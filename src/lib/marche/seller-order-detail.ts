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
  /** Product OR service listing — whichever this order points at. */
  itemTitle: string
  unitPrice: number | null
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
         products ( title, price_tnd ),
         service_listings ( title, starting_price_tnd )`,
      )
      .eq('id', orderId)
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

    const rawPrice = product?.price_tnd ?? service?.starting_price_tnd ?? null

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
      itemTitle: product?.title ?? service?.title ?? '',
      unitPrice: rawPrice != null ? Number(rawPrice) : null,
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
