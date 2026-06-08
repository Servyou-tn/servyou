# Operations — Servyou

## Sentry (error monitoring)

Sentry is wired into the app but **inert until env vars are set** — the SDK init is
skipped when `NEXT_PUBLIC_SENTRY_DSN` is unset, so dev and CI run identically to today.
Activation is founder-side:

1. Create a free Sentry account at https://sentry.io
2. Create a project named **servyou** (platform: Next.js)
3. Copy the **DSN** from the project setup page
4. In Vercel → project settings → Environment Variables, add:
   - `NEXT_PUBLIC_SENTRY_DSN` = the DSN from step 3
   - `SENTRY_ORG` = your Sentry organization slug
   - `SENTRY_PROJECT` = `servyou`
   - `SENTRY_AUTH_TOKEN` = create at
     https://sentry.io/settings/account/api/auth-tokens/ (scopes: `org:read` +
     `project:releases`). Only used at build time, for source-map upload.
5. Trigger a redeploy on Vercel after the env vars are set
6. Verify: open Sentry → Issues, then trigger a real error (e.g. visit a deliberately
   broken URL); the error should appear within seconds.

### File layout (Sentry v10 + Next.js 16)

Because this project uses a `src/` directory, the instrumentation files live in `src/`,
not the project root:

- `src/instrumentation.ts` — server/edge registration + `onRequestError`
- `src/instrumentation-client.ts` — browser init + `onRouterTransitionStart` (this is
  the current client hook; the older `sentry.client.config.ts` is **not** used in v10)
- `src/sentry.server.config.ts` — Node runtime (Server Components, Route Handlers,
  Server Actions)
- `src/sentry.edge.config.ts` — Edge runtime (covers `src/middleware.ts`)
- `src/lib/sentry/scrubber.ts` — shared `scrubPII` used by all three configs
- `next.config.ts` — wrapped with `withSentryConfig` for build-time source-map upload
  and the `/monitoring` tunnel route

## What's scrubbed before send

PII redaction runs in `beforeSend` / `beforeSendTransaction` via
`src/lib/sentry/scrubber.ts`. Field names are matched case-insensitively as substrings
against: `password`, `phone`, `delivery_address`, `delivery_phone`, `delivery_name`,
`buyer_note`, `cancellation_reason`, `admin_note`, `email`, `address`, `description`.
Matching values become `[REDACTED]`; cookies are redacted wholesale. This is not a
perfect PII filter — it covers the explicit PII columns Servyou collects. (Unit-tested
in `src/__tests__/sentry-scrubber.test.ts`.)

## Sample rates

- **Errors: 100%** — every error is captured.
- **Performance traces: 10%** in production, **100%** in development.
- **Session replay: disabled** — needs an explicit user-consent flow under Tunisian
  GDPR-equivalent law (Loi 2004-63); deferred to post-launch.

## Note on the `/monitoring` tunnel

Sentry events are proxied through `/monitoring` (set via `tunnelRoute`) to dodge ad
blockers. `src/middleware.ts` uses a closed-allowlist matcher that does **not** include
`/monitoring`, so the tunnel is unobstructed. If the middleware matcher is ever widened,
keep `/monitoring` excluded or browser events will silently stop arriving.
