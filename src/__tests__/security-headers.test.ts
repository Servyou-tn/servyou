/**
 * Browser security headers (src/lib/security/headers.ts, served by next.config.ts) — pre-launch security audit pass 1,
 * finding 1. Security-sensitive config, so a dropped header fails here, not in production:
 *   • framing is refused twice (X-Frame-Options DENY + CSP frame-ancestors 'none');
 *   • the full CSP is ENFORCED (pre-beta check 2026-11-01), allows what the app really loads, and never 'unsafe-eval' in
 *     production; no Report-Only header is left;
 *   • next.config.ts serves the set on every route and drops X-Powered-By.
 * Run by path.
 */

import { describe, it, expect } from 'vitest'
import { contentSecurityPolicy, cspReportUrl, securityHeaders, CSP_REPORT_GROUP, SUPABASE_ORIGIN, TURNSTILE_ORIGIN } from '@/lib/security/headers'
import nextConfig from '../../next.config'

const byKey = (isDev: boolean) => Object.fromEntries(securityHeaders(isDev).map((h) => [h.key, h.value]))
const byKeyWith = (reportUrl: string) => Object.fromEntries(securityHeaders(false, reportUrl).map((h) => [h.key, h.value]))
const directive = (csp: string, name: string) =>
  csp.split(';').map((d) => d.trim()).find((d) => d.startsWith(`${name} `))?.split(/\s+/).slice(1) ?? null

describe('enforced headers', () => {
  const h = byKey(false)

  it('refuses framing twice: X-Frame-Options DENY and the enforced CSP frame-ancestors', () => {
    expect(h['X-Frame-Options']).toBe('DENY')
    expect(directive(h['Content-Security-Policy'], 'frame-ancestors')).toEqual(["'none'"])
  })

  it('nosniff, referrer and permissions policies', () => {
    expect(h['X-Content-Type-Options']).toBe('nosniff')
    expect(h['Referrer-Policy']).toBe('strict-origin-when-cross-origin')
    expect(h['Permissions-Policy']).toBe('camera=(), microphone=(), geolocation=(), payment=()')
  })
})

describe('enforced CSP', () => {
  const prod = contentSecurityPolicy(false)

  it('is served ENFORCED — the full policy — and no Report-Only header is left', () => {
    expect(byKey(false)['Content-Security-Policy']).toBe(prod)
    expect(byKey(true)['Content-Security-Policy']).toBe(contentSecurityPolicy(true))
    expect(byKey(false)['Content-Security-Policy-Report-Only']).toBeUndefined()
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
    expect(directive(prod, 'frame-src')).toContain('https://vercel.live')
  })

  it('allows the Cloudflare Turnstile script and challenge iframe, and nothing else from Cloudflare', () => {
    expect(TURNSTILE_ORIGIN).toBe('https://challenges.cloudflare.com')
    expect(directive(prod, 'script-src')).toContain(TURNSTILE_ORIGIN)
    expect(directive(prod, 'frame-src')).toEqual(['https://vercel.live', TURNSTILE_ORIGIN])
    expect(directive(prod, 'connect-src')).not.toContain(TURNSTILE_ORIGIN)
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

})

describe('violation reporting (Sentry security endpoint, derived from the DSN)', () => {
  const DSN = 'https://abc123publickey@o4500.ingest.de.sentry.io/4511'

  it('builds the security-endpoint URL from a DSN, with the environment', () => {
    expect(cspReportUrl(DSN, 'preview')).toBe(
      'https://o4500.ingest.de.sentry.io/api/4511/security/?sentry_key=abc123publickey&sentry_environment=preview',
    )
    expect(cspReportUrl(DSN)).toBe('https://o4500.ingest.de.sentry.io/api/4511/security/?sentry_key=abc123publickey')
  })

  it('keeps a path prefix (self-hosted behind a sub-path) and encodes the key', () => {
    expect(cspReportUrl('https://k%20ey@sentry.example.com/errors/7')).toBe(
      'https://sentry.example.com/errors/api/7/security/?sentry_key=k%20ey',
    )
  })

  it('is OFF (null) for an unset, malformed, non-https, key-less or project-less DSN — and never throws', () => {
    for (const bad of [undefined, null, '', 'not a url', 'http://k@host/1', 'https://host/1', 'https://k@host/', 'https://k@host/abc']) {
      expect(cspReportUrl(bad as string | null | undefined)).toBeNull()
    }
  })

  it('the enforced policy carries report-uri AND report-to, and a Reporting-Endpoints header names the same URL', () => {
    const url = cspReportUrl(DSN, 'production')!
    const csp = contentSecurityPolicy(false, url)
    expect(csp).toContain(`report-uri ${url}`)
    expect(csp).toContain(`report-to ${CSP_REPORT_GROUP}`)
    const h = byKeyWith(url)
    expect(h['Content-Security-Policy']).toBe(csp)
    expect(h['Reporting-Endpoints']).toBe(`${CSP_REPORT_GROUP}="${url}"`)
  })

  it('without a DSN nothing changes: no report directives, no Reporting-Endpoints header', () => {
    expect(contentSecurityPolicy(false)).not.toContain('report-')
    expect(byKey(false)['Reporting-Endpoints']).toBeUndefined()
  })

  it('reporting only adds the report directives — the sources stay exactly the same', () => {
    const withReport = contentSecurityPolicy(false, cspReportUrl(DSN)!)
    expect(withReport.startsWith(`${contentSecurityPolicy(false)}; report-uri `)).toBe(true)
  })

  it('the report URL is not a CSP source of its own: report-uri is a reporting target, not a connect-src entry', () => {
    const csp = contentSecurityPolicy(false, cspReportUrl(DSN)!)
    expect(directive(csp, 'connect-src')?.join(' ')).not.toContain('/security/')
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
