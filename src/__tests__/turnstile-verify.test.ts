/**
 * verifyTurnstile (src/lib/security/turnstile.ts) — the server-side bot check in front of the order-request and
 * report actions. Security-sensitive, so every branch is pinned with Cloudflare's siteverify mocked (no network):
 *   • no TURNSTILE_SECRET_KEY → skipped, no request;
 *   • secret set → FAIL CLOSED: missing / malformed / oversized token, success:false, HTTP error, network error
 *     and timeout all refuse; only success:true passes;
 *   • the request carries the secret, the token and the caller's first x-forwarded-for hop;
 *   • neither the token nor the secret is ever logged.
 * Run by path.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

vi.mock('next/headers', () => ({
  headers: vi.fn(async () => new Headers({ 'x-forwarded-for': '203.0.113.7, 10.0.0.1' })),
}))

import { verifyTurnstile, SITEVERIFY_URL } from '@/lib/security/turnstile'

const SECRET = '1x0000000000000000000000000000000AA' // Cloudflare's dummy always-pass secret
const TOKEN = 'XXXX.DUMMY.TOKEN.XXXX' // Cloudflare's dummy token

const fetchMock = vi.fn()
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
const logs: string[] = []

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
  vi.stubEnv('TURNSTILE_SECRET_KEY', SECRET)
  logs.length = 0
  for (const level of ['log', 'warn', 'error'] as const) {
    vi.spyOn(console, level).mockImplementation((...args: unknown[]) => {
      logs.push(args.map(String).join(' '))
    })
  }
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe('verifyTurnstile — no secret', () => {
  it('skips verification entirely (no request) when TURNSTILE_SECRET_KEY is absent outside production', async () => {
    vi.stubEnv('TURNSTILE_SECRET_KEY', '')
    vi.stubEnv('VERCEL_ENV', '')
    vi.stubEnv('NODE_ENV', 'test')
    expect(await verifyTurnstile(undefined)).toEqual({ ok: true })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  // Pre-beta review M4: a lost secret in production must not silently switch bot protection off.
  it('FAILS CLOSED in production (VERCEL_ENV=production) and logs the misconfiguration', async () => {
    vi.stubEnv('TURNSTILE_SECRET_KEY', '')
    vi.stubEnv('VERCEL_ENV', 'production')
    vi.stubEnv('NODE_ENV', 'production')
    expect(await verifyTurnstile(TOKEN)).toEqual({ ok: false, reason: 'misconfigured' })
    expect(fetchMock).not.toHaveBeenCalled()
    expect(logs.some((l) => l.includes('TURNSTILE_SECRET_KEY is missing in production'))).toBe(true)
  })

  it.each(['preview', 'development'])('still skips on a %s deployment (the secret is Production-only)', async (env) => {
    vi.stubEnv('TURNSTILE_SECRET_KEY', '')
    vi.stubEnv('VERCEL_ENV', env)
    vi.stubEnv('NODE_ENV', 'production')
    expect(await verifyTurnstile(undefined)).toEqual({ ok: true })
  })

  it('a production build with VERCEL_ENV missing fails closed too (the safe default)', async () => {
    vi.stubEnv('TURNSTILE_SECRET_KEY', '')
    vi.stubEnv('VERCEL_ENV', '')
    vi.stubEnv('NODE_ENV', 'production')
    expect(await verifyTurnstile(TOKEN)).toEqual({ ok: false, reason: 'misconfigured' })
  })
})

describe('verifyTurnstile — secret set (fail closed)', () => {
  it.each([
    ['undefined', undefined],
    ['empty', ''],
    ['not a string', 42],
    ['over 2048 chars', 'x'.repeat(2049)],
  ])('refuses a %s token without calling Cloudflare', async (_label, token) => {
    expect(await verifyTurnstile(token)).toEqual({ ok: false, reason: 'missing-token' })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('passes on success:true, posting secret + token + the first forwarded IP to siteverify', async () => {
    fetchMock.mockResolvedValue(json({ success: true, 'error-codes': [] }))
    expect(await verifyTurnstile(TOKEN)).toEqual({ ok: true })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe(SITEVERIFY_URL)
    expect(init.method).toBe('POST')
    expect(init.signal).toBeInstanceOf(AbortSignal)
    const body = init.body as URLSearchParams
    expect(body.get('secret')).toBe(SECRET)
    expect(body.get('response')).toBe(TOKEN)
    expect(body.get('remoteip')).toBe('203.0.113.7')
  })

  it('refuses on success:false', async () => {
    fetchMock.mockResolvedValue(json({ success: false, 'error-codes': ['invalid-input-response'] }))
    expect(await verifyTurnstile(TOKEN)).toEqual({ ok: false, reason: 'rejected' })
  })

  it('refuses a truthy-but-not-true success (no loose check)', async () => {
    fetchMock.mockResolvedValue(json({ success: 'true' }))
    expect(await verifyTurnstile(TOKEN)).toEqual({ ok: false, reason: 'rejected' })
  })

  it('refuses when siteverify answers an HTTP error', async () => {
    fetchMock.mockResolvedValue(json({}, 500))
    expect(await verifyTurnstile(TOKEN)).toEqual({ ok: false, reason: 'unavailable' })
  })

  it('refuses on a network error', async () => {
    fetchMock.mockRejectedValue(new TypeError('fetch failed'))
    expect(await verifyTurnstile(TOKEN)).toEqual({ ok: false, reason: 'unavailable' })
  })

  it('refuses on a timeout', async () => {
    fetchMock.mockRejectedValue(new DOMException('The operation was aborted due to timeout', 'TimeoutError'))
    expect(await verifyTurnstile(TOKEN)).toEqual({ ok: false, reason: 'unavailable' })
  })

  it('refuses a non-JSON answer', async () => {
    fetchMock.mockResolvedValue(new Response('<html>', { status: 200 }))
    expect(await verifyTurnstile(TOKEN)).toEqual({ ok: false, reason: 'unavailable' })
  })

  it('never logs the token or the secret', async () => {
    fetchMock.mockResolvedValueOnce(json({ success: false, 'error-codes': ['timeout-or-duplicate'] }))
    await verifyTurnstile(TOKEN)
    fetchMock.mockRejectedValueOnce(new Error(`boom ${TOKEN} ${SECRET}`))
    await verifyTurnstile(TOKEN)
    await verifyTurnstile('')
    expect(logs.length).toBeGreaterThan(0)
    for (const line of logs) {
      expect(line).not.toContain(TOKEN)
      expect(line).not.toContain(SECRET)
    }
  })
})
