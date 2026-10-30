/**
 * Session-refresh persistence in src/middleware.ts (docs/follow-ups/suspension-enforcement.md « server-side getUser()
 * refreshes near expiry and throws the rotated tokens away »).
 *
 * When getUser() / getSession() refresh, @supabase/ssr calls setAll() with the rotated cookies. The middleware must
 * write them onto the RESPONSE (the browser keeps them) and onto the forwarded REQUEST (this request's Server
 * Components read the new session instead of refreshing again), with #257's cookie options and @supabase/ssr's
 * no-store headers. A removal-only setAll (supabase-js dropping the session after a failed refresh) is ignored —
 * K2 owns clearing a gone session. @supabase/ssr is mocked; the live proof is session-refresh-live.test.ts.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

type SetAll = (cookies: { name: string; value: string; options: Record<string, unknown> }[], headers: Record<string, string>) => void
type Opts = { cookieOptions?: unknown; cookies: { getAll: () => unknown; setAll: SetAll } }

const h = vi.hoisted(() => ({
  opts: null as unknown as { cookieOptions?: unknown; cookies: { setAll: (...a: unknown[]) => void } },
  getUser: vi.fn(),
  getSession: vi.fn(),
  maybeSingle: vi.fn(),
  created: 0,
}))

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn((_url: string, _key: string, opts: Opts) => {
    h.opts = opts as typeof h.opts
    h.created++
    return {
      auth: { getUser: h.getUser, getSession: h.getSession },
      from: () => ({ select: () => ({ eq: () => ({ maybeSingle: h.maybeSingle }) }) }),
    }
  }),
}))

import { middleware } from '@/middleware'
import { AUTH_COOKIE_OPTIONS } from '@/lib/supabase/cookie-options'

const OLD = 'sb-xggo-auth-token=base64-old; lang=ar'
const COOKIE_OPTS = { path: '/', sameSite: 'lax', httpOnly: false, maxAge: 34560000, secure: true }
const NO_STORE = { 'Cache-Control': 'private, no-cache, no-store, must-revalidate, max-age=0', Expires: '0', Pragma: 'no-cache' }

function request(path: string, headers: Record<string, string> = {}) {
  return new NextRequest(`http://localhost${path}`, { headers: { cookie: OLD, accept: 'text/html', ...headers } })
}

// What @supabase/ssr does on a successful refresh: the new (here chunked) session, and a removal of the stale name.
const refresh = () =>
  (h.opts.cookies.setAll as SetAll)(
    [
      { name: 'sb-xggo-auth-token', value: '', options: { ...COOKIE_OPTS, maxAge: 0 } },
      { name: 'sb-xggo-auth-token.0', value: 'base64-new0', options: COOKIE_OPTS },
      { name: 'sb-xggo-auth-token.1', value: 'new1', options: COOKIE_OPTS },
    ],
    NO_STORE,
  )
// What supabase-js does after a failed refresh: remove the session.
const removeOnly = () =>
  (h.opts.cookies.setAll as SetAll)([{ name: 'sb-xggo-auth-token', value: '', options: { ...COOKIE_OPTS, maxAge: 0 } }], NO_STORE)

const passedThrough = (res: Response) => res.headers.get('x-middleware-next') === '1'
const setCookie = (res: Response) => res.headers.getSetCookie().join('\n')

beforeEach(() => {
  h.getUser.mockReset()
  h.getSession.mockReset()
  h.maybeSingle.mockReset()
  h.created = 0
  h.maybeSingle.mockResolvedValue({ data: { suspended_at: null }, error: null })
})

describe('navigation: getUser() refreshes → the rotated session is persisted', () => {
  it('passes #257 cookie options to the client', async () => {
    h.getUser.mockResolvedValue({ data: { user: null }, error: null })
    await middleware(request('/mes-commandes'))
    expect(h.opts.cookieOptions).toBe(AUTH_COOKIE_OPTIONS)
  })

  it('writes the new cookies onto the response, with their options and the no-store headers', async () => {
    h.getUser.mockImplementation(async () => {
      refresh()
      return { data: { user: { id: 'u1' } }, error: null }
    })
    const res = await middleware(request('/mes-commandes'))
    expect(passedThrough(res)).toBe(true)
    const sc = setCookie(res)
    expect(sc).toContain('sb-xggo-auth-token.0=base64-new0')
    expect(sc).toContain('sb-xggo-auth-token.1=new1')
    expect(sc).toMatch(/sb-xggo-auth-token=;.*Max-Age=0/)
    expect(sc).toMatch(/sb-xggo-auth-token\.0=base64-new0;.*Secure/)
    expect(res.headers.get('cache-control')).toBe(NO_STORE['Cache-Control'])
  })

  it('forwards the new cookies on the request, so Server Components do not refresh again', async () => {
    h.getUser.mockImplementation(async () => {
      refresh()
      return { data: { user: { id: 'u1' } }, error: null }
    })
    const res = await middleware(request('/mes-commandes'))
    const forwarded = res.headers.get('x-middleware-request-cookie') ?? ''
    expect(forwarded).toContain('sb-xggo-auth-token.0=base64-new0')
    expect(forwarded).toContain('lang=ar')
    // The stale single cookie is emptied on the request too, so the chunks are what the page reads.
    expect(forwarded).not.toContain('base64-old')
  })

  it("a second setAll in the same run keeps the first one's cookies", async () => {
    h.getUser.mockImplementation(async () => {
      refresh()
      ;(h.opts.cookies.setAll as SetAll)([{ name: 'sb-xggo-auth-token-extra', value: 'x', options: COOKIE_OPTS }], NO_STORE)
      return { data: { user: { id: 'u1' } }, error: null }
    })
    const sc = setCookie(await middleware(request('/mes-commandes')))
    expect(sc).toContain('sb-xggo-auth-token.0=base64-new0')
    expect(sc).toContain('sb-xggo-auth-token-extra=x')
  })

  it('persists a refresh even when the user lookup then fails (an outage after the rotation)', async () => {
    h.getUser.mockImplementation(async () => {
      refresh()
      return { data: { user: null }, error: { name: 'AuthRetryableFetchError', status: 0, message: 'fetch failed' } }
    })
    const res = await middleware(request('/mes-commandes'))
    expect(passedThrough(res)).toBe(true)
    expect(setCookie(res)).toContain('sb-xggo-auth-token.0=base64-new0')
  })

  it('no refresh (the happy path): a plain pass-through, no Set-Cookie, no cache headers', async () => {
    h.getUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null })
    const res = await middleware(request('/mes-commandes'))
    expect(passedThrough(res)).toBe(true)
    expect(setCookie(res)).toBe('')
    expect(res.headers.get('cache-control')).toBeNull()
  })

  it('a suspended account is still signed out after a refresh (cookies cleared, not persisted)', async () => {
    h.getUser.mockImplementation(async () => {
      refresh()
      return { data: { user: { id: 'u1' } }, error: null }
    })
    h.maybeSingle.mockResolvedValue({ data: { suspended_at: '2026-10-30T10:00:00Z' }, error: null })
    const res = await middleware(request('/mes-commandes'))
    expect(res.headers.get('location')).toBe('http://localhost/compte-suspendu')
    const sc = setCookie(res)
    expect(sc).not.toContain('base64-new0')
    // The rotated chunk names are deleted too, not only the old cookie: no session survives the sign-out.
    expect(sc).toContain('sb-xggo-auth-token.0=;')
    expect(sc).toContain('sb-xggo-auth-token.1=;')
  })
})

describe('a removal-only write is ignored (K2 owns clearing a gone session)', () => {
  it('a failed refresh that is not a gone session: pass-through, the cookies stay', async () => {
    h.getUser.mockImplementation(async () => {
      removeOnly()
      return { data: { user: null }, error: { code: 'refresh_token_already_used', status: 400, message: 'used' } }
    })
    const res = await middleware(request('/mes-commandes'))
    expect(passedThrough(res)).toBe(true)
    expect(setCookie(res)).toBe('')
  })

  it('a gone session still goes to K2 (/session-expiree), which clears the cookies itself', async () => {
    h.getUser.mockImplementation(async () => {
      removeOnly()
      return { data: { user: null }, error: { code: 'refresh_token_not_found', status: 400, message: 'gone' } }
    })
    const res = await middleware(request('/mes-commandes'))
    expect(res.headers.get('location')).toBe('http://localhost/session-expiree?next=%2Fmes-commandes')
    expect(setCookie(res)).toContain('sb-xggo-auth-token=;')
  })
})

describe('prefetch: refreshed by getSession(), never the getUser() check', () => {
  const prefetch = (cookie = OLD) => request('/mes-commandes', { 'next-router-prefetch': '1', cookie })

  it('an expiring session is refreshed and persisted on the prefetch response', async () => {
    h.getSession.mockImplementation(async () => {
      refresh()
      return { data: { session: {} }, error: null }
    })
    const res = await middleware(prefetch())
    expect(h.getUser).not.toHaveBeenCalled()
    expect(h.maybeSingle).not.toHaveBeenCalled()
    expect(passedThrough(res)).toBe(true)
    expect(setCookie(res)).toContain('sb-xggo-auth-token.0=base64-new0')
  })

  it('a fresh session: no Set-Cookie', async () => {
    h.getSession.mockResolvedValue({ data: { session: {} }, error: null })
    const res = await middleware(prefetch())
    expect(setCookie(res)).toBe('')
  })

  it('an anonymous prefetch creates no Supabase client at all', async () => {
    const res = await middleware(prefetch('lang=ar'))
    expect(h.created).toBe(0)
    expect(passedThrough(res)).toBe(true)
  })

  it('a failed refresh leaves the session cookies alone and sets the 60 s backoff', async () => {
    h.getSession.mockImplementation(async () => {
      removeOnly()
      return { data: { session: null }, error: { code: 'refresh_token_not_found', status: 400, message: 'gone' } }
    })
    const res = await middleware(prefetch())
    expect(passedThrough(res)).toBe(true)
    const sc = setCookie(res)
    expect(sc).not.toContain('sb-xggo-auth-token')
    expect(sc).toMatch(/sv-refresh-backoff=1;.*Max-Age=60/)
    expect(sc).toMatch(/sv-refresh-backoff=1;.*HttpOnly/)
  })

  it('while the backoff is set, a prefetch makes no refresh attempt at all', async () => {
    const res = await middleware(prefetch(`${OLD}; sv-refresh-backoff=1`))
    expect(h.created).toBe(0)
    expect(h.getSession).not.toHaveBeenCalled()
    expect(passedThrough(res)).toBe(true)
  })

  it('a navigation ignores the backoff (K2 and the refresh still run there)', async () => {
    h.getUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null })
    await middleware(request('/mes-commandes', { cookie: `${OLD}; sv-refresh-backoff=1` }))
    expect(h.getUser).toHaveBeenCalledTimes(1)
  })
})
