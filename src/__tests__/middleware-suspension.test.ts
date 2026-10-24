/**
 * Unit tests for src/middleware.ts — the session layer of suspension enforcement.
 *
 * Matcher: the old closed allowlist had drifted (it missed /demander, /mes-commandes, /mon-compte,
 * /parametres and every dashboard), so it was inverted to "everything except static assets, the auth
 * pages and the Sentry tunnel". unstable_doesMiddlewareMatch runs Next's own matcher compiler, so
 * these cases pin what production actually matches — including that each excluded segment is
 * anchored (/connexion is excluded, /connexion-x is not).
 *
 * Handler: @supabase/ssr is mocked. A suspended account is signed out on either signal — the
 * profiles.suspended_at lookup, or getUser()'s 403 user_banned (the auth ban answers that on a
 * still-unexpired token, so it is the signal a banned account actually hits). Anonymous, active and
 * unreadable cases pass through untouched.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { unstable_doesMiddlewareMatch } from 'next/experimental/testing/server'

const h = vi.hoisted(() => ({
  getUser: vi.fn(),
  maybeSingle: vi.fn(),
  eq: vi.fn(),
}))

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => ({
    auth: { getUser: h.getUser },
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
    '/fonts/cairo.woff2',
    '/connexion',
    '/connexion?suspended=1',
    '/inscription',
    '/inscription/vendeur',
    '/mot-de-passe-oublie',
    '/nouveau-mot-de-passe',
    '/verifier-email',
    '/auth/signout',
    '/monitoring',
    '/monitoring?o=4500&p=123',
  ])('skips %s', (path) => {
    expect(matches(path)).toBe(false)
  })
})

function request(path: string) {
  return new NextRequest(`http://localhost${path}`, {
    headers: { cookie: 'sb-xggo-auth-token=abc; sb-xggo-auth-token.1=def; lang=ar' },
  })
}

const passedThrough = (res: Response) => res.headers.get('x-middleware-next') === '1'

function expectSignedOut(res: Response) {
  expect(res.status).toBe(307)
  expect(res.headers.get('location')).toBe('http://localhost/connexion?suspended=1')
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
