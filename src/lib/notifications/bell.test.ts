import { describe, it, expect } from 'vitest'
import { fr } from '@/lib/i18n/fr'
import { ar } from '@/lib/i18n/ar'
import { en } from '@/lib/i18n/en'
import { t } from '@/lib/i18n'
import {
  applyBellAction,
  BELL_STATUS_SENTENCE,
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
  const cases: [string, BellEvent, string, string][] = [
    // [event, input, key, the French line]
    // New order (product or service): the buyer acts, the seller reads.
    ['new product order → shop owner', ev({ kind: 'order_created', toStatus: 'pending', role: 'seller' }), `${E}new_order_product`, 'Nouvelle commande'],
    ['new service order → freelancer', ev({ kind: 'order_created', toStatus: 'pending', role: 'seller', orderType: 'service' }), 'activite.request_title', 'Nouvelle demande de service'],
    // The seller's steps: the buyer reads.
    ['pending → accepted (product)', ev({ toStatus: 'accepted' }), 'buyerOrder.event.accepted_shop', 'Acceptée par la boutique'],
    ['pending → accepted (service)', ev({ toStatus: 'accepted', orderType: 'service' }), 'buyerOrder.event.accepted_freelancer', 'Acceptée par le freelance'],
    ['accepted → prepared', ev({ toStatus: 'prepared' }), `${E}prepared`, 'Préparée par la boutique'],
    ['prepared → dispatched', ev({ toStatus: 'dispatched' }), 'buyerOrder.event.dispatched', 'Expédiée'],
    ['dispatched → in_delivery', ev({ toStatus: 'in_delivery' }), `${E}in_delivery`, 'En cours de livraison'],
    ['in_delivery → arrived (product)', ev({ toStatus: 'arrived' }), 'buyerOrder.event.arrived_product', 'Colis arrivé'],
    ['accepted → arrived (service)', ev({ toStatus: 'arrived', orderType: 'service' }), 'buyerOrder.event.arrived_service', 'Travail livré par le freelance'],
    // The buyer confirms receipt: the seller reads.
    ['arrived → received (product)', ev({ toStatus: 'received', role: 'seller' }), 'buyerOrder.event.received', 'Réception confirmée'],
    ['arrived → received (service)', ev({ toStatus: 'received', role: 'seller', orderType: 'service' }), 'buyerOrder.event.received', 'Réception confirmée'],
    // Cancels.
    ['→ cancelled by the shop', ev({ toStatus: 'cancelled' }), 'buyerOrder.event.cancelled_shop', 'Annulée par la boutique'],
    ['→ cancelled by the freelancer', ev({ toStatus: 'cancelled', orderType: 'service' }), 'buyerOrder.event.cancelled_freelancer', 'Annulée par le freelance'],
    ['→ « Refusée à la livraison » (a seller cancel with refusal_reason)', ev({ toStatus: 'cancelled', refused: true }), `${E}refused_on_delivery`, 'Refusée à la livraison'],
    ['→ cancelled by the buyer (product)', ev({ toStatus: 'cancelled', role: 'seller' }), 'common.cancelled_by_buyer', "Annulée par l'acheteur"],
  ]
  it.each(cases)('%s', (_name, event, key, french) => {
    expect(bellSentenceKey(event)).toBe(key)
    expect(t(key, 'fr')).toBe(french)
  })

  it('keys on the status reached, so a cancel reads the same from any earlier step', () => {
    for (const from of ['pending', 'accepted', 'prepared', 'dispatched']) {
      const item = toBellItem(row({ from_status: from, to_status: 'cancelled' }), BUYER)
      expect(item?.sentenceKey, from).toBe('buyerOrder.event.cancelled_shop')
    }
  })

  it('an event the actor rule cannot produce falls back to a generic line, never an empty one', () => {
    // A seller told of a seller step, a buyer told of their own order (the trigger writes neither) → « Statut : … ».
    expect(bellSentenceKey(ev({ toStatus: 'accepted', role: 'seller' }))).toBe(BELL_STATUS_SENTENCE)
    expect(bellSentenceKey(ev({ kind: 'order_created', toStatus: 'pending', role: 'buyer' }))).toBe(BELL_STATUS_SENTENCE)
    // A status or a kind this version does not know.
    expect(bellSentenceKey(ev({ toStatus: 'expired' }))).toBe(`${E}updated`)
    expect(bellSentenceKey(ev({ kind: 'proposal_received' }))).toBe(`${E}updated`)
  })

  it('every key the bell can return exists in French, Arabic and English', () => {
    const keys = new Set([...cases.map(([, , k]) => k), BELL_STATUS_SENTENCE, `${E}updated`])
    for (const key of keys) {
      expect(fr[key], `fr ${key}`).toBeTruthy()
      expect(ar[key], `ar ${key}`).toBeTruthy()
      expect(en[key], `en ${key}`).toBeTruthy()
    }
  })

  it('the generic line has its {status} slot in all three languages, and every status label it can take exists', () => {
    for (const dict of [fr, ar, en]) expect(dict[BELL_STATUS_SENTENCE]).toContain('{status}')
    for (const status of ['pending', 'accepted', 'prepared', 'dispatched', 'in_delivery', 'arrived', 'received', 'cancelled']) {
      for (const orderType of ['product', 'service']) {
        const key = toBellItem(row({ to_status: status }, { order_type: orderType }), SELLER)?.statusKey
        expect(key, `${status} ${orderType}`).toBeTruthy()
        for (const dict of [fr, ar, en]) expect(dict[key!], `${key}`).toBeTruthy()
      }
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
    expect(toBellItem(row(), BUYER)).toMatchObject({
      href: `/mes-commandes/${ORDER}`,
      sentenceKey: 'buyerOrder.event.accepted_shop',
      unread: true,
    })
  })

  it('the seller of a service order goes to « Mes engagements »; of a product order to « Commandes reçues »', () => {
    const created = { kind: 'order_created', from_status: null, to_status: 'pending' }
    expect(toBellItem(row(created, { order_type: 'service' }), SELLER)?.href).toBe(`/mes-engagements/${ORDER}`)
    expect(toBellItem(row(created), SELLER)?.href).toBe(`/commandes-recues/${ORDER}`)
  })

  it('a delivery refusal reads as one, from the order’s refusal_reason', () => {
    const item = toBellItem(row({ from_status: 'in_delivery', to_status: 'cancelled' }, { refusal_reason: 'refused_parcel' }), BUYER)
    expect(item?.sentenceKey).toBe(`${E}refused_on_delivery`)
  })

  it('carries the item title, and the order reference for when the title snapshot is missing', () => {
    expect(toBellItem(row(), BUYER)).toMatchObject({ title: 'Chéchia rouge', ref: '#A4F729' })
    expect(toBellItem(row({}, { item_title: null }), BUYER)?.title).toBeNull()
    expect(toBellItem(row({}, { item_title: '   ' }), BUYER)?.title).toBeNull()
  })

  it('the generic line gets the status label for the order type', () => {
    const item = toBellItem(row({ to_status: 'arrived' }, { order_type: 'service' }), SELLER)
    expect(item?.sentenceKey).toBe(BELL_STATUS_SENTENCE)
    expect(item?.statusKey).toBe('common.status_arrived_service')
    expect(t(item!.sentenceKey, 'fr', { status: t(item!.statusKey!, 'fr') })).toBe('Statut : Travail livré')
  })

  it('a read row is not unread; an unreadable order, a non-party reader or an unknown order type gives no item', () => {
    expect(toBellItem(row({ read_at: '2026-11-18T11:00:00Z' }), BUYER)?.unread).toBe(false)
    expect(toBellItem(row({ order: null }), BUYER)).toBeNull()
    expect(toBellItem(row(), 'someone-else')).toBeNull()
    expect(toBellItem(row({}, { order_type: 'gift' }), BUYER)).toBeNull()
  })
})

describe('applyBellAction — the optimistic read state', () => {
  const item = (id: string, unread: boolean): BellItem => ({
    id,
    sentenceKey: 'buyerOrder.event.accepted_shop',
    statusKey: null,
    title: 'x',
    ref: '#X',
    href: '/x',
    createdAt: '2026-11-18T10:00:00Z',
    unread,
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
