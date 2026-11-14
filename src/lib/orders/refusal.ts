// The COD no-show rule (founder decisions 2026-11-14, docs/follow-ups/cod-no-show-plan.md; migration
// db/migrations/PENDING_cod_no_show.sql). A refusal is a SELLER cancellation of a PRODUCT order coming from
// dispatched / in_delivery / arrived, carrying a refusal_reason. The database is the authority
// (enforce_refusal_marker, the orders_refusal_* CHECKs); these mirror it so the action answers before the round trip.

import type { OrderStatus, OrderType } from '@/lib/types/order-status'

/** The values of orders.refusal_reason (CHECK orders_refusal_reason_check). All three count. */
export const REFUSAL_REASONS = ['refused_parcel', 'not_collected', 'unreachable'] as const
export type RefusalReason = (typeof REFUSAL_REASONS)[number]

/** i18n key of a refusal reason's label. The resolved label is also what the action stores in cancellation_reason. */
export const refusalReasonKey = (reason: RefusalReason) => `common.refusal_reason_${reason}` as const

/** Statuses a delivery can be refused from: the order has shipped and is not finished. */
export const REFUSABLE_STATUSES: readonly OrderStatus[] = ['dispatched', 'in_delivery', 'arrived']

export function isRefusable(status: OrderStatus, orderType: OrderType): boolean {
  return orderType === 'product' && REFUSABLE_STATUSES.includes(status)
}

type DbError = { code?: string | null; hint?: string | null; message?: string | null }

export type RefusalErrorKey =
  | 'seller.orders.error_refusal_status'
  | 'seller.orders.error_not_cancellable'
  | 'common.error_generic'

/**
 * A refusal refused by the database → the i18n key the action answers with, never the raw text (French-only).
 *   • hints refusal_status / refusal_not_product (enforce_refusal_marker): the order has not shipped, or is a service;
 *   • check_order_status_transition's terminal lock (plain P0001, matched on its wording like cancel-error.ts): a
 *     concurrent change finished the order first;
 *   • anything else (42501 not the seller, RLS, a suspended account, an outage) → generic.
 */
export function refusalErrorKey(error: DbError): RefusalErrorKey {
  if (error.code === '23514' && (error.hint === 'refusal_status' || error.hint === 'refusal_not_product')) {
    return 'seller.orders.error_refusal_status'
  }
  if (error.code === 'P0001' && (error.message ?? '').startsWith('Cette commande est terminée')) {
    return 'seller.orders.error_not_cancellable'
  }
  return 'common.error_generic'
}
