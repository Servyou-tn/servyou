import { MAX_ACTIVE_RESPONSES_PER_FREELANCER } from '@/lib/job-constants'
import { resolveAnnonceStatus, type AnnonceDisplayStatus } from '@/lib/marche/annonce-status'
import { TUNIS_TZ } from '@/lib/datetime'

// H11 « Mes propositions » — pure types, state/tab/stat rules, search and paging. NO Supabase import on purpose (same split as
// engagements.ts / engagements-query.ts): unit-testable, and a client component can import the types for free.
//
// A « proposition » is one job_responses row of the freelancer, seen through the state of the post it answers
// (docs/design/h9-h13-measurements.md §5, Figma 298:9129 — cloned from H8 in the design, so the page mirrors H8's).

/** Rows per page (D-H11-8) — the frame draws 6; 10 matches H8 / G8 / H5. */
export const PROPOSALS_PER_PAGE = 10

export const PROPOSAL_TABS = ['all', 'active', 'closed'] as const
export type ProposalTab = (typeof PROPOSAL_TABS)[number]
/** D-H11-7: « Toutes » (the frame), not H8's « À traiter ». */
export const DEFAULT_PROPOSAL_TAB: ProposalTab = 'all'

/** D-H11-3: the frame draws no options. */
export const PROPOSAL_SORTS = ['recent', 'oldest'] as const
export type ProposalSort = (typeof PROPOSAL_SORTS)[number]
export const DEFAULT_PROPOSAL_SORT: ProposalSort = 'recent'

/**
 * What became of the post the proposal answers. The first three are `resolveAnnonceStatus` (open · filled · expired — exactly the
 * frame's three pills); `unavailable` is a post the responder can no longer read at all (deleted by its owner, or moderated:
 * migration 70 keeps only open / filled / expired answered posts readable), so the row has no title or client to show.
 */
export type ProposalState = AnnonceDisplayStatus | 'unavailable'

export type Proposal = {
  /** job_responses.id — what « Retirer » deletes. */
  id: string
  jobPostId: string
  createdAt: string
  /** Server-clock result (never re-derived in a client render — hydration). */
  state: ProposalState
  price: number | null
  timeframe: string | null
  /** null when the post is `unavailable`. */
  title: string | null
  categorySlug: string | null
  categoryNameFr: string | null
  categoryNameAr: string | null
  /** The post owner (get_contact_phone's target); null when `unavailable`. */
  clientId: string | null
  clientFirstName: string
  clientCity: string | null
}

/** Open and inside the 30-day window = the DB's own « active » rule (check_job_response_limits' cap of 5). */
export function isProposalActive(state: ProposalState): boolean {
  return state === 'open'
}

/** The state of a proposal from its post; `post` is null when RLS hides it. */
export function resolveProposalState(
  post: { status: 'open' | 'filled' | 'expired' | 'deleted'; createdAt: string } | null,
  now: Date,
): ProposalState {
  if (!post) return 'unavailable'
  return resolveAnnonceStatus(post.status, post.createdAt, now)
}

// ── Stat tiles (frame order: Envoyées · Actives n / 5 · Fermées · Ce mois) ───────────────────────────
export type ProposalStats = {
  sent: number
  /** Proposals on posts still taking proposals — the number the 5-active cap counts. */
  active: number
  activeMax: number
  /** Everything else: filled, expired, deleted / moderated. */
  closed: number
  /** Sent in the current calendar month, Africa/Tunis (D-H11-4). */
  thisMonth: number
}

/** « 2026-10 » of an instant in Tunis — the calendar month the tile counts in (UTC+1, no DST, so it differs from UTC near midnight on the 1st). */
export function tunisMonthKey(value: Date | string): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: TUNIS_TZ, year: 'numeric', month: '2-digit' }).formatToParts(new Date(value))
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? ''
  return `${get('year')}-${get('month')}`
}

export function proposalStats(all: readonly Pick<Proposal, 'state' | 'createdAt'>[], now: Date): ProposalStats {
  const thisMonthKey = tunisMonthKey(now)
  const active = all.filter((p) => isProposalActive(p.state)).length
  return {
    sent: all.length,
    active,
    activeMax: MAX_ACTIVE_RESPONSES_PER_FREELANCER,
    closed: all.length - active,
    thisMonth: all.filter((p) => tunisMonthKey(p.createdAt) === thisMonthKey).length,
  }
}

// ── Search ───────────────────────────────────────────────────────────────────────────────────────
function fold(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

/** « Rechercher une mission ou un client… » (D-H11-5) — the mission title or the client's first name. */
export function matchesProposalQuery(p: Pick<Proposal, 'title' | 'clientFirstName'>, q: string): boolean {
  const needle = fold(q.trim())
  if (!needle) return true
  return fold(p.title ?? '').includes(needle) || fold(p.clientFirstName).includes(needle)
}

function inTab(p: Pick<Proposal, 'state'>, tab: ProposalTab): boolean {
  if (tab === 'all') return true
  return tab === 'active' ? isProposalActive(p.state) : !isProposalActive(p.state)
}

// ── One page ─────────────────────────────────────────────────────────────────────────────────────
export type ProposalsPage = {
  proposals: Proposal[]
  /** Rows matching the tab AND the search — what the caption counts and the pager pages over. */
  totalCount: number
  totalPages: number
  /** The page actually served (an out-of-range request is clamped). */
  page: number
  stats: ProposalStats
}

/** Filter by tab and search, sort by send date, slice one page. Stats always cover ALL proposals (a tile must not move with the tab). */
export function pageProposals(
  all: readonly Proposal[],
  opts: { tab: ProposalTab; q: string; sort: ProposalSort; page: number },
  now: Date,
): ProposalsPage {
  const filtered = all.filter((p) => inTab(p, opts.tab) && matchesProposalQuery(p, opts.q))
  const sorted = [...filtered].sort((a, b) => {
    const d = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    return opts.sort === 'oldest' ? d : -d
  })
  const totalCount = sorted.length
  const totalPages = Math.max(1, Math.ceil(totalCount / PROPOSALS_PER_PAGE))
  // An integer whatever the URL said: `?page=1.5` would otherwise slice from row 5.
  const page = Math.min(Math.max(1, Math.floor(opts.page) || 1), totalPages)
  const start = (page - 1) * PROPOSALS_PER_PAGE
  return {
    proposals: sorted.slice(start, start + PROPOSALS_PER_PAGE),
    totalCount,
    totalPages,
    page,
    stats: proposalStats(all, now),
  }
}
