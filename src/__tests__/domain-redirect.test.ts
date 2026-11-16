/**
 * The domain switch (next.config.ts redirects()): servyou.vercel.app — that exact host only — answers every request with a
 * permanent redirect to https://servyou.tn, same path and same query string. Preview and deployment URLs keep serving the
 * app, and the own domain never redirects to itself.
 *
 * The redirects are run through Next's OWN matchers (the path matcher, matchHas, prepareDestination and the query
 * stringifier its router uses), in the order Next's router applies them: first match wins. That proves Next's semantics
 * (`next dev`, `next start`); on Vercel the platform router runs the same rules. Run by path.
 */

import type { IncomingMessage } from 'http'
import { parse, stringify } from 'querystring'
import { describe, it, expect } from 'vitest'
import { getPathMatch } from 'next/dist/shared/lib/router/utils/path-match'
import { matchHas, prepareDestination } from 'next/dist/shared/lib/router/utils/prepare-destination'
import loadCustomRoutes from 'next/dist/lib/load-custom-routes'
import { modifyRouteRegex } from 'next/dist/lib/redirect-status'
import nextConfig from '../../next.config'
import { DEFAULT_SITE_URL } from '@/lib/seo/site-url'
import { sentryTunnelRedirects } from '@/lib/security/sentry-tunnel'

const OLD_HOST = 'servyou.vercel.app'

async function redirectRules() {
  return nextConfig.redirects!()
}

/** The domain-switch rule: the one redirect keyed on a host. */
async function hostRule() {
  const rule = (await redirectRules()).find((r) => r.has?.some((h) => h.type === 'host'))
  if (!rule) throw new Error('no host redirect in next.config.ts')
  return rule
}

/** What Next answers for `url` on `host`: the first matching redirect's status and Location, or null (no redirect). */
async function resolveRedirect(host: string, url: string): Promise<{ status: number; location: string } | null> {
  const { pathname, search } = new URL(url, 'http://unused.invalid')
  // Parsed as Next's router parses it (querystring): a repeated key stays an array.
  const query = parse(search.slice(1))
  const req = { headers: { host } } as unknown as IncomingMessage
  for (const rule of await redirectRules()) {
    // Built as Next's router builds a redirect matcher (server/lib/router-utils/filesystem.js buildCustomRoute).
    const params = getPathMatch(rule.source, {
      strict: true,
      removeUnnamedParams: true,
      regexModifier: (regex) => modifyRouteRegex(regex, ['/_next']),
    })(pathname)
    if (!params) continue
    const hasParams = rule.has || rule.missing ? matchHas(req, query, rule.has, rule.missing) : {}
    if (!hasParams) continue
    const { parsedDestination } = prepareDestination({
      appendParamsToQuery: false,
      destination: rule.destination,
      params: { ...params, ...hasParams },
      query,
    })
    const search = stringify(parsedDestination.query)
    const { protocol, hostname, port } = parsedDestination
    const origin = hostname ? `${protocol}//${hostname}${port ? `:${port}` : ''}` : ''
    return {
      status: rule.permanent ? 308 : 307,
      location: `${origin}${parsedDestination.pathname}${search ? `?${search}` : ''}`,
    }
  }
  return null
}

describe('the rule', () => {
  it('comes right after the Sentry tunnel guard, before every path redirect', async () => {
    // The guard (#387) stays first; it only matches /monitoring without our org and project. Every path redirect
    // (/login, /signup, …) comes after the host rule, so an old link reaches the new host in one hop.
    const rules = await redirectRules()
    const guard = sentryTunnelRedirects(process.env.NEXT_PUBLIC_SENTRY_DSN)
    expect(rules.slice(0, guard.length)).toEqual(guard)
    expect(rules.findIndex((r) => r.has?.some((h) => h.type === 'host'))).toBe(guard.length)
  })

  it('is permanent, every path, the old host only, to the site address', async () => {
    const first = await hostRule()
    expect(first).toEqual({
      source: '/:path*',
      has: [{ type: 'host', value: 'servyou\\.vercel\\.app' }],
      destination: 'https://servyou.tn/:path*',
      permanent: true,
    })
    expect(DEFAULT_SITE_URL).toBe('https://servyou.tn')
    // Never a loop: the destination is another host.
    expect(new URL(first.destination.replace('/:path*', '/')).hostname).not.toBe(OLD_HOST)
  })

  it('passes Next\'s own route validation (what `next build` runs)', async () => {
    const { redirects } = await loadCustomRoutes(nextConfig)
    expect(redirects.find((r) => r.has?.some((h) => h.type === 'host'))).toMatchObject({
      source: '/:path*',
      destination: 'https://servyou.tn/:path*',
      permanent: true,
    })
  })
})

describe('servyou.vercel.app → https://servyou.tn, same path and query', () => {
  it.each([
    ['/', 'https://servyou.tn'], // an empty path IS the root: the browser requests https://servyou.tn/
    ['/produits/42', 'https://servyou.tn/produits/42'],
    ['/produits/42?ref=wa&x=1', 'https://servyou.tn/produits/42?ref=wa&x=1'],
    ['/connexion?next=%2Fmon-compte', 'https://servyou.tn/connexion?next=%2Fmon-compte'],
    ['/recherche?ville=sfax&ville=tunis&page=2', 'https://servyou.tn/recherche?ville=sfax&ville=tunis&page=2'],
    ['/recherche?q=%D8%AE%D8%AF%D9%85%D8%A9', 'https://servyou.tn/recherche?q=%D8%AE%D8%AF%D9%85%D8%A9'],
    ['/categories/design-graphique/logo', 'https://servyou.tn/categories/design-graphique/logo'],
    // The host rule comes before the path redirects: an old /login link reaches the new host in one hop (servyou.tn then sends it on to /connexion).
    ['/login', 'https://servyou.tn/login'],
  ])('%s → %s (308)', async (url, location) => {
    expect(await resolveRedirect(OLD_HOST, url)).toEqual({ status: 308, location })
  })

  it.each(['SERVYOU.VERCEL.APP', 'servyou.vercel.app:443'])('the host is matched case-insensitively and without its port: %s', async (host) => {
    expect(await resolveRedirect(host, '/faq')).toEqual({ status: 308, location: 'https://servyou.tn/faq' })
  })
})

describe('every other host keeps serving the app', () => {
  // Vercel's branch preview and per-deployment URLs — including a branch named after the old host.
  const PREVIEW_HOSTS = [
    'servyou-git-chore-domain-servyou-tn-servyou-s-projects.vercel.app',
    'servyou-k3x9a2b1c-servyou-s-projects.vercel.app',
    'servyou-git-servyou-vercel-app-servyou-s-projects.vercel.app',
  ]
  const OTHER_HOSTS = [
    ...PREVIEW_HOSTS,
    // Dots are literal, and the match is anchored to the whole hostname: nothing before or after the old host counts.
    'servyouxvercelxapp',
    'evil-servyou.vercel.app',
    'servyou.vercel.app.evil.example',
    // The own domain (never a loop) and local dev.
    'servyou.tn',
    'www.servyou.tn',
    'localhost:3000',
  ]

  it.each(OTHER_HOSTS)('%s: no host redirect', async (host) => {
    expect(await resolveRedirect(host, '/produits/42?ref=wa')).toBeNull()
  })

  it.each(OTHER_HOSTS)('%s: the existing same-host redirects still apply', async (host) => {
    expect(await resolveRedirect(host, '/login')).toEqual({ status: 308, location: '/connexion' })
  })

  it.each(PREVIEW_HOSTS)('%s: not matched even by an UNanchored reading of the host pattern', async (host) => {
    const first = await hostRule()
    expect(new RegExp(first.has![0].value!).test(host)).toBe(false)
  })
})
