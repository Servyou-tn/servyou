// Browser security headers for every route — served by next.config.ts `headers()`.
// Pre-launch security audit pass 1, finding 1 (docs/audits/prelaunch-security-audit-2026-10-29.md): production sent no
// CSP, frame, nosniff, referrer or permissions header, so /connexion and every signed-in page could be framed.
//
// Two CSP headers on purpose:
//   • ENFORCED `Content-Security-Policy: frame-ancestors 'none'` (+ X-Frame-Options: DENY for older browsers) — the
//     clickjacking fix, live now;
//   • `Content-Security-Policy-Report-Only` with the full policy — violations are only logged (browser console) until
//     the policy has been watched in real use; then it is promoted to enforced (and later moved to nonces).
//
// What the full policy must allow (verified from the code, 2026-10-29):
//   • Supabase — the browser client (`@supabase/ssr` createBrowserClient: sign-in / sign-up / password reset / order
//     cancel) calls REST + auth on the project origin, realtime would use wss on the same host; images are served
//     either through /_next/image (self) or straight from the public storage path;
//   • Sentry — events go through the same-origin `/monitoring` tunnel (next.config.ts tunnelRoute); the ingest
//     hosts are listed anyway for any path that bypasses it;
//   • Vercel — the preview-deployment toolbar (`vercel.live`, its fonts / images, and its pusher websocket). No
//     @vercel/analytics or speed-insights is installed;
//   • Next.js App Router inline scripts (`self.__next_f.push`) and React inline styles → 'unsafe-inline' until a
//     nonce-based policy; `next dev` also needs 'unsafe-eval' (React refresh), never in a production build.
// Turnstile is not loaded anywhere in the app, so challenges.cloudflare.com is not allowed.
//
// VIOLATION REPORTING (follow-up 1 of docs/follow-ups/security-headers.md): the Report-Only policy carries `report-uri` (every
// browser) and `report-to` + a `Reporting-Endpoints` header (Reporting API browsers) pointing at Sentry's SECURITY endpoint, so
// real traffic produces data before the policy is enforced. The URL is DERIVED from the Sentry DSN the app already ships to the
// browser (NEXT_PUBLIC_SENTRY_DSN) — the DSN's key is a public ingest key, not a secret, and nothing new is added to the repo.
// No DSN (dev, CI, an unconfigured preview) → no reporting, exactly like Sentry itself. The ENFORCED frame-ancestors header is
// left untouched: only the watched policy reports.

export const SUPABASE_ORIGIN = 'https://xggomcitqrkaylqezjjz.supabase.co'

/** Name of the Reporting API endpoint group (`report-to` directive ↔ `Reporting-Endpoints` header). */
export const CSP_REPORT_GROUP = 'csp-endpoint'

/**
 * Sentry's CSP intake for a DSN: `https://<host>/api/<projectId>/security/?sentry_key=<publicKey>` (+ the environment, so a
 * preview's noise is not mixed with production's). Returns null — reporting off — for anything that is not a well-formed
 * https DSN: an unset variable, a typo, a self-hosted `http://` Sentry. Never throws (it runs while next.config loads).
 */
export function cspReportUrl(dsn: string | null | undefined, environment?: string | null): string | null {
  if (!dsn) return null
  let url: URL
  try {
    url = new URL(dsn)
  } catch {
    return null
  }
  const segments = url.pathname.split('/').filter(Boolean)
  const projectId = segments.pop()
  // URL keeps userinfo percent-encoded as written; decode first so the re-encode below does not double-encode it.
  let key = url.username
  try {
    key = decodeURIComponent(key)
  } catch {
    return null
  }
  if (url.protocol !== 'https:' || !key || !projectId || !/^\d+$/.test(projectId)) return null
  const prefix = segments.length > 0 ? `/${segments.join('/')}` : ''
  const env = environment ? `&sentry_environment=${encodeURIComponent(environment)}` : ''
  return `https://${url.host}${prefix}/api/${projectId}/security/?sentry_key=${encodeURIComponent(key)}${env}`
}

export function contentSecurityPolicy(isDev: boolean, reportUrl: string | null = null): string {
  const directives: Record<string, string[]> = {
    'default-src': ["'self'"],
    'script-src': ["'self'", "'unsafe-inline'", ...(isDev ? ["'unsafe-eval'"] : []), 'https://vercel.live'],
    'style-src': ["'self'", "'unsafe-inline'", 'https://vercel.live'],
    'img-src': ["'self'", 'data:', 'blob:', SUPABASE_ORIGIN, 'https://vercel.live', 'https://vercel.com'],
    'font-src': ["'self'", 'data:', 'https://vercel.live', 'https://assets.vercel.com'],
    'connect-src': [
      "'self'",
      SUPABASE_ORIGIN,
      SUPABASE_ORIGIN.replace('https://', 'wss://'),
      'https://*.ingest.sentry.io',
      'https://*.ingest.de.sentry.io',
      'https://*.ingest.us.sentry.io',
      'https://vercel.live',
      'wss://ws-us3.pusher.com',
    ],
    'frame-src': ['https://vercel.live'],
    'worker-src': ["'self'", 'blob:'],
    'media-src': ["'self'", 'blob:', SUPABASE_ORIGIN],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'frame-ancestors': ["'none'"],
  }
  const policy = Object.entries(directives)
    .map(([name, values]) => `${name} ${values.join(' ')}`)
    .join('; ')
  return reportUrl ? `${policy}; report-uri ${reportUrl}; report-to ${CSP_REPORT_GROUP}` : policy
}

export function securityHeaders(isDev: boolean, reportUrl: string | null = null): { key: string; value: string }[] {
  return [
    { key: 'X-Frame-Options', value: 'DENY' },
    { key: 'Content-Security-Policy', value: "frame-ancestors 'none'" },
    { key: 'Content-Security-Policy-Report-Only', value: contentSecurityPolicy(isDev, reportUrl) },
    ...(reportUrl ? [{ key: 'Reporting-Endpoints', value: `${CSP_REPORT_GROUP}="${reportUrl}"` }] : []),
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
  ]
}
