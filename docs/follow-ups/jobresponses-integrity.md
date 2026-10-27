# job_responses integrity (`fix/job-responses-integrity`, 2026-10-23)

Found during migration 59's discovery, `/gstack-review` (core + adversarial pass) and the Supabase
advisors. Migration 59 itself closed the `job_responses` HIGH above.

## MEDIUM — moderation is shed by deleting and re-creating the freelancer profile (decision D4)

- **What:** "Owner deletes own freelancer profile" checks only `profile_id = auth.uid()`, and
  `enforce_admin_marker_lock` is BEFORE UPDATE only. A moderated freelancer with no orders can
  DELETE their profile and INSERT a fresh one (`enforce_seller_capability` passes: still
  `seller_type = 'freelancer'`, no shop) with `admin_hidden_at` NULL — and respond to job posts
  again, since migration 59's "not moderated" check reads the new row.
- **Scope:** moderation evasion across the whole freelancer surface (profile, listings once
  re-created), not only responses.
- **Fix (design choice):** refuse the DELETE while `admin_hidden_at` is set (policy or trigger), or
  move moderation to the account (`profiles`) so a re-created row inherits it.

## MEDIUM — admin-moderated job posts stay readable and accept responses (READ half ✅ closed)

- **Read half closed by** migration 65 (`20261025213214_prelaunch_shop_read_rls`, 2026-10-25): the public
  branch of "Open posts or own posts readable" now requires `admin_hidden_at is null`. **Still open:** a
  moderated post still ACCEPTS responses (`check_job_response_limits()` does not read `admin_hidden_at`), so
  the BEFORE INSERT guard below is still owed. **Priority raised (PR #192 review):** each such response also
  unlocks the poster's phone, because `get_contact_phone`'s job_responses branches check neither the post's
  status nor `admin_hidden_at`. A freelancer who kept a moderated post's id can still respond and read the
  phone. Fix both together: the response guard, and the same post-state condition in `get_contact_phone`.

- **What:** `admin_hide_content('job_post', …)` only stamps `job_posts.admin_hidden_at`. The SELECT
  policy "Open posts or own posts readable" is `status = 'open' OR consumer_id = auth.uid()`, and
  `check_job_response_limits()` checks status and expiry but not `admin_hidden_at` — so a moderated
  open post is still listed to everyone and still accepts responses (each one unlocks the poster's
  phone).
- **Fix:** add `admin_hidden_at is null` to the public branch of the SELECT policy (admins keep
  "Admin reads all job_posts") and refuse a response on a moderated post in a BEFORE INSERT guard.

## LOW — suspending or moderating a freelancer does not revoke the phone unlock they already hold

- **What:** `get_contact_phone` returns the phone whenever any `job_responses` row links caller and
  target, whatever the responder's current state. Migration 59 stops new responses from suspended or
  moderated freelancers; existing ones keep working.
- **Fix (product call):** gate `get_contact_phone`'s job_responses branches on the responder still
  being active, or have suspension / moderation withdraw the responses.

## ✅ RESOLVED (migration 68 `20261026190353`, 2026-10-26) — 31 SECURITY DEFINER functions are executable by anon / authenticated (one hygiene PR)

- Fixed exactly as proposed below, plus the global and per-schema default-privilege revokes; advisors
  0028 = 3, 0029 = 10 after apply. Original entry:

- **What:** advisor lints 0028 / 0029 flag every SECURITY DEFINER function in `public` (31 after
  migration 59). Supabase's default privileges grant EXECUTE on each new function to `anon` and
  `authenticated` directly, on top of Postgres' PUBLIC grant, so `revoke … from public` alone (what
  older migrations did) leaves them callable over `/rest/v1/rpc`. Trigger functions cannot run that
  way ("trigger functions can only be called as triggers"); the admin RPCs gate on `is_admin()`
  internally — so most of this is noise, but it is one layer.
- **Includes:** `enforce_job_responder_capability()` — its
  `revoke execute … from public, anon, authenticated` was drafted after review and NOT applied with
  migration 59.
- **Fix (one PR):** revoke EXECUTE from `public, anon, authenticated` on every trigger function and
  every function no client calls; keep the intended RPCs (`get_contact_phone`,
  `get_completed_service_order_count`, the admin RPCs for `authenticated`) explicitly granted; and
  close new functions by default. PUBLIC's EXECUTE comes from Postgres' built-in global default,
  which a per-schema `alter default privileges` cannot revoke — it needs the global form
  (`alter default privileges for role postgres revoke execute on functions from public`, and the
  same for `supabase_admin` if it creates functions), plus the per-schema
  `alter default privileges for role postgres in schema public revoke execute on functions from
  anon, authenticated` for Supabase's explicit grants. Prove every trigger still fires (the live
  suites do).

## ✅ RESOLVED (migration 68, 2026-10-26) — migration 48's README entry overstates `freelancer_has_active_listing`'s EXECUTE revoke

- anon's EXECUTE is revoked and README #48 carries a dated correction. Original entry:

- **What:** README #48 says EXECUTE was "revoked from public/granted to authenticated". Live ACL:
  `{postgres, anon, authenticated, service_role}` — PUBLIC is gone but `anon` still holds a direct
  grant (Supabase default privileges), and the advisor lists it under lint 0028.
- **Fix:** revoke from `anon` in the hygiene PR above, then correct the README sentence.

## LOW — `auth_rls_initplan`: 69 policies re-evaluate `auth.uid()` per row

- **What:** advisor lint `auth_rls_initplan` flags 69 policies (all three `job_responses` policies
  among them) that call `auth.<function>()` or `current_setting()` unwrapped, so Postgres
  re-evaluates them per row. The lint does not look at `is_admin()`; the policies that call only
  `is_admin()` are not in the 69 but have the same shape. The `job_responses` policies also have no
  `TO` clause (they apply to `public`).
- **Fix:** one performance PR rewriting each predicate as `(select auth.uid())` and adding
  `to authenticated` where the policy is never meant for `anon` — policy-by-policy, live-tested.

## LOW (note) — the `security_definer_view` ERROR on `public_profiles` is intentional

- The advisor reports `public_profiles` as a SECURITY DEFINER view (level ERROR). That is by design:
  its protection IS its SELECT column list (CLAUDE.md — never add phone / email / date_of_birth).
  Switching it to `security_invoker` would make it return nothing to other users (profiles RLS is
  owner-only). Document the exception; do not "fix" it.

## LOW — two `20260804*` migration files do not match their recorded versions

- **What:** `20260804125106_remove_placeholder_product_image_pointers.sql` is recorded as
  `20260804114751`, and `20260804132447_categories_kind_discriminator.sql` as `20260804122010`. The
  README's Verification query lists only three known-divergent files, so these two read as drift.
- **Fix:** add both to the `known_divergent` table (content unchanged), like the other three.

## LOW — two June test users are still in `auth.users`

- **What:** two `test-…@example.com` users created 2026-06-20 and 2026-06-24 (the `job-limits` /
  `profiles-rls` email shape) survived their suites' teardown. Not created by this PR's runs (both
  suites cleaned up after themselves on 2026-10-23).
- **Fix:** confirm they own nothing real, then delete them with the service role.

## LOW — eight live-DB suites promote a production admin with a password committed to a public repo

- **What:** `d4-freelancer-services-visibility`, `freelancer-publish-gate-rls`,
  `h3-links-portfolio-rls`, `h5-service-status-cascade`, `h6-service-listings-hardening-rls`,
  `orders-insert-integrity`, `profiles-client-insert-delete-revoked` and
  `seller-capability-integrity` set `is_admin = true` on a fixture account whose password is a
  constant in the file. The repo is public and the suites run against production, so a run killed
  between `beforeAll` and `afterAll` leaves a working admin login until the next run's teardown.
  Found by the `/gstack-review` of `fix/job-responses-integrity`; that PR's own suite already uses a
  per-run `randomUUID()` password.
- **Fix:** the same one-line change in each suite (`` const PASSWORD = `…-${randomUUID()}-Aa1!` ``).
