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

export const SUPABASE_ORIGIN = 'https://xggomcitqrkaylqezjjz.supabase.co'

export function contentSecurityPolicy(isDev: boolean): string {
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
  return Object.entries(directives)
    .map(([name, values]) => `${name} ${values.join(' ')}`)
    .join('; ')
}

export function securityHeaders(isDev: boolean): { key: string; value: string }[] {
  return [
    { key: 'X-Frame-Options', value: 'DENY' },
    { key: 'Content-Security-Policy', value: "frame-ancestors 'none'" },
    { key: 'Content-Security-Policy-Report-Only', value: contentSecurityPolicy(isDev) },
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
  ]
}
