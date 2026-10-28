import { createClient } from '@/lib/supabase/server'
import { reportQueryError } from '@/lib/supabase/query-error'
import { paginate, stripAccents } from '@/lib/search/search-params'
import {
  DEFAULT_ORDERS_TAB,
  ORDERS_PER_PAGE,
  type MyOrdersQuery,
  type OrdersTab,
  type OrderSort,
} from './my-orders-params'

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
// This function stays SERVICE-only (`order_type='service'`). The Produits tab has its own sibling below,
// getMyProductOrders, with the same contract: DB filters buyer + type + status, search / sort / paging run in
// memory, a failed read throws.

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
       service_listings ( title, starting_price_tnd, freelancer_profiles ( city ), categories!service_listings_category_id_fkey ( name_fr ) )`,
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
    // Partial display: the orders still render, the names fall back to ''.
    if (pErr) reportQueryError('my-orders public_profiles', pErr)
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

// ─── Produits tab ────────────────────────────────────────────────────────────────────────────────────────
//
// E3 Produits (Figma 704:58976 / 706:59409). Same accordion as Services; what differs is the row's data: a product
// thumbnail, the SHOP's name (not a freelancer's), a total (unit × quantity + delivery) instead of a « from » price,
// and the full 8-status lifecycle.

export type MyProductOrder = {
  id: string
  status: string
  createdAt: string
  receivedAt: string | null
  cancelledBy: 'buyer' | 'seller' | null
  cancellationReason: string | null
  /** Snapshot title, else the live product's; null when neither is readable (product removed). */
  title: string | null
  imageUrl: string | null
  /** null when the product is no longer readable — the order row carries no shop snapshot. */
  shopName: string | null
  quantity: number
  /** What the buyer pays on delivery: unit price × quantity + the delivery fee snapshot. null when no price is known. */
  total: number | null
  /** profiles.id of the shop owner — the get_contact_phone(target) argument (orders.seller_id). */
  sellerId: string
}

type ProductRow = {
  id: string
  status: string
  created_at: string
  received_at: string | null
  cancelled_by: 'buyer' | 'seller' | null
  cancellation_reason: string | null
  seller_id: string
  quantity: number
  unit_price_tnd: number | string | null
  item_title: string | null
  delivery_fee_tnd: number | string | null
  products:
    | {
        title: string
        price_tnd: number | string
        shops: { name: string | null } | { name: string | null }[] | null
        product_images: { image_url: string; display_order: number }[] | null
      }
    | null
}

/** Row → display shape. Pure. The price snapshot wins; the live price is the fallback for pre-snapshot orders. */
export function toMyProductOrder(row: ProductRow): MyProductOrder {
  const p = one(row.products)
  const unit = row.unit_price_tnd ?? p?.price_tnd ?? null
  const images = p?.product_images ?? []
  const first = [...images].sort((a, b) => a.display_order - b.display_order)[0]
  return {
    id: row.id,
    status: row.status,
    createdAt: row.created_at,
    receivedAt: row.received_at,
    cancelledBy: row.cancelled_by,
    cancellationReason: row.cancellation_reason,
    title: row.item_title ?? p?.title ?? null,
    imageUrl: first?.image_url ?? null,
    shopName: one(p?.shops)?.name ?? null,
    quantity: row.quantity,
    total: unit == null ? null : Number(unit) * row.quantity + Number(row.delivery_fee_tnd ?? 0),
    sellerId: row.seller_id,
  }
}

function productComparator(tri: OrderSort) {
  return (a: MyProductOrder, b: MyProductOrder): number => {
    const newest = b.createdAt.localeCompare(a.createdAt)
    if (tri === 'ancien') return a.createdAt.localeCompare(b.createdAt)
    if (tri === 'prix_asc' || tri === 'prix_desc') {
      // An order with no known price sorts last in BOTH directions.
      if (a.total == null && b.total == null) return newest
      if (a.total == null) return 1
      if (b.total == null) return -1
      return (tri === 'prix_asc' ? a.total - b.total : b.total - a.total) || newest
    }
    return newest
  }
}

export type MyProductOrdersResult = {
  orders: MyProductOrder[]
  page: number
  totalPages: number
  totalCount: number
  perPage: number
}

/** Search (title or shop name, accent- and case-insensitive) → sort → page. Pure. */
export function pageMyProductOrders(all: MyProductOrder[], query: MyOrdersQuery): MyProductOrdersResult {
  const needle = stripAccents(query.q.toLowerCase()).trim()
  const matched = needle
    ? all.filter(
        (o) =>
          stripAccents((o.title ?? '').toLowerCase()).includes(needle) ||
          stripAccents((o.shopName ?? '').toLowerCase()).includes(needle),
      )
    : all
  const sorted = [...matched].sort(productComparator(query.tri))
  const { totalPages, safePage, start, end } = paginate(sorted.length, query.page, ORDERS_PER_PAGE)
  return { orders: sorted.slice(start, end), page: safePage, totalPages, totalCount: sorted.length, perPage: ORDERS_PER_PAGE }
}

export async function getMyProductOrders(userId: string, query: MyOrdersQuery): Promise<MyProductOrdersResult> {
  const supabase = await createClient()

  // products has ONE foreign key to categories and shops, and none is embedded twice, so no PGRST201 hint applies.
  let q = supabase
    .from('orders')
    .select(
      `id, status, created_at, received_at, cancelled_by, cancellation_reason, seller_id, quantity,
       unit_price_tnd, item_title, delivery_fee_tnd,
       products ( title, price_tnd, shops ( name ), product_images ( image_url, display_order ) )`,
    )
    .eq('buyer_id', userId)
    .eq('order_type', 'product')
  if (query.statut !== 'all') q = q.eq('status', query.statut)

  const { data, error } = await q.order('created_at', { ascending: false })
  // A failed read must never look like « you have no orders » — on this page that is the worst failure there is.
  if (error) {
    console.error('[my-orders] product orders fetch error:', error.message, error.code, error.details)
    throw new Error(`product orders fetch failed: ${error.message}`)
  }

  return pageMyProductOrders(((data ?? []) as unknown as ProductRow[]).map(toMyProductOrder), query)
}

// ─── Default tab ─────────────────────────────────────────────────────────────────────────────────────────

/** The tab of the buyer's newest order; Produits when they have none. Pure. */
export function pickDefaultOrdersTab(latest: { order_type: string } | null | undefined): OrdersTab {
  if (latest?.order_type === 'service') return 'services'
  if (latest?.order_type === 'product') return 'produits'
  return DEFAULT_ORDERS_TAB
}

/**
 * What a bare /mes-commandes opens (architect ruling on #202): the tab of the buyer's MOST RECENT order, service or
 * product, so a services-only buyer coming from the sidebar is not shown an empty Produits tab. One tiny indexed read
 * (newest order, one column). A failed read throws like every other query on this page — falling back to Produits would
 * be a silent wrong answer for a services buyer.
 */
export async function getDefaultOrdersTab(userId: string): Promise<OrdersTab> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('orders')
    .select('order_type')
    .eq('buyer_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) {
    console.error('[my-orders] default tab fetch error:', error.message, error.code, error.details)
    throw new Error(`default orders tab fetch failed: ${error.message}`)
  }
  return pickDefaultOrdersTab(data as { order_type: string } | null)
}
