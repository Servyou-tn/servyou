/**
 * Browser security headers (src/lib/security/headers.ts, served by next.config.ts) — pre-launch security audit pass 1,
 * finding 1. Security-sensitive config, so a dropped header fails here, not in production:
 *   • framing is refused by an ENFORCED header pair (X-Frame-Options DENY + CSP frame-ancestors 'none');
 *   • the full CSP is Report-Only, allows what the app really loads, and never 'unsafe-eval' in production;
 *   • next.config.ts serves the set on every route and drops X-Powered-By.
 * Run by path.
 */

import { describe, it, expect } from 'vitest'
import { contentSecurityPolicy, securityHeaders, SUPABASE_ORIGIN } from '@/lib/security/headers'
import nextConfig from '../../next.config'

const byKey = (isDev: boolean) => Object.fromEntries(securityHeaders(isDev).map((h) => [h.key, h.value]))
const directive = (csp: string, name: string) =>
  csp.split(';').map((d) => d.trim()).find((d) => d.startsWith(`${name} `))?.split(/\s+/).slice(1) ?? null

describe('enforced headers', () => {
  const h = byKey(false)

  it('refuses framing twice: X-Frame-Options DENY and an enforced CSP that is ONLY frame-ancestors', () => {
    expect(h['X-Frame-Options']).toBe('DENY')
    // Nothing else in the enforced CSP: anything more would block real traffic before it has been watched.
    expect(h['Content-Security-Policy']).toBe("frame-ancestors 'none'")
  })

  it('nosniff, referrer and permissions policies', () => {
    expect(h['X-Content-Type-Options']).toBe('nosniff')
    expect(h['Referrer-Policy']).toBe('strict-origin-when-cross-origin')
    expect(h['Permissions-Policy']).toBe('camera=(), microphone=(), geolocation=(), payment=()')
  })
})

describe('report-only CSP', () => {
  const prod = contentSecurityPolicy(false)

  it('is served as Report-Only', () => {
    expect(byKey(false)['Content-Security-Policy-Report-Only']).toBe(prod)
  })

  it('allows Supabase REST / auth / storage and the realtime websocket', () => {
    expect(directive(prod, 'connect-src')).toEqual(
      expect.arrayContaining(["'self'", SUPABASE_ORIGIN, 'wss://xggomcitqrkaylqezjjz.supabase.co']),
    )
    expect(directive(prod, 'img-src')).toContain(SUPABASE_ORIGIN)
  })

  it('allows Sentry ingest and the Vercel preview toolbar', () => {
    expect(directive(prod, 'connect-src')).toEqual(expect.arrayContaining(['https://*.ingest.sentry.io', 'https://vercel.live']))
    expect(directive(prod, 'script-src')).toContain('https://vercel.live')
    expect(directive(prod, 'frame-src')).toEqual(['https://vercel.live'])
  })

  it('locks the dangerous directives', () => {
    expect(directive(prod, 'object-src')).toEqual(["'none'"])
    expect(directive(prod, 'base-uri')).toEqual(["'self'"])
    expect(directive(prod, 'form-action')).toEqual(["'self'"])
    expect(directive(prod, 'frame-ancestors')).toEqual(["'none'"])
  })

  it("never 'unsafe-eval' in production; only `next dev` gets it", () => {
    expect(directive(prod, 'script-src')).not.toContain("'unsafe-eval'")
    expect(directive(contentSecurityPolicy(true), 'script-src')).toContain("'unsafe-eval'")
  })

  it('has no upgrade-insecure-requests (ignored and warned about in a report-only policy)', () => {
    expect(prod).not.toContain('upgrade-insecure-requests')
  })
})

describe('next.config.ts', () => {
  it('drops X-Powered-By', () => {
    expect(nextConfig.poweredByHeader).toBe(false)
  })

  it('serves the header set on every route', async () => {
    const rules = await nextConfig.headers!()
    expect(rules).toHaveLength(1)
    expect(rules[0].source).toBe('/:path*')
    expect(rules[0].headers.map((x) => x.key)).toEqual(securityHeaders(false).map((x) => x.key))
  })
})
