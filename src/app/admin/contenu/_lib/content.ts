import { normalizeForSearch } from '@/lib/aide/search'

// Pure logic for /admin/contenu (Figma J4): tabs per content table, one status vocabulary across five tables,
// search / status / category filters, « Signalés d'abord » sort and pagination. No Supabase here.

export const CONTENT_TABS = ['product', 'service', 'shop', 'job_post', 'freelancer_profile'] as const
export type ContentTab = (typeof CONTENT_TABS)[number]

export const CONTENT_STATUSES = ['all', 'visible', 'hidden', 'draft', 'inactive'] as const
export type ContentStatusFilter = (typeof CONTENT_STATUSES)[number]
export type ContentStatus = Exclude<ContentStatusFilter, 'all'>

export const CONTENT_SORTS = ['reported', 'recent', 'oldest'] as const
export type ContentSort = (typeof CONTENT_SORTS)[number]

export function parseOne<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value) ? (value as T) : fallback
}

/**
 * The admin moderation marker wins (« Masqué »); then each table's own state:
 * product active / hidden (seller-paused) / sold_out · service active / hidden / draft · job_post open / filled /
 * expired / deleted · freelancer_profile is_published · shop has no state of its own.
 */
export function contentStatus(
  tab: ContentTab,
  row: { admin_hidden_at: string | null; status?: string | null; is_published?: boolean | null },
): ContentStatus {
  if (row.admin_hidden_at) return 'hidden'
  if (tab === 'shop') return 'visible'
  if (tab === 'freelancer_profile') return row.is_published ? 'visible' : 'draft'
  if (row.status === 'draft') return 'draft'
  if (row.status === 'active' || row.status === 'open') return 'visible'
  return 'inactive'
}

export type FilterableContent = {
  title: string
  owner: string | null
  status: ContentStatus
  categoryId: string | null
  reports: number
  created_at: string
}

export function filterContent<T extends FilterableContent>(
  rows: readonly T[],
  f: { q: string; status: ContentStatusFilter; category: string | null },
): T[] {
  const terms = normalizeForSearch(f.q).split(/\s+/).filter(Boolean)
  return rows.filter((r) => {
    if (f.status !== 'all' && r.status !== f.status) return false
    if (f.category && r.categoryId !== f.category) return false
    if (terms.length === 0) return true
    const hay = normalizeForSearch(`${r.title} ${r.owner ?? ''}`)
    return terms.every((t) => hay.includes(t))
  })
}

/** « Signalés d'abord »: most open reports first, then newest; « recent » / « oldest » by publication date. */
export function sortContent<T extends FilterableContent>(rows: readonly T[], sort: ContentSort): T[] {
  const time = (r: T) => new Date(r.created_at).getTime()
  const copy = [...rows]
  if (sort === 'oldest') return copy.sort((a, b) => time(a) - time(b))
  if (sort === 'recent') return copy.sort((a, b) => time(b) - time(a))
  return copy.sort((a, b) => b.reports - a.reports || time(b) - time(a))
}

export function paginate<T>(rows: readonly T[], page: number, perPage: number): { items: T[]; page: number; totalPages: number } {
  const totalPages = Math.max(1, Math.ceil(rows.length / perPage))
  const current = Math.min(Math.max(1, Math.floor(page) || 1), totalPages)
  return { items: rows.slice((current - 1) * perPage, current * perPage), page: current, totalPages }
}

/** Open (open + under_review) reports per target id. */
export function countReports(reports: ReadonlyArray<{ target_id: string }>): Map<string, number> {
  const m = new Map<string, number>()
  for (const r of reports) m.set(r.target_id, (m.get(r.target_id) ?? 0) + 1)
  return m
}
