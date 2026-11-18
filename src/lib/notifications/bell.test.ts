import { describe, it, expect } from 'vitest'
import { fr } from '@/lib/i18n/fr'
import { ar } from '@/lib/i18n/ar'
import { en } from '@/lib/i18n/en'
import { t } from '@/lib/i18n'
import {
  applyBellAction,
  bellBadgeText,
  bellHref,
  bellReaderRole,
  bellSentenceKey,
  toBellItem,
  type BellEvent,
  type BellFeed,
  type BellItem,
  type BellRow,
} from './bell'

// Bell v1 — the plan's §1 table (docs/follow-ups/bell-notifications-plan.md), one case per row, plus the links per
// reader role and order type. Pure: no I/O.

const E = 'shell.topbar.notifications.event.'
const BUYER = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const SELLER = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
const ORDER = 'a4f72911-0000-4000-8000-000000000001'

const ev = (over: Partial<BellEvent>): BellEvent => ({
  kind: 'order_status_changed',
  toStatus: 'accepted',
  orderType: 'product',
  role: 'buyer',
  refused: false,
  ...over,
})

describe('bellSentenceKey — every event of plan §1, seen by the party who did not act', () => {
  const cases: [string, BellEvent, string][] = [
    // New order (product or service): the buyer acts, the seller reads.
    ['new product order → seller', ev({ kind: 'order_created', toStatus: 'pending', role: 'seller' }), `${E}new_order_product`],
    ['new service order → seller', ev({ kind: 'order_created', toStatus: 'pending', role: 'seller', orderType: 'service' }), `${E}new_order_service`],
    // The seller's steps: the buyer reads.
    ['pending → accepted (product)', ev({ toStatus: 'accepted' }), `${E}accepted`],
    ['pending → accepted (service)', ev({ toStatus: 'accepted', orderType: 'service' }), `${E}accepted`],
    ['accepted → prepared', ev({ toStatus: 'prepared' }), `${E}prepared`],
    ['prepared → dispatched', ev({ toStatus: 'dispatched' }), `${E}dispatched`],
    ['dispatched → in_delivery', ev({ toStatus: 'in_delivery' }), `${E}in_delivery`],
    ['in_delivery → arrived (product)', ev({ toStatus: 'arrived' }), `${E}arrived_product`],
    ['accepted → arrived (service)', ev({ toStatus: 'arrived', orderType: 'service' }), `${E}arrived_service`],
    // The buyer confirms receipt: the seller reads.
    ['arrived → received (product)', ev({ toStatus: 'received', role: 'seller' }), `${E}received_product`],
    ['arrived → received (service)', ev({ toStatus: 'received', role: 'seller', orderType: 'service' }), `${E}received_service`],
    // Cancels.
    ['→ cancelled by the seller', ev({ toStatus: 'cancelled' }), `${E}cancelled_by_seller`],
    ['→ cancelled by the seller, a service', ev({ toStatus: 'cancelled', orderType: 'service' }), `${E}cancelled_by_seller`],
    ['→ « Refusée à la livraison » (seller cancel with refusal_reason)', ev({ toStatus: 'cancelled', refused: true }), `${E}refused_on_delivery`],
    ['→ cancelled by the buyer (product)', ev({ toStatus: 'cancelled', role: 'seller' }), `${E}cancelled_by_buyer`],
  ]
  it.each(cases)('%s', (_name, event, key) => {
    expect(bellSentenceKey(event)).toBe(key)
  })

  it('keys on the status reached, so a cancel reads the same from any earlier step', () => {
    for (const from of ['pending', 'accepted', 'prepared', 'dispatched']) {
      const item = toBellItem(row({ from_status: from, to_status: 'cancelled' }), BUYER)
      expect(item?.sentenceKey, from).toBe(`${E}cancelled_by_seller`)
    }
  })

  it('an event the actor rule cannot produce falls back to the generic sentence, never an empty line', () => {
    // A seller told of a seller step (the trigger never writes it) → « La commande est passée au statut … ».
    expect(bellSentenceKey(ev({ toStatus: 'accepted', role: 'seller' }))).toBe(`${E}status_changed`)
    expect(bellSentenceKey(ev({ kind: 'order_created', toStatus: 'pending', role: 'buyer' }))).toBe(`${E}status_changed`)
    // A status or a kind this version does not know.
    expect(bellSentenceKey(ev({ toStatus: 'expired' }))).toBe(`${E}updated`)
    expect(bellSentenceKey(ev({ kind: 'proposal_received' }))).toBe(`${E}updated`)
  })

  it('every sentence key exists in French, Arabic and English', () => {
    const keys = new Set([...cases.map(([, , k]) => k), `${E}status_changed`, `${E}updated`])
    for (const key of keys) {
      expect(fr[key], `fr ${key}`).toBeTruthy()
      expect(ar[key], `ar ${key}`).toBeTruthy()
      expect(en[key], `en ${key}`).toBeTruthy()
    }
  })
})

describe('bellHref — the order page for the reader’s side of the order', () => {
  it('the buyer opens « Mes commandes » for both order types', () => {
    expect(bellHref(ORDER, 'product', 'buyer')).toBe(`/mes-commandes/${ORDER}`)
    expect(bellHref(ORDER, 'service', 'buyer')).toBe(`/mes-commandes/${ORDER}`)
  })
  it('the shop owner opens « Commandes reçues » for a product order', () => {
    expect(bellHref(ORDER, 'product', 'seller')).toBe(`/commandes-recues/${ORDER}`)
  })
  it('the freelancer opens « Mes engagements » for a service order', () => {
    expect(bellHref(ORDER, 'service', 'seller')).toBe(`/mes-engagements/${ORDER}`)
  })
})

function row(over: Partial<BellRow> = {}, order: Partial<NonNullable<BellRow['order']>> = {}): BellRow {
  return {
    id: 'n-1',
    kind: 'order_status_changed',
    from_status: 'pending',
    to_status: 'accepted',
    created_at: '2026-11-18T10:00:00Z',
    read_at: null,
    order: {
      id: ORDER,
      buyer_id: BUYER,
      seller_id: SELLER,
      order_type: 'product',
      item_title: 'Chéchia rouge',
      refusal_reason: null,
      ...order,
    },
    ...over,
  }
}

describe('toBellItem — the role comes from the order, never from seller_type', () => {
  it('reads the reader’s side from buyer_id / seller_id', () => {
    expect(bellReaderRole({ buyer_id: BUYER, seller_id: SELLER }, BUYER)).toBe('buyer')
    expect(bellReaderRole({ buyer_id: BUYER, seller_id: SELLER }, SELLER)).toBe('seller')
    expect(bellReaderRole({ buyer_id: BUYER, seller_id: SELLER }, 'someone-else')).toBeNull()
  })

  it('a freelancer who BOUGHT a product opens it in « Mes commandes », not in their engagements', () => {
    const item = toBellItem(row(), BUYER)
    expect(item).toMatchObject({ href: `/mes-commandes/${ORDER}`, sentenceKey: `${E}accepted`, unread: true })
  })

  it('the seller of a service order is sent to « Mes engagements »; of a product order to « Commandes reçues »', () => {
    const created = { kind: 'order_created', from_status: null, to_status: 'pending' }
    expect(toBellItem(row(created, { order_type: 'service' }), SELLER)?.href).toBe(`/mes-engagements/${ORDER}`)
    expect(toBellItem(row(created), SELLER)?.href).toBe(`/commandes-recues/${ORDER}`)
  })

  it('a delivery refusal reads as one, from the order’s refusal_reason', () => {
    const item = toBellItem(row({ from_status: 'in_delivery', to_status: 'cancelled' }, { refusal_reason: 'refused_parcel' }), BUYER)
    expect(item?.sentenceKey).toBe(`${E}refused_on_delivery`)
  })

  it('carries the item title, and the order reference when the title snapshot is missing', () => {
    expect(toBellItem(row(), BUYER)).toMatchObject({ title: 'Chéchia rouge', ref: '#A4F729' })
    expect(toBellItem(row({}, { item_title: null }), BUYER)?.title).toBeNull()
    expect(toBellItem(row({}, { item_title: '   ' }), BUYER)?.title).toBeNull()
  })

  it('the generic sentence gets the status label key for the order type', () => {
    const item = toBellItem(row({ to_status: 'arrived' }, { order_type: 'service' }), SELLER)
    expect(item?.sentenceKey).toBe(`${E}status_changed`)
    expect(item?.statusKey).toBe('common.status_arrived_service')
    expect(t(item!.sentenceKey, 'fr', { status: t(item!.statusKey!, 'fr') })).toBe('La commande est passée au statut « Travail livré ».')
  })

  it('a read row is not unread; an unreadable order or a non-party reader gives no item', () => {
    expect(toBellItem(row({ read_at: '2026-11-18T11:00:00Z' }), BUYER)?.unread).toBe(false)
    expect(toBellItem(row({ order: null }), BUYER)).toBeNull()
    expect(toBellItem(row(), 'someone-else')).toBeNull()
    expect(toBellItem(row({}, { order_type: 'gift' }), BUYER)).toBeNull()
  })
})

describe('applyBellAction — the optimistic read state', () => {
  const item = (id: string, unread: boolean): BellItem => ({
    id, sentenceKey: `${E}accepted`, statusKey: null, title: 'x', ref: '#X', href: '/x', createdAt: '2026-11-18T10:00:00Z', unread,
  })
  const feed: BellFeed = { ok: true, unreadCount: 25, items: [item('a', true), item('b', true), item('c', false)] }

  it('opening one item marks only that item and takes one off the count', () => {
    const next = applyBellAction(feed, { type: 'read', id: 'b' })
    expect(next).toEqual({ ok: true, unreadCount: 24, items: [item('a', true), item('b', false), item('c', false)] })
  })
  it('an already-read item changes nothing', () => {
    expect(applyBellAction(feed, { type: 'read', id: 'c' })).toBe(feed)
  })
  it('« Tout marquer comme lu » clears the count, including unread rows beyond the 20 listed', () => {
    const next = applyBellAction(feed, { type: 'all' })
    expect(next.ok && next.unreadCount).toBe(0)
    expect(next.ok && next.items.every((i) => !i.unread)).toBe(true)
  })
  it('a failed feed stays failed', () => {
    expect(applyBellAction({ ok: false }, { type: 'all' })).toEqual({ ok: false })
  })
})

describe('bellBadgeText', () => {
  it('no badge at 0, the count up to 9, then 9+', () => {
    expect(bellBadgeText(0)).toBeNull()
    expect(bellBadgeText(1)).toBe('1')
    expect(bellBadgeText(9)).toBe('9')
    expect(bellBadgeText(10)).toBe('9+')
  })
})
