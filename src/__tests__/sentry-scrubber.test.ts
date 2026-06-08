/**
 * Unit tests for the Sentry PII scrubber (src/lib/sentry/scrubber.ts).
 *
 * PII redaction is a security-sensitive transformation — a must-test category per
 * CLAUDE.md — because its failure mode is user PII leaking to a third-party processor
 * (Sentry), the exact compliance harm this code exists to prevent. The scrubber is a
 * pure function with branching (recursion, arrays, case-insensitive substring match),
 * so it is directly unit-testable with no SDK runtime (scrubber.ts imports the Sentry
 * Event type only, never its runtime).
 */

import { describe, it, expect } from 'vitest'
import type { Event } from '@sentry/nextjs'
import { scrubPII } from '@/lib/sentry/scrubber'

type TestEvent = {
  request?: { data?: unknown; cookies?: unknown }
  extra?: Record<string, unknown>
}

// scrubPII is generic over Sentry.Event; the cast lets us exercise it with minimal
// event-shaped fixtures without constructing a full Event.
function run(e: TestEvent): TestEvent {
  return scrubPII(e as unknown as Event) as unknown as TestEvent
}

const asRecord = (v: unknown) => (v ?? {}) as Record<string, unknown>

describe('scrubPII — request.data field redaction', () => {
  it('redacts known sensitive fields and leaves benign ones intact', () => {
    const out = run({ request: { data: { delivery_phone: '20123456', description: 'secret', title: 'Chaise' } } })
    const data = asRecord(out.request?.data)
    expect(data.delivery_phone).toBe('[REDACTED]')
    expect(data.description).toBe('[REDACTED]')
    expect(data.title).toBe('Chaise')
  })

  it('matches field names case-insensitively as substrings', () => {
    const out = run({ request: { data: { Delivery_Address: 'x', EMAIL: 'a@b.com', telephone: '111', city: 'Tunis' } } })
    const data = asRecord(out.request?.data)
    expect(data.Delivery_Address).toBe('[REDACTED]')
    expect(data.EMAIL).toBe('[REDACTED]')
    expect(data.telephone).toBe('[REDACTED]') // contains 'phone'
    expect(data.city).toBe('Tunis')
  })

  it('redacts recursively through nested objects and arrays', () => {
    const out = run({ request: { data: { order: { buyer_note: 'n', items: [{ admin_note: 'a', sku: 'S1' }] } } } })
    const data = asRecord(out.request?.data)
    const order = asRecord(data.order)
    expect(order.buyer_note).toBe('[REDACTED]')
    const items = order.items as Array<Record<string, unknown>>
    expect(items[0].admin_note).toBe('[REDACTED]')
    expect(items[0].sku).toBe('S1')
  })
})

describe('scrubPII — cookies and extra', () => {
  it('drops cookies wholesale regardless of content', () => {
    const out = run({ request: { data: { ok: 1 }, cookies: { 'sb-access-token': 'jwt', other: 'v' } } })
    expect(out.request?.cookies).toBeUndefined()
  })

  it('redacts sensitive fields inside event.extra', () => {
    const out = run({ extra: { password: 'p', phone: '20', note: 'keep' } })
    const extra = asRecord(out.extra)
    expect(extra.password).toBe('[REDACTED]')
    expect(extra.phone).toBe('[REDACTED]')
    expect(extra.note).toBe('keep') // 'note' alone matches no sensitive substring
  })
})

describe('scrubPII — edge cases', () => {
  it('handles an event with no request/extra without throwing', () => {
    expect(() => run({})).not.toThrow()
  })

  it('preserves null values and does not throw on them', () => {
    const out = run({ request: { data: { a: null, keep: 'v' } } })
    const data = asRecord(out.request?.data)
    expect(data.a).toBeNull()
    expect(data.keep).toBe('v')
  })
})
