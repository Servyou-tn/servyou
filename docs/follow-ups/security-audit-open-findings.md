# Security audit — open findings (`fix/orders-insert-integrity`, 2026-10-23)

Manual static review of the live schema + app code (gstack-cso itself did not run — see the last
entry). Fixed in this PR, so NOT listed below: the profiles self-admin hole (migration 53) and the
orders INSERT gap (migration 54). Ranked most severe first; each is its own PR unless noted.

## ✅ CLOSED for `shops` + `freelancer_profiles` only — HIGH — `shops` / `freelancer_profiles` INSERT bypass the 18+ and one-seller-capability rules

- **Scope of the closure:** these two tables only. `job_responses` lets any account act as a
  freelancer with no age or capability check — that is still open, see the next entry.
- **Closed by** migration 55 (`20261023182532_seller_capability_integrity`,
  `fix/seller-capability-insert`, 2026-10-23): `enforce_seller_capability()` (BEFORE INSERT OR
  UPDATE OF owner on both tables) requires the owner's matching `seller_type` and no row of the
  other capability; `enforce_seller_capability_switch()` (BEFORE UPDATE OF `seller_type` on
  `profiles`, founder decision D1) stops a seller moving away from a capability they still own.
  Decision D2: the one existing freelancer profile on a `seller_type`-NULL account is left as is.
  Live proof: `src/__tests__/seller-capability-integrity.test.ts`.
- **Correction to the fix sketch below:** matching `seller_type` alone was not enough —
  `seller_type` stays client-UPDATEable, so an adult freelancer could flip to `shop_owner` and then
  POST a shop. Hence the "no other capability row" conjunct and the `profiles`-side guard.
- **What:** "Owner inserts own shop" and "Owner inserts own freelancer profile" check only
  `owner_id` / `profile_id = auth.uid()`, and neither table has an INSERT trigger. The age gate
  lives on `profiles.seller_type` (BEFORE UPDATE), which creating a shop never touches.
- **Exploit:** a consumer of any age `POST`s `/rest/v1/shops` (or `freelancer_profiles`, or both)
  over REST and becomes a seller without ever setting `seller_type`.
- **Fix:** BEFORE INSERT trigger on both tables requiring the caller's `profiles.seller_type` to be
  the matching value (which is itself age-gated), so the one-capability rule follows too.

## ✅ CLOSED — HIGH — `job_responses` INSERT bypasses the 18+ and freelancer-capability rules (and unlocks phones)

- **Closed by** migration 59 (`20261023212946_job_responses_responder_integrity`,
  `fix/job-responses-integrity`, 2026-10-23), switch-path corollary included:
  `enforce_job_responder_capability()` (BEFORE INSERT, fires before the limits trigger) requires the
  caller's own row first, then `seller_type = 'freelancer'`, 18+, not suspended and an unmoderated
  freelancer profile (all `42501`); `enforce_seller_capability_switch()` now also refuses a move away
  from `freelancer` while the account holds any response (D1); anon lost INSERT / UPDATE and
  authenticated lost UPDATE on the table (D3). D2: direct 18+ check kept. D4: moderation shedding
  logged below, not fixed. Live proof: `src/__tests__/job-responses-integrity.test.ts`.
- **Found by:** `/gstack-review` of PR #180 (security specialist + adversarial pass, independently),
  2026-10-23; confirmed live by the architect. Not caused by migration 55 — the policy dates from
  migration 8 (`20260603182702_job_posts_skills_responses`).
- **What:** the only INSERT gate is the RLS policy "Freelancer creates own response",
  `with check (freelancer_id = auth.uid())`; `freelancer_id` references `profiles`, not
  `freelancer_profiles`, and `check_job_response_limits()` (BEFORE INSERT) checks open / expiry /
  self-response / duplicate / the 10-per-post and 5-active caps but never `seller_type` or a
  freelancer profile. No app code inserts responses, so the policy is the whole gate.
- **Exploit:** any signed-in account — a consumer, a self-declared minor, a shop owner — POSTs
  `/rest/v1/job_responses` on an open post and then calls `get_contact_phone(poster)`, which returns
  the poster's phone whenever a response links the two. Deleting the response ("Freelancer deletes
  own response") frees a slot under the 5-active cap, so it repeats.
- **Switch-path corollary (red team):** responses are keyed on `profiles.id` and survive the
  deletion of the freelancer profile. A freelancer with no orders can delete their profile, switch
  to `shop_owner` (migration 55 allows it — no capability row left), open a shop, and keep live
  responses plus the phone unlock with each poster.
- **Live state (2026-10-23):** 3 responses, all from real freelancers — not exploited.
- **Fix (its own PR, after #180 merges; architect to brief):** a responder check on the INSERT path
  (extend `check_job_response_limits()` or a sibling trigger, same `auth.uid()` NULL / `is_admin()`
  bypass): `seller_type = 'freelancer'` plus an owned `freelancer_profiles` row, `42501`. Decide
  what happens to existing responses on a switch (count `job_responses` as freelancer capability
  rows in `enforce_seller_capability_switch()`, or have the switch flow remove them).

## ✅ CLOSED — HIGH — suspension is enforced only in `src/middleware.ts`

- **Closed by** `fix/suspension-enforcement` (2026-10-24), all three layers: migration 61
  (`20261024191215_suspension_enforcement`) — `trg_enforce_active_user`, a statement-level BEFORE
  trigger on all 26 client-writable tables, plus restrictive `storage.objects` policies (decisions
  D1–D8); the auth ban (`src/lib/auth/auth-ban.ts`, called from both admin suspend / unsuspend
  actions, database first, retry-safe); and the middleware matcher inverted to every route but
  static assets, the auth pages and `/monitoring` (it also signs out on getUser's `user_banned`).
  Verified by `suspension-enforcement.test.ts` (live) and `middleware-suspension.test.ts`. What
  remains is logged under "Suspension enforcement" at the end of this file.
- **What:** `suspended_at` is checked only in `src/middleware.ts:31-55`, which clears cookies on
  matched routes. No RLS policy reads it; the matcher misses `/demander`, `/mes-commandes`,
  `/commandes-recues`, `/mes-produits`, `/mes-services`, `/mon-compte`, `/parametres`, the
  dashboards, `/boutique/[id]` and `/freelance/[id]` (and lists stale paths).
- **Exploit:** a suspended user signs in again or reuses a token and keeps writing through PostgREST
  or any server action on an unmatched route (e.g. `submitProductRequest`).
- **Fix:** ban the auth user on suspension (admin API), add an `is_active()` helper to write policies,
  fix the matcher. Includes decision D3 below.
- **Partial (2026-10-23):** migration 59 is the first DB-level read of `suspended_at` on a write path
  — a suspended account can no longer insert a `job_responses` row. Every other write path is still
  open.

## ✅ CLOSED — HIGH — admin area has no server-side `requireAdmin()`

- **Closed by** `fix/app-server-guards` (2026-10-23): `src/lib/auth/require-admin.ts` —
  `requireAdmin(path)` in a now-server `admin/layout.tsx` AND in all 8 admin `page.tsx` (a layout
  does not re-render on client navigation), `checkAdmin(supabase)` first in all 13 admin actions
  (`statistiques` swapped from its inline check, which swallowed the profiles error).
- **What:** `src/app/admin/layout.tsx` is `'use client'` and checks `is_admin` in a `useEffect`; the
  actions in `admin/{litiges,signalements,utilisateurs}/actions.ts` never call `getUser()` or check
  admin (only `statistiques/actions.ts` does).
- **Exploit:** none today — every write is gated by `is_admin()` in RLS/RPCs. But it is a single
  layer: migration 53's hole would have handed over the whole admin UI with no second check.
- **Fix:** server `requireAdmin()` in a server `admin/layout.tsx` and at the top of every admin action.

## ✅ CLOSED (except E2) — MEDIUM — orders UPDATE: lifecycle columns stay writable after the fact

- **Closed by** migration 66 (`20261025222218_order_lifecycle_columns`, 2026-10-25): with a JWT,
  `received_at` can no longer be backdated (discarded outside the receipt transition) and
  `cancelled_by` / `cancellation_reason` change only inside the transition into `cancelled` (else 42501).
  Live-tested by `orders-lifecycle-columns.test.ts`. **Still open:** E2 (✅ E2 closed by migration 84 `20261028194721_orders_received_at_revoke`, 2026-10-28) (the `received_at` column grant
  revoke, after H8 #191) and moving the buyer-side client `.update()`s to server actions.

- **What:** `authenticated` holds UPDATE on `cancelled_by`, `cancellation_reason`, `received_at`;
  `check_order_status_transition` lets status-free edits "sail through" and
  `enforce_order_identity_lock` doesn't cover these three.
- **Exploit:** a buyer flips `cancelled_by` 'buyer' → 'seller' on an already-cancelled order to clean
  `buyer_cancellation_history` (or a seller frames a buyer the other way); either party backdates
  `received_at`.
- **Fix:** lock the three once set (identity lock), stamp `received_at` in a trigger and revoke its
  grant; move `ReceiptConfirmButton` / `OrdersList` / `CancelOrderModal` writes to server actions.

## ✅ CLOSED — MEDIUM — `demander/[id]/actions.ts` has no Zod schema

- **Closed by** `fix/app-server-guards` (2026-10-23): `demander/[id]/schema.ts` (caps in
  `limits.ts`, founder ruling — `orders` has no DB length CHECK), `seller_id` dropped from both
  inserts, errors logged as `message` / `code` / `details`. The schema also rejects input that would
  corrupt the folded `delivery_address` / `buyer_note`.
- **What:** `submitProductRequest` / `submitServiceRequest` validate by hand: ids aren't checked as
  UUIDs; `note`, `description`, `timeframe`, `deliveryName` have no max length; `quantity` no upper
  bound.
- **Exploit:** a direct action call stores a multi-MB `buyer_note` on a seller's order, rendered on
  their dashboard.
- **Fix:** Zod schema like `actions/orders.ts` (CLAUDE.md hard standard). Same PR: drop the now
  redundant `seller_id` from both inserts (migration 54 derives it) and stop logging the raw
  `insErr` object (`console.error('[submit…Request] insert error:', insErr)` — CLAUDE.md "never log
  raw error objects"; log `message` / `code` / `details`).

## ✅ CLOSED — MEDIUM — `src/app/actions/products.ts` relies on RLS alone for ownership

- **Closed by** `fix/app-server-guards` (2026-10-23): toggle / update / delete resolve the shop and
  filter by `shop_id`; `deleteProductImageAction` confirms the parent product (`id` + `shop_id`)
  first, since `product_images` has no `shop_id`; the two bulk writes carry the filter too. The
  wrong `:976` comment is corrected.
- **What:** toggle status (`:462`), delete (`:526`), update (`:778`) and `deleteProductImageAction`
  (`:965`) take a caller `productId` and never add `.eq('shop_id', …)`. Safe today because products
  UPDATE/DELETE and product_images DELETE are owner-gated in RLS. The comment at `:976` ("RLS scoped
  the read to zero rows") is wrong — product_images SELECT is `using (true)`.
- **Fix:** add `.eq('shop_id', shop.shopId)` after `resolveOwnedShopId`, as the bulk actions do.

## ✅ CLOSED (app layer) — MEDIUM — freelancer URL fields accept `javascript:` / `data:`

- **Closed by** `fix/app-server-guards` (2026-10-23) for the server actions: every freelancer URL
  field uses `.url(HTTP_URL)` (`src/lib/freelancer/http-url.ts`, protocol `^https?$`). The DB CHECK
  and a render-time guard are still open — see the `fix/app-server-guards` section below.
- **What:** Zod `.url()` accepts `javascript:alert(1)`; used in
  `mon-profil-freelance/modifier/schema.ts` (`:25,29,35`) and `creer/competences/actions.ts:49-50`,
  rendered as `href` in `freelance/[id]/_components/FreelancerDetail.tsx` (`:119,236,253`). React 19
  blocks it at render today; any non-React consumer (email, OG tags) would not.
- **Fix:** `.refine((u) => /^https?:\/\//i.test(u))` plus a DB CHECK on the columns.

## ✅ CLOSED — MEDIUM — `using (true)` SELECT family (extends the H6 PR-1 entry above)

- **Closed by** migration 65 (`20261025213214_prelaunch_shop_read_rls`, 2026-10-25): `shop_payment_methods`,
  `shop_categories` and `job_post_skills` now delegate to their parent's SELECT policy. `categories` is the only
  `using (true)` SELECT left in `public`, and is meant to be.

- **What:** besides `products` / `shops` / `product_images` (entry above), `shop_payment_methods`,
  `shop_categories` and `job_post_skills` are also `using (true)` (confirmed live 2026-10-23).
- **Fix:** fold into the products/shops security PR with the same embed audit.

## ✅ CLOSED — MEDIUM — `freelancer_profiles.is_published` is owner-settable (publish-gate bypass)

- ✅ **CLOSED by migration 81** `20261028194715_freelancer_profiles_column_grants` (`fix/security-followups-batch`, 2026-10-28; proof: `security-followups-batch.test.ts`).

- **Found by:** `fix/seller-capability-insert` discovery, 2026-10-23.
- **What:** migration 48 defines `is_published` as "derived, never user-set" (true iff ≥1 active
  `service_listings` row, kept by `sync_freelancer_is_published`). But `authenticated` holds column
  INSERT and UPDATE on it and no trigger guards it: the sync trigger lives on `service_listings`
  only, and `enforce_admin_marker_lock` covers `admin_hidden_*` only.
- **Exploit:** an owner PATCHes (or INSERTs) `is_published = true` on a profile with no active
  listing, making it and its five child tables (skills, tools, education, certifications,
  languages) world-readable to anon. Self-exposure only, and the next listing write re-syncs it,
  but it defeats the publish gate's invariant.
- **Fix:** revoke INSERT/UPDATE on `is_published` from `anon`/`authenticated` (column grants).
  Do NOT use a guard trigger with the usual `auth.uid()` bypass: `sync_freelancer_is_published` is
  SECURITY DEFINER (owner `postgres`) but fires inside the user's own session, so `auth.uid()` is
  still the user there and the guard would block the sync. The owner bypasses column grants.

## MEDIUM — a "switch seller type" flow cannot be a user-session delete-then-switch

- **Found by:** `/gstack-review` of PR #180 (red team), 2026-10-23. Founder decision needed before
  any switch feature is built.
- **What:** CLAUDE.md says switching deletes own role content but preserves completed transactions.
  Migration 55's Part 2 allows a switch once the old content is gone, but for any seller with an
  order the content cannot go: deleting a shop / freelancer profile cascades to products /
  service_listings, whose orders FK is `ON DELETE SET NULL`, and `enforce_order_identity_lock`
  rejects that cascaded `SET NULL` for a signed-in non-admin (`42501` — the same code
  `actions/products.ts` / `actions/services.ts` already map to "has orders").
- **Options:** a SECURITY DEFINER RPC or service-role action that archives (hides) role content
  instead of deleting it; or exempt the FK-cascade `SET NULL` in `enforce_order_identity_lock` when
  the referenced item is gone.
- **⏸ PARKED until after the real-user review (Nov 6–10)** — architect, 2026-10-30. Options written up, no code.
  Live on 2026-10-30: 1 shop owner, 10 freelancers, 2 sellers with any order, 16 orders in all.
  What already holds: an order keeps its own snapshot (`item_title`, `unit_price_tnd`, `delivery_fee_tnd`), and
  `orders.seller_id` points at the seller's PROFILE, not the shop. A deleted product / service only nulls
  `orders.product_id` / `service_listing_id`, so the order's history survives a real delete.
  - **A. Archive instead of delete.** A SECURITY DEFINER RPC `switch_seller_type(new_type)` hides the old role's
    content (shop + products, or freelancer profile + services) instead of deleting it, then flips `seller_type`.
    + Nothing is lost, and a switch back is possible.
    − It needs an « archived » state that every read path and the one-capability rule (migration 55) treat as « no
      capability ». That touches a lot of RLS and many queries, and leaves rows that are never shown.
  - **B. Real delete, with the cascade allowed.** `enforce_order_identity_lock` lets the FK-cascade `SET NULL`
    through when the referenced product / service no longer exists, i.e. the delete itself caused it. The referential
    action runs after the parent row is deleted, so the trigger should see it gone — to be proven live in B's discovery. The seller deletes their shop or
    profile, then switches through the existing age-gated UPDATE.
    + This matches CLAUDE.md as written (« switching deletes own role content but preserves completed
      transactions »), with one small trigger change and no new state.
    − The delete is irreversible. Open orders (pending / accepted) need a rule: refuse the switch while any is open.
  - **C. Switch only with no orders; otherwise ask support.** Self-serve only when the seller has never had an
    order (no trigger change: today's delete path already works then). Otherwise the founder / admin does it through a
    service-role admin action.
    + No migration. Covers the common early case.
    − Manual work for every seller with history.
  - **D. No switch at all.** One account per role; a seller who changes trade opens a new account.
    + Zero work. − Splits a person across two accounts and phones; poor fit for Tunisia's WhatsApp-first contact.
- **Recommendation:** **C now, B when it is built.** At this scale (2 sellers with orders), C costs nothing and keeps
  the MVP honest. If the real-user review shows people actually switch, build B: one guarded change to
  `enforce_order_identity_lock`, plus a « switch » action that refuses while any order is open and deletes the old role
  content before the age-gated `seller_type` UPDATE. Avoid A: an archived state leaks into every read path for a flow
  few users will use.

## ✅ RESOLVED (migrations 71 / 73 / 74 + PR #208, 2026-10-26) — storage provenance missing for avatars and shop assets

- **Column side fixed (71, 73):** `avatar_url`, `logo_url` and `banner_url` require a host-anchored URL with an
  `uploaded_objects` record owned by the row's owner (no bypass); the product / portfolio checks are
  host-anchored, and portfolio `image_url` is checked on UPDATE too.
- **Upload side fixed (S-3):** PR #208 moved the five upload actions to the service role (after normalize,
  ownership re-derivation and the active-caller check), and migration 74 `20261026222408` dropped the four
  client INSERT storage policies after that deploy: a client PUT into avatars / portfolio-media / shop-assets /
  product-images is refused (`storage-uploads-service-role.test.ts`). Production smoke 2026-10-26: avatar,
  shop logo, product image and portfolio image all uploaded through the deployed app.
- ✅ **RESOLVED by migration 73 (`20261026212227`) — `freelancer_portfolio_items.image_url` could be PATCHed past provenance:**
  its trigger is BEFORE INSERT only, the owner has an UPDATE policy and authenticated holds UPDATE, so an
  owner can insert a recorded item and then point `image_url` at a raw-PUT object (or any URL on the host).
  The app never updates items (delete + re-insert). 0 items today. Fix: the trigger on UPDATE OF image_url too.
- **The project host is hard-coded** in `storage_public_object_path` (S-2): a custom domain, a preview-branch
  database or a replay on another project refuses every image until the helper is redefined.
- **If Google OAuth is ever re-enabled:** a provider avatar URL is refused by `trg_enforce_avatar_provenance`;
  it must be downloaded, normalized, uploaded and recorded like any other avatar (`handle_new_user` does not
  touch `avatar_url` today, so signup is unaffected).
- Original entry:

- **What:** the `uploaded_objects` provenance trigger guards only `product_images` and
  `freelancer_portfolio_items`. `profiles.avatar_url` and `shops.logo_url` / `banner_url` can be
  PATCHed over REST to any URL, and raw bytes can be PUT to the `avatars` / `shop-assets` buckets
  without `normalize.ts`. Bounded: `next/image` `remotePatterns` only renders the Supabase host.
- **Fix:** the owed Storage-REST provenance PR — extend the provenance gate to those columns.

## LOW — order-insert decisions deferred from migration 54 (D2 / D3 / D4)

- **D2:** clients can still set `created_at` / `updated_at` on INSERT (backdating skews H5's monthly
  stats, which bucket by `created_at`). Fix: force both to `now()` for non-admin inserts.
- **D3:** orders are not blocked when the buyer or seller is suspended — with the suspension PR above.
- **D4:** the stock rule (`tracks_stock` and `quantity > stock_count`) is app-only. Fix: add it to
  `enforce_order_insert_integrity`.

## LOW — `shops.owner_id` is not unique

- **Found by:** `fix/seller-capability-insert` discovery, 2026-10-23.
- **What:** the only unique indexes on `shops` are the PK and `lower(name)`. A shop owner can POST
  several shops over REST (migration 55 checks capability, not count), while the app assumes one —
  `resolveOwnedShopId` and the G2 action's "already owns a shop" check.
- **Fix:** a unique index on `shops.owner_id` (discovery first: 1 shop in prod today), or a
  founder decision that multi-shop is a future feature and the app should handle it.

## LOW — the D2 account is shown the G2 form and gets an unexplained error

- **Found by:** `/gstack-review` of PR #180, 2026-10-23.
- **What:** the one account kept as is by decision D2 (`seller_type` NULL, owns a freelancer
  profile) passes G2's guards — `ma-boutique/creer/page.tsx` and `createShopAction` check
  `seller_type === 'freelancer'` only, not freelancer-profile ownership — so it sees "Créer ma
  boutique". On submit its `seller_type` flip to `shop_owner` fails migration 55's `42501`, which
  the action maps to `common.error_generic`. The DB refusal is correct; the dead end is UX only.
- **Fix:** guard G2's page and action with `resolveOwnedFreelancerProfileId` and show the existing
  "already a freelancer" card; or map a `42501` from the `seller_type` UPDATE to specific copy; or
  repair the account to `seller_type = 'freelancer'` (migration 55 allows it).

## LOW — migration 55 locks the target owner's profile row before RLS rejects a foreign write

- ✅ **CLOSED by migration 85** `20261028194726_seller_capability_fail_closed` (`fix/security-followups-batch`, 2026-10-28; proof: `security-followups-batch.test.ts`).

- **Found by:** `/gstack-review` of PR #180 (adversarial pass), 2026-10-23.
- **What:** `enforce_seller_capability()` reads the NEW owner's `profiles` row `FOR SHARE` before
  the RLS WITH CHECK rejects an insert naming someone else as owner, so any signed-in user can
  briefly lock any profile row (for the length of the failing statement) and get one of three
  error texts. `seller_type` is public via `public_profiles`, so the text leaks little.
- **Fix (needs a forward migration):** fail closed first —
  `if v_owner is distinct from auth.uid() then raise ... using errcode = '42501'` — before the
  `FOR SHARE` read.
- **Can leak more than `seller_type` (2026-10-23, `fix/job-responses-integrity` review):** the
  "à la fois" message would tell the caller whether the named account owns the other capability's
  row (private while a freelancer profile is unpublished) — but it only fires for a mixed account (a
  shop owner holding a freelancer profile, or a freelancer owning a shop). Live there are 0 of each
  and client paths cannot create one, so this is latent. Migration 59 already uses the
  fail-closed-first shape on `job_responses`; `enforce_seller_capability()` should copy it.

## LOW — `admin_hidden_*` can be set on INSERT (`shops`, `freelancer_profiles`)

- ✅ **CLOSED by migrations 81 + 82** (`…194715` / `…194717`) (`fix/security-followups-batch`, 2026-10-28; proof: `security-followups-batch.test.ts`).

- **Found by:** `fix/seller-capability-insert` discovery, 2026-10-23.
- **What:** `authenticated` holds column INSERT on `admin_hidden_at` / `admin_hidden_reason`, and
  `enforce_admin_marker_lock` is BEFORE UPDATE only. An owner can create their own row already
  "admin-moderated", with any reason text. Self-harm only (it hides their own content), but the
  marker is meant to be admin-written.
- **Fix:** revoke column INSERT on both from `anon`/`authenticated`, or extend the lock to INSERT.

## ✅ CLOSED — LOW — two live-DB suites reuse a fixed shop name and fail on `shops_name_lower_key`

- ✅ **CLOSED by #252** (`docs/live-signin-budget`, 2026-10-30): each fixture shop name carries its seller id; both suites green live.

- **Found by:** `fix/seller-capability-insert`, full integration run, 2026-10-23 — pre-existing,
  not caused by migration 55 (the failing insert is service-role, which the new trigger bypasses).
- **What:** `buyer-cancellation-history.test.ts` creates three shops all named `'BCH Shop'`, and
  `order-delivery-fee-snapshot.test.ts` two named `'DFee Shop'`. Since migration 20260811055734
  made `lower(name)` unique, the second insert fails with 23505 and both suites skip every test —
  they have proven nothing since 2026-08-11.
- **Fix:** give each fixture shop a distinct name (label + run id), as
  `orders-insert-integrity.test.ts` and `seller-capability-integrity.test.ts` do.

## LOW — `freelancer-publish-gate-rls.test.ts` "getActiveServices list shape" is flaky under parallel runs

- **Found by:** `fix/seller-capability-insert`, default vitest run, 2026-10-23 (failed 24 vs 25, then
  passed 22/22 alone).
- **What:** the case counts all active `service_listings` (service role), then reads the anon list
  shape, and compares the two. Any other suite in the same run (or another agent) that creates an
  active listing between the two reads fails it.
- **Fix:** scope both reads to rows that exist before the test starts (e.g. exclude the
  `@rls-smoke.servyou.invalid` owners), or compare id sets instead of lengths.

## LOW — `orders-insert-integrity.test.ts` header cites the pre-rename migration file

- The header names `db/migrations/20261023165345_orders_insert_integrity.sql`; the file was renamed
  to the recorded version `20261023170918_orders_insert_integrity.sql`. One-line fix.

## LOW — Supabase advisor hygiene

- SECURITY DEFINER functions executable by anon/authenticated — now 31, tracked as its own entry
  under "job_responses integrity" below (one hygiene PR, default privileges included).
- Leaked-password protection (HaveIBeenPwned) is disabled in Auth.
- Mutable `search_path` on `handle_updated_at`, `set_cancelled_at_on_transition`, `f_unaccent`; the
  `unaccent` extension lives in `public`.
- Default table grants still include TRUNCATE (and DELETE/INSERT where no policy exists) to
  anon/authenticated on most tables — not exposed by PostgREST, but worth a sweeping revoke.
  Re-confirmed on `shops` and `freelancer_profiles` 2026-10-23 (`fix/seller-capability-insert`):
  both grant TRUNCATE to anon and authenticated. Migration 53 already revoked it on `profiles`.
  Migration 59 revoked INSERT / UPDATE on `job_responses` from anon and UPDATE from authenticated
  but left TRUNCATE (and REFERENCES / TRIGGER) on both — include it in the sweep.
  Re-confirmed 2026-10-24 (`fix/suspension-enforcement`): anon and authenticated hold TRUNCATE on
  all 25 tables with table-level write grants (every client-writable table but `profiles`).
  TRUNCATE skips RLS and every INSERT / UPDATE /
  DELETE trigger — including migration 61's `trg_enforce_active_user` — so this sweep is also
  the last piece of suspension enforcement if TRUNCATE ever becomes reachable (an RPC running
  dynamic SQL as the caller, a new exposed schema).
- `uploaded_objects` has RLS with no policies (intentional: service-role only) — document it.

## ✅ CLOSED — LOW — `auth.admin.listUsers` fails on this project ("Database error finding users")

- **Closed by** migration 56 (`20261023195911_auth_users_null_token_columns_fix`, applied by the
  architect 2026-10-23, recorded in `fix/job-responses-integrity`): the four columns coalesced to
  `''`; 0 of 22 rows still hold a NULL.
- **What:** 9 of 22 `auth.users` rows have NULL `confirmation_token` / `recovery_token` /
  `email_change` / `email_change_token_new` (seeded by SQL); GoTrue cannot scan NULL into those
  string fields, so every `listUsers` call fails. Found while writing
  `profiles-client-insert-delete-revoked.test.ts` (which now avoids `listUsers`).
- **Fix:** coalesce the four columns to `''` for existing rows — a migration for the architect.

## LOW — `db/migrations/README.md` "Rollback paths" section is stale

- Still says "the inverse SQL for migrations 13 and 14 (the most recent two) is documented in the PR
  descriptions" — every migration since carries its own rollback block. Rewrite the paragraph.

## LOW — gstack-cso cannot run on this Windows machine

- The `gstack-cso` launcher is not installed (`~/.claude/skills/gstack/bin/` has none); building it
  on Windows needs Visual Studio Build Tools. Until then every `/cso` run reports "not assessed" and
  audits are manual static reviews like this one.
