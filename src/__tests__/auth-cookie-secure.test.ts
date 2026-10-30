/**
 * Session cookies carry Secure in production (audit pass 3 « Logged »; src/lib/supabase/cookie-options.ts).
 * Both clients that write the sb-* cookies — the browser client (sign-in / sign-up / sign-out) and the server client
 * (session refresh, the /mon-compte re-auth) — must hand AUTH_COOKIE_OPTIONS to @supabase/ssr, which merges it over
 * its defaults for the cookies it sets AND removes. Not in development: Safari refuses Secure on http://localhost.
 * @supabase/ssr and next/headers are mocked; the module is re-imported per NODE_ENV (the value is read at import).
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

const h = vi.hoisted(() => ({
  createServerClient: vi.fn(() => ({})),
  createBrowserClient: vi.fn(() => ({})),
}))

vi.mock('@supabase/ssr', () => ({ createServerClient: h.createServerClient, createBrowserClient: h.createBrowserClient }))
vi.mock('next/headers', () => ({ cookies: vi.fn(async () => ({ getAll: () => [], set: vi.fn() })) }))

type Opts = { cookieOptions?: { secure?: boolean } }
const optsOf = (fn: typeof h.createServerClient) => (fn.mock.calls[0] as unknown as [string, string, Opts])[2]

beforeEach(() => {
  vi.resetModules()
  h.createServerClient.mockClear()
  h.createBrowserClient.mockClear()
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe.each([
  ['production', true],
  ['development', false],
  ['test', false],
])('NODE_ENV=%s → Secure %s', (env, secure) => {
  it('the server client passes cookieOptions.secure', async () => {
    vi.stubEnv('NODE_ENV', env)
    const { createClient } = await import('@/lib/supabase/server')
    await createClient()
    expect(optsOf(h.createServerClient).cookieOptions).toEqual({ secure })
  })

  it('the browser client passes cookieOptions.secure', async () => {
    vi.stubEnv('NODE_ENV', env)
    const { createClient } = await import('@/lib/supabase/client')
    createClient()
    expect(optsOf(h.createBrowserClient).cookieOptions).toEqual({ secure })
  })
})

describe('only `secure` is set, so @supabase/ssr keeps its other defaults', () => {
  it('no path / sameSite / maxAge / httpOnly override (the browser client must still read the cookie)', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    const { AUTH_COOKIE_OPTIONS } = await import('@/lib/supabase/cookie-options')
    expect(Object.keys(AUTH_COOKIE_OPTIONS)).toEqual(['secure'])
  })
})
