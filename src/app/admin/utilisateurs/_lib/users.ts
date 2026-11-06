import { normalizeForSearch } from '@/lib/aide/search'
import { accountRoles, parseAccountRole, type AccountRole } from '@/lib/roles'

// Pure logic for /admin/utilisateurs (Figma J2) and the J3 detail: tabs, search, filters, sort,
// pagination, status precedence and the reports-received filter string. No Supabase here.

// ?role= keeps its built meaning (every ACCOUNT_ROLE, unknown = all) and gains « suspended » for the
// « Suspendus » tab. « admin » stays a valid filter though the frame draws no tab for it.
export type UserTab = AccountRole | 'suspended' | 'all'
export const USER_TABS = ['all', 'consumer', 'freelancer', 'shop_owner', 'suspended'] as const

export function parseUserTab(value: unknown): UserTab {
  if (value === 'suspended') return 'suspended'
  return parseAccountRole(value) ?? 'all'
}

export const JOINED_WINDOWS = ['all', '7d', '30d', '12m'] as const
export type JoinedWindow = (typeof JOINED_WINDOWS)[number]
const WINDOW_DAYS: Record<Exclude<JoinedWindow, 'all'>, number> = { '7d': 7, '30d': 30, '12m': 365 }

export const USER_SORTS = ['recent', 'oldest', 'name'] as const
export type UserSort = (typeof USER_SORTS)[number]

export function parseOne<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value) ? (value as T) : fallback
}

export type UserStatus = 'active' | 'suspended' | 'deletion_pending'

// Suspended wins over a pending deletion request: it is the state that blocks the account now.
export function userStatus(u: { suspended_at: string | null; deletionPending: boolean }): UserStatus {
  if (u.suspended_at) return 'suspended'
  if (u.deletionPending) return 'deletion_pending'
  return 'active'
}

export type FilterableUser = {
  full_name: string | null
  email: string | null
  phone: string | null
  city: string | null
  created_at: string
  suspended_at: string | null
  seller_type: string | null
  is_admin: boolean
}

export function inTab(u: FilterableUser, tab: UserTab): boolean {
  if (tab === 'all') return true
  if (tab === 'suspended') return Boolean(u.suspended_at)
  return accountRoles(u).includes(tab)
}

const digits = (s: string) => s.replace(/\D/g, '')

/**
 * A phone-shaped query (only digits, spaces, + . - ( ), 3+ digits) matches the phone as one digit string, so
 * « 55 123 » and « +21655123 » both find « +216 55 123 456 ». Otherwise every term must match the name or e-mail.
 */
export function matchesUserQuery(u: FilterableUser, query: string): boolean {
  const trimmed = query.trim()
  if (/^[\d\s+().-]+$/.test(trimmed) && digits(trimmed).length >= 3) return digits(u.phone ?? '').includes(digits(trimmed))
  const terms = normalizeForSearch(trimmed).split(/\s+/).filter(Boolean)
  if (terms.length === 0) return true
  const text = normalizeForSearch([u.full_name, u.email].filter(Boolean).join(' '))
  return terms.every((term) => text.includes(term))
}

export function filterUsers<T extends FilterableUser>(
  rows: readonly T[],
  f: { tab: UserTab; q: string; city: string | null; joined: JoinedWindow; now: number },
): T[] {
  const since = f.joined === 'all' ? null : f.now - WINDOW_DAYS[f.joined] * 86_400_000
  return rows.filter(
    (u) =>
      inTab(u, f.tab) &&
      (f.city === null || u.city === f.city) &&
      (since === null || new Date(u.created_at).getTime() >= since) &&
      matchesUserQuery(u, f.q),
  )
}

export function sortUsers<T extends FilterableUser>(rows: readonly T[], sort: UserSort): T[] {
  const time = (u: T) => new Date(u.created_at).getTime()
  const copy = [...rows]
  if (sort === 'oldest') return copy.sort((a, b) => time(a) - time(b))
  if (sort === 'name') return copy.sort((a, b) => (a.full_name ?? '').localeCompare(b.full_name ?? '', 'fr', { sensitivity: 'base' }))
  return copy.sort((a, b) => time(b) - time(a))
}

export function paginate<T>(rows: readonly T[], page: number, perPage: number): { items: T[]; page: number; totalPages: number } {
  const totalPages = Math.max(1, Math.ceil(rows.length / perPage))
  const current = Math.min(Math.max(1, Math.floor(page) || 1), totalPages)
  return { items: rows.slice((current - 1) * perPage, current * perPage), page: current, totalPages }
}

/** Distinct non-empty cities, sorted — the « Ville » filter options come from the data, not a fixed list. */
export function cityOptions(rows: ReadonlyArray<{ city: string | null }>): string[] {
  return [...new Set(rows.map((r) => r.city?.trim()).filter((c): c is string => Boolean(c)))].sort((a, b) => a.localeCompare(b, 'fr'))
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * PostgREST `.or()` filter for « Signalements reçus »: reports against the account itself (target_type user)
 * plus reports against any content it owns. Empty id lists are dropped (`in.()` is a 400). Ids are
 * uuid-checked, so nothing user-shaped reaches the filter string.
 */
export function reportsReceivedFilter(userId: string, content: Record<string, readonly string[]>): string {
  const clauses = [`and(target_type.eq.user,target_id.eq.${userId})`]
  for (const [type, ids] of Object.entries(content)) {
    const safe = ids.filter((id) => UUID.test(id))
    if (safe.length > 0) clauses.push(`and(target_type.eq.${type},target_id.in.(${safe.join(',')}))`)
  }
  if (!UUID.test(userId)) throw new Error('reportsReceivedFilter: userId must be a uuid')
  return clauses.join(',')
}

/** Age band from the declared date of birth (the DB requires 16+ to buy, 18+ to sell) — never the date itself. */
export function ageBand(dob: string | null, now: number): '18+' | '16-17' | 'under16' | null {
  if (!dob) return null
  const birth = new Date(dob)
  const today = new Date(now)
  let age = today.getUTCFullYear() - birth.getUTCFullYear()
  const m = today.getUTCMonth() - birth.getUTCMonth()
  if (m < 0 || (m === 0 && today.getUTCDate() < birth.getUTCDate())) age--
  if (age >= 18) return '18+'
  if (age >= 16) return '16-17'
  return 'under16'
}

/** Audit `action` → i18n key. hide/unhide are emitted as `hide_content_<type>`, so they map by prefix. */
const KNOWN_ACTIONS = [
  'suspend_user', 'unsuspend_user', 'resolve_report', 'dismiss_report', 'claim_report',
  'resolve_dispute', 'dismiss_dispute', 'claim_dispute', 'approve_deletion_request', 'reject_deletion_request',
  'complete_account_erasure', 'complete_data_export', 'handle_contact_message',
] as const

export function journalActionKey(action: string): string {
  if (action.startsWith('unhide_content')) return 'admin.journal.action.unhide_content'
  if (action.startsWith('hide_content')) return 'admin.journal.action.hide_content'
  return (KNOWN_ACTIONS as readonly string[]).includes(action) ? `admin.journal.action.${action}` : 'admin.journal.action.other'
}

/** « #F1B220 » — the order's id fragment (the table has no human number). */
export function orderRef(id: string): string {
  return id.replace(/-/g, '').slice(0, 6).toUpperCase()
}
