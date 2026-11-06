import { normalizeForSearch } from '@/lib/aide/search'

// Pure logic for /admin/journal (Figma J11): action labels and tones, the « avant → après » pair from the audit
// row's before_state / after_state JSON, filters and the period window. No Supabase here. Keys live under
// admin.log.* (a separate block from the user page's admin.journal.*, so the two PRs never duplicate a key).

export const LOG_ACTION_GROUPS = ['hide', 'unhide', 'suspend', 'unsuspend', 'report', 'dispute', 'request', 'other'] as const
export type LogActionGroup = (typeof LOG_ACTION_GROUPS)[number]
export const LOG_TARGETS = ['report', 'dispute', 'user', 'product', 'service', 'shop', 'freelancer_profile', 'job_post', 'deletion_request', 'data_export', 'contact_message'] as const
export const LOG_PERIODS = ['7d', '30d', '90d', 'all'] as const
export type LogPeriod = (typeof LOG_PERIODS)[number]

export function parseOne<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value) ? (value as T) : fallback
}

const KNOWN = [
  'suspend_user', 'unsuspend_user', 'resolve_report', 'dismiss_report', 'claim_report', 'resolve_dispute', 'dismiss_dispute',
  'claim_dispute', 'approve_deletion_request', 'reject_deletion_request', 'complete_account_erasure', 'complete_data_export',
  'reject_data_export', 'handle_contact_message',
] as const

/** hide / unhide are emitted as `hide_content_<type>`; unknown codes get a neutral label, never the raw code. */
export function logActionKey(action: string): string {
  if (action.startsWith('unhide_content')) return 'admin.log.action.unhide_content'
  if (action.startsWith('hide_content')) return 'admin.log.action.hide_content'
  return (KNOWN as readonly string[]).includes(action) ? `admin.log.action.${action}` : 'admin.log.action.other'
}

export function logActionGroup(action: string): LogActionGroup {
  if (action.startsWith('unhide_content')) return 'unhide'
  if (action.startsWith('hide_content')) return 'hide'
  if (action === 'suspend_user') return 'suspend'
  if (action === 'unsuspend_user') return 'unsuspend'
  if (action.endsWith('_report')) return 'report'
  if (action.endsWith('_dispute')) return 'dispute'
  if (/deletion|erasure|export|contact/.test(action)) return 'request'
  return 'other'
}

export type LogTone = 'danger' | 'success' | 'info'
export function logTone(action: string): LogTone {
  if (action.startsWith('unhide_content') || action === 'unsuspend_user' || action.startsWith('resolve_') || action.startsWith('approve_') || action.startsWith('complete_') || action.startsWith('handle_')) return 'success'
  if (action.startsWith('hide_content') || action === 'suspend_user' || action.startsWith('dismiss_') || action.startsWith('reject_')) return 'danger'
  return 'info'
}

// State values the audit rows carry → i18n keys. Anything else renders « — », never a raw value.
const STATE_KEY: Record<string, string> = {
  open: 'admin.reports.status_open',
  under_review: 'admin.reports.pill_under_review',
  resolved: 'admin.reports.status_resolved',
  dismissed: 'admin.reports.status_dismissed',
  pending: 'admin.log.state.pending',
  approved: 'admin.log.state.approved',
  rejected: 'admin.log.state.rejected',
  completed: 'admin.log.state.completed',
  handled: 'admin.log.state.handled',
  new: 'admin.log.state.new',
  active: 'admin.log.state.active',
  hidden: 'admin.reports.pill_hidden',
  suspended: 'admin.log.state.suspended',
}

function stateOf(json: unknown): string | null {
  if (!json || typeof json !== 'object' || Array.isArray(json)) return null
  const o = json as Record<string, unknown>
  if (typeof o.status === 'string') return o.status
  if ('suspended' in o) return o.suspended ? 'suspended' : 'active'
  if ('suspended_at' in o) return o.suspended_at ? 'suspended' : 'active'
  if ('admin_hidden_at' in o) return o.admin_hidden_at ? 'hidden' : 'active'
  if ('moderated' in o) return o.moderated ? 'hidden' : 'active'
  return null
}

/** « Ouvert → Rejeté »: the i18n keys of the before / after states, or null when either side is unknown. */
export function stateTransition(before: unknown, after: unknown): { from: string; to: string } | null {
  const a = stateOf(before), b = stateOf(after)
  if (!a || !b || !STATE_KEY[a] || !STATE_KEY[b]) return null
  return { from: STATE_KEY[a], to: STATE_KEY[b] }
}

export function periodSince(period: LogPeriod, now: number): string | null {
  const days = { '7d': 7, '30d': 30, '90d': 90 } as const
  return period === 'all' ? null : new Date(now - days[period] * 86_400_000).toISOString()
}

export function matchesLogQuery(fields: ReadonlyArray<string | null | undefined>, q: string): boolean {
  const terms = normalizeForSearch(q).split(/\s+/).filter(Boolean)
  if (terms.length === 0) return true
  const hay = normalizeForSearch(fields.filter(Boolean).join(' '))
  return terms.every((t) => hay.includes(t))
}
