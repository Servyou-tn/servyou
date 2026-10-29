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

// ── Pre-launch audit pass 2: headers, value patterns, camelCase keys, breadcrumbs, the rest of the event ─────────────

type FullEvent = Event & { request?: Event['request'] & { headers?: Record<string, string> } }
const scrub = (e: Record<string, unknown>) => scrubPII(e as unknown as Event) as unknown as FullEvent

describe('scrubPII — auth material in request headers', () => {
  it('deletes the Cookie (sb-* access + refresh token), Authorization and x-supabase headers; keeps the rest', () => {
    const out = scrub({
      request: {
        headers: {
          cookie: 'sb-xggo-auth-token=eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ4In0.c2lnbmF0dXJlLXZhbHVl; servyou_lang=ar',
          Authorization: 'Bearer abcdefghijklmnopqrstuvwxyz',
          'x-supabase-api-version': '2024-01-01',
          'user-agent': 'Mozilla/5.0',
          'accept-language': 'fr',
        },
      },
    })
    expect(out.request?.headers).toEqual({ 'user-agent': 'Mozilla/5.0', 'accept-language': 'fr' })
  })
})

describe('scrubPII — value patterns in strings', () => {
  it.each([
    ['an email', 'contact: zina.ben-ali+test@gmail.com', 'contact: [REDACTED]'],
    ['a %40-encoded email in a URL', '/verifier-email?email=zina%40gmail.com', '/verifier-email?email=[REDACTED]'],
    ['a +216 phone', 'tél +216 20 123 456', 'tél [REDACTED]'],
    ['a 00216 phone', 'tél 0021698765432', 'tél [REDACTED]'],
    ['a bare 8-digit phone', 'Key (delivery_phone)=(98765432) invalid', 'Key (delivery_phone)=([REDACTED]) invalid'],
    ['a JWT', 'token eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ4In0.c2lnbmF0dXJlLXZhbHVl end', 'token [REDACTED] end'],
  ])('redacts %s', (_label, input, expected) => {
    expect(scrub({ message: input }).message).toBe(expected)
  })

  it('leaves uuids, prices, years and ids alone', () => {
    const msg = 'order 11111111-1111-4111-8111-111111111111 · 173.500 TND · 2026 · id 12345'
    expect(scrub({ message: msg }).message).toBe(msg)
  })

  it('applies to the request url, query string, exception values, contexts and tags', () => {
    const out = scrub({
      request: { url: 'https://servyou.vercel.app/verifier-email?email=a%40b.tn', query_string: 'email=a%40b.tn' },
      exception: { values: [{ type: 'Error', value: 'duplicate key: (email)=(a@b.tn)' }] },
      contexts: { nextjs: { request_path: '/verifier-email?email=a%40b.tn' } },
      tags: { where: 'signup', who: 'a@b.tn' },
    })
    expect(out.request?.url).toBe('https://servyou.vercel.app/verifier-email?email=[REDACTED]')
    expect(out.request?.query_string).toBe('email=[REDACTED]')
    expect(out.exception?.values?.[0].value).toBe('duplicate key: (email)=([REDACTED])')
    expect((out.contexts as Record<string, Record<string, unknown>>).nextjs.request_path).toBe('/verifier-email?email=[REDACTED]')
    expect(out.tags).toEqual({ where: 'signup', who: '[REDACTED]' })
  })

  it('a raw string request body (a server-action payload) is pattern-redacted too', () => {
    const out = scrub({ request: { data: '["Zina","zina@gmail.com","20123456"]' } })
    expect(out.request?.data).toBe('["Zina","[REDACTED]","[REDACTED]"]')
  })
})

describe('scrubPII — camelCase action fields', () => {
  it('matches keys without their underscores (deliveryName, deliveryStreet, fullName, buyerNote, dateOfBirth)', () => {
    const out = scrub({ request: { data: { deliveryName: 'Zina', deliveryStreet: 'Rue 1', quartier: 'Ennasr', fullName: 'Z', buyerNote: 'n', dateOfBirth: '1990-01-01', ville: 'Ariana', quantity: 2 } } })
    expect(out.request?.data).toEqual({
      deliveryName: '[REDACTED]', deliveryStreet: '[REDACTED]', quartier: '[REDACTED]', fullName: '[REDACTED]',
      buyerNote: '[REDACTED]', dateOfBirth: '[REDACTED]', ville: 'Ariana', quantity: 2,
    })
  })
})

describe('scrubPII — breadcrumbs', () => {
  it('a console breadcrumb keeps only its [scope] label — error.details (row values) never travels', () => {
    const out = scrub({
      breadcrumbs: [{
        category: 'console',
        level: 'error',
        message: '[submitProductRequest] insert error: violates ... Failing row contains (Zina, Rue des Oliviers 12, 20123456)',
        data: { arguments: ['[submitProductRequest] insert error:', 'violates ...', 'Failing row contains (Zina, Rue des Oliviers 12, 20123456)'] },
      }],
    })
    expect(out.breadcrumbs).toEqual([{ category: 'console', level: 'error', message: '[submitProductRequest] insert error:', data: undefined }])
  })

  it('other breadcrumbs (navigation, fetch) are pattern- and key-redacted', () => {
    const out = scrub({
      breadcrumbs: [
        { category: 'navigation', data: { from: '/inscription', to: '/verifier-email?email=a%40b.tn' } },
        { category: 'fetch', data: { url: '/api/x', email: 'a@b.tn', status_code: 200 } },
      ],
    })
    expect(out.breadcrumbs?.[0].data).toEqual({ from: '/inscription', to: '/verifier-email?email=[REDACTED]' })
    expect(out.breadcrumbs?.[1].data).toEqual({ url: '/api/x', email: '[REDACTED]', status_code: 200 })
  })
})
