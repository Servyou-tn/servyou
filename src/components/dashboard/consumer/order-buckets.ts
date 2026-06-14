// Pure, render-free helpers for the consumer dashboard's active-orders snapshot.
// Kept out of the React tree so the bucketing logic is unit-testable in isolation
// (see ActiveOrdersSnapshot.test.ts). No 'use client', no React imports.

export type OrderStatus =
  | 'pending'
  | 'accepted'
  | 'prepared'
  | 'dispatched'
  | 'in_delivery'
  | 'arrived'
  | 'received'
  | 'cancelled'

// "En cours" = in-flight, pre-arrival. "À confirmer" = arrived, awaiting the buyer's
// receipt confirmation. received/cancelled are terminal and never count as active
// (the /mon-espace query already excludes them, but bucketOrders is defensive).
export const EN_COURS_STATUSES: readonly OrderStatus[] = [
  'pending',
  'accepted',
  'prepared',
  'dispatched',
  'in_delivery',
]

/** Count active orders into the two snapshot buckets. Unknown/terminal statuses
 *  are ignored, so the counts only ever reflect genuinely active orders. */
export function bucketOrders(
  orders: ReadonlyArray<{ status: string }>,
): { enCours: number; aConfirmer: number } {
  let enCours = 0
  let aConfirmer = 0
  for (const o of orders) {
    if (o.status === 'arrived') aConfirmer++
    else if ((EN_COURS_STATUSES as readonly string[]).includes(o.status)) enCours++
  }
  return { enCours, aConfirmer }
}

// Status → Tailwind pill classes. amber on `arrived` is the "needs action" colour.
// received/cancelled are included for completeness even though the active query
// excludes them. Colours are raw Tailwind utilities (no new design tokens).
export const STATUS_BADGE_CLASS: Record<OrderStatus, string> = {
  pending: 'bg-slate-100 text-slate-700',
  accepted: 'bg-blue-100 text-blue-800',
  prepared: 'bg-blue-100 text-blue-800',
  dispatched: 'bg-blue-100 text-blue-800',
  in_delivery: 'bg-blue-100 text-blue-800',
  arrived: 'bg-amber-100 text-amber-800',
  received: 'bg-emerald-100 text-emerald-800',
  cancelled: 'bg-red-100 text-red-700',
}

/** The existing common.status_* label key for a status, accounting for the
 *  service-specific "arrived" wording ("Travail livré" vs "Arrivée"). */
export function statusLabelKey(status: string, orderType: string): string {
  if (status === 'arrived' && orderType === 'service') return 'common.status_arrived_service'
  return `common.status_${status}`
}
