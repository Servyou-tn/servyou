# Supabase Auth CAPTCHA readiness (`feat/captcha-ready`, 2026-10-30)

## 1. 🔴 After the flip, a client without the REAL site key cannot sign in / sign up / reset (decision before the flip)
- **What:** with CAPTCHA on, Supabase Auth refuses the password grant, `/signup`, `/recover`, `/resend` and `/otp`
  without a token its secret accepts. The Cloudflare dummy token is refused by the real secret. So:
  - **Preview** — no keys there (founder, 2026-10-30) → no widget → no token → `captcha_failed` on every sign-in;
  - **local dev** (`next dev` against the production project) — same, unless `.env.local` holds the REAL site key and
    `localhost` is on the widget's hostname list;
  - **gate scripts** that sign in with a password through the form (gstack-qa / CDP gates) — same as local dev.
  Google sign-in, sessions already open, token refresh and the recovery link are NOT affected.
- **Why deferred:** a founder call (which surfaces must keep working), not code.
- **Options:** put only `NEXT_PUBLIC_TURNSTILE_SITE_KEY` back on Preview (the app-side secret can stay absent — the
  order / report actions then skip verification there) and add the preview + `localhost` hostnames to the widget;
  or accept that Preview and local sign-in stop working.
- **Trigger:** before switching the toggle on.

## 2. The full live set has not been re-run in one go on the magic-link sign-in
- **What:** the 37 converted suites share one helper (`src/__tests__/fixture-session.ts`). Proven live on
  suspension-enforcement (incl. the ban probes), profiles-rls, progressive-phone, storage-uploads-service-role and
  storage-verifications-no-client-insert (241 tests). The other 32 are the same type-checked one-line swap.
- **Why deferred:** ~130 fixture sign-ins in one run exceed Supabase's per-IP token-verification rate limit.
- **Trigger:** the next PR that touches those suites runs them; or a batched run (≤ ~25 sign-ins per 5 min).

## 3. `scripts/rls-smoke.mjs` still uses the password grant
- **What:** it will fail with `captcha_failed` once CAPTCHA is on.
- **Why deferred:** it must never be run anyway (it deletes every test-domain user on production — CLAUDE.md).
- **Trigger:** if it is ever revived — switch it to `fixtureSignIn`'s magic-link path.
