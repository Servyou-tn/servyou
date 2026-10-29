import { isCancellable, type OrderStatus, type OrderType } from '@/lib/types/order-status'
import { canConfirmReceipt } from '@/lib/orders/order-status'
import type { OrderEvent } from '@/lib/marche/seller-order-detail'

// E4 « Détail de ma commande » (/mes-commandes/[id]) — the BUYER-side decisions, kept pure so they can be tested without
// rendering a page: which action panel a status gets, which buttons it carries, how the history reads, where a cancelled
// order's rail stops. Figma 1469:23519 and its state frames 1472:23919 / 1472:24760 / 1472:25035 / 1475:25384.

export type BuyerPanelState = 'pending' | 'in_progress' | 'confirm' | 'received' | 'cancelled'

/**
 * Which action panel the rail shows.
 *   pending      → « En attente de la boutique »   (frame 1472:23919)
 *   confirm      → « Votre colis est arrivé ? »    (frame 1469:23519; service: « Le travail est livré ? »)
 *   received     → « Commande terminée »           (frame 1472:24760)
 *   cancelled    → « Commande annulée »            (frame 1472:25035)
 *   in_progress  → accepted / prepared / dispatched / in_delivery — NO FRAME draws these; derived (decision D4).
 */
export function buyerPanelState(status: string): BuyerPanelState {
  switch (status) {
    case 'pending':
      return 'pending'
    case 'arrived':
      return 'confirm'
    case 'received':
      return 'received'
    case 'cancelled':
      return 'cancelled'
    default:
      return 'in_progress'
  }
}

/**
 * Founder ruling, following the DATABASE: a buyer may cancel a PRODUCT order until it is Reçue / Annulée (free while
 * pending, a reason required from Expédiée on — `requiresCancellationReason`). A SERVICE order has no buyer cancel.
 */
export function buyerCanCancel(status: string, orderType: OrderType): boolean {
  return orderType === 'product' && isCancellable(status as OrderStatus)
}

/** While pending, « Annuler la commande » IS the panel's main action (a red button); afterwards it is a quiet link under it. */
export function buyerCancelIsButton(status: string): boolean {
  return status === 'pending'
}

/**
 * « Signaler un problème » — a dispute. The `disputes` INSERT policy refuses a pending order and nothing is disputable
 * once cancelled, so it is offered from `accepted` through `received` (the frames draw it on Arrivée and Reçue).
 */
export function buyerCanDispute(status: string): boolean {
  return status !== 'pending' && status !== 'cancelled'
}

export function buyerCanConfirmReceipt(status: string, orderType: OrderType): boolean {
  // The same hop for both order types — `arrived` is « Arrivée » for a product and « Travail livré » for a service.
  void orderType
  return canConfirmReceipt(status)
}

/**
 * The last chain stage a cancelled order actually reached — Figma 1472:25035 draws « En attente ✓ » and then a red
 * « Annulée » node IN PLACE OF the next stage. It comes from the cancellation event's `from_status`; an order that
 * predates `order_events` (no event) falls back to the first stage, which every order has passed by existing.
 */
export function cancelledAfterStage(
  events: readonly Pick<OrderEvent, 'eventType' | 'toStatus' | 'fromStatus'>[],
  chain: readonly string[],
): string {
  const cancellation = [...events]
    .reverse()
    .find((e) => e.eventType === 'status_change' && e.toStatus === 'cancelled')
  const from = cancellation?.fromStatus
  return from && chain.includes(from) ? from : chain[0]
}

type Translate = (key: string, vars?: Record<string, string | number>) => string

/**
 * One « Historique » line, in the BUYER's voice, or null for an event the frame does not draw.
 *
 * The frame shows six milestones — placed, accepted, shipped, arrived, received, cancelled — and deliberately NOT
 * « Préparée » / « En livraison » (the stepper above carries every stage; the history is the buyer's checkpoints).
 * A cancellation carries its reason INLINE (« Annulée par vous · motif : « J'ai changé d'avis » »), which is why the
 * timeline's separate note row is switched off for this panel.
 *
 * `carrier` is `orders.carrier`, which nothing writes today — so « Expédiée avec First Delivery » reads plain
 * « Expédiée » until a carrier exists; the wording is ready for it.
 */
export function buyerEventLabel(
  event: Pick<OrderEvent, 'eventType' | 'toStatus' | 'actorRole' | 'note'>,
  ctx: { orderType: OrderType; carrier: string | null },
  tr: Translate,
): string | null {
  const product = ctx.orderType === 'product'
  if (event.eventType === 'created') {
    return tr(product ? 'buyerOrder.event.created_product' : 'buyerOrder.event.created_service')
  }
  if (event.eventType !== 'status_change' || !event.toStatus) return null

  switch (event.toStatus) {
    case 'accepted':
      return tr(product ? 'buyerOrder.event.accepted_shop' : 'buyerOrder.event.accepted_freelancer')
    case 'dispatched':
      return ctx.carrier
        ? tr('buyerOrder.event.dispatched_with', { carrier: ctx.carrier })
        : tr('buyerOrder.event.dispatched')
    case 'arrived':
      return tr(product ? 'buyerOrder.event.arrived_product' : 'buyerOrder.event.arrived_service')
    case 'received':
      return tr('buyerOrder.event.received')
    case 'cancelled': {
      const byBuyer = event.actorRole === 'buyer'
      const who = byBuyer ? 'buyer' : product ? 'shop' : 'freelancer'
      const reason = event.note?.trim()
      return reason
        ? tr(`buyerOrder.event.cancelled_${who}_reason`, { reason })
        : tr(`buyerOrder.event.cancelled_${who}`)
    }
    default:
      return null
  }
}
