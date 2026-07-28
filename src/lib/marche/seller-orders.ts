import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { PRODUCT_LIFECYCLE, type OrderStatus, type OrderType } from '@/lib/types/order-status'

// G8 « Commandes reçues » data layer (Figma 489:25211, specimens 490:25690 / 490:26034).
//
// The seller's inbox: every order where they are the seller, filtered by a status tab, sorted,
// paginated. Read-only — transitions go through the server actions in app/actions/orders.ts.
//
// Scoped by `orders.seller_id`, which is the same column `check_order_status_transition`
// authorises on, so the list can never show a row the seller could not act on.

/** Rows per page — matches the Figma list (10 rows above the pagination block). */
export const ORDERS_PER_PAGE = 10

// The status tabs, in FRAME ORDER (Figma 489:25351): Toutes · À traiter · En livraison ·
// Terminées · Annulées. Five, not the six G8 first shipped — "En attente" and "En cours" were
// mine and are merged back into the frame's single "En livraison".
//
// ⚑ ONE DELIBERATE DIVERGENCE, founder-approved: the frame's ACTIVE tab is `all`, but the landing
// tab here is `a_traiter`. An inbox that opens on an undifferentiated list does not answer "what
// needs me?" — the same reasoning that made G4 action-first. `all` stays FIRST in the strip, as
// drawn; only the default selection differs. The Figma should absorb this rather than the code
// matching it.
export const ORDER_TABS = ['all', 'a_traiter', 'in_delivery', 'done', 'cancelled'] as const
export type OrderTab = (typeof ORDER_TABS)[number]

/** The tab a bare /commandes-recues lands on. See the divergence note above. */
export const DEFAULT_ORDER_TAB: OrderTab = 'a_traiter'

// Statuses the SELLER can still advance. Mirrors G4's action centre.
const ACTIONABLE: OrderStatus[] = ['pending', 'accepted', 'prepared', 'dispatched']
// "En livraison" — physically moving. `arrived` belongs here rather than under Terminées: the
// parcel has landed but the buyer has not confirmed, so the order is not done.
const IN_DELIVERY: OrderStatus[] = ['in_delivery', 'arrived']
const DONE: OrderStatus[] = ['received']
const CANCELLED: OrderStatus[] = ['cancelled']

export function statusesForTab(tab: OrderTab): OrderStatus[] | null {
  switch (tab) {
    case 'a_traiter':
      return ACTIONABLE
    case 'in_delivery':
      return IN_DELIVERY
    case 'done':
      return DONE
    case 'cancelled':
      return CANCELLED
    case 'all':
      return null // no status predicate
  }
}

export type SellerOrderSort = 'recent' | 'oldest'

export type SellerOrder = {
  id: string
  status: OrderStatus
  orderType: OrderType
  title: string
  buyerId: string
  buyerName: string
  buyerCity: string | null
  createdAt: string
  cancellationReason: string | null
  cancelledBy: string | null
  /**
   * Hours the order has been waiting — ONLY for `pending`, and null otherwise.
   * `orders` carries no per-step timestamps (only created_at / updated_at / received_at /
   * cancelled_at), so "waiting since" is knowable for pending and unknowable for every other
   * state. `updated_at` is the last touch of ANYTHING on the row, so deriving a wait from it
   * would print a confidently wrong number. Founder call: pending only, nothing elsewhere.
   */
  waitingHours: number | null
}

export type SellerOrdersPage = {
  orders: SellerOrder[]
  totalCount: number
  totalPages: number
  page: number
  /** Per-tab counts for the tab bar badges. */
  counts: Record<OrderTab, number>
}

type Row = {
  id: string
  status: string
  order_type: OrderType
  created_at: string
  buyer_id: string
  cancellation_reason: string | null
  cancelled_by: string | null
  products: { title: string } | { title: string }[] | null
  service_listings: { title: string } | { title: string }[] | null
}

function one<T>(embed: T | T[] | null | undefined): T | null {
  if (Array.isArray(embed)) return embed[0] ?? null
  return embed ?? null
}

/**
 * One page of the seller's inbox, plus the counts every tab badge needs.
 *
 * Small-data posture, matching the rest of the marketplace: the seller's orders are fetched once
 * and filtered/sorted/paged in JS, rather than one query per tab count plus a ranged query. A
 * shop with thousands of orders wants a `count: 'exact', head: true` per tab and a `.range()` —
 * revisit then, not before.
 */
export const getSellerOrders = cache(
  async (
    userId: string,
    opts: { tab: OrderTab; sort: SellerOrderSort; page: number },
  ): Promise<SellerOrdersPage> => {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('orders')
      .select(
        `id, status, order_type, created_at, buyer_id, cancellation_reason, cancelled_by,
         products ( title ),
         service_listings ( title )`,
      )
      .eq('seller_id', userId)
      .order('created_at', { ascending: false })

    // Never degrade to "you have no orders" on a seller's inbox — that reads as "nothing to do"
    // and the seller simply does not ship. Surface it.
    if (error) {
      console.error(
        '[seller-orders] fetch error:',
        error.message,
        error.code,
        error.details,
      )
      throw new Error(`seller orders fetch failed: ${error.message}`)
    }

    const rows = (data ?? []) as unknown as Row[]

    // Buyer names from public_profiles — profiles SELECT is owner-only, so an embed would return
    // null for every buyer.
    const buyerIds = [...new Set(rows.map((r) => r.buyer_id).filter(Boolean))]
    const names = new Map<string, { name: string; city: string | null }>()
    if (buyerIds.length > 0) {
      const { data: profiles, error: pErr } = await supabase
        .from('public_profiles')
        .select('id, full_name, city')
        .in('id', buyerIds)
      if (pErr) console.error('[seller-orders] public_profiles error:', pErr.message, pErr.code)
      for (const p of (profiles ?? []) as {
        id: string
        full_name: string | null
        city: string | null
      }[]) {
        names.set(p.id, { name: p.full_name ?? '', city: p.city })
      }
    }

    const now = Date.now()
    const all: SellerOrder[] = rows.map((r) => {
      const buyer = names.get(r.buyer_id) ?? { name: '', city: null }
      const status = r.status as OrderStatus
      return {
        id: r.id,
        status,
        orderType: r.order_type,
        title: one(r.products)?.title ?? one(r.service_listings)?.title ?? '',
        buyerId: r.buyer_id,
        buyerName: buyer.name,
        buyerCity: buyer.city,
        createdAt: r.created_at,
        cancellationReason: r.cancellation_reason,
        cancelledBy: r.cancelled_by,
        waitingHours:
          status === 'pending'
            ? Math.max(0, Math.floor((now - new Date(r.created_at).getTime()) / 3_600_000))
            : null,
      }
    })

    const countIn = (set: OrderStatus[]) => all.filter((o) => set.includes(o.status)).length
    const counts: Record<OrderTab, number> = {
      all: all.length,
      a_traiter: countIn(ACTIONABLE),
      in_delivery: countIn(IN_DELIVERY),
      done: countIn(DONE),
      cancelled: countIn(CANCELLED),
    }

    const allowed = statusesForTab(opts.tab)
    const filtered = allowed ? all.filter((o) => allowed.includes(o.status)) : all
    const sorted = [...filtered].sort((a, b) => {
      const d = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      return opts.sort === 'oldest' ? d : -d
    })

    const totalCount = sorted.length
    const totalPages = Math.max(1, Math.ceil(totalCount / ORDERS_PER_PAGE))
    const page = Math.min(Math.max(1, opts.page), totalPages)
    const start = (page - 1) * ORDERS_PER_PAGE

    return {
      orders: sorted.slice(start, start + ORDERS_PER_PAGE),
      totalCount,
      totalPages,
      page,
      counts,
    }
  },
)

/** Product orders show a 7-step chain; services a 4-step one. Re-exported for the row's stepper. */
export { PRODUCT_LIFECYCLE }
