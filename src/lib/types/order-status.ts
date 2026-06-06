// Order lifecycle status model — shared across the buyer view (mes-demandes)
// and both seller dashboards (ma-boutique/commandes, mon-profil-freelance/demandes).
// The DB trigger in PR-B is the REAL enforcement of who-may-do-what; these helpers
// are the app-code guard that decides which buttons each dashboard renders.

export type OrderStatus =
  | 'pending'
  | 'accepted'
  | 'prepared'
  | 'dispatched'
  | 'in_delivery'
  | 'arrived'
  | 'received'
  | 'cancelled'

export type OrderType = 'product' | 'service'
export type OrderRole = 'buyer' | 'seller'

// Ordered chains. 'cancelled' is a parallel terminal state, not part of a chain.
// Product orders run the full physical-delivery chain; service requests skip the
// middle delivery states (Pillar 4 §4.14.1 / CLAUDE.md): accepted → arrived → received.
export const PRODUCT_LIFECYCLE: OrderStatus[] = [
  'pending', 'accepted', 'prepared', 'dispatched', 'in_delivery', 'arrived', 'received',
]

export const SERVICE_LIFECYCLE: OrderStatus[] = [
  'pending', 'accepted', 'arrived', 'received',
]

export function lifecycleFor(orderType: OrderType): OrderStatus[] {
  return orderType === 'product' ? PRODUCT_LIFECYCLE : SERVICE_LIFECYCLE
}

// The next state in the chain, or null at the terminal state / off-chain (e.g. cancelled).
export function nextStatus(current: OrderStatus, orderType: OrderType): OrderStatus | null {
  const chain = lifecycleFor(orderType)
  const i = chain.indexOf(current)
  if (i === -1 || i >= chain.length - 1) return null
  return chain[i + 1]
}

// Cancellable states. The free/logged cancellation pivot differs by type:
// products pivot at dispatch (cancellable while pending/accepted/prepared),
// services pivot at acceptance (cancellable while pending/accepted) — Layer 3 §63.
export function canCancel(status: OrderStatus, orderType: OrderType): boolean {
  const cancellable: OrderStatus[] = orderType === 'product'
    ? ['pending', 'accepted', 'prepared']
    : ['pending', 'accepted']
  return cancellable.includes(status)
}

// App-code transition guard. PR-B's DB trigger is the authoritative enforcement.
export function canTransition(
  from: OrderStatus,
  to: OrderStatus,
  orderType: OrderType,
  role: OrderRole,
): boolean {
  if (to === 'cancelled') return canCancel(from, orderType)
  if (to !== nextStatus(from, orderType)) return false
  // The final hop into 'received' is the buyer's confirmation of receipt;
  // every earlier hop is the seller advancing the order.
  return to === 'received' ? role === 'buyer' : role === 'seller'
}

// i18n key helpers — 'arrived' reads differently for a non-physical service.
export function statusLabelKey(status: OrderStatus, orderType: OrderType): string {
  if (status === 'arrived' && orderType === 'service') return 'common.status_arrived_service'
  return `common.status_${status}`
}

export function advanceLabelKey(target: OrderStatus, orderType: OrderType): string {
  if (target === 'arrived' && orderType === 'service') return 'common.mark_arrived_service'
  return `common.mark_${target}`
}
