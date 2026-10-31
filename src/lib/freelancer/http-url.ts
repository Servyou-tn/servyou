// Scheme restriction for every freelancer-entered URL (links, portfolio, credentials). Passed to
// Zod's `.url()`, which on its own accepts ANY scheme the WHATWG parser understands — verified on
// zod 4.4.3: `javascript:alert(1)`, `data:text/html,…`, `vbscript:…` all pass a bare `.url()`.
// These values are rendered as `href` on the public D4 profile (FreelancerDetail.tsx), so only
// http(s) gets through.
//
// Deliberately NOT `z.httpUrl()`: that also demands a dotted domain, which rejects
// `http://localhost:54321/…` — the local Supabase storage URL a portfolio imageUrl carries in dev.
//
// This guards the server actions. A direct REST write by the row's owner is refused by the DB-side
// `^https?://` CHECKs on the same five columns (migration 106, 20261030221121_freelancer_url_scheme_checks).
//
// Keep this regex's source exactly `^https?$`: zod 4 only adds its "must contain ://" check when
// the protocol pattern's source equals its own httpProtocol regex (v4/core/schemas.js, $ZodURL).
export const HTTP_URL = { protocol: /^https?$/ }

/**
 * The browser-side twin of `z.string().trim().url(HTTP_URL)` — zod-free, so client forms can give
 * a field-level error BEFORE the server rejects the whole save. Mirrors $ZodURL step for step:
 * trim, require `http(s)://`, parse with `URL`, check the protocol. freelancer-url-scheme.test.ts
 * asserts the two agree on every case, so they cannot drift.
 */
export function isHttpUrl(value: string): boolean {
  const trimmed = value.trim()
  if (!/^https?:\/\//i.test(trimmed)) return false
  try {
    const { protocol } = new URL(trimmed)
    return HTTP_URL.protocol.test(protocol.endsWith(':') ? protocol.slice(0, -1) : protocol)
  } catch {
    return false
  }
}
