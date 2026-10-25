/**
 * H8 PR-2 — the pure decisions behind /mes-engagements/[id] (src/lib/marche/engagement-detail.ts).
 */

import { describe, it, expect } from 'vitest'
import {
  engagementReceivedAt,
  headerDateFor,
  isEngagementOrder,
  nextStepHintKey,
  requestRows,
  showCancelReasonInRail,
} from '@/lib/marche/engagement-detail'
import { nextSellerStatus, SERVICE_LIFECYCLE, type OrderStatus } from '@/lib/types/order-status'
import { t } from '@/lib/i18n'

describe('isEngagementOrder', () => {
  it('serves service orders only — a product order is a 404 here', () => {
    expect(isEngagementOrder({ orderType: 'service' })).toBe(true)
    expect(isEngagementOrder({ orderType: 'product' })).toBe(false)
  })
})

describe('engagementReceivedAt', () => {
  const events = [
    { toStatus: 'pending', createdAt: '2026-10-01T10:00:00Z' },
    { toStatus: 'received', createdAt: '2026-10-05T12:00:00Z' },
  ]
  it('prefers the column', () => {
    expect(engagementReceivedAt({ receivedAt: '2026-10-05T11:59:00Z', events })).toBe('2026-10-05T11:59:00Z')
  })
  it('falls back to the event that recorded the move to received (column not stamped yet, or never was)', () => {
    expect(engagementReceivedAt({ receivedAt: null, events })).toBe('2026-10-05T12:00:00Z')
  })
  it('is null when neither exists', () => {
    expect(engagementReceivedAt({ receivedAt: null, events: [events[0]] })).toBeNull()
    expect(engagementReceivedAt({ receivedAt: null, events: [] })).toBeNull()
  })
})

describe('headerDateFor', () => {
  const base = { createdAt: '2026-10-01T10:00:00Z', cancelledAt: null }
  it('says when it was requested while the order is open', () => {
    for (const status of ['pending', 'accepted', 'arrived'] as const) {
      expect(headerDateFor({ ...base, status }, null)).toEqual({ key: 'requested', iso: base.createdAt })
    }
  })
  it('says when it was finished once received, and when it was cancelled once cancelled', () => {
    expect(headerDateFor({ ...base, status: 'received' }, '2026-10-05T12:00:00Z')).toEqual({
      key: 'done',
      iso: '2026-10-05T12:00:00Z',
    })
    expect(headerDateFor({ ...base, status: 'cancelled', cancelledAt: '2026-10-03T08:00:00Z' }, null)).toEqual({
      key: 'cancelled',
      iso: '2026-10-03T08:00:00Z',
    })
  })
  it('never prints an invented date: a received / cancelled order with no date reads as requested', () => {
    expect(headerDateFor({ ...base, status: 'received' }, null).key).toBe('requested')
    expect(headerDateFor({ ...base, status: 'cancelled' }, null).key).toBe('requested')
  })
})

describe('nextStepHintKey', () => {
  const chain: OrderStatus[] = [...SERVICE_LIFECYCLE, 'cancelled']

  it('has a real sentence, in French and Arabic, for every status a service can be in', () => {
    for (const status of chain) {
      const key = nextStepHintKey(status)
      for (const lang of ['fr', 'ar'] as const) expect(t(key, lang), `${status} ${lang}`).not.toBe(key)
    }
  })

  it('only the seller-owned statuses promise a button; arrived waits on the buyer', () => {
    expect(nextSellerStatus('pending', 'service')).toBe('accepted')
    expect(nextStepHintKey('pending')).toBe('engagements.detail.hint_pending')
    expect(nextSellerStatus('accepted', 'service')).toBe('arrived')
    expect(nextStepHintKey('accepted')).toBe('engagements.detail.hint_accepted')
    expect(nextSellerStatus('arrived', 'service')).toBeNull()
    expect(nextStepHintKey('arrived')).toBe('seller.orders.awaiting_buyer')
  })
})

describe('requestRows', () => {
  it('passes the three parts through, trimmed', () => {
    expect(requestRows({ description: '  Un logo moderne  ', timeframe: ' 2 semaines ', budget: '400' })).toEqual({
      description: 'Un logo moderne',
      timeframe: '2 semaines',
      budget: '400',
      empty: false,
    })
  })
  it('a request with only a budget is not empty', () => {
    expect(requestRows({ description: '', timeframe: null, budget: '400' }).empty).toBe(false)
  })
  it('a missing or blank brief reads as « not detailed », not as three empty rows', () => {
    expect(requestRows(null).empty).toBe(true)
    expect(requestRows({ description: '   ', timeframe: '  ', budget: null }).empty).toBe(true)
  })
})

describe('showCancelReasonInRail', () => {
  const base = { status: 'cancelled' as const, cancellationReason: 'Client injoignable' }
  it('keeps the reason in the rail for an order with no history event carrying it (pre-order_events)', () => {
    expect(showCancelReasonInRail({ ...base, events: [] })).toBe(true)
  })
  it('drops it when the cancellation event already shows it', () => {
    expect(showCancelReasonInRail({ ...base, events: [{ toStatus: 'cancelled', note: 'Client injoignable' }] })).toBe(false)
  })
  it('keeps it when the cancellation event has no note', () => {
    expect(showCancelReasonInRail({ ...base, events: [{ toStatus: 'cancelled', note: null }] })).toBe(true)
  })
  it('is never shown for an order that is not cancelled, or has no reason', () => {
    expect(showCancelReasonInRail({ status: 'accepted', cancellationReason: 'x', events: [] })).toBe(false)
    expect(showCancelReasonInRail({ status: 'cancelled', cancellationReason: null, events: [] })).toBe(false)
  })
})
