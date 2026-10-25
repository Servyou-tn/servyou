import type { OrderStatus } from '@/lib/types/order-status'

// H8 « Mes engagements » — pure types, tab/stat rules, search and paging. NO Supabase import on purpose
// (same split as seller-services.ts / seller-services-query.ts): everything here is unit-testable, and a
// client component can import the types without dragging the server client into its bundle.
//
// An « engagement » is a SERVICE order seen from the freelancer's side (orders.order_type = 'service',
// orders.seller_id = the freelancer's profile id). docs/design/h8-measurements.md, Figma 273:8575.

/** Rows per page — the frame draws 6; 10 matches G8 and H5. */
export const ENGAGEMENTS_PER_PAGE = 10

// Tabs. Architect ruling D1: « À traiter » (pending) is FIRST and the default landing, then the frame's five
// (Tous · En cours · Livrés · Terminés · Annulés, Figma 273:9054). The frame draws no pending state at all,
// yet pending is where the freelancer has to act, so it leads — the G8 precedent (an inbox opens on what
// needs you). « Tous » keeps its drawn position among the frame's five.
//
// Each tab is ONE status, because the service chain is a single line: pending → accepted → arrived →
// received, plus cancelled. Names are the freelancer's words (frame): `accepted` is « En cours » (work under
// way), `arrived` is « Livré » (the freelancer has delivered; the buyer has yet to confirm), `received` is
// « Terminé » (the buyer confirmed).
export const ENGAGEMENT_TABS = ['a_traiter', 'all', 'in_progress', 'delivered', 'done', 'cancelled'] as const
export type EngagementTab = (typeof ENGAGEMENT_TABS)[number]
export const DEFAULT_ENGAGEMENT_TAB: EngagementTab = 'a_traiter'

export const ENGAGEMENT_SORTS = ['recent', 'oldest'] as const
export type EngagementSort = (typeof ENGAGEMENT_SORTS)[number]
export const DEFAULT_ENGAGEMENT_SORT: EngagementSort = 'recent'

export function statusesForEngagementTab(tab: EngagementTab): OrderStatus[] | null {
  switch (tab) {
    case 'a_traiter':
      return ['pending']
    case 'in_progress':
      return ['accepted']
    case 'delivered':
      return ['arrived']
    case 'done':
      return ['received']
    case 'cancelled':
      return ['cancelled']
    case 'all':
      return null // no status predicate
  }
}

/** How the frame labels the client: « Consommateur » (user icon) or « Boutique » (store icon). */
export type EngagementClientType = 'consumer' | 'shop' | 'freelancer'

/** profiles.seller_type → the label. null = a plain consumer; a freelancer can buy a service too. */
export function clientTypeOf(sellerType: string | null | undefined): EngagementClientType {
  if (sellerType === 'shop_owner') return 'shop'
  if (sellerType === 'freelancer') return 'freelancer'
  return 'consumer'
}

export type Engagement = {
  id: string
  status: OrderStatus
  /** The frozen title (orders.item_title), falling back to the live listing for the 14 pre-snapshot rows. */
  title: string
  /** service_listings.category_id's slug — the category icon and label. null: no listing, or none set. */
  categorySlug: string | null
  clientId: string
  clientName: string
  clientCity: string | null
  clientAvatarUrl: string | null
  clientType: EngagementClientType
  createdAt: string
  receivedAt: string | null
  cancelledAt: string | null
  cancellationReason: string | null
  /** orders.unit_price_tnd — the listing's STARTING price at the time of the order (ruling D3), not a negotiated one. */
  startingPrice: number | null
  /** service_listings.price_unit as of NOW (orders snapshot no unit): hour / day / month print « / heure » etc.; fixed and NULL print none. */
  priceUnit: string | null
  /** The timeframe the buyer typed in the request (« Délai souhaité ») — free text, ruling D4. */
  requestedTimeframe: string | null
}

// ── Stat tiles ───────────────────────────────────────────────────────────────────────────────────
// Frame order: En cours · (À livrer → « À traiter », ruling D4) · Terminés · Total.
//
// « En cours » is `accepted` ONLY (ruling D9), matching its tab. H4's « Engagements actifs » counts every
// non-terminal status, pending included — a known mismatch, logged in docs/follow-ups.md, not edited here.
export type EngagementStats = {
  /** accepted — work under way. */
  inProgress: number
  /** pending — requests waiting for the freelancer's answer. */
  toHandle: number
  /** received — confirmed by the buyer. */
  done: number
  /** every order, cancelled included (« depuis le début »). */
  total: number
}

export function engagementStats(all: readonly { status: OrderStatus }[]): EngagementStats {
  const count = (s: OrderStatus) => all.filter((e) => e.status === s).length
  return { inProgress: count('accepted'), toHandle: count('pending'), done: count('received'), total: all.length }
}

// ── Search ───────────────────────────────────────────────────────────────────────────────────────

/** Lower-case and strip diacritics, so « creation » finds « Création » (the data is French / Arabic mixed). */
function fold(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

/** « Rechercher un client ou service… » — matches the client's name or the service title. */
export function matchesEngagementQuery(e: Pick<Engagement, 'clientName' | 'title'>, q: string): boolean {
  const needle = fold(q.trim())
  if (!needle) return true
  return fold(e.clientName).includes(needle) || fold(e.title).includes(needle)
}

// ── One page ─────────────────────────────────────────────────────────────────────────────────────

export type EngagementsPage = {
  engagements: Engagement[]
  /** Rows matching the tab AND the search — what « n engagements » counts and the pager pages over. */
  totalCount: number
  totalPages: number
  /** The page actually served (an out-of-range request is clamped). */
  page: number
  stats: EngagementStats
}

/**
 * Filter by tab and search, sort by request date, slice one page. Stats always cover ALL engagements —
 * a tile must not change with the tab or the search box.
 *
 * Small-data posture, as G8: the freelancer's service orders are fetched once and filtered in JS.
 */
export function pageEngagements(
  all: readonly Engagement[],
  opts: { tab: EngagementTab; q: string; sort: EngagementSort; page: number },
): EngagementsPage {
  const allowed = statusesForEngagementTab(opts.tab)
  const filtered = all.filter(
    (e) => (!allowed || allowed.includes(e.status)) && matchesEngagementQuery(e, opts.q),
  )
  const sorted = [...filtered].sort((a, b) => {
    const d = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    return opts.sort === 'oldest' ? d : -d
  })

  const totalCount = sorted.length
  const totalPages = Math.max(1, Math.ceil(totalCount / ENGAGEMENTS_PER_PAGE))
  // An integer, whatever the URL said: `?page=1.5` would otherwise slice from row 5 and print a wrong caption.
  const page = Math.min(Math.max(1, Math.floor(opts.page) || 1), totalPages)
  const start = (page - 1) * ENGAGEMENTS_PER_PAGE
  return {
    engagements: sorted.slice(start, start + ENGAGEMENTS_PER_PAGE),
    totalCount,
    totalPages,
    page,
    stats: engagementStats(all),
  }
}
