import { describe, it, expect } from 'vitest'
import { fr } from '@/lib/i18n/fr'
import { ar } from '@/lib/i18n/ar'
import { en } from '@/lib/i18n/en'
import { t, type Lang } from '@/lib/i18n'
import {
  BELL_KINDS,
  BELL_STATUS_SENTENCE,
  bellHref,
  bellKind,
  bellReaderRole,
  defineBellKind,
  toBellItem,
  type BellKindName,
} from './bell-kinds'
import { bellSentenceText, type BellIcon, type BellRow, type BellTone } from './bell'

// The bell's kind map, v1: the plan's §1 table (docs/follow-ups/bell-notifications-plan.md), one case per row, run
// through the map end to end (row → item), plus the item envelope, the icon and tone rules and a kind this version does
// not know.

const E = 'shell.topbar.notifications.event.'
const BUYER = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const SELLER = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
const ORDER = 'a4f72911-0000-4000-8000-000000000001'

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

const translate = (lang: Lang) => (key: string, vars?: Record<string, string | number>) => t(key, lang, vars)

type Case = {
  name: string
  kind: BellKindName
  to: string
  type?: 'product' | 'service'
  reader: 'buyer' | 'seller'
  refused?: boolean
  key: string
  french: string
  icon: BellIcon
  tone: BellTone
}

const CASES: Case[] = [
  // New order (product or service): the buyer acts, the seller reads.
  { name: 'new product order → shop owner', kind: 'order_created', to: 'pending', reader: 'seller', key: `${E}new_order_product`, french: 'Nouvelle commande', icon: 'shopping-bag', tone: 'info' },
  { name: 'new service order → freelancer', kind: 'order_created', to: 'pending', type: 'service', reader: 'seller', key: 'activite.request_title', french: 'Nouvelle demande de service', icon: 'shopping-bag', tone: 'info' },
  // The seller's steps: the buyer reads.
  { name: 'pending → accepted (product)', kind: 'order_status_changed', to: 'accepted', reader: 'buyer', key: 'buyerOrder.event.accepted_shop', french: 'Acceptée par la boutique', icon: 'circle-check', tone: 'success' },
  { name: 'pending → accepted (service)', kind: 'order_status_changed', to: 'accepted', type: 'service', reader: 'buyer', key: 'buyerOrder.event.accepted_freelancer', french: 'Acceptée par le freelance', icon: 'circle-check', tone: 'success' },
  { name: 'accepted → prepared', kind: 'order_status_changed', to: 'prepared', reader: 'buyer', key: `${E}prepared`, french: 'Préparée par la boutique', icon: 'truck', tone: 'progress' },
  { name: 'prepared → dispatched', kind: 'order_status_changed', to: 'dispatched', reader: 'buyer', key: 'buyerOrder.event.dispatched', french: 'Expédiée', icon: 'truck', tone: 'progress' },
  { name: 'dispatched → in_delivery', kind: 'order_status_changed', to: 'in_delivery', reader: 'buyer', key: `${E}in_delivery`, french: 'En cours de livraison', icon: 'truck', tone: 'progress' },
  { name: 'in_delivery → arrived (product)', kind: 'order_status_changed', to: 'arrived', reader: 'buyer', key: 'buyerOrder.event.arrived_product', french: 'Colis arrivé', icon: 'truck', tone: 'progress' },
  { name: 'accepted → arrived (service)', kind: 'order_status_changed', to: 'arrived', type: 'service', reader: 'buyer', key: 'buyerOrder.event.arrived_service', french: 'Travail livré par le freelance', icon: 'truck', tone: 'progress' },
  // The buyer confirms receipt: the seller reads.
  { name: 'arrived → received (product)', kind: 'order_status_changed', to: 'received', reader: 'seller', key: 'buyerOrder.event.received', french: 'Réception confirmée', icon: 'package-check', tone: 'success' },
  { name: 'arrived → received (service)', kind: 'order_status_changed', to: 'received', type: 'service', reader: 'seller', key: 'buyerOrder.event.received', french: 'Réception confirmée', icon: 'package-check', tone: 'success' },
  // Cancels.
  { name: '→ cancelled by the shop', kind: 'order_status_changed', to: 'cancelled', reader: 'buyer', key: 'buyerOrder.event.cancelled_shop', french: 'Annulée par la boutique', icon: 'circle-x', tone: 'danger' },
  { name: '→ cancelled by the freelancer', kind: 'order_status_changed', to: 'cancelled', type: 'service', reader: 'buyer', key: 'buyerOrder.event.cancelled_freelancer', french: 'Annulée par le freelance', icon: 'circle-x', tone: 'danger' },
  { name: '→ « Refusée à la livraison » (a seller cancel with refusal_reason)', kind: 'order_status_changed', to: 'cancelled', reader: 'buyer', refused: true, key: `${E}refused_on_delivery`, french: 'Refusée à la livraison', icon: 'circle-x', tone: 'danger' },
  { name: '→ cancelled by the buyer (product)', kind: 'order_status_changed', to: 'cancelled', reader: 'seller', key: 'common.cancelled_by_buyer', french: "Annulée par l'acheteur", icon: 'circle-x', tone: 'danger' },
  // A refusal_reason on the order does not turn a BUYER's cancel into a refusal line for the seller (unreachable: only
  // the seller records a refusal, but the key must not depend on it).
  { name: '→ cancelled by the buyer, order carrying a refusal_reason', kind: 'order_status_changed', to: 'cancelled', reader: 'seller', refused: true, key: 'common.cancelled_by_buyer', french: "Annulée par l'acheteur", icon: 'circle-x', tone: 'danger' },
]

const itemFor = (c: Case) =>
  toBellItem(
    row(
      { kind: c.kind, from_status: c.kind === 'order_created' ? null : 'pending', to_status: c.to },
      { order_type: c.type ?? 'product', refusal_reason: c.refused ? 'refused_parcel' : null },
    ),
    c.reader === 'buyer' ? BUYER : SELLER,
  )

describe('toBellItem — the item, whatever the kind', () => {
  it('carries the row’s id, kind, time and read state around the kind’s face', () => {
    expect(toBellItem(row(), BUYER)).toEqual({
      id: 'n-1',
      kind: 'order_status_changed',
      icon: 'circle-check',
      tone: 'success',
      sentence: { key: 'buyerOrder.event.accepted_shop', vars: { status: { key: 'common.status_accepted' } } },
      title: 'Chéchia rouge',
      ref: '#A4F729',
      href: `/mes-commandes/${ORDER}`,
      createdAt: '2026-11-18T10:00:00Z',
      unread: true,
    })
    expect(toBellItem(row({ read_at: '2026-11-18T11:00:00Z' }), BUYER)?.unread).toBe(false)
  })

  it('keeps the order reference for when the title snapshot is missing or blank', () => {
    expect(toBellItem(row({}, { item_title: null }), BUYER)).toMatchObject({ title: null, ref: '#A4F729' })
    expect(toBellItem(row({}, { item_title: '   ' }), BUYER)?.title).toBeNull()
  })

  it('an unreadable order, a non-party reader or an unknown order type gives no item', () => {
    expect(toBellItem(row({ order: null }), BUYER)).toBeNull()
    expect(toBellItem(row(), 'someone-else')).toBeNull()
    expect(toBellItem(row({}, { order_type: 'gift' }), BUYER)).toBeNull()
  })
})

describe('BELL_KINDS — every event of plan §1, seen by the party who did not act', () => {
  it.each(CASES.map((c) => [c.name, c] as const))('%s', (_name, c) => {
    const item = itemFor(c)
    expect(item).toMatchObject({ kind: c.kind, icon: c.icon, tone: c.tone, sentence: { key: c.key } })
    expect(bellSentenceText(item!.sentence, translate('fr'))).toBe(c.french)
  })

  it('every v1 line reads in full in French, Arabic and English: no raw key, no {slot} left', () => {
    for (const c of CASES) {
      const item = itemFor(c)!
      for (const lang of ['fr', 'ar', 'en'] as const) {
        const text = bellSentenceText(item.sentence, translate(lang))
        expect(text, `${c.name} ${lang}`).not.toBe(c.key)
        expect(text, `${c.name} ${lang}`).not.toMatch(/[{}]/)
      }
    }
  })

  it('every item survives the Server → Client prop boundary unchanged (plain data only)', () => {
    for (const c of CASES) {
      const item = itemFor(c)
      expect(JSON.parse(JSON.stringify(item)), c.name).toEqual(item)
    }
  })

  it('maps exactly the kinds the DB allows (notifications_kind_check, migration 20261116201553)', () => {
    expect(Object.keys(BELL_KINDS).sort()).toEqual(['order_created', 'order_status_changed'])
  })

  it('keys on the status reached, so a cancel reads the same from any earlier step', () => {
    for (const from of ['pending', 'accepted', 'prepared', 'dispatched']) {
      const item = toBellItem(row({ from_status: from, to_status: 'cancelled' }), BUYER)
      expect(item?.sentence.key, from).toBe('buyerOrder.event.cancelled_shop')
    }
  })

  it('an event the actor rule cannot produce falls back to a generic line, never an empty one', () => {
    // A seller told of a seller step, a buyer told of their own order (the trigger writes neither) → « Statut : … ».
    expect(toBellItem(row({ to_status: 'accepted' }), SELLER)?.sentence.key).toBe(BELL_STATUS_SENTENCE)
    expect(toBellItem(row({ kind: 'order_created', from_status: null, to_status: 'pending' }), BUYER)?.sentence.key).toBe(
      BELL_STATUS_SENTENCE,
    )
    // A status this version does not know: « Commande mise à jour », neutral, no {status}.
    expect(toBellItem(row({ to_status: 'expired' }), BUYER)).toMatchObject({ sentence: { key: `${E}updated` }, tone: 'neutral' })
    expect(toBellItem(row({ to_status: 'expired' }), BUYER)?.sentence.vars).toBeUndefined()
  })

  it('a kind this version does not map gives no item — not an order line on a row that may not be about an order', () => {
    expect(toBellItem(row({ kind: 'proposal_received' }), BUYER)).toBeNull()
    for (const key of ['constructor', '__proto__', 'toString', 'hasOwnProperty']) {
      expect(bellKind(key), key).toBeNull()
      expect(toBellItem(row({ kind: key }), BUYER), key).toBeNull()
    }
  })

  it('every key the map can return exists in French, Arabic and English', () => {
    const keys = new Set([...CASES.map((c) => c.key), BELL_STATUS_SENTENCE, `${E}updated`])
    for (const key of keys) {
      expect(fr[key], `fr ${key}`).toBeTruthy()
      expect(ar[key], `ar ${key}`).toBeTruthy()
      expect(en[key], `en ${key}`).toBeTruthy()
    }
  })

  it('the generic line has its {status} slot in all three languages, and gets the status label for the order type', () => {
    for (const dict of [fr, ar, en]) expect(dict[BELL_STATUS_SENTENCE]).toContain('{status}')
    for (const status of ['pending', 'accepted', 'prepared', 'dispatched', 'in_delivery', 'arrived', 'received', 'cancelled']) {
      for (const orderType of ['product', 'service']) {
        const vars = toBellItem(row({ to_status: status }, { order_type: orderType }), SELLER)?.sentence.vars
        const label = vars?.status
        expect(label && 'key' in label, `${status} ${orderType}`).toBe(true)
        if (label && 'key' in label) for (const dict of [fr, ar, en]) expect(dict[label.key], label.key).toBeTruthy()
      }
    }
    const item = toBellItem(row({ to_status: 'arrived' }, { order_type: 'service' }), SELLER)!
    expect(item.sentence).toEqual({ key: BELL_STATUS_SENTENCE, vars: { status: { key: 'common.status_arrived_service' } } })
    expect(bellSentenceText(item.sentence, translate('fr'))).toBe('Statut : Travail livré')
  })
})

describe('the icon and tone of the order kinds — the « NOV 18 — Notifications » frame (1778:30747)', () => {
  it('a new order or request is a blue shopping bag, whoever reads it and whatever the order type', () => {
    for (const reader of [BUYER, SELLER]) {
      for (const order_type of ['product', 'service']) {
        const item = toBellItem(row({ kind: 'order_created', from_status: null, to_status: 'pending' }, { order_type }), reader)
        expect(item, `${reader} ${order_type}`).toMatchObject({ icon: 'shopping-bag', tone: 'info' })
      }
    }
  })

  it('a status change takes the tile of the status reached, from either side and for both order types', () => {
    const FRAME: Record<string, [BellIcon, BellTone]> = {
      accepted: ['circle-check', 'success'],
      prepared: ['truck', 'progress'],
      dispatched: ['truck', 'progress'],
      in_delivery: ['truck', 'progress'],
      arrived: ['truck', 'progress'],
      received: ['package-check', 'success'],
      cancelled: ['circle-x', 'danger'],
    }
    for (const [status, [icon, tone]] of Object.entries(FRAME)) {
      for (const reader of [BUYER, SELLER]) {
        for (const order_type of ['product', 'service']) {
          const item = toBellItem(row({ to_status: status }, { order_type }), reader)
          expect(item, `${status} ${order_type}`).toMatchObject({ icon, tone })
        }
      }
    }
    // « Refusée à la livraison » is a cancel: the red circle-x too.
    expect(toBellItem(row({ to_status: 'cancelled' }, { refusal_reason: 'refused_parcel' }), BUYER)).toMatchObject({
      icon: 'circle-x',
      tone: 'danger',
    })
  })

  it('a status no rule covers (pending as a change, or unknown) gets the neutral bell tile, never a misleading colour', () => {
    expect(toBellItem(row({ to_status: 'pending' }), BUYER)).toMatchObject({ icon: 'bell', tone: 'neutral' })
    expect(toBellItem(row({ to_status: 'expired' }), BUYER)).toMatchObject({ icon: 'bell', tone: 'neutral' })
  })
})

describe('bellHref and bellReaderRole — the order page for the reader’s side, from the order', () => {
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
  it('reads the reader’s side from buyer_id / seller_id, never from seller_type', () => {
    expect(bellReaderRole({ buyer_id: BUYER, seller_id: SELLER }, BUYER)).toBe('buyer')
    expect(bellReaderRole({ buyer_id: BUYER, seller_id: SELLER }, SELLER)).toBe('seller')
    expect(bellReaderRole({ buyer_id: BUYER, seller_id: SELLER }, 'someone-else')).toBeNull()
  })
  it('a freelancer who BOUGHT a product opens it in « Mes commandes », not in their engagements', () => {
    expect(toBellItem(row(), BUYER)?.href).toBe(`/mes-commandes/${ORDER}`)
  })
  it('the seller of a service order goes to « Mes engagements »; of a product order to « Commandes reçues »', () => {
    const created = { kind: 'order_created', from_status: null, to_status: 'pending' }
    expect(toBellItem(row(created, { order_type: 'service' }), SELLER)?.href).toBe(`/mes-engagements/${ORDER}`)
    expect(toBellItem(row(created), SELLER)?.href).toBe(`/commandes-recues/${ORDER}`)
  })
})

describe('defineBellKind — a later kind with its own subject slots into the same item', () => {
  // A stand-in for a plan §7 kind (say, low stock): its own context, a plain-value variable, no reference.
  const lowStock = defineBellKind<{ left: number }>({
    read: (r) => (r.order ? null : { left: 2 }),
    icon: () => 'bell',
    tone: () => 'warning',
    sentence: (e) => ({ key: 'x.low_stock', vars: { count: { value: e.left } } }),
    href: () => '/mes-produits',
    subject: () => ({ title: 'Chéchia rouge', ref: null }),
  })

  it('builds the same face from a different context', () => {
    expect(lowStock.face(row({ order: null }), SELLER)).toEqual({
      icon: 'bell',
      tone: 'warning',
      sentence: { key: 'x.low_stock', vars: { count: { value: 2 } } },
      href: '/mes-produits',
      title: 'Chéchia rouge',
      ref: null,
    })
  })
  it('a row its `read` cannot use gives no face', () => {
    expect(lowStock.face(row(), SELLER)).toBeNull()
  })
})
