# Suspension enforcement (`fix/suspension-enforcement`, 2026-10-24)

Found during migration 61's discovery (decisions D1–D8). TRUNCATE grants are tracked under
"LOW — Supabase advisor hygiene" above (re-confirmed there).

## MEDIUM — `disputes`, `data_exports` and `deletion_requests` accept admin fields on INSERT
✅ CLOSED — migration 68 (`20261026190353_prelaunch_acl_hardening`, item C) and 83 (`20261028194719_disputes_insert_columns`).
Live 2026-10-30: no table-level INSERT for authenticated on the three tables; column INSERT only on
`disputes(order_id, reason, description, created_by_role)`, `data_exports(user_id)`, `deletion_requests(user_id, reason)`.

- ✅ **CLOSED**: `data_exports` / `deletion_requests` by migration 68 C; `disputes` by migration 83 `20261028194719_disputes_insert_columns` (`fix/security-followups-batch`, 2026-10-28; proof: `security-followups-batch.test.ts`). `disputes.created_by` was not added.

- **What:** each INSERT policy checks only who the row belongs to — "Dispute creation by order
  party" (the caller is the order's buyer or seller, order past `pending`), "Users insert own export
  request" / "Users insert own deletion request" (`auth.uid() = user_id`) — and `authenticated`
  holds table-level INSERT. So any signed-in account can insert a dispute already `resolved` with
  an `outcome` and an `admin_note`, or an export / deletion request already `completed` with
  `processed_at`, `processed_by` (any uuid, an admin's included) and an arbitrary `export_url`.
  `disputes` also records only `created_by_role`, never who opened it.
- **Migration 61:** keeps these INSERTs open to suspended accounts (D3, D4) — no new power, the hole
  is pre-existing for every account.
- **Fix:** a BEFORE INSERT guard (or column-level INSERT grants) forcing `status` to its default and
  the admin columns to NULL for non-admin callers; add `created_by uuid default auth.uid()` to
  `disputes`.

## MEDIUM — active users can still transact with a suspended account, and its content stays public
✅ CLOSED — ruling 7 (2026-10-28), re-confirmed by the founder 2026-10-30 (« a suspended seller / freelancer:
listings hidden from public and NOT orderable; existing orders continue »), is already live:
- 89: a new order from a suspended seller is refused (« Cet article n'est plus disponible. »);
- 90: a job response to a suspended poster's post is refused (`job_unavailable`); 94: that post no longer counts
  toward the poster's 5-active cap;
- 88: `get_contact_phone` returns NULL when either party is suspended, on every branch — including unlocks granted
  earlier, so the phone / WhatsApp contact on an EXISTING order is withdrawn while the account is suspended;
- 95: the public branch of the shops / products / freelancer_profiles / service_listings / job_posts SELECT policies
  requires an active account.
Existing orders keep their rows and lifecycle; only the contact reveal is withdrawn (88). If the founder wants contact
kept on existing orders, that is a change to 88 for the Nov 6–10 review. Live-verified 2026-10-30.

## MEDIUM — `get_contact_phone` withdraws contact on EXISTING orders while a party is suspended (migration 88)
⏳ RULED, for the Nov 6–10 build (architect / founder, 2026-10-30): the phone / WhatsApp contact must STAY visible on
EXISTING orders while either party is suspended — existing orders continue, and they need contact. Hide it only for
new interactions. No code before then.
- **What:** migration 88 (`20261028201733_get_contact_phone_state_gate`) returns NULL when either party is suspended,
  on every branch, including unlocks granted before the suspension. So an order placed before a suspension loses its
  WhatsApp / phone contact, though the order itself continues (rows and lifecycle untouched).
- **Fix shape:** in `get_contact_phone`, keep the suspension gate on the branches that unlock contact for a NEW
  interaction (a job response, a not-yet-placed order) and drop it on the branch backed by an existing order between
  the two parties (placed before the suspension, still in a non-terminal or recent status — exact window to confirm).
  SQL to the architect, who applies it; a live test pins both sides (existing order keeps contact, new interaction
  gets NULL).
- **Where it lives:** `get_contact_phone` (migration 88); the WhatsApp buttons on G9 / E3 read it.
- **Trigger:** the Nov 6–10 suspension build.

- **What:** migration 61 checks the actor only (D6). Nothing reads the counterparty's
  `suspended_at`: an active buyer can still order from a suspended seller's shop or listing
  (`enforce_order_insert_integrity` does not check it); an active freelancer can still respond to a
  suspended consumer's open job post, which unlocks the poster's phone through
  `get_contact_phone`; and a suspended account's shop, products, listings, freelancer profile and
  job posts stay publicly listed (no SELECT policy reads `suspended_at`).
- **Fix (product call):** hide a suspended account's public content (SELECT policies, or have
  `admin_suspend_user` stamp `admin_hidden_at` on it) and refuse an order or a response that
  targets a suspended account in the existing BEFORE INSERT guards.

## LOW — `LanguageToggle` logs the raw Supabase error object

- **What:** `src/components/layout/LanguageToggle.tsx:42` —
  `console.error('[LanguageToggle] profile language update error:', error)`. A `PostgrestError`
  serializes to `{}` (CLAUDE.md hard standard). After migration 61 (D8), every language switch by
  a suspended account whose session is still live takes this branch with `42501`.
- **Fix:** log `error.message`, `error.code`, `error.details`.

## MEDIUM — D3 is unreachable in the app: a suspended account cannot get to its export / deletion request
⏳ RULED, for the Nov 6–10 review (founder, 2026-10-30): a suspended user CAN reach their own data export and
deletion request (legal right). The DB already allows it (migration 61 keeps both INSERT policies open); the missing
part is the path in (middleware signs a suspended session out). No code yet.

- **What:** migration 61 keeps `data_exports` / `deletion_requests` INSERT open to a suspended
  account (D3, GDPR rights), but the same PR bans it in Supabase Auth and middleware signs it out
  on every route — so the only path left is the API with a token issued before the ban (≤ 3600 s).
  In practice a suspended user can only exercise D3 through support.
- **Fix (product call):** a support / contact path that files the request on their behalf
  (service role), or a signed-link flow that does not need a session.

## LOW — sign-in tells anyone that an email belongs to a suspended account

- **What:** GoTrue answers `user_banned` before it checks the password (measured 2026-10-24: right
  and wrong password both get it; an unknown email gets `invalid_credentials`). `/connexion` maps it
  to the suspended banner, which adds nothing — the public auth API already says it to anyone who
  calls it with the anon key. The disclosure comes with the ban itself.
- **Fix (if it matters):** none in-app; would need GoTrue to check the password first, or a
  suspension that is not a ban (and loses the refresh / sign-in refusal).

## LOW — a token issued before the ban can still READ through the API for up to an hour

- **What:** the access-token lifetime is 3600 s (ES256, measured 2026-10-24). After a suspension,
  getUser() and refresh refuse the account at once and the database refuses every write, but
  PostgREST and Storage verify the JWT locally and no SELECT policy reads `suspended_at` — so a
  replayed token keeps read access until it expires.
- **Fix (if it matters):** a shorter JWT expiry (Auth settings), or `is_active_user()` in the
  owner-read policies.

## LOW — `src/middleware.ts` now costs one Auth round trip per signed-in request on every route

- **What:** the inverted matcher runs the existing getUser() (network call to Auth) then one PK
  lookup, in sequence, on every non-static, non-auth navigation and server action — previously only
  on the allowlisted routes. `<Link>` prefetches (~15–30 per signed-in page view) were the bulk of
  it; PR #183 skips GET prefetches (`next-router-prefetch`, founder ruling 2026-10-24). Anonymous
  visitors make no network call, but every request is still a middleware invocation against Vercel
  Hobby limits, and getUser() has no timeout, so an Auth slowdown stalls every signed-in page.
- **Fix (if latency shows):** run getUser() and `rpc('is_active_user')` in parallel; or getClaims()
  — note it goes through getSession() and refreshes too.

## LOW — the auth ban can still drift from `suspended_at` outside the admin actions, or after a failed sync

- **Partly fixed in PR #183 (founder ruling 2026-10-24):** the four admin actions now call
  `syncAuthBan`, which sets the ban from the committed `suspended_at` — concurrent admins and
  resubmits converge on the database.
- **What remains:** (a) the ban exists only on the app path — a direct
  `/rest/v1/rpc/admin_suspend_user` call (both RPCs stay EXECUTE-granted to authenticated), a Studio
  / SQL edit of `suspended_at`, or any future code path suspends without a ban (and a direct unsuspend
  leaves one); (b) when the sync itself fails, the action says so without revalidating, but an admin
  who reloads sees only the database state, with no control to re-sync. Reverting the app code does
  not lift bans either; the README rollback covers SQL only.
- **Fix:** keep `banned_until` in step inside the database (the RPCs or a trigger on
  `suspended_at`, if writing `auth.users` is permitted here — needs SQL), or revoke direct EXECUTE on
  the two RPCs; on `/admin/utilisateurs/[id]` read `banned_until` (`auth.admin.getUserById`) and offer
  a re-sync when it disagrees.

## ✅ CLOSED — HIGH — a suspended admin keeps admin READ access (`is_admin()` ignores `suspended_at`)

- **Closed by** PR #183 (2026-10-24): migration 63 (`20261024215559_is_admin_requires_active`,
  `is_admin()` requires `suspended_at is null`) and `checkAdmin` rejecting a suspended admin. Verified
  live: a suspended admin's admin RPCs are Forbidden and it reads no other account's profile; an
  active admin is unchanged.
- **What:** `is_admin()` checks only `is_admin = true`, and `checkAdmin` reads only that column. A
  suspended admin keeps "Admin reads all profiles" (every account's email, phone, date_of_birth) and
  every other `is_admin()` read branch for its token's lifetime (≤ 3600 s), indefinitely if its ban
  is missing. Writes are already refused by migration 61. Found by the PR #183 review.

## LOW (hardening) — PR #183 review leftovers

- `src/middleware.ts`'s sign-out is a 307: a server-action POST from a suspended session is
  replayed as a POST to `/connexion`, so the action errors instead of showing the banner (cookies
  are still cleared). A 303 for non-GET requests would turn it into a GET. Unverified against Next
  16.2's action client.
- `src/lib/auth/auth-ban.ts` and `src/lib/supabase/admin.ts` guard "server only" by comment; the
  repo does not use the `server-only` package (adding it is a dependency change). `setAuthBan` /
  `syncAuthBan` could also take the `checkAdmin` result so the admin gate is structural.


## MEDIUM — server-side getUser() refreshes near expiry and throws the rotated tokens away
✅ CLOSED — `fix/session-refresh-persistence`, 2026-10-30: `src/middleware.ts` writes a refresh onto the response and
the forwarded request (the @supabase/ssr pattern, #257's cookie options); prefetches refresh via `getSession()`.
Preview click-through: `docs/operations/session-refresh-preview-check.md`.

- **What:** auth-js refreshes inside getUser() once the cookie session is within ~90 s of expiry,
  but neither `src/middleware.ts` (no-op `setAll`) nor Server Components (`src/lib/supabase/server.ts`
  swallows the cookie write — its comment "session refresh is handled by middleware instead" is not
  true) persist the result, and no browser client is mounted globally. Once a session goes stale,
  every request — now every route and every prefetch — re-refreshes the same refresh token: extra
  `/token` calls from Vercel's shared egress IPs (Auth's per-IP refresh rate limit; a 429 reads as
  logged-out), plus refresh-token rotation reuse handling. Pre-existing; PR #183 widened it.
- **Fix — its own PR (founder ruling 2026-10-24):** the standard @supabase/ssr updateSession pattern
  (middleware writes `cookiesToSet` onto the response), or a middleware that validates the raw access
  token with getUser(jwt) and never refreshes. Correct the server.ts comment either way.

## MEDIUM — Supabase default privileges re-grant writes on any new or re-created view

- **What:** migration 60 revoked writes on the two existing views only. A new view, or a
  drop-and-recreate of `public_profiles`, gets INSERT / UPDATE / DELETE for anon and authenticated
  again, and a simple owner-run view is auto-updatable — which re-opens the hole migration 60
  closed. Likewise `trg_enforce_active_user` is a per-table list: a new client-writable table ships
  unguarded until someone adds it. The live catalog check in `suspension-enforcement.test.ts`
  catches both, but only in the integration config, which CI (`npx vitest run`) does not run.
- **Fix:** default privileges scoped so views never get client writes (or a `ddl_command_end` event
  trigger that revokes them / attaches the trigger), plus a migration-checklist item: "new table →
  trigger; new view → revoke writes".

## MEDIUM (investigate) — no integrity sweep for writes that may have gone through the `public_profiles` hole
✅ CLOSED — `docs/audits/public-profiles-integrity-check-2026-10-30.md`: no sign of a write through the hole
(14/14 profiles, avatars all with provenance, `seller_type` consistent, no under-18 seller, clean names / cities).
One 2026-08-07 update of a real account is not attributable but consistent — founder to confirm it.

- **What:** migration 60 notes "earlier writes cannot be ruled out from the logs". DELETE is ruled
  out (22 users = 22 profiles); a PATCH (name / city / avatar / `seller_type`) is not.
- **Fix:** read-only checks — every `profiles.avatar_url` has a matching `uploaded_objects`
  (`avatars`, `owner_id = id`) row; `seller_type` agrees with the account's shop / freelancer rows;
  `updated_at` anomalies around the exposure window.

## LOW — the delete actions read the suspension error as "has orders"

- **What:** `deleteProductAction` (`src/app/actions/products.ts:558`) and `deleteService`
  (`src/app/actions/services.ts:156`) map `error.code === '42501'` to the "an order landed" race
  message; migration 61 raises 42501 too, so a suspended seller deleting a product / service with no
  orders is told it has orders. Unreachable in the app once PR #183 deploys (middleware signs the
  account out before any action runs); reachable until then on `/mes-produits` and `/mes-services`.
- **Fix:** check `error.message === 'Ce compte est suspendu.'` before the 42501 mapping.

## LOW — suspension does not revoke sessions

- **What:** `setAuthBan` sets `banned_until` only. A device that made no request while the account
  was suspended keeps its refresh cookie and resumes after the unban — relevant if suspension is
  ever the response to a compromised account.
- **Fix (if it matters):** sign out every session on suspension (Admin API, or `auth.sessions` via a
  service-role RPC).

## LOW — `suspension-enforcement.test.ts` teardown stops at the first failure

- **What:** teardown throws on the first failed delete, leaving the remaining fixtures — possibly
  one of the two `is_admin` accounts (per-run password) — until the next run's teardown. It shares
  the `@rls-smoke.servyou.invalid` suffix the rls-smoke reaper deletes wholesale.
- **Fix:** collect errors, delete every fixture, throw once at the end; demote fixture admins first.

## LOW (note) — no last-active-admin guard

- Two admins suspending each other at the same moment both pass the statement trigger; recovery is
  the SQL editor only. Moot with one admin.
