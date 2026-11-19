import { shortRef } from '@/lib/orders/order-status'
import { statusLabelKey, type OrderStatus, type OrderType } from '@/lib/types/order-status'
import type { BellIcon, BellItem, BellRow, BellSentence, BellTone } from './bell'

// The bell's event kinds: ONE entry per kind says what the panel shows for it — the icon, the tone, the sentence key
// (with its variables), the link, and what the event is about (title / reference). The panel renders every item the
// same way, so a later kind (plan §7: mission alerts, proposals, stock, moderation) slots in as one new entry here,
// plus its columns in the loader's select and its key in the DB CHECK — the item and the panel stay as they are.
// v1 fills the map with the two order kinds only (founder 2026-11-18).
//
// Each field is a function of the event, not a constant: an order's sentence and link depend on the status reached,
// the reader's side and the order type. `read` picks a kind's own context out of the row, so kinds with different
// subjects (an order, a job post, a product) share one map.
//
// The icon and the tone of the order kinds follow rules the app already has, until the « NOV 18 — Notifications »
// frame says otherwise (docs/follow-ups/bell-ui.md):
//   • icon = the sidebar icon of the page the item opens (sidebar-items.ts; the /aide AIDE ICON RULE);
//   • tone = the tone of the status pill of the status reached. ORDER_TONE mirrors statusPillFor + status-pill.tsx's
//     STATUS_TONE by hand (a server lib does not import a component); bell-kinds.test.tsx enforces the match.

/** The kinds the DB allows: `notifications_kind_check` (migration 20261116201553). The generated types say `string`. */
export type BellKindName = 'order_created' | 'order_status_changed'

/** What one kind declares. `read` returns the event's context, or null when this reader cannot be shown the row. */
export type BellKindSpec<C> = {
  read: (row: BellRow, readerId: string) => C | null
  icon: (event: C) => BellIcon
  tone: (event: C) => BellTone
  sentence: (event: C) => BellSentence
  href: (event: C) => string
  subject: (event: C) => { title: string | null; ref: string | null }
}

/** An item's face: everything but the row's own id, kind, time and read state. */
export type BellFace = Pick<BellItem, 'icon' | 'tone' | 'sentence' | 'href' | 'title' | 'ref'>

/** One map entry: a spec with its context type closed over. */
export type BellKind = { face: (row: BellRow, readerId: string) => BellFace | null }

export function defineBellKind<C>(spec: BellKindSpec<C>): BellKind {
  return {
    face(row, readerId) {
      const event = spec.read(row, readerId)
      if (event === null) return null
      // Field by field, never a spread: an entry returning extra keys cannot leak them into the item.
      const { title, ref } = spec.subject(event)
      return {
        icon: spec.icon(event),
        tone: spec.tone(event),
        sentence: spec.sentence(event),
        href: spec.href(event),
        title,
        ref,
      }
    },
  }
}

// ── v1: the order kinds ────────────────────────────────────────────────────────────────────────────────────────────
// The reader's role comes from the ORDER (buyer_id / seller_id), never from seller_type: a freelancer who bought a
// product is that order's buyer and opens it in « Mes commandes ».

export type BellReaderRole = 'buyer' | 'seller'

/** An order event, from its reader's side. */
export type OrderBellEvent = {
  orderId: string
  orderType: OrderType
  role: BellReaderRole
  toStatus: string
  /** The order carries a delivery refusal (refusal_reason): the seller recorded « Refusée à la livraison ». */
  refused: boolean
  title: string | null
}

const EVENT = 'shell.topbar.notifications.event.'

/** The generic line for a known status the actor rule does not produce: « Statut : {status} » (the G9 timeline's). */
export const BELL_STATUS_SENTENCE = 'seller.orderDetail.event_status'

// The status reached → the tone of its status pill. A hand-kept mirror of statusPillFor's pill → status-pill.tsx
// STATUS_TONE: « En attente » warning, the steps of the chain info, « Reçue » success, « Annulée » and « Refusée »
// danger. bell-kinds.test.tsx renders the real StatusPill for every status and fails on a drift.
const ORDER_TONE: Record<OrderStatus, BellTone> = {
  pending: 'warning',
  accepted: 'info',
  prepared: 'info',
  dispatched: 'info',
  in_delivery: 'info',
  arrived: 'info',
  received: 'success',
  cancelled: 'danger',
}

function isOrderStatus(value: string): value is OrderStatus {
  return Object.hasOwn(ORDER_TONE, value)
}

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

/** The sidebar icon of the page bellHref opens: Package, Inbox, Handshake (sidebar-items.ts). */
function orderIcon(e: OrderBellEvent): BellIcon {
  if (e.role === 'buyer') return 'package'
  return e.orderType === 'service' ? 'handshake' : 'inbox'
}

/** The row's order from the reader's side; null when unreadable, not theirs, or of an unknown type (all unreachable). */
function readOrderEvent(row: BellRow, readerId: string): OrderBellEvent | null {
  const order = row.order
  if (!order) return null
  const orderType = toOrderType(order.order_type)
  const role = bellReaderRole(order, readerId)
  if (!orderType || !role) return null
  return {
    orderId: order.id,
    orderType,
    role,
    toStatus: row.to_status,
    refused: order.refusal_reason != null,
    title: order.item_title?.trim() || null,
  }
}

/**
 * The sentence keys reuse the order timelines' labels where they fit (founder 2026-11-18): the buyer's
 * `buyerOrder.event.*` (E4), the freelancer dashboard's « Nouvelle demande de service », « Annulée par l'acheteur »;
 * `shell.topbar.notifications.event.*` holds only the events no label covered. The reader is always the party who did
 * NOT act (founder rule 2026-11-16). Keyed on the status reached, not on the from→to pair, so a skipped step still reads
 * right. An event the rule cannot produce falls back to a generic line, never an empty one.
 */
export function orderCreatedSentenceKey(e: OrderBellEvent): string {
  if (e.role === 'buyer') return BELL_STATUS_SENTENCE
  return e.orderType === 'product' ? `${EVENT}new_order_product` : 'activite.request_title'
}

export function orderStatusSentenceKey(e: OrderBellEvent): string {
  const product = e.orderType === 'product'
  if (e.role === 'seller') {
    // The buyer acted: confirmed receipt, or cancelled (product orders only, enforced in the DB).
    if (e.toStatus === 'received') return 'buyerOrder.event.received'
    if (e.toStatus === 'cancelled') return 'common.cancelled_by_buyer'
  } else {
    // The seller acted: a step of the chain, a cancel, or a delivery refusal (a seller cancel with refusal_reason).
    switch (e.toStatus) {
      case 'accepted':
        return product ? 'buyerOrder.event.accepted_shop' : 'buyerOrder.event.accepted_freelancer'
      case 'prepared':
        return `${EVENT}prepared`
      case 'dispatched':
        return 'buyerOrder.event.dispatched'
      case 'in_delivery':
        return `${EVENT}in_delivery`
      case 'arrived':
        return product ? 'buyerOrder.event.arrived_product' : 'buyerOrder.event.arrived_service'
      case 'cancelled':
        if (e.refused) return `${EVENT}refused_on_delivery`
        return product ? 'buyerOrder.event.cancelled_shop' : 'buyerOrder.event.cancelled_freelancer'
    }
  }
  return isOrderStatus(e.toStatus) ? BELL_STATUS_SENTENCE : `${EVENT}updated`
}

/** A sentence key with the {status} of the generic line: the status label for the order type, when the status is known. */
function orderSentence(key: string, e: OrderBellEvent): BellSentence {
  if (!isOrderStatus(e.toStatus)) return { key }
  return { key, vars: { status: { key: statusLabelKey(e.toStatus, e.orderType) } } }
}

const ORDER_FACE = {
  read: readOrderEvent,
  icon: orderIcon,
  tone: (e: OrderBellEvent): BellTone => (isOrderStatus(e.toStatus) ? ORDER_TONE[e.toStatus] : 'neutral'),
  href: (e: OrderBellEvent) => bellHref(e.orderId, e.orderType, e.role),
  subject: (e: OrderBellEvent) => ({ title: e.title, ref: shortRef(e.orderId) }),
}

// ── The map ────────────────────────────────────────────────────────────────────────────────────────────────────────

export const BELL_KINDS: Record<BellKindName, BellKind> = {
  order_created: defineBellKind({ ...ORDER_FACE, sentence: (e) => orderSentence(orderCreatedSentenceKey(e), e) }),
  order_status_changed: defineBellKind({ ...ORDER_FACE, sentence: (e) => orderSentence(orderStatusSentenceKey(e), e) }),
}

/** The entry for a row's kind, or null for a kind this version does not know (own keys only: « constructor » is none). */
export function bellKind(kind: string): BellKind | null {
  return Object.hasOwn(BELL_KINDS, kind) ? BELL_KINDS[kind as BellKindName] : null
}

/**
 * One row → one panel item, through its kind's entry. Null when this version does not know the kind, or the row's
 * subject is unreadable for this reader: the loader drops it and reports it (the badge still counts it).
 */
export function toBellItem(row: BellRow, readerId: string): BellItem | null {
  const face = bellKind(row.kind)?.face(row, readerId)
  if (!face) return null
  return { ...face, id: row.id, kind: row.kind, createdAt: row.created_at, unread: row.read_at === null }
}
