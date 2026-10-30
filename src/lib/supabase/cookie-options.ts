// Session-cookie options for the two Supabase clients that write the sb-* cookies (browser: sign-in / sign-up / sign-out;
// server: session refresh and the /mon-compte re-auth). src/middleware.ts never writes them (its setAll is a no-op).
//
// Audit pass 3 « Logged » (docs/audits/prelaunch-security-audit-pass-3-auth.md): @supabase/ssr sets the sb-* session
// cookies WITHOUT the Secure attribute. In production (https only: Vercel, HSTS preload) they now carry Secure, so a
// browser never sends them over plain http. Not in `next dev`: Safari refuses a Secure cookie on http://localhost,
// which would break local sign-in.
//
// @supabase/ssr merges this over its defaults (path '/', sameSite 'lax', 400-day maxAge, httpOnly false — the
// browser client signs in and must read the cookie), for both the cookies it sets and the ones it removes, so only
// `secure` changes.
export const AUTH_COOKIE_OPTIONS = { secure: process.env.NODE_ENV === 'production' }
