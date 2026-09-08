// H5 « Mes services » — pure types/predicates only. NO `@/lib/supabase/server` import here on
// purpose: `ServiceRow.tsx` (client) imports `SellerServiceRow` from this file, and that
// server-only import would otherwise drag the whole server client into the client bundle —
// mirrors seller-products.ts's own split for the identical reason.

/** Rows per page. */
export const SERVICES_PER_PAGE = 10

// Frame order: Tous · Actifs · En pause (Figma 244:726, Segmented count=3). "En pause" covers BOTH
// a self-paused row and an admin-moderated one — both are `status='hidden'` in the DB; the pill
// (not the tab) is what tells them apart (see ServiceRow.tsx / status-pill.tsx).
export const SERVICE_TABS = ['all', 'active', 'paused'] as const
export type ServiceTab = (typeof SERVICE_TABS)[number]
export const DEFAULT_SERVICE_TAB: ServiceTab = 'all'

export const SERVICE_SORTS = ['recent', 'price_asc', 'price_desc'] as const
export type ServiceSort = (typeof SERVICE_SORTS)[number]
export const DEFAULT_SERVICE_SORT: ServiceSort = 'recent'

// A service can also be 'draft' (H6, the creation wizard, is its only writer — not yet in code).
// A draft is excluded from ALL THREE tabs, Tous included: it was never published by its owner, so
// H5 must not be the surface that first makes it visible. Making it resumable/visible again is
// H6's job (see docs/follow-ups.md), not this file's.
type TabFields = { status: 'active' | 'hidden' | 'draft' }

export function matchesServiceTab(s: TabFields, tab: ServiceTab): boolean {
  switch (tab) {
    case 'all':
      return s.status !== 'draft'
    case 'active':
      return s.status === 'active'
    case 'paused':
      return s.status === 'hidden'
  }
}

export type ServiceTabCounts = Record<ServiceTab, number>

export function countServiceTabs(rows: TabFields[]): ServiceTabCounts {
  return {
    all: rows.filter((r) => matchesServiceTab(r, 'all')).length,
    active: rows.filter((r) => matchesServiceTab(r, 'active')).length,
    paused: rows.filter((r) => matchesServiceTab(r, 'paused')).length,
  }
}

export type SellerServiceRow = {
  id: string
  title: string
  description: string | null
  priceTnd: number
  status: 'active' | 'hidden' | 'draft'
  adminHiddenAt: string | null
  /** Non-cancelled orders against THIS listing — the "Commandes" column. */
  ordersCount: number
  /** ANY order at all, any status — the delete-eligibility signal (mirrors products' hasOrders;
   *  enforce_order_identity_lock raises on the ON DELETE SET NULL cascade regardless of status,
   *  verified live against this exact schema shape before this file was written). */
  hasOrders: boolean
  /** True only for an `active` row when it is the freelancer's ONLY active listing — the signal
   *  that pausing or deleting THIS row would flip `freelancer_profiles.is_published` to false. */
  isLastActive: boolean
  /** `categories.slug` via `service_listings.category_id` — drives the row thumb icon
   *  (CATEGORY_ICONS in ServiceRow.tsx). Null for the rare uncategorized row; Wrench fallback. */
  categorySlug: string | null
}

export type ServiceStats = {
  activeCount: number
  totalCount: number
  pendingOrders: number
  /** Non-cancelled service orders, all-time. */
  receivedOrders: number
  /** Non-cancelled service orders, calendar month, Africa/Tunis. */
  thisMonthOrders: number
  /** thisMonthOrders - lastMonthOrders. Can be negative or zero — reported honestly, never hidden. */
  monthDelta: number
}

export type SellerServicesPage = {
  services: SellerServiceRow[]
  counts: ServiceTabCounts
  stats: ServiceStats
  totalCount: number
  totalPages: number
  page: number
}
