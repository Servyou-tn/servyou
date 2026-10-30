/**
 * Unit tests for src/middleware.ts — the session layer of suspension enforcement.
 *
 * Matcher: the old closed allowlist had drifted (it missed /demander, /mes-commandes, /mon-compte,
 * /parametres and every dashboard), so it was inverted to "everything except static assets, the auth
 * pages and the Sentry tunnel". unstable_doesMiddlewareMatch runs Next's own matcher compiler, so
 * these cases pin what production actually matches — including that each excluded segment is
 * anchored (/connexion is excluded, /connexion-x is not), and that a file extension is excluded only
 * where public/ assets live (the root and /brand/): a dotted dynamic segment such as
 * /admin/utilisateurs/x.png is a page and a server-action endpoint, so it stays matched.
 *
 * Handler: @supabase/ssr is mocked. A suspended account is signed out on either signal — the
 * profiles.suspended_at lookup, or getUser()'s 403 user_banned (the auth ban answers that on a
 * still-unexpired token, so it is the signal a banned account actually hits). Anonymous, active and
 * unreadable cases pass through untouched.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import { unstable_doesMiddlewareMatch } from 'next/experimental/testing/server'

const h = vi.hoisted(() => ({
  getUser: vi.fn(),
  getSession: vi.fn(async () => ({ data: { session: null }, error: null })),
  maybeSingle: vi.fn(),
  eq: vi.fn(),
}))

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => ({
    auth: { getUser: h.getUser, getSession: h.getSession },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: (...args: unknown[]) => {
          h.eq(...args)
          return { maybeSingle: h.maybeSingle }
        },
      })),
    })),
  })),
}))

import { middleware, config } from '@/middleware'

const matches = (path: string) => unstable_doesMiddlewareMatch({ config, url: `http://localhost${path}` })

describe('matcher — everything but static assets, auth pages and the Sentry tunnel', () => {
  it.each([
    '/',
    '/marche',
    '/marche/produits',
    '/demander/123e4567-e89b-12d3-a456-426614174000',
    '/mes-commandes',
    '/commandes-recues',
    '/mes-produits',
    '/mes-services',
    '/mon-compte',
    '/parametres',
    '/tableau-de-bord',
    '/tableau-de-bord-vendeur',
    '/admin',
    '/admin/utilisateurs/123',
    '/boutique/123',
    '/freelance/123',
    '/a-propos',
    // Anchoring: an excluded word as a prefix of a longer segment is still matched.
    '/connexion-x',
    '/authentique',
    '/monitoring-report',
    '/inscriptions',
    '/maintenance-x',
    '/a-bientots',
    // A dotted dynamic segment is a page (and a server-action endpoint), not a static file: the
    // extension exclusion covers only where public/ assets live (the root and /brand/).
    '/admin/utilisateurs/x.png',
    '/demander/x.txt',
    '/mes-commandes/x.xml',
    '/produits/x.svg',
  ])('matches %s', (path) => {
    expect(matches(path)).toBe(true)
  })

  it.each([
    '/_next/static/chunks/main.js',
    '/_next/static/css/app.css',
    '/_next/image?url=%2Fbrand%2Flogo.png&w=64&q=75',
    '/favicon.ico',
    '/robots.txt',
    '/sitemap.xml',
    '/brand/icons/facebook-app-symbol.png',
    '/brand/logo.svg',
    '/brand/photo.jpg',
    '/file.svg',
    '/connexion',
    '/connexion?suspended=1',
    '/inscription',
    '/inscription/vendeur',
    '/mot-de-passe-oublie',
    '/nouveau-mot-de-passe',
    '/verifier-email',
    '/auth/signout',
    // The four K system pages are bounce targets: matching them would loop.
    '/a-bientot',
    '/session-expiree',
    '/session-expiree?next=%2Fmes-commandes',
    '/compte-suspendu',
    '/maintenance',
    '/monitoring',
    '/monitoring?o=4500&p=123',
  ])('skips %s', (path) => {
    expect(matches(path)).toBe(false)
  })
})

function request(path: string, init: { method?: string; headers?: Record<string, string> } = {}) {
  return new NextRequest(`http://localhost${path}`, {
    method: init.method ?? 'GET',
    headers: { cookie: 'sb-xggo-auth-token=abc; sb-xggo-auth-token.1=def; lang=ar', ...init.headers },
  })
}

const passedThrough = (res: Response) => res.headers.get('x-middleware-next') === '1'

function expectSignedOut(res: Response) {
  expect(res.status).toBe(307)
  expect(res.headers.get('location')).toBe('http://localhost/compte-suspendu')
  const setCookie = res.headers.get('set-cookie') ?? ''
  expect(setCookie).toContain('sb-xggo-auth-token=;')
  expect(setCookie).toContain('sb-xggo-auth-token.1=;')
  expect(setCookie).not.toContain('lang=')
}

beforeEach(() => {
  h.getUser.mockReset()
  h.maybeSingle.mockReset()
  h.eq.mockReset()
})

describe('handler', () => {
  // Every Next prefetch (segment cache) sends next-router-prefetch '1' or '2'; navigations never do.
  // getSession() only (the session-refresh persistence, middleware-session-refresh.test.ts): local unless the token
  // is about to expire, never the getUser() Auth round-trip or the suspension check.
  it.each(['1', '2'])('lets a GET <Link> prefetch (next-router-prefetch: %s) through without the getUser check', async (value) => {
    h.getUser.mockResolvedValue({ data: { user: null }, error: { code: 'user_banned', status: 403, message: 'User is banned' } })
    const res = await middleware(request('/mes-commandes', { headers: { 'next-router-prefetch': value } }))
    expect(passedThrough(res)).toBe(true)
    expect(h.getUser).not.toHaveBeenCalled()
  })

  it('still checks a POST carrying the prefetch header (a server action never skips)', async () => {
    h.getUser.mockResolvedValue({ data: { user: null }, error: { code: 'user_banned', status: 403, message: 'User is banned' } })
    expectSignedOut(await middleware(request('/mes-commandes', { method: 'POST', headers: { 'next-router-prefetch': '1' } })))
  })

  it('still checks the navigation that follows a prefetch (no header)', async () => {
    h.getUser.mockResolvedValue({ data: { user: null }, error: { code: 'user_banned', status: 403, message: 'User is banned' } })
    expectSignedOut(await middleware(request('/mes-commandes', { headers: { rsc: '1' } })))
  })

  it('passes an anonymous visitor through without a profile lookup', async () => {
    h.getUser.mockResolvedValue({ data: { user: null }, error: { code: undefined, name: 'AuthSessionMissingError', status: 400 } })
    const res = await middleware(request('/mes-commandes'))
    expect(passedThrough(res)).toBe(true)
    expect(h.maybeSingle).not.toHaveBeenCalled()
  })

  it('passes an active user through after one lookup of their own row', async () => {
    h.getUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null })
    h.maybeSingle.mockResolvedValue({ data: { suspended_at: null }, error: null })
    const res = await middleware(request('/mes-commandes'))
    expect(passedThrough(res)).toBe(true)
    expect(h.eq).toHaveBeenCalledWith('id', 'u1')
  })

  it('signs out a user whose profile is suspended and sends them to the banner', async () => {
    h.getUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null })
    h.maybeSingle.mockResolvedValue({ data: { suspended_at: '2026-10-24T19:00:00Z' }, error: null })
    expectSignedOut(await middleware(request('/demander/abc')))
  })

  it('signs out a banned account (getUser → 403 user_banned) without a profile lookup', async () => {
    h.getUser.mockResolvedValue({ data: { user: null }, error: { code: 'user_banned', status: 403, message: 'User is banned' } })
    expectSignedOut(await middleware(request('/')))
    expect(h.maybeSingle).not.toHaveBeenCalled()
  })

  it('passes through on any other getUser error (an outage is not a suspension)', async () => {
    h.getUser.mockResolvedValue({ data: { user: null }, error: { code: 'unexpected_failure', status: 500, message: 'boom' } })
    expect(passedThrough(await middleware(request('/')))).toBe(true)
  })

  it('fails open and logs the fields when the profile lookup errors (unchanged behaviour)', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    h.getUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null })
    h.maybeSingle.mockResolvedValue({ data: null, error: { message: 'timeout', code: '57014', details: null } })
    expect(passedThrough(await middleware(request('/')))).toBe(true)
    expect(log).toHaveBeenCalledWith('[middleware] suspended_at lookup error:', 'timeout', '57014', null)
    log.mockRestore()
  })
})

// K2 — an expired session. Only a present auth cookie + a "session is gone" code + a GET may redirect.
describe('K2 — expired session', () => {
  const gone = (code: string) => ({ data: { user: null }, error: { code, status: 400, message: code } })

  function expectExpired(res: Response, next: string | null) {
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toBe(
      next === null ? 'http://localhost/session-expiree' : `http://localhost/session-expiree?next=${encodeURIComponent(next)}`,
    )
    const setCookie = res.headers.get('set-cookie') ?? ''
    expect(setCookie).toContain('sb-xggo-auth-token=;')
    expect(setCookie).toContain('sb-xggo-auth-token.1=;')
    expect(setCookie).not.toContain('lang=')
  }

  const html = { accept: 'text/html,application/xhtml+xml' }

  it.each([
    'session_expired',
    'session_not_found',
    'refresh_token_not_found',
    'bad_jwt',
    'user_not_found',
  ])('redirects a GET navigation with an auth cookie on %s, clearing the cookies and keeping the page', async (code) => {
    h.getUser.mockResolvedValue(gone(code))
    expectExpired(await middleware(request('/mes-commandes?tab=2', { headers: html })), '/mes-commandes?tab=2')
  })

  it('also redirects an RSC navigation fetch', async () => {
    h.getUser.mockResolvedValue(gone('session_expired'))
    expectExpired(await middleware(request('/mes-commandes', { headers: { rsc: '1', accept: 'text/x-component' } })), '/mes-commandes')
  })

  it('omits ?next= for the home page', async () => {
    h.getUser.mockResolvedValue(gone('session_expired'))
    expectExpired(await middleware(request('/', { headers: html })), null)
  })

  it('does NOT treat refresh_token_already_used as a gone session (the discarded rotation can cause it)', async () => {
    h.getUser.mockResolvedValue(gone('refresh_token_already_used'))
    expect(passedThrough(await middleware(request('/mes-commandes', { headers: html })))).toBe(true)
  })

  it('leaves a non-navigation GET (a JSON fetch) alone', async () => {
    h.getUser.mockResolvedValue(gone('session_expired'))
    expect(passedThrough(await middleware(request('/mes-commandes', { headers: { accept: 'application/json' } })))).toBe(true)
  })

  it('passes an anonymous visitor with NO auth cookie through, whatever the code', async () => {
    h.getUser.mockResolvedValue(gone('session_expired'))
    const res = await middleware(request('/mes-commandes', { headers: { cookie: 'lang=ar', accept: 'text/html' } }))
    expect(passedThrough(res)).toBe(true)
  })

  it('does not treat the PKCE code-verifier cookie as a session', async () => {
    h.getUser.mockResolvedValue(gone('session_not_found'))
    const res = await middleware(request('/mes-commandes', { headers: { cookie: 'sb-xggo-auth-token-code-verifier=zzz', accept: 'text/html' } }))
    expect(passedThrough(res)).toBe(true)
  })

  it('passes through on an error that is not a gone session (an auth outage must not log everyone out)', async () => {
    h.getUser.mockResolvedValue({ data: { user: null }, error: { name: 'AuthRetryableFetchError', status: 0, message: 'fetch failed' } })
    expect(passedThrough(await middleware(request('/mes-commandes', { headers: { accept: 'text/html' } })))).toBe(true)
    h.getUser.mockResolvedValue(gone('over_request_rate_limit'))
    expect(passedThrough(await middleware(request('/mes-commandes', { headers: { accept: 'text/html' } })))).toBe(true)
  })

  it('never redirects a POST (a server action fails its own auth check)', async () => {
    h.getUser.mockResolvedValue(gone('session_expired'))
    expect(passedThrough(await middleware(request('/mes-commandes', { method: 'POST' })))).toBe(true)
  })
})

// K4 — MAINTENANCE_MODE=1 short-circuits before any auth call.
describe('K4 — maintenance mode', () => {
  beforeEach(() => {
    vi.stubEnv('MAINTENANCE_MODE', '1')
  })
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('redirects a GET to /maintenance without calling Auth', async () => {
    const res = await middleware(request('/marche/produits'))
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toBe('http://localhost/maintenance')
    expect(h.getUser).not.toHaveBeenCalled()
  })

  it('answers any other method 503 with Retry-After', async () => {
    const res = await middleware(request('/mes-commandes', { method: 'POST' }))
    expect(res.status).toBe(503)
    expect(res.headers.get('retry-after')).toBe('300')
    expect(h.getUser).not.toHaveBeenCalled()
  })

  it.each(['0', '', 'true'])('is off for MAINTENANCE_MODE=%j (only the literal 1 turns it on)', async (value) => {
    vi.stubEnv('MAINTENANCE_MODE', value)
    h.getUser.mockResolvedValue({ data: { user: null }, error: { name: 'AuthSessionMissingError', status: 400 } })
    expect(passedThrough(await middleware(request('/marche/produits')))).toBe(true)
  })
})
