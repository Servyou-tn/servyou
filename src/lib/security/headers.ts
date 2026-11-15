// Browser security headers for every route — served by next.config.ts `headers()`.
// Pre-launch security audit pass 1, finding 1 (docs/audits/prelaunch-security-audit-2026-10-29.md): production sent no
// CSP, frame, nosniff, referrer or permissions header, so /connexion and every signed-in page could be framed.
//
// The full CSP is ENFORCED (`Content-Security-Policy`, with frame-ancestors 'none' + X-Frame-Options: DENY for older
// browsers). It was served Report-Only from 2026-10-29 until the pre-beta check of 2026-11-01: the three journeys'
// pages, browsed on a Vercel preview and a production build, produced one violation only — zod's caught eval probe,
// switched off in src/instrumentation-client.ts. Moving to nonces (to drop 'unsafe-inline') is a later step.
//
// What the full policy must allow (verified from the code, 2026-10-29):
//   • Supabase — the browser client (`@supabase/ssr` createBrowserClient: sign-in / sign-up / password reset / order
//     cancel) calls REST + auth on the project origin, realtime would use wss on the same host; images are served
//     either through /_next/image (self) or straight from the public storage path;
//   • Sentry — events go through the same-origin `/monitoring` tunnel (next.config.ts tunnelRoute); the ingest
//     hosts are listed anyway for any path that bypasses it;
//   • Vercel — the preview-deployment toolbar (`vercel.live`, its fonts / images, and its pusher websocket), on PREVIEW
//     deployments only (`allowVercelToolbar`, from VERCEL_ENV in next.config.ts): production, and any host that is not a
//     Vercel preview, never allows it (audit M7, PR 16). No @vercel/analytics or speed-insights is installed;
//   • Next.js App Router inline scripts (`self.__next_f.push`) and React inline styles → 'unsafe-inline' until a
//     nonce-based policy; `next dev` also needs 'unsafe-eval' (React refresh), never in a production build.
//   • Cloudflare Turnstile (src/components/security/Turnstile.tsx) — its script and challenge iframe come from
//     challenges.cloudflare.com (script-src + frame-src, per Cloudflare's CSP reference); siteverify is server-side.
//   • Umami (lib/analytics/umami.ts, production + audience consent only) — the tracker script from cloud.umami.is (script-src) and its
//     event POSTs to gateway.umami.is/api/send (connect-src). The second host was OBSERVED on 2026-11-14, not guessed: a production
//     build with cloud.umami.is allowed and no connect-src entry blocked exactly `https://gateway.umami.is/api/send` (the script's
//     default endpoint, no data-host-url set); the endpoint answers directly, no redirect. Two exact origins, no wildcard.
//
// VIOLATION REPORTING (follow-up 1 of docs/follow-ups/security-headers.md): the policy carries `report-uri` (every browser) and
// `report-to` + a `Reporting-Endpoints` header (Reporting API browsers) pointing at Sentry's SECURITY endpoint, so a blocked
// load in real traffic shows up in Sentry. The URL is DERIVED from the Sentry DSN the app already ships to the browser
// (NEXT_PUBLIC_SENTRY_DSN) — the DSN's key is a public ingest key, not a secret, and nothing new is added to the repo.
// No DSN (dev, CI, an unconfigured preview) → no reporting, exactly like Sentry itself.
//
// TRANSPORT AND WINDOW ISOLATION (audit M7, PR 16): Strict-Transport-Security is sent by the app itself, not left to the
// host (Vercel adds one today; the planned server behind Cloudflare would not), two years with subdomains and no `preload`
// (the preload list is hard to leave, so it waits until servyou.tn is settled). Browsers ignore it on plain http, so
// `next dev` is unaffected. Cross-Origin-Opener-Policy: same-origin cuts the link to any cross-origin window that opens
// one of our pages (or that we open), so another site cannot script or navigate it; the app opens no cross-origin popup
// that needs `window.opener` (sign-in is a redirect, WhatsApp links open with noopener, Turnstile is an iframe).
// The nonce-based CSP that would drop 'unsafe-inline' is decided together with page caching (audit M7/M8), not here.

export const SUPABASE_ORIGIN = 'https://xggomcitqrkaylqezjjz.supabase.co'
export const TURNSTILE_ORIGIN = 'https://challenges.cloudflare.com'
/** Umami Cloud — where the tracker script is served from (lib/analytics/umami.ts UMAMI_SCRIPT_URL). */
export const UMAMI_SCRIPT_ORIGIN = 'https://cloud.umami.is'
/** Umami Cloud — where that script POSTs its events (`/api/send`). Observed, not guessed: see the comment above. */
export const UMAMI_COLLECT_ORIGIN = 'https://gateway.umami.is'

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

/**
 * The CSP. `allowVercelToolbar` adds the Vercel toolbar's hosts: true on Vercel PREVIEW deployments only (next.config.ts),
 * false everywhere else, which is the default.
 */
export function contentSecurityPolicy(isDev: boolean, reportUrl: string | null = null, allowVercelToolbar = false): string {
  const toolbar = (...sources: string[]) => (allowVercelToolbar ? sources : [])
  const directives: Record<string, string[]> = {
    'default-src': ["'self'"],
    'script-src': ["'self'", "'unsafe-inline'", ...(isDev ? ["'unsafe-eval'"] : []), ...toolbar('https://vercel.live'), TURNSTILE_ORIGIN, UMAMI_SCRIPT_ORIGIN],
    'style-src': ["'self'", "'unsafe-inline'", ...toolbar('https://vercel.live')],
    'img-src': ["'self'", 'data:', 'blob:', SUPABASE_ORIGIN, ...toolbar('https://vercel.live', 'https://vercel.com')],
    'font-src': ["'self'", 'data:', ...toolbar('https://vercel.live', 'https://assets.vercel.com')],
    'connect-src': [
      "'self'",
      SUPABASE_ORIGIN,
      SUPABASE_ORIGIN.replace('https://', 'wss://'),
      'https://*.ingest.sentry.io',
      'https://*.ingest.de.sentry.io',
      'https://*.ingest.us.sentry.io',
      ...toolbar('https://vercel.live', 'wss://ws-us3.pusher.com'),
      UMAMI_COLLECT_ORIGIN,
    ],
    'frame-src': [...toolbar('https://vercel.live'), TURNSTILE_ORIGIN],
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

/** Two years, subdomains included, no `preload` (see TRANSPORT AND WINDOW ISOLATION above). */
export const HSTS_VALUE = 'max-age=63072000; includeSubDomains'

export function securityHeaders(
  isDev: boolean,
  reportUrl: string | null = null,
  allowVercelToolbar = false,
): { key: string; value: string }[] {
  return [
    { key: 'Strict-Transport-Security', value: HSTS_VALUE },
    { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
    { key: 'X-Frame-Options', value: 'DENY' },
    { key: 'Content-Security-Policy', value: contentSecurityPolicy(isDev, reportUrl, allowVercelToolbar) },
    ...(reportUrl ? [{ key: 'Reporting-Endpoints', value: `${CSP_REPORT_GROUP}="${reportUrl}"` }] : []),
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
  ]
}
