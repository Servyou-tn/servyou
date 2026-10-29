import { describe, it, expect } from 'vitest'
import {
  buyerCanCancel,
  buyerCancelIsButton,
  buyerCanConfirmReceipt,
  buyerCanDispute,
  buyerEventLabel,
  buyerPanelState,
  cancelledAfterStage,
} from './buyer-order'
import { PRODUCT_LIFECYCLE, SERVICE_LIFECYCLE, type OrderStatus } from '@/lib/types/order-status'

// The buyer's order detail (E4): who may do what at each status. These rules follow the DATABASE
// (check_order_status_transition + the disputes INSERT policy), so a button the DB would refuse must never render.

const ALL: OrderStatus[] = ['pending', 'accepted', 'prepared', 'dispatched', 'in_delivery', 'arrived', 'received', 'cancelled']

describe('buyerPanelState', () => {
  it.each([
    ['pending', 'pending'],
    ['accepted', 'in_progress'],
    ['prepared', 'in_progress'],
    ['dispatched', 'in_progress'],
    ['in_delivery', 'in_progress'],
    ['arrived', 'confirm'],
    ['received', 'received'],
    ['cancelled', 'cancelled'],
  ])('%s → %s', (status, expected) => {
    expect(buyerPanelState(status)).toBe(expected)
  })

  it('an unknown status degrades to in_progress, never to a confirm / cancel panel', () => {
    expect(buyerPanelState('weird')).toBe('in_progress')
  })
})

describe('buyerCanCancel — product orders only, until Reçue / Annulée', () => {
  it.each(ALL)('product · %s', (status) => {
    expect(buyerCanCancel(status, 'product')).toBe(status !== 'received' && status !== 'cancelled')
  })

  it.each(ALL)('service · %s → never (founder ruling: services have no buyer cancel)', (status) => {
    expect(buyerCanCancel(status, 'service')).toBe(false)
  })
})

describe('buyerCancelIsButton', () => {
  it('only while pending — afterwards « Annuler la commande » is the quiet link under the main action', () => {
    expect(ALL.filter(buyerCancelIsButton)).toEqual(['pending'])
  })
})

describe('buyerCanDispute', () => {
  it('from accepted through received; never while pending (the INSERT policy refuses it) nor once cancelled', () => {
    expect(ALL.filter(buyerCanDispute)).toEqual(['accepted', 'prepared', 'dispatched', 'in_delivery', 'arrived', 'received'])
  })
})

describe('buyerCanConfirmReceipt', () => {
  it('only from `arrived`, for both order types (the DB: « Seul l\'acheteur peut confirmer la réception »)', () => {
    expect(ALL.filter((s) => buyerCanConfirmReceipt(s, 'product'))).toEqual(['arrived'])
    expect(ALL.filter((s) => buyerCanConfirmReceipt(s, 'service'))).toEqual(['arrived'])
  })
})

describe('cancelledAfterStage', () => {
  const cancelEvent = (from: OrderStatus | null) =>
    ({ eventType: 'status_change', fromStatus: from, toStatus: 'cancelled' }) as const

  it('is the cancellation event\'s from_status — the stage the order had reached', () => {
    expect(cancelledAfterStage([cancelEvent('pending')], PRODUCT_LIFECYCLE)).toBe('pending')
    expect(cancelledAfterStage([cancelEvent('dispatched')], PRODUCT_LIFECYCLE)).toBe('dispatched')
  })

  it('an order with no events (it predates order_events) falls back to the first stage', () => {
    expect(cancelledAfterStage([], PRODUCT_LIFECYCLE)).toBe('pending')
    expect(cancelledAfterStage([], SERVICE_LIFECYCLE)).toBe('pending')
  })

  it('a from_status that is not on this chain (a service has no « prepared ») also falls back, never crashes', () => {
    expect(cancelledAfterStage([cancelEvent('prepared')], SERVICE_LIFECYCLE)).toBe('pending')
    expect(cancelledAfterStage([cancelEvent(null)], PRODUCT_LIFECYCLE)).toBe('pending')
  })

  it('uses the LAST cancellation event', () => {
    expect(cancelledAfterStage([cancelEvent('pending'), cancelEvent('accepted')], PRODUCT_LIFECYCLE)).toBe('accepted')
  })
})

describe('buyerEventLabel', () => {
  // A translator that echoes its key and variables, so the test asserts WHICH wording is chosen, not the French.
  const tr = (key: string, vars?: Record<string, string | number>) => (vars ? `${key}|${JSON.stringify(vars)}` : key)
  const status = (toStatus: OrderStatus, extra: { actorRole?: 'buyer' | 'seller' | null; note?: string | null } = {}) => ({
    eventType: 'status_change' as const,
    toStatus,
    actorRole: extra.actorRole ?? 'seller',
    note: extra.note ?? null,
  })
  const product = { orderType: 'product' as const, carrier: null }
  const service = { orderType: 'service' as const, carrier: null }

  it('the six milestones of the frame, in the buyer\'s voice', () => {
    expect(buyerEventLabel({ eventType: 'created', toStatus: null, actorRole: null, note: null }, product, tr)).toBe('buyerOrder.event.created_product')
    expect(buyerEventLabel(status('accepted'), product, tr)).toBe('buyerOrder.event.accepted_shop')
    expect(buyerEventLabel(status('dispatched'), product, tr)).toBe('buyerOrder.event.dispatched')
    expect(buyerEventLabel(status('arrived'), product, tr)).toBe('buyerOrder.event.arrived_product')
    expect(buyerEventLabel(status('received', { actorRole: 'buyer' }), product, tr)).toBe('buyerOrder.event.received')
  })

  it('service wording differs: « Demande envoyée », « par le freelance », « Travail livré »', () => {
    expect(buyerEventLabel({ eventType: 'created', toStatus: null, actorRole: null, note: null }, service, tr)).toBe('buyerOrder.event.created_service')
    expect(buyerEventLabel(status('accepted'), service, tr)).toBe('buyerOrder.event.accepted_freelancer')
    expect(buyerEventLabel(status('arrived'), service, tr)).toBe('buyerOrder.event.arrived_service')
  })

  it('« Expédiée avec {carrier} » only when a carrier exists', () => {
    expect(buyerEventLabel(status('dispatched'), { ...product, carrier: 'First Delivery' }, tr)).toBe(
      'buyerOrder.event.dispatched_with|{"carrier":"First Delivery"}',
    )
  })

  it('skips « Préparée » and « En livraison » (the frame\'s history does not draw them) and non-status events', () => {
    expect(buyerEventLabel(status('prepared'), product, tr)).toBeNull()
    expect(buyerEventLabel(status('in_delivery'), product, tr)).toBeNull()
    expect(buyerEventLabel({ eventType: 'print', toStatus: null, actorRole: null, note: null }, product, tr)).toBeNull()
    expect(buyerEventLabel({ eventType: 'status_change', toStatus: null, actorRole: null, note: null }, product, tr)).toBeNull()
  })

  it('a cancellation says WHO cancelled and carries the reason inline when there is one', () => {
    expect(buyerEventLabel(status('cancelled', { actorRole: 'buyer' }), product, tr)).toBe('buyerOrder.event.cancelled_buyer')
    expect(buyerEventLabel(status('cancelled', { actorRole: 'buyer', note: "J'ai changé d'avis" }), product, tr)).toBe(
      'buyerOrder.event.cancelled_buyer_reason|{"reason":"J\'ai changé d\'avis"}',
    )
    expect(buyerEventLabel(status('cancelled', { actorRole: 'seller', note: 'Rupture de stock' }), product, tr)).toBe(
      'buyerOrder.event.cancelled_shop_reason|{"reason":"Rupture de stock"}',
    )
    expect(buyerEventLabel(status('cancelled', { actorRole: 'seller' }), service, tr)).toBe('buyerOrder.event.cancelled_freelancer')
  })

  it('a blank reason is not a reason', () => {
    expect(buyerEventLabel(status('cancelled', { actorRole: 'buyer', note: '   ' }), product, tr)).toBe('buyerOrder.event.cancelled_buyer')
  })
})
