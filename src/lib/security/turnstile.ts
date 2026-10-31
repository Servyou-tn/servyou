import { headers } from 'next/headers'

// Cloudflare Turnstile — server-side token check for the order-request and report actions (pre-launch bot
// protection). The browser widget (src/components/security/Turnstile.tsx) sends a single-use token with the
// submit; this verifies it against Cloudflare's siteverify BEFORE the action touches the database.
//
//   • TURNSTILE_SECRET_KEY absent in PRODUCTION (VERCEL_ENV === 'production') → FAIL CLOSED: every protected
//     submit is refused and the misconfiguration is logged loudly (pre-beta review M4 — a lost env var must not
//     silently switch bot protection off). Keyed on VERCEL_ENV, not NODE_ENV: Vercel previews also build with
//     NODE_ENV=production, and the secret is Production-only by design, so previews stay usable.
//   • TURNSTILE_SECRET_KEY absent anywhere else (local dev without keys, previews, CI, unit tests) → SKIPPED.
//   • TURNSTILE_SECRET_KEY set → FAIL CLOSED: a missing / malformed token, a Cloudflare refusal, a network
//     error or a timeout all refuse the submit. A deployment with the secret but no
//     NEXT_PUBLIC_TURNSTILE_SITE_KEY therefore refuses every protected submit — set both.
//
// Sign-in / sign-up do NOT use this: they call Supabase Auth from the browser, so an app-side check would be
// bypassed by calling the auth API directly. Their token goes to Supabase Auth as `captchaToken`, which verifies
// it itself once CAPTCHA protection is enabled in the Supabase dashboard.
//
// Never log the token or the secret. Local / test keys: Cloudflare's dummy keys (.env.example).

export const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'
const TOKEN_MAX = 2048 // Cloudflare's documented maximum token length
const TIMEOUT_MS = 5000

export type TurnstileResult =
  | { ok: true }
  | { ok: false; reason: 'missing-token' | 'rejected' | 'unavailable' | 'misconfigured' }

async function clientIp(): Promise<string | null> {
  try {
    return (await headers()).get('x-forwarded-for')?.split(',')[0]?.trim() || null
  } catch {
    return null // outside a request scope — remoteip is optional
  }
}

export async function verifyTurnstile(token: unknown): Promise<TurnstileResult> {
  const secret = process.env.TURNSTILE_SECRET_KEY
  if (!secret) {
    if (process.env.VERCEL_ENV === 'production') {
      console.error('[turnstile] TURNSTILE_SECRET_KEY is missing in production — refusing (fail closed)')
      return { ok: false, reason: 'misconfigured' }
    }
    return { ok: true }
  }

  if (typeof token !== 'string' || token.length === 0 || token.length > TOKEN_MAX) {
    console.warn('[turnstile] refused: missing or malformed token')
    return { ok: false, reason: 'missing-token' }
  }

  const body = new URLSearchParams({ secret, response: token })
  const ip = await clientIp()
  if (ip) body.set('remoteip', ip)

  try {
    const res = await fetch(SITEVERIFY_URL, { method: 'POST', body, signal: AbortSignal.timeout(TIMEOUT_MS), cache: 'no-store' })
    if (!res.ok) {
      console.error('[turnstile] siteverify HTTP', res.status)
      return { ok: false, reason: 'unavailable' }
    }
    const outcome = (await res.json()) as { success?: unknown; 'error-codes'?: unknown }
    if (outcome.success === true) return { ok: true }
    console.warn('[turnstile] refused:', Array.isArray(outcome['error-codes']) ? outcome['error-codes'].join(',') : 'no error-codes')
    return { ok: false, reason: 'rejected' }
  } catch (err) {
    console.error('[turnstile] siteverify failed:', err instanceof Error ? err.name : 'unknown')
    return { ok: false, reason: 'unavailable' }
  }
}
