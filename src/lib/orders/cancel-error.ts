// An order cancel refused by the database → the i18n key cancelOrderAction answers with. Never the raw message: it is
// French-only, and a trigger's text can name another party's role (« cancelled_by doit correspondre à votre rôle »).
//
//   • hint 'buyer_cancel_service' — migration 102 (a buyer cannot cancel a service order);
//   • check_order_status_transition raises plain P0001 exceptions with no hint, so its two refusals a cancel can
//     still hit after the action's own pre-checks (a concurrent status change) are matched on the trigger's wording,
//     anchored at the start;
//   • anything else (RLS, a suspended account, an outage, a role mismatch) → the generic error.

type DbError = { code?: string | null; hint?: string | null; message?: string | null }

export type CancelErrorKey =
  | 'buyerOrder.error_service_cancel'
  | 'seller.orders.error_reason_required'
  | 'seller.orders.error_not_cancellable'
  | 'common.error_generic'

export function cancelErrorKey(error: DbError): CancelErrorKey {
  if (error.hint === 'buyer_cancel_service') return 'buyerOrder.error_service_cancel'
  const message = error.message ?? ''
  if (error.code === 'P0001' && message.startsWith("Une raison d'annulation est requise")) return 'seller.orders.error_reason_required'
  if (error.code === 'P0001' && message.startsWith('Cette commande est terminée')) return 'seller.orders.error_not_cancellable'
  return 'common.error_generic'
}
