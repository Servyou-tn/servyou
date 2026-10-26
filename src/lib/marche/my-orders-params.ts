// Pure URL/param vocabulary for E3 (/mes-commandes). No data client, no next/headers — the
// filter bar is a CLIENT component and needs these constants, so they cannot live next to the
// query in my-orders.ts: importing that pulls lib/supabase/server (and next/headers) into the
// browser bundle, which is a build error, not a type error. tsc passes either way; only the
// bundler catches it.

/** The five statuses a SERVICE order can hold — the 3 product-only stages can never appear. */
export const SERVICE_STATUSES = ['pending', 'accepted', 'arrived', 'received', 'cancelled'] as const
export type ServiceOrderStatus = (typeof SERVICE_STATUSES)[number]

/**
 * The eight statuses a PRODUCT order can hold (the DB CHECK's full set): the 7-step chain plus `cancelled`.
 * In chain order, which is also the order of the Statut filter.
 */
export const PRODUCT_STATUSES = [
  'pending',
  'accepted',
  'prepared',
  'dispatched',
  'in_delivery',
  'arrived',
  'received',
  'cancelled',
] as const
export type ProductOrderStatus = (typeof PRODUCT_STATUSES)[number]

/** The Produits · Services toggle. `?tab=` is a real URL fact; anything else falls back to DEFAULT_ORDERS_TAB. */
export const ORDER_TABS = ['produits', 'services'] as const
export type OrdersTab = (typeof ORDER_TABS)[number]
/**
 * The tab when the buyer has no orders at all — Figma authors Produits first and selected (704:58976). With orders,
 * a bare /mes-commandes opens the tab of the buyer's MOST RECENT order instead (architect ruling on #202; see
 * getDefaultOrdersTab in my-orders.ts), so the sidebar link never lands a services-only buyer on an empty Produits tab.
 */
export const DEFAULT_ORDERS_TAB: OrdersTab = 'produits'

/** True when `?tab=` names a real tab. An absent or unknown value means « pick the smart default ». */
export function hasExplicitTab(sp: Record<string, string | string[] | undefined>): boolean {
  const raw = Array.isArray(sp.tab) ? sp.tab[0] : sp.tab
  return (ORDER_TABS as readonly string[]).includes(raw ?? '')
}

export function statusesForTab(tab: OrdersTab): readonly (ProductOrderStatus | ServiceOrderStatus)[] {
  return tab === 'produits' ? PRODUCT_STATUSES : SERVICE_STATUSES
}

export const ORDER_SORTS = ['recent', 'ancien', 'prix_desc', 'prix_asc'] as const
export type OrderSort = (typeof ORDER_SORTS)[number]

/** Rows per page. The Figma pagination caption is "Affichage 1 à 6 sur 6" on a 6-row mock. */
export const ORDERS_PER_PAGE = 10

export type MyOrdersQuery = {
  tab: OrdersTab
  q: string
  /** Validated against the tab's own status set, so `?tab=services&statut=prepared` is `all`, not an empty list. */
  statut: ProductOrderStatus | 'all'
  tri: OrderSort
  page: number
}

export function parseOrdersParams(
  sp: Record<string, string | string[] | undefined>,
  /** The tab to use when `?tab=` is absent or unknown — the page passes the smart default; statut is validated against it. */
  fallbackTab: OrdersTab = DEFAULT_ORDERS_TAB,
): MyOrdersQuery {
  const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)

  const rawTab = first(sp.tab)
  const tab = (ORDER_TABS as readonly string[]).includes(rawTab ?? '') ? (rawTab as OrdersTab) : fallbackTab

  const rawStatut = first(sp.statut)
  const statut = (statusesForTab(tab) as readonly string[]).includes(rawStatut ?? '')
    ? (rawStatut as ProductOrderStatus)
    : 'all'

  const rawTri = first(sp.tri)
  const tri = (ORDER_SORTS as readonly string[]).includes(rawTri ?? '') ? (rawTri as OrderSort) : 'recent'

  const rawPage = Number(first(sp.page))
  const page = Number.isFinite(rawPage) && rawPage >= 1 ? Math.floor(rawPage) : 1

  return { tab, q: (first(sp.q) ?? '').trim(), statut, tri, page }
}
