import { normalizeForSearch } from '@/lib/aide/search'

// Pure queue logic for /admin/signalements (Figma J5): which statuses a tab shows, the severity order
// (« Triés par gravité : arnaque et danger d'abord, puis les plus anciens »), and the search match.
// No Supabase here — the page fetches, this decides.

export const REPORT_TABS = ['open', 'under_review', 'resolved', 'dismissed'] as const
export type ReportTab = (typeof REPORT_TABS)[number]

export const REPORT_REASONS = ['fake_scam', 'offensive', 'wrong_category', 'other'] as const
export const REPORT_TARGET_TYPES = ['product', 'service', 'shop', 'freelancer_profile', 'job_post', 'user'] as const
export const REPORT_SORTS = ['severity', 'newest', 'oldest'] as const
export type ReportSort = (typeof REPORT_SORTS)[number]

export type SeverityTone = 'danger' | 'warning' | 'info'

export function parseTab(value: string | undefined): ReportTab {
  return (REPORT_TABS as readonly string[]).includes(value ?? '') ? (value as ReportTab) : 'open'
}

export function parseSort(value: string | undefined): ReportSort {
  return (REPORT_SORTS as readonly string[]).includes(value ?? '') ? (value as ReportSort) : 'severity'
}

export function parseOption<T extends string>(value: string | undefined, allowed: readonly T[]): T | null {
  return (allowed as readonly string[]).includes(value ?? '') ? (value as T) : null
}

// « Ouverts » is the work queue: it lists every report still waiting for a decision — open AND claimed
// (the J5 frame draws an « En cours » row inside the Ouverts tab, with « Reprendre »). Its badge counts
// the unclaimed ones only. The other three tabs are one status each.
export function statusesForTab(tab: ReportTab): string[] {
  return tab === 'open' ? ['open', 'under_review'] : [tab]
}

// Lower = more severe. An unknown reason sorts last rather than throwing.
const SEVERITY_RANK: Record<string, number> = { fake_scam: 0, offensive: 1, wrong_category: 2, other: 3 }

export function severityRank(reason: string): number {
  return SEVERITY_RANK[reason] ?? 4
}

export function severityTone(reason: string): SeverityTone {
  const rank = severityRank(reason)
  if (rank === 0) return 'danger'
  if (rank === 1) return 'warning'
  return 'info'
}

type Sortable = { reason: string; created_at: string }

/** Returns a new array. `severity`: most severe first, then oldest first within a severity. */
export function sortReports<T extends Sortable>(rows: readonly T[], sort: ReportSort): T[] {
  const time = (r: T) => new Date(r.created_at).getTime()
  const copy = [...rows]
  if (sort === 'newest') return copy.sort((a, b) => time(b) - time(a))
  if (sort === 'oldest') return copy.sort((a, b) => time(a) - time(b))
  return copy.sort((a, b) => severityRank(a.reason) - severityRank(b.reason) || time(a) - time(b))
}

/** Every whitespace-separated term of `query` must appear in one of `fields` (case/accent-insensitive). */
export function matchesReportQuery(fields: ReadonlyArray<string | null | undefined>, query: string): boolean {
  const terms = normalizeForSearch(query).split(/\s+/).filter(Boolean)
  if (terms.length === 0) return true
  const haystack = normalizeForSearch(fields.filter(Boolean).join(' '))
  return terms.every((term) => haystack.includes(term))
}

/** The id fragment shown as the report's reference (« #3f2a1b9c ») — the table has no human number. */
export function reportRef(id: string): string {
  return id.slice(0, 8)
}
