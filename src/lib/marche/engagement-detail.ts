import type { OrderStatus } from '@/lib/types/order-status'

// H8 PR-2 « Détail d'un engagement » — the pure decisions behind /mes-engagements/[id]. No Supabase and no
// React, so each rule is unit-tested; the data itself comes from getSellerOrderDetail (G9's loader, scoped on
// orders.seller_id, which already parses a service order's brief).

/**
 * The detail page serves SERVICE orders only. getSellerOrderDetail is scoped on seller_id and would happily
 * return a product order, but a freelancer owns none (one seller capability) — and a product order here would
 * render a service layout around a parcel. 404 it like any order that is not theirs.
 */
export function isEngagementOrder(order: { orderType: string }): boolean {
  return order.orderType === 'service'
}

/**
 * When the buyer confirmed receipt: the column if set, else the event that recorded the move to `received`.
 * The column is being taken off the browser (H8 PR-2, DB ruling #12) and stamped by the database; until that
 * lands, and for orders confirmed before it existed, the timeline is the honest second source.
 */
export function engagementReceivedAt(order: {
  receivedAt: string | null
  events: readonly { toStatus: string | null; createdAt: string }[]
}): string | null {
  if (order.receivedAt) return order.receivedAt
  return order.events.find((e) => e.toStatus === 'received')?.createdAt ?? null
}

/** The line under the title: when it was requested, finished, or cancelled — `date` is null if unknowable. */
export function headerDateFor(
  order: { status: OrderStatus; createdAt: string; cancelledAt: string | null },
  receivedAt: string | null,
): { key: 'requested' | 'done' | 'cancelled'; iso: string } {
  if (order.status === 'received' && receivedAt) return { key: 'done', iso: receivedAt }
  if (order.status === 'cancelled' && order.cancelledAt) return { key: 'cancelled', iso: order.cancelledAt }
  return { key: 'requested', iso: order.createdAt }
}

/**
 * The helper line under « Prochaine étape », as an i18n key. pending and accepted have a seller-owned next
 * hop (the button); arrived waits on the BUYER; received / cancelled are closed.
 */
export function nextStepHintKey(status: OrderStatus): string {
  switch (status) {
    case 'pending':
      return 'engagements.detail.hint_pending'
    case 'accepted':
      return 'engagements.detail.hint_accepted'
    case 'arrived':
      return 'seller.orders.awaiting_buyer'
    case 'received':
      return 'engagements.detail.done'
    case 'cancelled':
      return 'engagements.detail.cancelled'
    default:
      // prepared / dispatched / in_delivery are product-chain only — a service order cannot be there.
      return 'seller.orderDetail.no_action'
  }
}

/**
 * Whether the « Motif » line belongs in the action rail. A cancellation's reason is ALSO the note of its history
 * event, so printing both shows the freelancer the same sentence twice; the rail keeps it only for the orders with no
 * such event (those that predate order_events).
 */
export function showCancelReasonInRail(order: {
  status: OrderStatus
  cancellationReason: string | null
  events: readonly { toStatus: string | null; note: string | null }[]
}): boolean {
  if (order.status !== 'cancelled' || !order.cancellationReason) return false
  return !order.events.some((e) => e.toStatus === 'cancelled' && e.note)
}

/**
 * The client's request as the panel shows it. The brief is whatever E1 folded into buyer_note; any of the three
 * parts may be missing, and a request with none of them reads as « not detailed », never as an empty panel.
 */
export function requestRows(brief: { description: string; timeframe: string | null; budget: string | null } | null): {
  description: string
  timeframe: string | null
  budget: string | null
  empty: boolean
} {
  const description = brief?.description.trim() ?? ''
  const timeframe = brief?.timeframe?.trim() || null
  const budget = brief?.budget?.trim() || null
  return { description, timeframe, budget, empty: !description && !timeframe && !budget }
}
