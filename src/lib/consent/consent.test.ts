import { describe, it, expect, vi } from 'vitest'
import {
  CONSENT_COOKIE,
  CONSENT_MAX_AGE_SECONDS,
  CONSENT_VALIDITY_DAYS,
  CONSENT_VERSION,
  consentCookieString,
  hasConsent,
  makeConsent,
  parseConsent,
} from './consent'

const DAY = 24 * 60 * 60 * 1000
const NOW = Date.parse('2026-10-30T12:00:00.000Z')
const raw = (over: Record<string, unknown> = {}) => JSON.stringify({ v: CONSENT_VERSION, audience: true, ts: NOW - DAY, ...over })

describe('parseConsent — a stored value is trusted only when it is whole, current and not expired', () => {
  it('reads a valid choice, yes or no', () => {
    expect(parseConsent(raw(), NOW)).toEqual({ v: 1, audience: true, ts: NOW - DAY })
    expect(parseConsent(raw({ audience: false }), NOW)?.audience).toBe(false)
  })

  it('no cookie, an empty one and junk are « not asked »', () => {
    for (const bad of [undefined, null, '', 'nope', '{', '42', 'null', '[]']) expect(parseConsent(bad, NOW)).toBeNull()
  })

  it('a bumped version re-asks (an old v, or a future one)', () => {
    expect(parseConsent(raw({ v: 0 }), NOW)).toBeNull()
    expect(parseConsent(raw({ v: 2 }), NOW)).toBeNull()
  })

  it('a wrong shape never reads as a grant (audience must be a real boolean, ts a finite number)', () => {
    expect(parseConsent(raw({ audience: 'true' }), NOW)).toBeNull()
    expect(parseConsent(raw({ audience: 1 }), NOW)).toBeNull()
    expect(parseConsent(raw({ audience: undefined }), NOW)).toBeNull()
    expect(parseConsent(raw({ ts: '2026-10-29' }), NOW)).toBeNull()
    expect(parseConsent(raw({ ts: null }), NOW)).toBeNull()
  })

  it('is valid for 6 months and then asks again — the boundary is exact', () => {
    expect(CONSENT_VALIDITY_DAYS).toBe(183)
    expect(parseConsent(raw({ ts: NOW - 183 * DAY }), NOW)).not.toBeNull()
    expect(parseConsent(raw({ ts: NOW - 183 * DAY - 1 }), NOW)).toBeNull()
    expect(parseConsent(raw({ ts: NOW - 400 * DAY }), NOW)).toBeNull()
  })

  it('refuses a timestamp from the future beyond a day of clock skew (a forged value cannot live forever)', () => {
    expect(parseConsent(raw({ ts: NOW + DAY / 2 }), NOW)).not.toBeNull()
    expect(parseConsent(raw({ ts: NOW + 2 * DAY }), NOW)).toBeNull()
  })

  it('drops unknown extra fields', () => {
    expect(parseConsent(raw({ admin: true }), NOW)).toEqual({ v: 1, audience: true, ts: NOW - DAY })
  })
})

describe('hasConsent — the one question future analytics asks', () => {
  it('is true only for an explicit, valid yes', () => {
    expect(hasConsent(makeConsent(true, NOW), 'audience')).toBe(true)
    expect(hasConsent(makeConsent(false, NOW), 'audience')).toBe(false)
  })

  it('is false when the visitor has not chosen (null) — silence is not consent', () => {
    expect(hasConsent(null, 'audience')).toBe(false)
  })

  it('is false once the stored choice has expired (parseConsent returns null)', () => {
    expect(hasConsent(parseConsent(raw({ ts: NOW - 200 * DAY }), NOW), 'audience')).toBe(false)
  })
})

describe('consentCookieString', () => {
  it('stores URI-encoded JSON, first-party, SameSite=Lax, 6 months, Path=/', () => {
    const c = makeConsent(true, NOW)
    const s = consentCookieString(c, true)
    const [pair, ...attrs] = s.split('; ')
    expect(pair.startsWith(`${CONSENT_COOKIE}=`)).toBe(true)
    expect(JSON.parse(decodeURIComponent(pair.slice(CONSENT_COOKIE.length + 1)))).toEqual({ v: 1, audience: true, ts: NOW })
    expect(attrs).toEqual(['Path=/', `Max-Age=${CONSENT_MAX_AGE_SECONDS}`, 'SameSite=Lax', 'Secure'])
    expect(CONSENT_MAX_AGE_SECONDS).toBe(183 * 24 * 60 * 60)
  })

  it('omits Secure on plain http (some browsers drop a Secure cookie there)', () => {
    expect(consentCookieString(makeConsent(false, NOW), false)).not.toContain('Secure')
  })

  it('round-trips through parseConsent', () => {
    const s = consentCookieString(makeConsent(true, NOW), true)
    const value = decodeURIComponent(s.split('; ')[0].slice(CONSENT_COOKIE.length + 1))
    expect(parseConsent(value, NOW)).toEqual({ v: 1, audience: true, ts: NOW })
  })
})

describe('getConsent / hasConsent (server)', () => {
  it('reads the cookie the browser wrote, encoded or already decoded, and rejects junk', async () => {
    let value: string | undefined
    vi.resetModules()
    vi.doMock('next/headers', () => ({ cookies: async () => ({ get: () => (value === undefined ? undefined : { value }) }) }))
    const server = await import('./server')
    const good = JSON.stringify({ v: 1, audience: true, ts: Date.now() })

    value = encodeURIComponent(good)
    expect(await server.hasConsent('audience')).toBe(true)
    value = good
    expect(await server.hasConsent('audience')).toBe(true)
    value = undefined
    expect(await server.getConsent()).toBeNull()
    expect(await server.hasConsent('audience')).toBe(false)
    value = '%E0%A4%A'
    expect(await server.getConsent()).toBeNull()
    value = JSON.stringify({ v: 1, audience: true, ts: Date.now() - 200 * DAY })
    expect(await server.hasConsent('audience')).toBe(false)
    vi.doUnmock('next/headers')
  })
})
