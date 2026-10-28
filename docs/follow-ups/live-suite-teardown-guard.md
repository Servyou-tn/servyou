# Live-suite teardown guard (`fix/rls-suite-teardown-guard`, 2026-10-26)

The guard now lives in `src/__tests__/live-teardown-guard.ts` and runs in all 14 live suites that seed a
fixture seller with an orderable item: `prelaunch-shop-read-rls`, `buyer-cancellation-history`,
`order-delivery-fee-snapshot`, `orders-insert-integrity`, `suspension-enforcement`,
`uploaded-objects-provenance-rls`, both `d4-*`, `freelancer-publish-gate-rls`, `h3-links-portfolio-rls`, the
three `h5-service-*`, and `h6-service-listings-hardening-rls`. `orders-lifecycle-columns` keeps its original
inline copy from PR #193. Any NEW live suite that seeds a seller must call it before its first orders delete.
The other 11 live suites seed no product or service listing, so a real customer cannot order from their
fixtures. `scripts/rls-smoke.mjs` (not a suite, never run) seeds an active product and listing and reaps every
`@rls-smoke.servyou.invalid` user with no guard — other suites' live fixtures included.

## LOW — the guard checks once, then deletes: a real order placed in between still cascades

- The window runs from the SELECT to the last `deleteUser`: up to ~20 sequential round trips after the
  check (`suspension-enforcement`: orders, audit log, an avatar sweep per user, 9 `deleteUser`), so seconds,
  not milliseconds. **Narrow it if wanted:** hide every fixture product / listing (service role,
  `status = 'hidden'`) first, so migration 54 refuses new orders, then run the guard, then delete. Admins are
  not covered — migration 54 returns before its live check for `is_admin()` — which is why the guard must
  still run after the hide. #193 has the same window.

## LOW — favourites, job responses and fixture categories still go with the fixtures

- A real user's favourite of a live fixture item, or a real freelancer's `job_responses` row on an open fixture
  job post, is deleted with the fixtures (`favorites.product_id` / `service_listing_id` and
  `job_responses.job_post_id` are ON DELETE CASCADE). Suites with an open fixture post: `prelaunch-shop-read-rls`,
  `suspension-enforcement`, `profiles-rls`, `job-limits`, `progressive-phone.integration`,
  `job-responses-integrity`. Three of them (`profiles-rls:88`, `job-limits:86`, `progressive-phone:82`) do not
  even wait for the cascade: they run `job_responses.delete().in('job_post_id', testPostIds)` directly. Lower
  stakes than an order (no money, no address), but it is still a real user's row. **Fix:** the same
  refuse-then-resolve guard, keyed on `favorites.user_id` / `job_responses.freelancer_id` outside the fixture
  set, placed before those direct deletes. *(Since M-A, `refuseTeardownOnForeignResponses` exists in
  `live-teardown-guard.ts` and `job-posts-response-count` calls it; the six suites above still need the call,
  and favourites still need their own check.)*
- `h6-service-listings-hardening-rls` seeds real `categories` rows (`h6-hard-sector-*` / `h6-hard-sub-*`) for
  the whole run and deletes them last. If a real seller picks one meanwhile (not checked whether the pickers
  list them), the delete clears their product / listing category (`category_id` / `subcategory_id` are ON
  DELETE SET NULL) or deletes their `shop_categories` row (ON DELETE CASCADE). Never an order.

## ✅ RESOLVED (`feat/missions-m-a`, 2026-10-26) — nine live suites ran on every default `vitest run`, against production

- Fixed: all nine are in `INTEGRATION_GLOBS`, and `integration-globs-guard.test.ts` fails the unit run if a test
  file reading the service-role key is ever left out again. Original entry:
- `INTEGRATION_GLOBS` (vitest.config.ts) leaves out both `d4-*`, `freelancer-publish-gate-rls`,
  `h3-links-portfolio-rls`, the three `h5-service-*`, `h6-service-listings-hardening-rls` and
  `freelancer-details-wizard`. So DoD item 4 (`vitest run`) creates and deletes users on production whenever
  `.env.local` holds the service key, and CI's "pure unit gate" claim holds only because CI has no
  credentials. `--config vitest.integration.config.ts <file>` silently runs nothing for them. **Fix:** add
  the nine to `INTEGRATION_GLOBS`.

## LOW — three teardowns ignore their delete errors

- `d4-completed-project-count`, `h5-service-delete-orders-gate` and `h5-service-monthly-stats` discard the
  `error` of their orders deletes and of `deleteUser`, and `afterAll` never counts what is left. A failed
  cleanup passes silently and leaves fixtures on production. **Fix:** throw on each error and verify with a
  read-only count, as the newer suites do.

## Still red — `buyer-cancellation-history` / `order-delivery-fee-snapshot` (`shops_name_lower_key`)

- Seen again on this branch's run, 2026-10-26: same 23505, same cause, already logged twice above. The guarded
  teardown still runs in `afterAll`, and cleanup was verified at 0. Their tests have proven nothing since
  2026-08-11.

## H9/H10 board (missions PR-1) — logged from the review pass, not fixed

- **Skill filter is exact and case-sensitive** on two free-text fields (`freelancer_skills.skill` vs `job_post_skills.skill`):
  « react » never matches « React », and a consumer who types « figma adobe » as one skill is one skill. Normalise at write
  time or match via a lowercase column when skills get a taxonomy. `?competence=` also accepts any value, not only the viewer's own.
- **« Budget décroissant »** orders by `budget_max` desc, then `budget_min`, nulls last: a « Dès 5 000 TND » post (no max)
  ranks below every post that has a max. Sort on `coalesce(budget_max, budget_min)` through a generated column if it matters.
- **AR budget labels in the Budget dropdown and chip** (« 200 – 500 د.ت ») are not pinned LTR, unlike the card and facts panel.
- **Skill filter id list** is capped at 500 matching in-window open posts (explicit `.limit`); an RPC would remove the cap.
- **Awareness bar « N sur 5 »** can read 4/5 while the DB blocks at 5 when a moderated-but-open post counts toward the cap (gap G5).

## E3 Produits tab — logged, not fixed

- **Tracking is not shown** on a product order (`carrier`, `tracking_number`): not in Figma 704:58976. A natural line under the rail once
  the seller has dispatched.
- **Rail scroll position on mobile**: the 7-step rail scrolls sideways below `lg`; it starts at the first stage, so an order that is
  « En livraison » shows its current stage only after a swipe. Scroll the current node into view if it matters.
- **Buyer-side cancel on Services** is still the frame's (none). Products have it (see docs/design/e3-produits-measurements.md D5).

## I1 « Mon compte » + K1–K4 — logged, not fixed (feat/i1-mon-compte)

Ranked.

1. **MEDIUM (db-guardian) — `auth.users.email` → `profiles.email` has no sync trigger** (only `on_auth_user_created`, INSERT).
   Email is read-only on I1 for that reason (architect ruling 2). Self-service email change needs the trigger first; until then the
   export modal and the admin pages read `profiles.email`.
2. **✅ CONFIRMED (founder, 2026-10-27) — Email provider: « Secure password change » = OFF, « Require current password when
   updating » = OFF**, both kept off for now. `changePasswordAction` re-authenticates with `signInWithPassword` before
   `updateUser`, so it is correct under either setting. See item 12 for the pre-launch evaluation of turning the second one on.
3. **LOW — open-orders warning is informational.** A hard block on deletion with open orders is a business rule and would need a
   database trigger (CLAUDE.md « every business rule enforced in the DB »). Deletion stays an admin-processed request.
4. **LOW — K4 maintenance flag is an env var**, so toggling needs a Vercel redeploy; the auth pages stay reachable (outside the
   matcher) and a signed-in user is sent to /maintenance on their next navigation. A DB/edge-config flag is the alternative.
5. **LOW — K4 social line** (muted « Facebook » text under the card, Figma 731:64476, derived) is not built: no Facebook URL exists
   in the codebase.
6. **LOW — K1/K2/K4 copy and the I1 delete modal are derived** (Figma reads were capped at 4; the modal frame 728:64303 rendered
   empty). Arabic strings are drafts: grep `REVIEW_AR_TRANSLATION` in `src/lib/i18n/ar.ts`.
7. **LOW — legacy `monCompte.delete.confirmPrompt` / `confirmWord` and `placeholders.comingSoon.account` keys are unused** now.
8. **LOW — middleware `?next=` is built from `nextUrl.search`**: confirm in a browser that `_rsc` is not carried into the K2
   `next` for an RSC navigation (not verified; the K2 page only forwards same-site paths either way).
9. **LOW — `+216` prefix order in AR** (I1 phone, same markup as `ServiceRequestForm`): the prefix is a flex sibling of the
   `dir="ltr"` input, so in a RTL container it sits on the right of the digits. A shared `Input` fix, not an I1-only one.
10. **LOW — `ModalShell` focus restore**: the opener is read from `document.activeElement`; on Safari a clicked button is not
    focused, and after a delete request the opener becomes the disabled « pending » button. Pass a trigger ref if it matters.
11. **LOW — maintenance mode specifics**: prefetches return before the flag check; `/connexion` and `/auth/*` stay reachable
    (outside the matcher); `/maintenance` answers 200 after a 307, so an uptime monitor reads « up »; admins are redirected too.
12. **PRE-LAUNCH (MEDIUM) — evaluate « Require current password when updating » = ON, without breaking recovery.** Today it is
    OFF and our own action is the only guard (`signInWithPassword` with the session user's email, then `updateUser`, then
    `signOut({ scope: 'others' })`). Turning it on makes GoTrue enforce it server-side, so a stolen session cannot change the
    password through the API directly. The risk: the **recovery flow** (`/mot-de-passe-oublie` → email link →
    `/nouveau-mot-de-passe`, `NewPasswordForm`) calls `updateUser({ password })` from a recovery session with NO current
    password, and must keep working. To do, in this order, on a throwaway fixture user (not a real account):
    (a) with the setting still OFF, record the recovery flow end to end (request → link → set a new password → sign in);
    (b) turn it ON and run **both** flows: recovery must still succeed (GoTrue is expected to waive the requirement for a
    recovery/reauthenticated session, but that is unverified for this project's version), and I1's change must pass
    `current_password` to `updateUser` — add it to `changePasswordAction` (it already holds the verified value) so the two
    guards agree; (c) if recovery breaks, turn it back OFF and keep the app-level guard as the only one; (d) also re-test with
    « Secure password change » ON, which asks for a fresh sign-in or a reauthentication nonce on the same call. Only enable in
    production after (a)–(d) pass; the I1 unit tests in `src/app/mon-compte/actions.test.ts` need the extra argument asserted.

## H11 Mes propositions (PR-3) — logged, not fixed

- ✅ **Closed by migration 76** (2026-10-27: DELETE policy « Freelancer withdraws own response while the post is open »). Was: **« Retirer » only-while-open is an app rule, not a DB one** (DB role): the `job_responses` DELETE policy is `freelancer_id = auth.uid()` alone, so a
  direct API call can delete a response on a filled / expired post. Harmless to counters (the -1 trigger still keeps `response_count` right) but it erases
  the consumer's record of the proposal. A `USING` clause joining `job_posts.status = 'open'` would enforce it.
- **« Indisponible » pill** (post deleted or moderated, so unreadable to the responder) has no Figma specimen: it is `StatusPill withdrawn` (muted grey)
  with a new key. The frame's open-post pill is kept as « Ouverte »; switch the label to « En attente » with one key if the founder prefers.
- **Empty-none and empty-active states** are derived (no frame) and were not eyeballed: the founder's account has 4 proposals, 1 active.
- **Mobile search placeholder** clips (« …ou un clie ») below ~400 px, the same as H8's.

## Moderated-freelancer read fix (`fix/moderated-freelancer-read`, 2026-10-27) — logged, not fixed

- **MEDIUM — moderation-sheds-by-delete/re-create** (decision D4, above) is still open and is the natural pair of this
  fix: once the profile is hidden at the RLS layer, the owner can still DELETE and re-INSERT it with `admin_hidden_at` NULL.
- **LOW — `public_profiles` still exposes name and city of a moderated freelancer** (and of a moderated shop owner). The view
  is keyed on `profiles`, not on seller moderation; the app's own filters hide the card. Same class as migration 65's shops;
  decide whether the view should cascade seller moderation.
- **LOW — cascade depends on `is_published`, which is owner-settable** (MEDIUM item above): the new `service_listings` cascade
  reads `freelancer_profiles` under its own policy, so an owner who flips `is_published` to false hides their own live
  listings from anon. Self-inflicted and the same as the app's `freelancer_profiles!inner` reads today; closed by revoking
  the column grant (that item's fix).
- **Residual — the `portfolio-media` / avatar buckets are public**: the policy hides URL discovery, not a known file URL.
- **LOW (Sonnet review of #75) — `freelancer_profiles.admin_hidden_reason` is readable by the owner and, since #75, by a
  past buyer** (table-level SELECT; no column revoke). Not a regression — everyone read it before — but the moderator's note
  should be admin-internal (ModerationBanner already never renders it). Fix: revoke SELECT on `admin_hidden_reason` from
  anon / authenticated and give admin pages a definer read. Same question for shops / products / service_listings / job_posts.
- **LOW (Sonnet review of #75) — anon SELECT on `orders` is now a hard dependency of `freelancer_profiles` and
  `service_listings` reads too** (buyer branches read `orders` as the caller; the grant is checked even when the OR
  short-circuits), next to the shops / products dependency from #65. A grant sweep that revokes it turns every anon
  marketplace read into 42501.

## Job-post write guards (`fix/job-posts-write-guards`, migration 76, 2026-10-27) — logged, not fixed

- **MEDIUM — NEXT ITEM (founder, 2026-10-27): a consumer can hard-DELETE an ANSWERED post.** « Consumer deletes own post »
  is `consumer_id = auth.uid()` and `job_responses.job_post_id` is ON DELETE CASCADE, so one REST DELETE erases every
  freelancer's proposal (and the app only ever soft-deletes). **Decision B (founder, 2026-10-27):** drop the policy and
  revoke DELETE from authenticated — ✅ closed by migration 77 (`20261027211851_job_posts_no_hard_delete`).
- **LOW — a responder can still add / remove `job_response_skills` after the post closes** ✅ **CLOSED by migration 79** (`20261028194710`). (insert / delete policies check
  only response ownership). Same shape as the job_responses withdrawal window: gate both on the post being open.
- **MEDIUM (Sonnet review of #76) — a JWT admin can still INSERT an order at any status.** ✅ **CLOSED by migration 80** (`20261028194712`). `enforce_order_insert_integrity`
  returns before tier 2 on `is_admin()`, and #76 only normalises the cancel columns: an admin buyer can insert at
  `received` / `arrived` (with carrier / tracking) — a fake completed transaction — or at `cancelled` with
  `cancelled_by = 'seller'`, pinning a cancellation on the seller. Same family as 9a / decision 7. Fix: drop the
  `is_admin()` early return from tier 2 (then decision 10's INSERT-at-cancelled case disappears too).
- **LOW (Sonnet review of #76) — the skills lock can race a response.** ✅ **CLOSED by migration 86** (`20261028194729`). `enforce_job_post_skills_lock` reads
  `response_count` with a plain SELECT, so a skill insert / delete concurrent with an uncommitted response sees 0. Fix:
  `select … for share` (waits for the counter's transaction; the skill FK check already takes FOR KEY SHARE).
- **Note — no status data-fix path on orders** (9a): neither an admin nor the service role can move an order's status
  through the API now; a correction needs a migration.
