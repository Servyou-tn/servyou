import { createClient } from '@/lib/supabase/server'
import { paginate, stripAccents } from '@/lib/search/search-params'
import { ORDERS_PER_PAGE, type MyOrdersQuery, type OrderSort } from './my-orders-params'

// E3 — the buyer's SERVICE orders for /mes-commandes (Figma 709:59662 / 710:59945).
//
// Separate from getMyOrders (my-data.ts), which returns every order of both types unfiltered
// and unpaginated: E3's chrome needs a search box, a Statut filter, a Trier par sort and
// pagination, all URL-param driven. getMyOrders stays for whatever else wants the flat list.
//
// Split of work: the DB filters what it can index (buyer + type + status), then search/sort/
// paginate run in memory. Search has to match the FREELANCER'S NAME as well as the title, and
// that name comes from a second query against public_profiles (profiles is owner-only), so it
// cannot be a PostgREST filter without a view. At MVP order volume per buyer this is the honest
// trade; when a buyer can plausibly have hundreds of orders it wants a view + server-side ILIKE.
//
// Product orders are excluded at the query level (`order_type='service'`) — the Produits tab is
// a later PR and there is deliberately no code path that would render one here.

// The param vocabulary (statuses, sorts, page size, parser) lives in my-orders-params.ts so the
// client filter bar can import it without dragging lib/supabase/server into the browser bundle.

export type MyServiceOrder = {
  id: string
  status: string
  createdAt: string
  receivedAt: string | null
  cancelledBy: 'buyer' | 'seller' | null
  cancellationReason: string | null
  /** null when the listing is no longer readable (hidden by its seller / admin). */
  title: string | null
  category: string | null
  /** service_listings.starting_price_tnd — a "from" price, never a paid total. */
  startingPrice: number | null
  /** profiles.id of the freelancer — the get_contact_phone(target) argument. */
  sellerId: string
  sellerName: string | null
  sellerCity: string | null
}

export type MyOrdersResult = {
  orders: MyServiceOrder[]
  page: number
  totalPages: number
  totalCount: number
  perPage: number
}

type Row = {
  id: string
  status: string
  created_at: string
  received_at: string | null
  cancelled_by: 'buyer' | 'seller' | null
  cancellation_reason: string | null
  seller_id: string
  service_listings:
    | {
        title: string
        starting_price_tnd: number | string | null
        freelancer_profiles: { city: string | null } | { city: string | null }[] | null
        categories: { name_fr: string } | { name_fr: string }[] | null
      }
    | null
}

function one<T>(embed: T | T[] | null | undefined): T | null {
  if (Array.isArray(embed)) return embed[0] ?? null
  return embed ?? null
}

function comparator(tri: OrderSort) {
  return (a: MyServiceOrder, b: MyServiceOrder): number => {
    const newest = b.createdAt.localeCompare(a.createdAt)
    switch (tri) {
      case 'ancien':
        return a.createdAt.localeCompare(b.createdAt)
      // A service with no starting price sorts last in BOTH directions (same rule the
      // marketplace uses for "sur devis" listings).
      case 'prix_asc': {
        if (a.startingPrice == null && b.startingPrice == null) return newest
        if (a.startingPrice == null) return 1
        if (b.startingPrice == null) return -1
        return a.startingPrice - b.startingPrice || newest
      }
      case 'prix_desc': {
        if (a.startingPrice == null && b.startingPrice == null) return newest
        if (a.startingPrice == null) return 1
        if (b.startingPrice == null) return -1
        return b.startingPrice - a.startingPrice || newest
      }
      case 'recent':
      default:
        return newest
    }
  }
}

export async function getMyServiceOrders(
  userId: string,
  query: MyOrdersQuery,
): Promise<MyOrdersResult> {
  const supabase = await createClient()

  let q = supabase
    .from('orders')
    .select(
      `id, status, created_at, received_at, cancelled_by, cancellation_reason, seller_id,
       service_listings ( title, starting_price_tnd, freelancer_profiles ( city ), categories ( name_fr ) )`,
    )
    .eq('buyer_id', userId)
    .eq('order_type', 'service')
  if (query.statut !== 'all') q = q.eq('status', query.statut)

  const { data, error } = await q.order('created_at', { ascending: false })
  // Same contract as getMyOrders: a failed query must never look like an empty account.
  if (error) {
    console.error('[my-orders] fetch error:', error.message, error.code, error.details)
    throw new Error(`service orders fetch failed: ${error.message}`)
  }

  const rows = (data ?? []) as unknown as Row[]

  // Freelancer display names come from the public_profiles view (profiles is owner-only read).
  const sellerIds = [...new Set(rows.map((r) => r.seller_id))]
  const names = new Map<string, string>()
  if (sellerIds.length > 0) {
    const { data: profiles, error: pErr } = await supabase
      .from('public_profiles')
      .select('id, full_name')
      .in('id', sellerIds)
    if (pErr) console.error('[my-orders] public_profiles error:', pErr.message, pErr.code, pErr.details)
    for (const p of (profiles ?? []) as { id: string; full_name: string | null }[]) {
      names.set(p.id, p.full_name ?? '')
    }
  }

  const all: MyServiceOrder[] = rows.map((row) => {
    const s = one(row.service_listings)
    const fp = one(s?.freelancer_profiles)
    return {
      id: row.id,
      status: row.status,
      createdAt: row.created_at,
      receivedAt: row.received_at,
      cancelledBy: row.cancelled_by,
      cancellationReason: row.cancellation_reason,
      title: s?.title ?? null,
      category: one(s?.categories)?.name_fr ?? null,
      startingPrice: s?.starting_price_tnd != null ? Number(s.starting_price_tnd) : null,
      sellerId: row.seller_id,
      sellerName: names.get(row.seller_id) || null,
      sellerCity: fp?.city ?? null,
    }
  })

  // Search matches the service title OR the freelancer's name, accent- and case-insensitively
  // (same normalisation the marketplace search uses, so "traduction" finds "Traduction").
  const needle = stripAccents(query.q.toLowerCase()).trim()
  const matched = needle
    ? all.filter(
        (o) =>
          stripAccents((o.title ?? '').toLowerCase()).includes(needle) ||
          stripAccents((o.sellerName ?? '').toLowerCase()).includes(needle),
      )
    : all

  const sorted = [...matched].sort(comparator(query.tri))
  const { totalPages, safePage, start, end } = paginate(sorted.length, query.page, ORDERS_PER_PAGE)

  return {
    orders: sorted.slice(start, end),
    page: safePage,
    totalPages,
    totalCount: sorted.length,
    perPage: ORDERS_PER_PAGE,
  }
}
