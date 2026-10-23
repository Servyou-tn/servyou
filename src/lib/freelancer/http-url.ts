// Scheme restriction for every freelancer-entered URL (links, portfolio, credentials). Passed to
// Zod's `.url()`, which on its own accepts ANY scheme the WHATWG parser understands — verified on
// zod 4.4.3: `javascript:alert(1)`, `data:text/html,…`, `vbscript:…` all pass a bare `.url()`.
// These values are rendered as `href` on the public D4 profile (FreelancerDetail.tsx), so only
// http(s) gets through.
//
// Deliberately NOT `z.httpUrl()`: that also demands a dotted domain, which rejects
// `http://localhost:54321/…` — the local Supabase storage URL a portfolio imageUrl carries in dev.
//
// This guards the server actions only. A direct REST write by the row's owner bypasses it; the
// DB-side CHECK is logged in docs/follow-ups.md.
export const HTTP_URL = { protocol: /^https?$/ }
