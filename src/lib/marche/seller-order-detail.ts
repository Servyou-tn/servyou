import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { parseDeliveryAddress, parseServiceBuyerNote } from '@/lib/marche/order-detail'
import type { OrderStatus, OrderType } from '@/lib/types/order-status'

// G9 « Détail de la commande » data layer (Figma 495:26112, specimens 498:26471 / 26622 / 26793).
//
// A SIBLING of getOrderDetail, deliberately — not the same function with a role argument.
// getOrderDetail re-checks `buyer_id === currentUserId`; this one re-checks `seller_id`. A single
// function taking a role would make safety a call-site responsibility, and one defaulted or
// forgotten argument shows a buyer the seller's view of an order. The name IS the scope.
//
// The two also return different SHAPES: the buyer's view carries seller identity for the WhatsApp
// reveal, this one carries buyer identity plus the delivery fields the seller has to act on. A
// union return type would force every consumer to narrow on something the compiler cannot tie
// back to the role that was passed.
//
// RLS is the real boundary either way: `orders` SELECT is
// `buyer_id = auth.uid() OR seller_id = auth.uid()`, so the database already refuses an order the
// caller is not party to. This check is defence in depth, and it is what stops a SELLER-party
// order being rendered in the buyer layout (or vice versa) — RLS cannot tell those apart.
//
// `parseDeliveryAddress` and `parseServiceBuyerNote` are imported from the buyer module rather
// than copied: they parse formats written by the ORDER pipeline, not by either role.

export type SellerOrderDetail = {
  id: string
  status: OrderStatus
  orderType: OrderType
  createdAt: string
  receivedAt: string | null
  cancelledAt: string | null
  cancelledBy: string | null
  cancellationReason: string | null
  quantity: number
  /**
   * Product OR service listing — whichever this order points at.
   *
   * FROZEN SNAPSHOT FIRST, live join as the fallback. `orders.item_title` is written by
   * `set_order_snapshot()` (BEFORE INSERT, server-derived, client value discarded), so every order
   * created after migration 20260729111547 carries its own title and a seller renaming a listing
   * can no longer rewrite history. The 14 orders that predate the column have NULL and fall through
   * to the embed, rendering exactly what they render today.
   *
   * The fallback is SELF-RETIRING: it serves a closed set of 14 rows that can only shrink, and it
   * is unreachable for a new order. When those are archived the `??` tails delete with no migration.
   */
  itemTitle: string
  /** Same snapshot-first rule as itemTitle — `orders.unit_price_tnd`, then the live join. */
  unitPrice: number | null
  /** Per-shipment carrier. Product orders only (CHECK orders_shipment_requires_product). */
  carrier: string | null
  /** Seller-entered tracking number. Product orders only, same CHECK. */
  trackingNumber: string | null
  /** Append-only timeline, OLDEST FIRST (frame order). Empty on the 14 pre-migration orders. */
  events: OrderEvent[]
  /** buyer profile id — the get_contact_phone target. */
  buyerId: string
  buyerName: string
  buyerCity: string | null
  deliveryName: string | null
  deliveryStreet: string
  deliveryGovernorate: string | null
  deliveryPhone: string | null
  /** Free-text note for a product order; the parsed brief for a service one. */
  buyerNote: string | null
  serviceBrief: { description: string; timeframe: string | null; budget: string | null } | null
}

/** One `order_events` row, as G9's panel-historique consumes it. */
export type OrderEvent = {
  eventType: 'created' | 'status_change' | 'print'
  fromStatus: OrderStatus | null
  toStatus: OrderStatus | null
  actorRole: 'buyer' | 'seller' | 'admin' | 'system' | null
  note: string | null
  createdAt: string
}

type Row = {
  id: string
  status: string
  order_type: OrderType
  created_at: string
  received_at: string | null
  cancelled_at: string | null
  cancelled_by: string | null
  cancellation_reason: string | null
  quantity: number | null
  buyer_id: string
  seller_id: string
  delivery_name: string | null
  delivery_address: string | null
  delivery_phone: string | null
  buyer_note: string | null
  item_title: string | null
  unit_price_tnd: number | string | null
  carrier: string | null
  tracking_number: string | null
  order_events:
    | {
        event_type: string
        from_status: string | null
        to_status: string | null
        actor_role: string | null
        note: string | null
        created_at: string
      }[]
    | null
  products: { title: string; price_tnd: number | string } | { title: string; price_tnd: number | string }[] | null
  service_listings:
    | { title: string; starting_price_tnd: number | string | null }
    | { title: string; starting_price_tnd: number | string | null }[]
    | null
}

function one<T>(embed: T | T[] | null | undefined): T | null {
  if (Array.isArray(embed)) return embed[0] ?? null
  return embed ?? null
}

/**
 * One order, from the SELLER's side. Returns null for a missing order, an invalid id, or an order
 * this user does not sell — all the same not-found state, so the response cannot be used to probe
 * whether an order id exists.
 */
export const getSellerOrderDetail = cache(
  async (orderId: string, sellerId: string): Promise<SellerOrderDetail | null> => {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('orders')
      .select(
        `id, status, order_type, created_at, received_at, cancelled_at, cancelled_by,
         cancellation_reason, quantity, buyer_id, seller_id,
         delivery_name, delivery_address, delivery_phone, buyer_note,
         item_title, unit_price_tnd, carrier, tracking_number,
         products ( title, price_tnd ),
         service_listings ( title, starting_price_tnd ),
         order_events ( event_type, from_status, to_status, actor_role, note, created_at )`,
      )
      .eq('id', orderId)
      // OLDEST FIRST, matching the frame: Figma's timeline (504:27045/27050/27055) runs 09h12 →
      // 10h45 → 14h02 top to bottom, which is also the only order a vertical connecting rule reads
      // correctly in. Sorted by the database, not in JS.
      .order('created_at', { referencedTable: 'order_events', ascending: true })
      .maybeSingle()

    if (error) {
      // An invalid uuid lands here as Postgres 22P02 — a graceful not-found, not a crash.
      console.error('[seller-order-detail] fetch error:', error.message, error.code, error.details)
      return null
    }
    if (!data) return null

    const row = data as unknown as Row
    if (row.seller_id !== sellerId) return null

    const product = one(row.products)
    const service = one(row.service_listings)
    const addr = parseDeliveryAddress(row.delivery_address)

    // Buyer display name comes from public_profiles — profiles SELECT is owner-only, so an embed
    // would return null for every buyer that is not the caller.
    let buyerName = ''
    let buyerCity: string | null = null
    const { data: profile, error: pErr } = await supabase
      .from('public_profiles')
      .select('full_name, city')
      .eq('id', row.buyer_id)
      .maybeSingle()
    if (pErr) console.error('[seller-order-detail] public_profiles error:', pErr.message, pErr.code)
    if (profile) {
      buyerName = (profile as { full_name: string | null }).full_name ?? ''
      buyerCity = (profile as { city: string | null }).city
    }

    // Snapshot wins; the live join is the fallback for the 14 orders that predate capture. `??`
    // not `||` — a legitimately-zero price must not fall through to the live join.
    const rawPrice = row.unit_price_tnd ?? product?.price_tnd ?? service?.starting_price_tnd ?? null

    return {
      id: row.id,
      status: row.status as OrderStatus,
      orderType: row.order_type,
      createdAt: row.created_at,
      receivedAt: row.received_at,
      cancelledAt: row.cancelled_at,
      cancelledBy: row.cancelled_by,
      cancellationReason: row.cancellation_reason,
      quantity: row.quantity ?? 1,
      itemTitle: row.item_title ?? product?.title ?? service?.title ?? '',
      unitPrice: rawPrice != null ? Number(rawPrice) : null,
      carrier: row.carrier,
      trackingNumber: row.tracking_number,
      events: (row.order_events ?? []).map((e) => ({
        eventType: e.event_type as OrderEvent['eventType'],
        fromStatus: e.from_status as OrderStatus | null,
        toStatus: e.to_status as OrderStatus | null,
        actorRole: e.actor_role as OrderEvent['actorRole'],
        note: e.note,
        createdAt: e.created_at,
      })),
      buyerId: row.buyer_id,
      buyerName,
      buyerCity,
      deliveryName: row.delivery_name,
      deliveryStreet: addr.street,
      deliveryGovernorate: addr.governorate,
      deliveryPhone: row.delivery_phone,
      // A product order's note is free text; a service order's is the folded brief E1 wrote.
      buyerNote: row.order_type === 'product' ? row.buyer_note : null,
      serviceBrief:
        row.order_type === 'service' ? parseServiceBuyerNote(row.buyer_note) : null,
    }
  },
)
