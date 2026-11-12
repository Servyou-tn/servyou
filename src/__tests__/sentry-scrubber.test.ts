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

// ── Review of #242: bounded patterns, no lookbehind, spans / user / env, JSON bodies, grouped phones ────────────────

describe('scrubPII — bounded work (ReDoS) and browser-safe regexes', () => {
  it('a 100k-character token-like run (with and without @) scrubs fast and is truncated', () => {
    for (const s of ['a'.repeat(100_000), 'a'.repeat(100_000) + '@', ('ab.' as string).repeat(40_000)]) {
      const started = performance.now()
      const out = scrub({ extra: { blob: s } })
      expect(performance.now() - started).toBeLessThan(500)
      expect(String((out.extra as Record<string, unknown>).blob)).toMatch(/…\[TRUNCATED\]$/)
    }
  })

  it('uses no lookbehind (Safari < 16.4 cannot parse it; the scrubber ships in the client entry chunk)', async () => {
    const { readFileSync } = await import('node:fs')
    const source = readFileSync(new URL('../lib/sentry/scrubber.ts', import.meta.url), 'utf8')
    expect(source).not.toMatch(/\(\?<[=!]/)
  })
})

describe('scrubPII — value patterns after review', () => {
  it.each([
    ['a grouped phone with spaces', 'tél 98 765 432 ok', 'tél [REDACTED] ok'],
    ['a grouped phone with hyphens', 'tél: 98-765-432', 'tél: [REDACTED]'],
  ])('redacts %s', (_label, input, expected) => {
    expect(scrub({ message: input }).message).toBe(expected)
  })

  it.each([
    ['a package version', 'next@16.4.3 and @supabase/ssr@0.10.3'],
    ['a decimal', 'ratio 0.98765432'],
    ['a timestamp', '2026-10-29T23:21:37.123Z'],
  ])('keeps %s', (_label, input) => {
    expect(scrub({ message: input }).message).toBe(input)
  })
})

describe('scrubPII — spans, user, env, JSON bodies, console objects', () => {
  it('redacts span descriptions and data (transactions)', () => {
    const out = scrub({
      spans: [{ description: 'GET /rest/v1/profiles?email=eq.a%40b.tn', data: { 'url.full': '/x?email=a%40b.tn', phone: '20123456', 'http.method': 'GET' } }],
    }) as unknown as { spans: Array<{ description: string; data: Record<string, unknown> }> }
    // The local part may contain dots, so PostgREST's `eq.` prefix is swallowed too — over-redaction, harmless.
    expect(out.spans[0].description).toBe('GET /rest/v1/profiles?email=[REDACTED]')
    expect(out.spans[0].data).toEqual({ 'url.full': '/x?email=[REDACTED]', phone: '[REDACTED]', 'http.method': 'GET' })
  })

  it('redacts event.user and drops request.env', () => {
    const out = scrub({ user: { id: 'u1', email: 'a@b.tn', ip_address: '1.2.3.4' }, request: { env: { REMOTE_ADDR: '1.2.3.4' } } })
    expect(out.user).toEqual({ id: 'u1', email: '[REDACTED]', ip_address: '[REDACTED]' })
    expect((out.request as Record<string, unknown>).env).toBeUndefined()
  })

  it('a JSON string body gets its KEYS redacted, not just patterns', () => {
    const out = scrub({ request: { data: '{"deliveryAddress":"Rue des Oliviers 12","quantity":2}' } })
    expect(out.request?.data).toBe('{"deliveryAddress":"[REDACTED]","quantity":2}')
  })

  it('a console breadcrumb whose first argument is not a string is dropped to no message', () => {
    const out = scrub({ breadcrumbs: [{ category: 'console', message: 'Error: Failing row contains (Zina, Rue 12)', data: { arguments: [{ message: 'x' }] } }] })
    expect(out.breadcrumbs?.[0].message).toBeUndefined()
    expect(out.breadcrumbs?.[0].data).toBeUndefined()
  })
})

// Audit 2026-11-11 H5: one-time codes and session tokens in URLs. The reset page keeps token_hash in its address until
// « Continuer », so every place a URL can travel must lose the VALUE (the name and `type` stay). Neutral key names
// (url, href, from, to, path) so each case proves the pattern, not the sensitive-key rule.
describe('scrubPII — one-time codes and tokens in URLs (audit H5)', () => {
  const RESET = 'https://servyou.vercel.app/nouveau-mot-de-passe?token_hash=abc&type=recovery'
  const RESET_OUT = 'https://servyou.vercel.app/nouveau-mot-de-passe?token_hash=[Filtered]&type=recovery'

  it('the goal case: token_hash is filtered, type=recovery is kept', () => {
    expect(scrub({ message: '/nouveau-mot-de-passe?token_hash=abc&type=recovery' }).message).toBe(
      '/nouveau-mot-de-passe?token_hash=[Filtered]&type=recovery',
    )
  })

  it.each([
    ['code', '/auth/callback?code=4f1c2a9e-0b7d-4c3e-9a51-7d2f0e6b8c11&next=%2F', '/auth/callback?code=[Filtered]&next=%2F'],
    ['token', '/auth/v1/verify?token=pkce_abc123&type=signup', '/auth/v1/verify?token=[Filtered]&type=signup'],
    [
      'a fragment',
      '/nouveau-mot-de-passe#access_token=eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ4In0.c2lnbmF0dXJlLXZhbHVl&refresh_token=r3fr35h&type=recovery',
      '/nouveau-mot-de-passe#access_token=[Filtered]&refresh_token=[Filtered]&type=recovery',
    ],
    [
      'a URL nested in ?next= (percent-encoded)',
      '/connexion?next=%2Fnouveau-mot-de-passe%3Ftoken_hash%3Dabc%2Bdef%26type%3Drecovery',
      '/connexion?next=%2Fnouveau-mot-de-passe%3Ftoken_hash%3D[Filtered]%26type%3Drecovery',
    ],
    ['upper-case names', '/x?TOKEN_HASH=abc&Code=def', '/x?TOKEN_HASH=[Filtered]&Code=[Filtered]'],
    ['a value inside quoted JSON', '{"url":"/verifier-email?token_hash=abc&type=signup"}', '{"url":"/verifier-email?token_hash=[Filtered]&type=signup"}'],
  ])('filters %s', (_label, input, expected) => {
    expect(scrub({ message: input }).message).toBe(expected)
  })

  it.each([
    ['type=recovery alone', '/nouveau-mot-de-passe?type=recovery'],
    ['the expired-link fragment (error_code is not code)', '/nouveau-mot-de-passe#error=access_denied&error_code=otp_expired'],
    ['a free-text Postgres code', 'insert failed: code 23514 (check_violation)'],
    ['a longer parameter name', '/x?tokens=3&barcode=123&code_promo=ETE'],
  ])('keeps %s', (_label, input) => {
    expect(scrub({ message: input }).message).toBe(input)
  })

  it('a token longer than any URL limit is filtered whole (no tail survives)', () => {
    const out = scrub({ message: `/x?token_hash=${'f'.repeat(5_000)}&type=recovery` })
    expect(out.message).toBe('/x?token_hash=[Filtered]&type=recovery')
  })

  it('request.url, the Referer header and the transaction name', () => {
    const out = scrub({
      transaction: '/nouveau-mot-de-passe?token_hash=abc&type=recovery',
      request: { url: RESET, headers: { referer: RESET, 'user-agent': 'Mozilla/5.0' } },
    })
    expect(out.request?.url).toBe(RESET_OUT)
    expect(out.request?.headers?.referer).toBe(RESET_OUT)
    expect(out.transaction).toBe('/nouveau-mot-de-passe?token_hash=[Filtered]&type=recovery')
  })

  it('a stack frame from an inline script, whose file is the page URL', () => {
    const out = scrub({
      exception: { values: [{ type: 'Error', value: 'x', stacktrace: { frames: [{ filename: RESET, abs_path: RESET, lineno: 1 }] } }] },
    })
    expect(out.exception?.values?.[0].stacktrace?.frames?.[0]).toEqual({ filename: RESET_OUT, abs_path: RESET_OUT, lineno: 1 })
  })

  it('request.query_string as a string, an object and an array of pairs', () => {
    const asString = scrub({ request: { query_string: 'token_hash=abc&type=recovery' } })
    expect(asString.request?.query_string).toBe('token_hash=[Filtered]&type=recovery')

    const asObject = scrub({ request: { query_string: { token_hash: 'abc', code: 'def', access_token: 'ghi', type: 'recovery' } } })
    expect(asObject.request?.query_string).toEqual({ token_hash: '[Filtered]', code: '[Filtered]', access_token: '[Filtered]', type: 'recovery' })

    const asPairs = scrub({
      request: { query_string: [['token_hash', 'abc'], ['refresh_token', 'r'], ['token', 't'], ['type', 'recovery']] },
    })
    expect(asPairs.request?.query_string).toEqual([
      ['token_hash', '[Filtered]'],
      ['refresh_token', '[Filtered]'],
      ['token', '[Filtered]'],
      ['type', 'recovery'],
    ])
  })

  it('breadcrumbs: navigation from / to, fetch url, and the message', () => {
    const out = scrub({
      breadcrumbs: [
        { category: 'navigation', data: { from: RESET, to: '/connexion?code=xyz' } },
        { category: 'fetch', data: { url: '/auth/v1/verify?token_hash=abc&type=recovery', method: 'POST' } },
        { category: 'ui.click', message: `left ${RESET}` },
      ],
    })
    expect(out.breadcrumbs?.[0].data).toEqual({ from: RESET_OUT, to: '/connexion?code=[Filtered]' })
    expect(out.breadcrumbs?.[1].data).toEqual({ url: '/auth/v1/verify?token_hash=[Filtered]&type=recovery', method: 'POST' })
    expect(out.breadcrumbs?.[2].message).toBe(`left ${RESET_OUT}`)
  })

  it('span descriptions and data, including the bare OTel url.query / url.fragment (no leading ? or #)', () => {
    const out = scrub({
      spans: [
        {
          description: 'GET /nouveau-mot-de-passe?token_hash=abc&type=recovery',
          data: { 'url.full': RESET, 'url.query': 'token_hash=abc&type=recovery', 'url.fragment': 'access_token=a&type=recovery' },
        },
      ],
    }) as unknown as { spans: Array<{ description: string; data: Record<string, unknown> }> }
    expect(out.spans[0].description).toBe('GET /nouveau-mot-de-passe?token_hash=[Filtered]&type=recovery')
    expect(out.spans[0].data).toEqual({
      'url.full': RESET_OUT,
      'url.query': 'token_hash=[Filtered]&type=recovery',
      'url.fragment': 'access_token=[Filtered]&type=recovery',
    })
  })

  it('tags, contexts and extra — and a `code` KEY (a Postgres error code) is left alone', () => {
    const out = scrub({
      tags: { url: RESET, route: '/nouveau-mot-de-passe' },
      contexts: { nextjs: { request_path: '/nouveau-mot-de-passe?token_hash=abc&type=recovery' }, trace: { data: { href: RESET } } },
      extra: { path: '/verifier-email?token_hash=abc&type=signup', code: '23514', status_code: 500 },
    })
    expect(out.tags).toEqual({ url: RESET_OUT, route: '/nouveau-mot-de-passe' })
    const contexts = out.contexts as Record<string, Record<string, unknown>>
    expect(contexts.nextjs.request_path).toBe('/nouveau-mot-de-passe?token_hash=[Filtered]&type=recovery')
    expect(contexts.trace.data).toEqual({ href: RESET_OUT })
    expect(out.extra).toEqual({ path: '/verifier-email?token_hash=[Filtered]&type=signup', code: '23514', status_code: 500 })
  })

  it('a very long URL is still scrubbed fast (near-miss shapes just under the 20k cut, fastest of 3)', () => {
    const shapes = [
      '/x?' + '&token_has'.repeat(1_990),
      '/x?' + '?code='.repeat(3_300),
      '/x?code=' + '%2'.repeat(6_600),
      '/x?token_hash=' + 'a'.repeat(19_900),
      '/x' + '%3Ftoken%3D'.repeat(1_800),
    ]
    for (const url of shapes) {
      expect(url.length).toBeLessThan(20_000)
      let fastest = Infinity
      for (let i = 0; i < 3; i++) {
        const started = performance.now()
        scrub({ request: { url } })
        fastest = Math.min(fastest, performance.now() - started)
      }
      expect(fastest).toBeLessThan(50)
    }
  })
})
