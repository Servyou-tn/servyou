/**
 * The Sentry tunnel guard (src/lib/security/sentry-tunnel.ts, audit M7, PR 16): /monitoring forwards to OUR Sentry project
 * only. The rules run through Next.js's OWN matchers (path-to-regexp source + has/missing), the same ones the router uses
 * for redirects, so this checks what Next will do, not a re-implementation of it.
 * Run by path.
 */

import { describe, it, expect } from 'vitest'
import { getPathMatch } from 'next/dist/shared/lib/router/utils/path-match'
import { matchHas } from 'next/dist/shared/lib/router/utils/prepare-destination'
import type { IncomingMessage } from 'node:http'
import {
  SENTRY_TUNNEL_REFUSED,
  SENTRY_TUNNEL_ROUTE,
  sentryDsnIds,
  sentryTunnelRedirects,
  type TunnelGuardRedirect,
} from '@/lib/security/sentry-tunnel'
import nextConfig from '../../next.config'

const DSN = 'https://abc123publickey@o4500.ingest.de.sentry.io/4511'

/** The query as Next's router hands it to matchHas: a repeated key becomes an array. */
function queryOf(search: string): Record<string, string | string[]> {
  const out: Record<string, string | string[]> = {}
  for (const [k, v] of new URLSearchParams(search)) {
    const prev = out[k]
    out[k] = prev === undefined ? v : Array.isArray(prev) ? [...prev, v] : [prev, v]
  }
  return out
}

/** True when one of the guard's redirects fires for this request (Next applies the first redirect that matches). */
function refused(rules: TunnelGuardRedirect[], url: string): boolean {
  const [pathname, search = ''] = url.split('?')
  const req = { headers: {} } as IncomingMessage
  return rules.some((rule) => {
    const pathOk = getPathMatch(rule.source, { strict: true, removeUnnamedParams: true })(pathname)
    return pathOk !== false && matchHas(req, queryOf(search), [], rule.missing ?? []) !== false
  })
}

describe('sentryDsnIds — parsed like @sentry/nextjs builds the tunnel query', () => {
  it('reads the org and project of a SaaS DSN, with or without a region', () => {
    expect(sentryDsnIds(DSN)).toEqual({ orgId: '4500', projectId: '4511' })
    expect(sentryDsnIds('https://k@o7.ingest.sentry.io/12')).toEqual({ orgId: '7', projectId: '12' })
  })

  it('is null for anything the SDK would not tunnel', () => {
    for (const bad of [undefined, null, '', 'not a url', 'http://k@o1.ingest.sentry.io/2', 'https://k@sentry.example.com/3', 'https://k@o1.ingest.sentry.io/abc']) {
      expect(sentryDsnIds(bad as string | null | undefined)).toBeNull()
    }
  })
})

describe('the guard, through Next.js matchers', () => {
  const rules = sentryTunnelRedirects(DSN)

  it('lets our own events through: the query the SDK builds from our DSN', () => {
    expect(refused(rules, `${SENTRY_TUNNEL_ROUTE}?o=4500&p=4511&r=de`)).toBe(false)
    expect(refused(rules, `${SENTRY_TUNNEL_ROUTE}?o=4500&p=4511`)).toBe(false)
    expect(refused(rules, `${SENTRY_TUNNEL_ROUTE}/?o=4500&p=4511&r=de`)).toBe(false)
  })

  it('refuses another org, another project, or both — with or without the trailing slash', () => {
    expect(refused(rules, `${SENTRY_TUNNEL_ROUTE}?o=999&p=4511&r=de`)).toBe(true)
    expect(refused(rules, `${SENTRY_TUNNEL_ROUTE}?o=4500&p=999&r=de`)).toBe(true)
    expect(refused(rules, `${SENTRY_TUNNEL_ROUTE}?o=999&p=999`)).toBe(true)
    expect(refused(rules, `${SENTRY_TUNNEL_ROUTE}/?o=4500&p=999`)).toBe(true)
  })

  it('refuses a missing parameter and a look-alike value (Next anchors the value: 45001 is not 4500)', () => {
    expect(refused(rules, `${SENTRY_TUNNEL_ROUTE}?p=4511`)).toBe(true)
    expect(refused(rules, `${SENTRY_TUNNEL_ROUTE}?o=4500`)).toBe(true)
    expect(refused(rules, `${SENTRY_TUNNEL_ROUTE}?o=45001&p=4511`)).toBe(true)
    expect(refused(rules, `${SENTRY_TUNNEL_ROUTE}?o=4500&p=14511`)).toBe(true)
  })

  it('reads the LAST value of a repeated parameter, as Sentry\'s rewrite does: ours then foreign is refused', () => {
    expect(refused(rules, `${SENTRY_TUNNEL_ROUTE}?o=4500&o=999&p=4511`)).toBe(true)
    expect(refused(rules, `${SENTRY_TUNNEL_ROUTE}?o=999&o=4500&p=4511`)).toBe(false)
  })

  it('touches no other path', () => {
    expect(refused(rules, '/monitoringx?o=999&p=999')).toBe(false)
    expect(refused(rules, '/connexion?o=999')).toBe(false)
  })

  it('sends a refused request to a path with no page (a 404), as a temporary redirect', () => {
    expect(rules.every((r) => r.destination === SENTRY_TUNNEL_REFUSED && r.permanent === false)).toBe(true)
  })

  it('without a usable DSN every tunnel request is refused (the browser does not tunnel then anyway)', () => {
    const none = sentryTunnelRedirects(undefined)
    expect(refused(none, `${SENTRY_TUNNEL_ROUTE}?o=4500&p=4511&r=de`)).toBe(true)
    expect(refused(none, '/connexion')).toBe(false)
  })
})

describe('next.config.ts', () => {
  it('puts the guard first in redirects(), for the DSN the build sees', async () => {
    const redirects = await nextConfig.redirects!()
    const guard = sentryTunnelRedirects(process.env.NEXT_PUBLIC_SENTRY_DSN)
    expect(redirects.slice(0, guard.length)).toEqual(guard)
  })
})
