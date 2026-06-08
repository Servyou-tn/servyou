# Operations — Servyou

## RLS smoke test (`npm run rls-smoke`)

Programmatic verification that the critical Row-Level Security policies actually hold,
run against **production Supabase**. The server-action unit tests mock the Supabase
client, so they never exercise real RLS; this script does — it creates three ephemeral
users, signs in as each with a real authenticated client, and asserts the privacy and
visibility boundaries, then cleans up.

```
npm run rls-smoke
```

Requires `.env.local` with `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
and `SUPABASE_SERVICE_ROLE_KEY` (loaded via `node --env-file`). The service-role key is
used **only** for fixture setup and teardown; the assertions themselves run through
per-user authenticated clients. **Pass** = all assertions green, exit 0. **Fail** = the
failing assertions are listed, exit 1.

### MVP coverage (PR-U)

Highest-risk paths, each "deny" paired with a positive control on the same row:

- **profiles** — `public_profiles` exposes name/city but hides phone/email/date_of_birth
  (the invariant CLAUDE.md states twice); base `profiles` rows of other users are not
  readable; `get_contact_phone` reveals the number only with a relationship.
- **reports** — reporter sees own; non-reporter non-admin does not; admin sees all.
- **disputes** — buyer and seller parties see; non-party non-admin does not; admin sees all.
- **admin_audit_log** — non-admin can neither write (via `log_admin_action`) nor read;
  admin can do both.
- **moderation** — `admin_hide_content` sets the admin marker (`status='hidden'` +
  `admin_hidden_at`); the moderation-lock triggers then block a non-admin owner from
  overriding it: `enforce_admin_moderation_lock_products` (a seller can't clear the
  marker or flip status back to `active` on products an admin moderated) and
  `enforce_admin_marker_lock` (a non-admin owner can't set `shops.admin_hidden_at`).

Each new RLS-touching PR should add coverage here (PR-U1, U2… expand to the remaining
tables).

### Public catalog tables are world-readable by design — hiding is APP-layer, not RLS

`products` and `shops` have a SELECT policy of `USING (true)` — the public catalog is
intentionally readable by everyone. Hiding a listing (seller-hide via `status`, or admin
moderation via `admin_hidden_at`) is **not** enforced by RLS on the read path; it is
enforced at the **application layer** by the cascade filtering shipped in PR-N (public
surfaces query `status='active'` and `admin_hidden_at IS NULL`). The DB-layer guarantee
is narrower and is what the smoke test asserts: an admin can set the marker, and a
non-admin owner **cannot override or clear it** (the moderation-lock triggers above).

Do **not** add an RLS assertion of the form "a hidden product/shop is invisible to the
public" — it will fail, because RLS returns the row and the app does the filtering. (PR-U's
first run included exactly that false-premise assertion; it was swapped for the
override-lock test. Documented here so it isn't reintroduced.)

### Note on the audit-log write (design intent preserved)

To exercise the `admin_audit_log` RLS at all, the script writes a couple of **ephemeral**
rows to that table (the admin-write assertion + the moderation action), then removes them
via the service role. The "immutable audit log" design — no UPDATE, no DELETE policy — is
a **user/app-facing** invariant and stays fully intact: no application code path can ever
delete an audit row. The narrow service-role cleanup is scoped strictly by the
script-generated test-user ids created in the same run (`admin_id IN (test_user_ids)`),
never by an action/target pattern, so it can never touch a real forensic row.

### Manual cleanup (if the script crashes mid-run)

The test users use deterministic emails (`alice@rls-smoke.servyou.invalid`, etc.). The
script self-cleans, and also re-runs cleanup on a fatal error — but if it is killed
hard, clean up manually. **Order matters**: delete the audit-log rows *before* the users.
`admin_audit_log.admin_id → profiles` is `ON DELETE RESTRICT`, so deleting the users first
fails for the admin test user (charlie) while their audit rows still reference them:

```sql
DELETE FROM admin_audit_log
 WHERE admin_id IN (SELECT id FROM auth.users WHERE email LIKE '%@rls-smoke.servyou.invalid');
DELETE FROM auth.users WHERE email LIKE '%@rls-smoke.servyou.invalid';
```

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
