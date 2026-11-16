# Two-step sign-up, DB-1: follow-ups (`feat/two-step-signup-db`, 2026-11-15)

DB-1 of DB-1 → UI-1 → DB-2 (plan and founder decisions: `docs/follow-ups/two-step-signup-plan.md`, PR #381). This PR
ships the spike suite, `db/migrations/20261115222457_two_step_signup.sql` (applied 2026-11-15, README #135) and its live suite. These are the items
it leaves, ranked.

## 1. MEDIUM: spike point 4 was not run (a first password more than 24 hours after the link)

**What:** with « Secure password change » ON, GoTrue requires a reauthentication for `updateUser({ password })` when
the session is older than 24 hours. A user who opens the link, leaves the tab, and comes back a day later on the same
session would hit it in step 2.
**Why deferred:** forcing a session older than 24 hours means writing `auth.sessions.created_at` on production, which
needs the architect's OK. Its effect is UI only: the database refuses nothing extra.
**Where it lives:** UI-1's step-2 server action. It maps GoTrue's reauthentication error to « Recevoir un nouveau
lien »; a new link opens a fresh session.
**Trigger:** UI-1. Decided (architect, 2026-11-15): the check is NOT run; no writes to `auth.sessions` on
production. UI-1 handles the case on the page.

## 2. MEDIUM (UI-1): what step 2 must do with the database

**What:**
- **Call order** (review M1):
  1. `signOut({ scope: 'others' })`;
  2. `updateUser({ password })`;
  3. `complete_my_account(p_full_name, p_date_of_birth, p_city, p_terms_version)`.

  The RPC refuses while another session of the account is alive (`other_sessions`: run the sequence again). The
  password must change during the same session (`password_required` otherwise).
- **Hints to map** to i18n keys, never the raw French text:
  - `other_sessions` → repeat the sequence once, then the « new link » path;
  - `password_required`, `email_link_required`, `session_unknown` → the « new link » path;
  - `name_invalid`, `city_required`, `birth_date_invalid`, `too_young`;
  - `terms_required`, `terms_outdated` (reload the page);
  - `already_complete` (go on).
- **The terms version:** the page sends the version it shows. It must equal `private.current_terms_version()`
  (`cgu-2026-06-17+confidentialite-2026-11-14`). Keep it in one TypeScript constant, and bump it with a migration when
  `legal.updatedDate` or `legal.privacy.updatedDate` changes.
- **`profiles.date_of_birth` is now nullable**, for incomplete accounts.
  - `tsc` stayed green: the readers declare their own types.
  - `src/lib/marche/mon-compte.ts`, the admin user pages and the seller age-gate cards must still show a missing
    birth date gracefully (« — »).
- **The middleware** reads `completed_at` alongside `suspended_at` (one query).

**Why deferred:** pages are Agent A's (plan section 7).
**Where it lives:** the plan's sections 4 and 7; this PR's live suite shows each refusal.
**Trigger:** met: DB-1 applied 2026-11-15 (`20261115222457`, README #135).

## 3. MEDIUM (DB-2): the gate, the end of the transitional rule, the purge

**What:**
- `trg_enforce_active_user` also refuses an incomplete account's writes on the 28 tables (decision 5:
  `deletion_requests` and `data_exports` included). `complete_my_account` must still get through.
- `handle_new_user` is complete at creation only when `new.email_confirmed_at is not null` at insert (the service
  role's fixtures and seeds). Revisit the « avant 2026-11 » label for those.
- Purge confirmed-but-incomplete accounts after 7 days, with today's exclusions (decision 5).
- **Required, not optional** (review M4): refuse EVERY write whose JWT `session_id` no longer exists in
  `auth.sessions`, not only an incomplete account's.
  - Otherwise a squatter's already-issued access token keeps writing for up to an hour after the owner completes.
  - The cost is one indexed lookup per write statement.
- The 16+ rule at creation too (review L6). The 15-year-old « minor » fixtures of `job-responses-integrity`,
  `prelaunch-acl-hardening` and `seller-capability-integrity` move to 17 (still under 18), or they would become
  incomplete and their 18+ refusals would turn into the gate's.

**Why deferred:** DB-2 ships the same day UI-1 goes live (decision 10). Until then H1 stays open, as decided.
**Where it lives:** `public.enforce_active_user()`, `public.handle_new_user()`, `purge_unconfirmed_signups()`.
**Trigger:** UI-1 deployed.

## 4. ✅ CLOSED (2026-11-15): two Auth settings the design now depends on

**What:**
- **« Secure email change » must be ON** (review M2). Otherwise a squatter's password session could move the account
  to the squatter's own address before the owner completes; an e-mail-change link also yields an `otp` session.
- **Anonymous sign-ins must be OFF** (review L5). `handle_new_user` no longer fails without a birth date, so every
  `auth.users` insert now gets a profile.

**Why deferred:** decision 9 did not list them. Only the founder can read the dashboard.
**Where it lives:** Supabase dashboard › Authentication › Providers › Email (« Secure email change ») and › Settings
(« Allow anonymous sign-ins »). Both are listed in the PENDING file's DEPENDENCIES.
**Trigger:** met. The founder confirmed in the dashboard before the apply: « Secure email change » ON, anonymous
sign-ins OFF.

## 5. LOW: the spike uses admin-generated links, not the browser's `signInWithOtp`

**What:** the browser's call (CAPTCHA, the e-mail, the « Confirm signup » or « Magic Link » template) cannot run from a
test, and no outside address receives mail before Brevo. `generateLink` creates the same account and link types, and
`verifyOtp` is the same `/verify` the e-mailed link calls.
**Why deferred:** decision 9: real outside sign-ups only after domain day.
**Where it lives:** `src/__tests__/two-step-signup-auth-live.test.ts`.
**Trigger:** domain day (Brevo live). Check one real sign-up end to end, and the two templates' wording.

## 6. INFO: transient connect timeouts from the dev PC

**What:** two live runs on 2026-11-15 failed an admin call with `fetch failed` / `ETIMEDOUT`: once in a `beforeAll`,
once in an `afterAll`. The second left one fixture, which was deleted through the admin API and counted (0 left).
**Why deferred:** a local network blip, not the suites.
**Where it lives:** the live suites' teardown.
**Trigger:** if it recurs, give teardown's `deleteUser` one retry.
