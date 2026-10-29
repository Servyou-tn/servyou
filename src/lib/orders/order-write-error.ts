// Seller-side order writes refused by the database → the i18n key the action answers with (pre-launch audit pass 2).
// advanceOrderAction and setOrderTrackingAction used to return `updateError.message` verbatim: French-only text on
// the AR site, and trigger wording the client has no business seeing. Same approach as cancel-error.ts (#238): the
// triggers raise plain exceptions with no hint, so their refusals are matched on their own wording, anchored at the
// start (or, for the CHECK, on the constraint name); anything else → the generic error.

type DbError = { code?: string | null; message?: string | null }

export type AdvanceErrorKey = 'seller.dashboard.error_no_transition' | 'common.error_generic'
export type TrackingErrorKey =
  | 'seller.orderDetail.tracking_terminal'
  | 'seller.orderDetail.tracking_product_only'
  | 'common.error_generic'

// check_order_status_transition: the order moved under the seller (another tab / the buyer cancelled) — the action's
// own next-status read was stale. All three mean « nothing to do here any more ».
const STALE_TRANSITION = ['Transition invalide', 'Cette commande est terminée', 'Seul le vendeur peut faire avancer']

export function advanceErrorKey(error: DbError): AdvanceErrorKey {
  const message = error.message ?? ''
  if (error.code === 'P0001' && STALE_TRANSITION.some((prefix) => message.startsWith(prefix))) {
    return 'seller.dashboard.error_no_transition'
  }
  return 'common.error_generic'
}

export function trackingErrorKey(error: DbError): TrackingErrorKey {
  const message = error.message ?? ''
  // enforce_order_identity_lock (errcode 42501), once the order is received / cancelled.
  if (error.code === '42501' && message.startsWith('Cette commande est terminée : le suivi')) {
    return 'seller.orderDetail.tracking_terminal'
  }
  // CHECK orders_shipment_requires_product (a service order).
  if (error.code === '23514' && message.includes('orders_shipment_requires_product')) {
    return 'seller.orderDetail.tracking_product_only'
  }
  return 'common.error_generic'
}
