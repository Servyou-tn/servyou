import { shortRef } from '@/lib/orders/order-status'
import { statusLabelKey, type OrderStatus, type OrderType } from '@/lib/types/order-status'

// The bell, v1 (docs/follow-ups/bell-notifications-plan.md §1 and §3; migration 20261116201553_bell_notifications).
// A notifications row stores keys, never text: `kind`, `from_status`, `to_status`. This module turns a row and its order
// into what the panel shows — a sentence KEY (translated at render, in the reader's language), the order's item title,
// and the order page for the reader's side of the order. Pure: no I/O, so every event of §1 is unit-tested.
//
// The reader's role comes from the ORDER (buyer_id / seller_id), never from seller_type: a freelancer who bought a
// product is that order's buyer and opens it in « Mes commandes ».

export type BellReaderRole = 'buyer' | 'seller'

/** One notifications row with the columns of its order the bell needs, as the loader selects it. */
export type BellRow = {
  id: string
  kind: string
  from_status: string | null
  to_status: string
  created_at: string
  read_at: string | null
  order: {
    id: string
    buyer_id: string
    seller_id: string
    order_type: string
    item_title: string | null
    refusal_reason: string | null
  } | null
}

/** What the client panel gets. Keys and data only: the text is resolved at render (a language switch re-translates). */
export type BellItem = {
  id: string
  sentenceKey: string
  /** The {status} of the generic sentence: a status label KEY, or null. */
  statusKey: string | null
  /** The order's item title snapshot, or null (old orders): the panel then shows `ref`. */
  title: string | null
  /** « #A4F729 », the order reference. */
  ref: string
  href: string
  createdAt: string
  unread: boolean
}

/** The bell's data for one page load. `ok: false` = the read failed: the panel says so, never « no notifications ». */
export type BellFeed = { ok: true; items: BellItem[]; unreadCount: number } | { ok: false }

export const BELL_LIMIT = 20

const EVENT = 'shell.topbar.notifications.event.'

const ORDER_STATUSES: readonly string[] = [
  'pending', 'accepted', 'prepared', 'dispatched', 'in_delivery', 'arrived', 'received', 'cancelled',
]

function toOrderType(value: string): OrderType | null {
  return value === 'product' || value === 'service' ? value : null
}

/** The reader's side of the order, or null when they are neither party (unreachable: the trigger writes parties only). */
export function bellReaderRole(order: { buyer_id: string; seller_id: string }, readerId: string): BellReaderRole | null {
  if (order.buyer_id === readerId) return 'buyer'
  if (order.seller_id === readerId) return 'seller'
  return null
}

/**
 * The order page for the reader's side: the buyer's « Mes commandes » for both order types, the shop owner's
 * « Commandes reçues » for a product, the freelancer's « Mes engagements » for a service.
 */
export function bellHref(orderId: string, orderType: OrderType, role: BellReaderRole): string {
  if (role === 'buyer') return `/mes-commandes/${orderId}`
  return orderType === 'service' ? `/mes-engagements/${orderId}` : `/commandes-recues/${orderId}`
}

export type BellEvent = {
  kind: string
  toStatus: string
  orderType: OrderType
  role: BellReaderRole
  /** The order carries a delivery refusal (refusal_reason): the seller recorded « Refusée à la livraison ». */
  refused: boolean
}

/**
 * The sentence key for one event, seen by the reader (founder rule 2026-11-16: the reader is always the party who did
 * NOT act). Keyed on the status reached, not on the from→to pair, so a skipped step still reads right. An event the
 * rule cannot produce (a seller told of their own step, a future status) falls back to a generic sentence instead of
 * an empty line.
 */
export function bellSentenceKey(e: BellEvent): string {
  if (e.kind === 'order_created') {
    return e.role === 'seller' ? `${EVENT}new_order_${e.orderType}` : `${EVENT}status_changed`
  }
  if (e.kind !== 'order_status_changed') return `${EVENT}updated`

  if (e.role === 'seller') {
    // The buyer acted: confirmed receipt, or cancelled (product orders only, enforced in the DB).
    if (e.toStatus === 'received') return `${EVENT}received_${e.orderType}`
    if (e.toStatus === 'cancelled') return `${EVENT}cancelled_by_buyer`
  } else {
    // The seller acted: each step of the chain, a cancel, or a delivery refusal (a seller cancel with refusal_reason).
    switch (e.toStatus) {
      case 'accepted':
      case 'prepared':
      case 'dispatched':
      case 'in_delivery':
        return `${EVENT}${e.toStatus}`
      case 'arrived':
        return `${EVENT}arrived_${e.orderType}`
      case 'cancelled':
        return e.refused ? `${EVENT}refused_on_delivery` : `${EVENT}cancelled_by_seller`
    }
  }
  return ORDER_STATUSES.includes(e.toStatus) ? `${EVENT}status_changed` : `${EVENT}updated`
}

/** One row → one panel item, or null when its order is unreadable or the reader is not a party (both unreachable). */
export function toBellItem(row: BellRow, readerId: string): BellItem | null {
  const order = row.order
  if (!order) return null
  const orderType = toOrderType(order.order_type)
  const role = bellReaderRole(order, readerId)
  if (!orderType || !role) return null

  const sentenceKey = bellSentenceKey({
    kind: row.kind,
    toStatus: row.to_status,
    orderType,
    role,
    refused: order.refusal_reason != null,
  })
  const title = order.item_title?.trim() || null
  return {
    id: row.id,
    sentenceKey,
    statusKey: ORDER_STATUSES.includes(row.to_status) ? statusLabelKey(row.to_status as OrderStatus, orderType) : null,
    title,
    ref: shortRef(order.id),
    href: bellHref(order.id, orderType, role),
    createdAt: row.created_at,
    unread: row.read_at === null,
  }
}

export type BellOptimisticAction = { type: 'read'; id: string } | { type: 'all' }

/**
 * The panel's optimistic state while a mark-read call is in flight (useOptimistic). The server count stays the truth:
 * the next page load (or the refresh after « Tout marquer ») replaces this.
 */
export function applyBellAction(feed: BellFeed, action: BellOptimisticAction): BellFeed {
  if (!feed.ok) return feed
  if (action.type === 'all') {
    return { ok: true, unreadCount: 0, items: feed.items.map((i) => (i.unread ? { ...i, unread: false } : i)) }
  }
  const target = feed.items.find((i) => i.id === action.id)
  if (!target?.unread) return feed
  return {
    ok: true,
    unreadCount: Math.max(0, feed.unreadCount - 1),
    items: feed.items.map((i) => (i.id === action.id ? { ...i, unread: false } : i)),
  }
}

/** The badge text: the count up to 9, then « 9+ » (the 16px circle holds two characters). */
export function bellBadgeText(count: number): string | null {
  if (count <= 0) return null
  return count > 9 ? '9+' : String(count)
}
