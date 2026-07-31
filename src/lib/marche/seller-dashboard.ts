import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'

// G4 « Tableau de bord vendeur » data layer (Figma 475:21134, specimen 484:24205).
//
// One shop's snapshot: the glance counts, the action-center queue, the in-flight monitor and the
// low-stock rail. Read-only — every mutation goes through the server actions in
// app/tableau-de-bord-vendeur/actions.ts.
//
// Order-status vocabulary is the DB's, verified against `check_order_status_transition`:
//   product  pending -> accepted -> prepared -> dispatched -> in_delivery -> arrived -> received
//   service  pending -> accepted -> arrived -> received
// The seller owns every hop except `received` (buyer-only, from `arrived`). So the ACTION queue is
// the statuses a seller can still advance, and the MONITOR is the ones where the ball is not in
// their court.

// Low-stock threshold, locked at 5 (G4 build note). Only meaningful when tracks_stock is true —
// a "Toujours disponible" product has no stock to be low.
const LOW_STOCK_THRESHOLD = 5

// Statuses the SELLER can still act on, in urgency order — pending first (a buyer is waiting on
// a decision and this is where refusal risk lives), then the chain the seller still owns.
const ACTIONABLE: readonly string[] = ['pending', 'accepted', 'prepared', 'dispatched']
// In flight: moving, but not by the seller's hand. `arrived` sits here because the next move is
// the BUYER's confirmation, not the seller's.
const IN_FLIGHT: readonly string[] = ['in_delivery', 'arrived']

export type SellerOrderKind = 'product' | 'service'

export type ActionableOrder = {
  id: string
  status: string
  orderType: SellerOrderKind
  title: string
  buyerName: string
  buyerCity: string | null
  createdAt: string
}

export type InFlightOrder = {
  id: string
  status: string
  title: string
  buyerName: string
  buyerCity: string | null
}

export type LowStockProduct = { id: string; title: string; stockCount: number }

/**
 * G4's « Bénéfice net » tile.
 *
 * ⚑ GATED ON A SNAPSHOT EXISTING, NOT ON A NON-ZERO SUM. Every delivered order predates
 * `unit_price_tnd`, so a naive `SUM` prints a confident **0 TND** — which reads as "you earned
 * nothing", a false claim, rather than "not measured yet". `null` here means *no delivered order
 * carries a snapshot*, and the tile keeps its em-dash treatment.
 *
 * Per the founder ruling the agency's delivery fee is not seller revenue, so net for a shop owner is
 * `unit_price_tnd × quantity` over delivered orders and the fee plays no part.
 *
 * `measuredCount` vs `deliveredCount` exists because the gate alone is not enough: the day the FIRST
 * snapshot-bearing order is delivered, the tile would flip from "—" to a real number that silently
 * excludes the 4 delivered orders that predate the column — the same defect one step later. When the
 * two counts differ the caption says so instead of the value pretending to be complete.
 */
export type NetProfit = {
  /** TND, summed over delivered orders that HAVE a snapshot. */
  value: number
  /** Delivered orders counted in `value`. */
  measuredCount: number
  /** ALL delivered orders, measured or not. */
  deliveredCount: number
}

export type SellerDashboard = {
  pendingCount: number
  ordersThisWeek: number
  activeProducts: number
  actionable: ActionableOrder[]
  inFlight: InFlightOrder[]
  lowStock: LowStockProduct[]
  /** null when NO delivered order carries a price snapshot — see NetProfit. */
  netProfit: NetProfit | null
}

export type OrderRow = {
  id: string
  status: string
  order_type: SellerOrderKind
  created_at: string
  buyer_id: string
  quantity: number | null
  item_title: string | null
  unit_price_tnd: number | string | null
  products: { title: string } | { title: string }[] | null
  service_listings: { title: string } | { title: string }[] | null
}

function one<T>(embed: T | T[] | null | undefined): T | null {
  if (Array.isArray(embed)) return embed[0] ?? null
  return embed ?? null
}

/**
 * Frozen snapshot first, live join as the self-retiring fallback for the 14 pre-migration orders.
 * See SellerOrderDetail.itemTitle for the full reasoning.
 */
function titleOf(row: OrderRow): string {
  return row.item_title ?? one(row.products)?.title ?? one(row.service_listings)?.title ?? ''
}

/** `received` is the delivered/terminal-success state — the buyer has confirmed receipt. */
const DELIVERED = 'received'

/** Exported for tests — money logic is must-test per the testing discipline. */
export function netProfitOf(orders: OrderRow[]): NetProfit | null {
  const delivered = orders.filter((o) => o.status === DELIVERED)
  const measured = delivered.filter((o) => o.unit_price_tnd != null)
  // No snapshot anywhere ⇒ not measured yet. Deliberately NOT a zero — see NetProfit.
  if (measured.length === 0) return null
  const value = measured.reduce((sum, o) => sum + Number(o.unit_price_tnd) * (o.quantity ?? 1), 0)
  return {
    // Round to the cent: numeric(10,2) × an integer stays exact in Postgres, but it arrives as a
    // JS float here and a long tail of binary noise must not reach the UI.
    value: Math.round(value * 100) / 100,
    measuredCount: measured.length,
    deliveredCount: delivered.length,
  }
}

/**
 * Everything G4 renders for one shop owner, in two round trips (orders, then buyer names) plus
 * one for products. Wrapped in cache() so generateMetadata and the page share a single fetch.
 */
export const getSellerDashboard = cache(
  async (userId: string, shopId: string | null): Promise<SellerDashboard> => {
    const supabase = await createClient()

    // Orders where I am the seller. seller_id is denormalised onto orders, so this needs no join
    // through shops — and it is the same column `check_order_status_transition` authorises on.
    const { data: orderData, error: ordersError } = await supabase
      .from('orders')
      .select(
        `id, status, order_type, created_at, buyer_id, quantity,
         item_title, unit_price_tnd,
         products ( title ),
         service_listings ( title )`,
      )
      .eq('seller_id', userId)
      .order('created_at', { ascending: false })

    // A failed query must never degrade to "you have no orders" — on a seller dashboard that
    // reads as "nothing to do today" and the seller simply does not ship. Surface it instead.
    if (ordersError) {
      console.error(
        '[seller-dashboard] orders fetch error:',
        ordersError.message,
        ordersError.code,
        ordersError.details,
      )
      throw new Error(`seller orders fetch failed: ${ordersError.message}`)
    }

    const orders = (orderData ?? []) as unknown as OrderRow[]

    // Buyer display names come from public_profiles, never a profiles embed: profiles SELECT is
    // owner-only, so an embed would return null for every buyer that is not the seller.
    const buyerIds = [...new Set(orders.map((o) => o.buyer_id).filter(Boolean))]
    const names = new Map<string, { name: string; city: string | null }>()
    if (buyerIds.length > 0) {
      const { data: profiles, error: profilesError } = await supabase
        .from('public_profiles')
        .select('id, full_name, city')
        .in('id', buyerIds)
      if (profilesError) {
        console.error(
          '[seller-dashboard] public_profiles fetch error:',
          profilesError.message,
          profilesError.code,
        )
      }
      for (const p of (profiles ?? []) as { id: string; full_name: string | null; city: string | null }[]) {
        names.set(p.id, { name: p.full_name ?? '', city: p.city })
      }
    }

    // Products for the glance count + the low-stock rail. Scoped to the owner's shop; a
    // shop_owner who never completed G2 has no shop, so there is nothing to count.
    let activeProducts = 0
    let lowStock: LowStockProduct[] = []
    if (shopId) {
      const { data: productData, error: productsError } = await supabase
        .from('products')
        .select('id, title, status, tracks_stock, stock_count')
        .eq('shop_id', shopId)
      if (productsError) {
        console.error(
          '[seller-dashboard] products fetch error:',
          productsError.message,
          productsError.code,
        )
        throw new Error(`seller products fetch failed: ${productsError.message}`)
      }
      const products = (productData ?? []) as {
        id: string
        title: string
        status: string
        tracks_stock: boolean
        stock_count: number | null
      }[]
      activeProducts = products.filter((p) => p.status === 'active').length
      lowStock = products
        .filter(
          (p) =>
            p.status === 'active' &&
            p.tracks_stock &&
            p.stock_count != null &&
            p.stock_count <= LOW_STOCK_THRESHOLD,
        )
        .sort((a, b) => (a.stock_count ?? 0) - (b.stock_count ?? 0))
        .map((p) => ({ id: p.id, title: p.title, stockCount: p.stock_count ?? 0 }))
    }

    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
    const buyer = (id: string) => names.get(id) ?? { name: '', city: null }

    return {
      pendingCount: orders.filter((o) => o.status === 'pending').length,
      ordersThisWeek: orders.filter((o) => new Date(o.created_at).getTime() >= weekAgo).length,
      activeProducts,
      actionable: orders
        .filter((o) => ACTIONABLE.includes(o.status))
        // Urgency: pending first, then oldest-first within a status — the order that has been
        // waiting longest is the one at risk, so recency-DESC would be exactly backwards here.
        .sort((a, b) => {
          const rank = ACTIONABLE.indexOf(a.status) - ACTIONABLE.indexOf(b.status)
          if (rank !== 0) return rank
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        })
        .map((o) => ({
          id: o.id,
          status: o.status,
          orderType: o.order_type,
          title: titleOf(o),
          buyerName: buyer(o.buyer_id).name,
          buyerCity: buyer(o.buyer_id).city,
          createdAt: o.created_at,
        })),
      inFlight: orders
        .filter((o) => IN_FLIGHT.includes(o.status))
        .map((o) => ({
          id: o.id,
          status: o.status,
          title: titleOf(o),
          buyerName: buyer(o.buyer_id).name,
          buyerCity: buyer(o.buyer_id).city,
        })),
      lowStock,
      netProfit: netProfitOf(orders),
    }
  },
)

// NOTE there is deliberately no `nextSellerStatus` here any more. G4 shipped one, which duplicated
// the chains already in `@/lib/types/order-status` (`PRODUCT_LIFECYCLE` / `SERVICE_LIFECYCLE` /
// `nextStatus`). Two copies of the DB trigger's truth is one too many — they agreed at the time,
// but the second consumer (G8) would have made a third copy likely. Import `nextStatus` from
// `@/lib/types/order-status`; it is the same function with the same result, derived from the
// lifecycle arrays rather than an if-ladder.

export { LOW_STOCK_THRESHOLD, ACTIONABLE, IN_FLIGHT }
