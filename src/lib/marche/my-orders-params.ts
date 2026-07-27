// Pure URL/param vocabulary for E3 (/mes-commandes). No data client, no next/headers — the
// filter bar is a CLIENT component and needs these constants, so they cannot live next to the
// query in my-orders.ts: importing that pulls lib/supabase/server (and next/headers) into the
// browser bundle, which is a build error, not a type error. tsc passes either way; only the
// bundler catches it.

/** The five statuses a SERVICE order can hold — the 3 product-only stages can never appear. */
export const SERVICE_STATUSES = ['pending', 'accepted', 'arrived', 'received', 'cancelled'] as const
export type ServiceOrderStatus = (typeof SERVICE_STATUSES)[number]

export const ORDER_SORTS = ['recent', 'ancien', 'prix_desc', 'prix_asc'] as const
export type OrderSort = (typeof ORDER_SORTS)[number]

/** Rows per page. The Figma pagination caption is "Affichage 1 à 6 sur 6" on a 6-row mock. */
export const ORDERS_PER_PAGE = 10

export type MyOrdersQuery = {
  q: string
  statut: ServiceOrderStatus | 'all'
  tri: OrderSort
  page: number
}

export function parseOrdersParams(sp: Record<string, string | string[] | undefined>): MyOrdersQuery {
  const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)

  const rawStatut = first(sp.statut)
  const statut = (SERVICE_STATUSES as readonly string[]).includes(rawStatut ?? '')
    ? (rawStatut as ServiceOrderStatus)
    : 'all'

  const rawTri = first(sp.tri)
  const tri = (ORDER_SORTS as readonly string[]).includes(rawTri ?? '') ? (rawTri as OrderSort) : 'recent'

  const rawPage = Number(first(sp.page))
  const page = Number.isFinite(rawPage) && rawPage >= 1 ? Math.floor(rawPage) : 1

  return { q: (first(sp.q) ?? '').trim(), statut, tri, page }
}
