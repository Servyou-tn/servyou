/**
 * Unit tests for the order lifecycle helpers (business-rule logic).
 *
 * Pure functions — no DB, no Supabase, no browser. These guard the
 * transition rules the seller dashboards rely on; the DB trigger in PR-B
 * is the authoritative enforcement, but this is the app-code contract.
 *
 * Run: npx vitest run src/__tests__/order-status.test.ts
 */

import { describe, it, expect } from 'vitest'
import {
  PRODUCT_LIFECYCLE,
  SERVICE_LIFECYCLE,
  nextStatus,
  canCancel,
  canTransition,
  statusLabelKey,
  advanceLabelKey,
} from '@/lib/types/order-status'

describe('lifecycle chains', () => {
  it('product chain is the full 7-state physical-delivery path', () => {
    expect(PRODUCT_LIFECYCLE).toEqual([
      'pending', 'accepted', 'prepared', 'dispatched', 'in_delivery', 'arrived', 'received',
    ])
  })

  it('service chain skips the middle delivery states', () => {
    expect(SERVICE_LIFECYCLE).toEqual(['pending', 'accepted', 'arrived', 'received'])
  })
})

describe('nextStatus', () => {
  it('advances a product order one step at a time', () => {
    expect(nextStatus('pending', 'product')).toBe('accepted')
    expect(nextStatus('accepted', 'product')).toBe('prepared')
    expect(nextStatus('dispatched', 'product')).toBe('in_delivery')
    expect(nextStatus('arrived', 'product')).toBe('received')
  })

  it('advances a service order along the reduced chain', () => {
    expect(nextStatus('pending', 'service')).toBe('accepted')
    expect(nextStatus('accepted', 'service')).toBe('arrived')
    expect(nextStatus('arrived', 'service')).toBe('received')
  })

  it('returns null at the terminal state and off-chain', () => {
    expect(nextStatus('received', 'product')).toBeNull()
    expect(nextStatus('received', 'service')).toBeNull()
    expect(nextStatus('cancelled', 'product')).toBeNull()
  })
})

describe('canCancel — pivot differs by type', () => {
  it('product is cancellable pre-dispatch only', () => {
    expect(canCancel('pending', 'product')).toBe(true)
    expect(canCancel('accepted', 'product')).toBe(true)
    expect(canCancel('prepared', 'product')).toBe(true)
    expect(canCancel('dispatched', 'product')).toBe(false)
    expect(canCancel('in_delivery', 'product')).toBe(false)
    expect(canCancel('arrived', 'product')).toBe(false)
  })

  it('service pivots at acceptance', () => {
    expect(canCancel('pending', 'service')).toBe(true)
    expect(canCancel('accepted', 'service')).toBe(true)
    expect(canCancel('arrived', 'service')).toBe(false)
  })
})

describe('canTransition — role gating', () => {
  it('lets the seller advance through the chain', () => {
    expect(canTransition('pending', 'accepted', 'product', 'seller')).toBe(true)
    expect(canTransition('in_delivery', 'arrived', 'product', 'seller')).toBe(true)
  })

  it('reserves the final received hop for the buyer', () => {
    expect(canTransition('arrived', 'received', 'product', 'buyer')).toBe(true)
    expect(canTransition('arrived', 'received', 'product', 'seller')).toBe(false)
    expect(canTransition('arrived', 'received', 'service', 'buyer')).toBe(true)
    expect(canTransition('arrived', 'received', 'service', 'seller')).toBe(false)
  })

  it('rejects skipping stages and going backwards', () => {
    expect(canTransition('pending', 'dispatched', 'product', 'seller')).toBe(false)
    expect(canTransition('prepared', 'accepted', 'product', 'seller')).toBe(false)
  })

  it('allows cancel only from cancellable states', () => {
    expect(canTransition('accepted', 'cancelled', 'product', 'seller')).toBe(true)
    expect(canTransition('dispatched', 'cancelled', 'product', 'seller')).toBe(false)
  })
})

describe('i18n key helpers', () => {
  it('uses the service-specific arrived label only for services', () => {
    expect(statusLabelKey('arrived', 'product')).toBe('common.status_arrived')
    expect(statusLabelKey('arrived', 'service')).toBe('common.status_arrived_service')
    expect(statusLabelKey('dispatched', 'product')).toBe('common.status_dispatched')
  })

  it('maps advance targets to their action keys', () => {
    expect(advanceLabelKey('accepted', 'product')).toBe('common.mark_accepted')
    expect(advanceLabelKey('arrived', 'product')).toBe('common.mark_arrived')
    expect(advanceLabelKey('arrived', 'service')).toBe('common.mark_arrived_service')
  })
})
