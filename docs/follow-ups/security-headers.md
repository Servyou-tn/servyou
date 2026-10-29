# Security headers — logged, not fixed (`feat/security-headers`, 2026-10-29)

Ranked. From the PR's review and the preview gate.

## 1. MEDIUM — the report-only CSP has no reporting endpoint
**What:** no `report-uri` / `report-to`, so a violation only reaches that visitor's console. The plan is to watch the
policy in real use and then enforce it, but production traffic produces no data.
**Why deferred:** the brief asked for console-level proof on the preview. An endpoint is new scope: a Sentry security
endpoint (`report-uri https://<org>.ingest.sentry.io/api/<project>/security/?sentry_key=…`), or a same-origin
`/api/csp-report` route with its own rate limit.
**Where:** `src/lib/security/headers.ts`.
**Trigger:** before the CSP is promoted to enforced. The founder picks Sentry (no code to host) or a route.

## 2. LOW — signed-in pages and the order form were not browsed under the policy
**What:** the preview gate covered `/`, `/marche/produits`, a product, `/marche/services`, a service and the sign-in
fetch (`auth/v1/token`), with zero violations. `/demander/[id]` redirects to `/connexion` when signed out. Signing in
needs a production account (no fixture writes allowed in this PR).
**Trigger:** the founder browses one signed-in session (order form, Mes commandes, an upload) on the preview with
DevTools open, or with the endpoint from item 1 live.

## 3. LOW — tighten the policy at promotion time
**What:**
- `https://vercel.live` (toolbar) is only needed on preview deployments, but the build-time header ships it on
  production too.
- `media-src` lists Supabase, but the app has no `<video>` / `<audio>`.
- The Supabase `wss://` entry is headroom (there is no realtime today).

Trim all three when enforcing, and move to nonces to drop `'unsafe-inline'`.
