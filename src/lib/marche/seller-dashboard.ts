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

export type SellerDashboard = {
  pendingCount: number
  ordersThisWeek: number
  activeProducts: number
  actionable: ActionableOrder[]
  inFlight: InFlightOrder[]
  lowStock: LowStockProduct[]
}

type OrderRow = {
  id: string
  status: string
  order_type: SellerOrderKind
  created_at: string
  buyer_id: string
  products: { title: string } | { title: string }[] | null
  service_listings: { title: string } | { title: string }[] | null
}

function one<T>(embed: T | T[] | null | undefined): T | null {
  if (Array.isArray(embed)) return embed[0] ?? null
  return embed ?? null
}

function titleOf(row: OrderRow): string {
  return one(row.products)?.title ?? one(row.service_listings)?.title ?? ''
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
        `id, status, order_type, created_at, buyer_id,
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
    }
  },
)

/**
 * The seller's next status for an order, or null when the seller owns no further hop.
 * Mirrors `check_order_status_transition` exactly — the DB is the authority, this is the UI's
 * copy so a button is only ever offered for a transition the trigger will actually accept.
 */
export function nextSellerStatus(orderType: SellerOrderKind, status: string): string | null {
  if (orderType === 'service') {
    if (status === 'pending') return 'accepted'
    if (status === 'accepted') return 'arrived'
    return null
  }
  if (status === 'pending') return 'accepted'
  if (status === 'accepted') return 'prepared'
  if (status === 'prepared') return 'dispatched'
  if (status === 'dispatched') return 'in_delivery'
  if (status === 'in_delivery') return 'arrived'
  return null
}

export { LOW_STOCK_THRESHOLD, ACTIONABLE, IN_FLIGHT }
