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
  isCancellable,
  requiresCancellationReason,
  canConfirmReceipt,
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

describe('isCancellable — any non-terminal state', () => {
  it('is true for every non-terminal state', () => {
    expect(isCancellable('pending')).toBe(true)
    expect(isCancellable('accepted')).toBe(true)
    expect(isCancellable('prepared')).toBe(true)
    expect(isCancellable('dispatched')).toBe(true)
    expect(isCancellable('in_delivery')).toBe(true)
    expect(isCancellable('arrived')).toBe(true)
  })

  it('is false for the terminal states', () => {
    expect(isCancellable('received')).toBe(false)
    expect(isCancellable('cancelled')).toBe(false)
  })
})

describe('requiresCancellationReason — post-pivot needs a reason', () => {
  it('product requires a reason from dispatch onward', () => {
    expect(requiresCancellationReason('dispatched', 'product')).toBe(true)
    expect(requiresCancellationReason('in_delivery', 'product')).toBe(true)
    expect(requiresCancellationReason('arrived', 'product')).toBe(true)
  })

  it('product is free to cancel pre-dispatch', () => {
    expect(requiresCancellationReason('pending', 'product')).toBe(false)
    expect(requiresCancellationReason('accepted', 'product')).toBe(false)
    expect(requiresCancellationReason('prepared', 'product')).toBe(false)
  })

  it('service requires a reason from acceptance onward', () => {
    expect(requiresCancellationReason('accepted', 'service')).toBe(true)
    expect(requiresCancellationReason('arrived', 'service')).toBe(true)
  })

  it('service is free to cancel while pending', () => {
    expect(requiresCancellationReason('pending', 'service')).toBe(false)
  })

  it('terminal states never require a reason, for either type', () => {
    expect(requiresCancellationReason('received', 'product')).toBe(false)
    expect(requiresCancellationReason('cancelled', 'product')).toBe(false)
    expect(requiresCancellationReason('received', 'service')).toBe(false)
    expect(requiresCancellationReason('cancelled', 'service')).toBe(false)
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

  it('allows cancel from any non-terminal state, blocks it from terminal ones', () => {
    expect(canTransition('accepted', 'cancelled', 'product', 'seller')).toBe(true)
    expect(canTransition('dispatched', 'cancelled', 'product', 'seller')).toBe(true)
    expect(canTransition('arrived', 'cancelled', 'service', 'buyer')).toBe(true)
    expect(canTransition('received', 'cancelled', 'product', 'buyer')).toBe(false)
  })
})

describe('canConfirmReceipt — buyer receipt-button gate', () => {
  it('is true only once the order has arrived', () => {
    expect(canConfirmReceipt('arrived')).toBe(true)
  })

  it('is false for every other status', () => {
    expect(canConfirmReceipt('pending')).toBe(false)
    expect(canConfirmReceipt('accepted')).toBe(false)
    expect(canConfirmReceipt('prepared')).toBe(false)
    expect(canConfirmReceipt('dispatched')).toBe(false)
    expect(canConfirmReceipt('in_delivery')).toBe(false)
    expect(canConfirmReceipt('received')).toBe(false)
    expect(canConfirmReceipt('cancelled')).toBe(false)
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
