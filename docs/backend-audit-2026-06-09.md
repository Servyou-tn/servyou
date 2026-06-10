# Backend Audit — 2026-06-09 (pre-design-phase)

A read-only audit of the Servyou backend after the six PRs shipped on 2026-06-09
(PR-T … PR-Y), to surface silent debt and stale-doc drift before the design phase.
**No code was changed in this pass** — discovery and findings only. Two throwaway
probes were run against production to confirm security findings empirically (ephemeral
users, cleaned up; not committed).

## Summary

- **Critical findings: 1** (must fix before launch — one is a live privilege-escalation)
- **Important findings: 5** (should fix before launch)
- **Minor observations: 2**
- **Total checks run: 10** (5 critical-tier, 5 important-tier)
- **Audit date:** 2026-06-09 (single focused pass; duration not separately tracked)

Live baseline derived during the audit: **22 public tables**, **33 migrations** (disk ==
`schema_migrations`, in order, zero drift), **206 tests passing**, **14 server actions
(all tested)**, RLS enabled on every table.

> ⚠️ **CRIT-1 is a live, empirically-confirmed privilege escalation: any authenticated
> user can grant themselves `is_admin` via the public REST API.** Production currently
> holds only the founder's ~3 accounts, so real-world exposure is presently nil — but
> this is an absolute launch-blocker and should be PR-Z's first item.

---

## Critical Findings

### CRIT-1 — `profiles` privileged columns are self-writable (admin escalation + suspension bypass + seller-gate bypass)

- **Severity:** critical — **confirmed by live probe**
- **Tier check:** RLS Posture Sweep (check 2)
- **Location:** table `public.profiles`; policy `"Users can update their own profile"`; column grants to `authenticated`/`anon`; columns `is_admin`, `suspended_at`, `suspended_reason`, `seller_type`
- **Current state:** The only UPDATE policy on `profiles` is `USING (auth.uid() = id) WITH CHECK (auth.uid() = id)` — it gates the **row**, not the **columns**. `authenticated` (and `anon`) hold table-wide column UPDATE on `is_admin`, `suspended_at`, `suspended_reason`, `seller_type` (verified via `information_schema.column_privileges`). The only trigger on `profiles` is `profiles_set_updated_at`; **no trigger guards these columns.** Net result, confirmed by probe (run as a real signed-in non-admin, then cleaned up):
  - `UPDATE profiles SET is_admin = true WHERE id = auth.uid()` → **succeeded**, `is_admin` became `true` (full admin takeover — `is_admin()` reads this column and gates every admin RPC/policy).
  - After an admin suspended the user, `UPDATE profiles SET suspended_at = NULL` on their own row → **succeeded** (suspension bypass; the middleware sign-out is moot against a direct REST call with a valid JWT).
  - `UPDATE profiles SET seller_type = 'shop_owner'` → **succeeded** (self-upgrade to seller, bypassing the app-layer 18+ check — there is **no DB-level age gate**, see Expected state).
- **Expected state:** CLAUDE.md (Code & data rules, and line 286): *"Every business rule (… age 18+ to sell, one seller capability) … MUST be enforced in the database … not only in app code"* and *"RLS gates ROWS, not columns. Sensitive columns … stay owner-only."* The `admin_hidden_at` moderation columns on `shops`/`products`/etc. **were** given owner-write protection via the `enforce_admin_marker_lock` / `enforce_admin_moderation_lock` triggers (PR-N). The same protection was never applied to the `profiles` privileged columns. Privileged columns must not be writable by the row owner; the 18+ gate must be DB-enforced.
- **Recommended fix (PR-Z, first item):** Add a `BEFORE UPDATE` trigger on `profiles` (mirroring the existing `enforce_admin_marker_lock` pattern already in the codebase — more robust than a column `REVOKE`, which Supabase's default-privilege machinery can silently re-grant) that:
  1. rejects any change to `is_admin`, `suspended_at`, `suspended_reason` unless `is_admin()` (so only the admin SECURITY DEFINER functions, which run with the calling admin's `is_admin()`, can change them);
  2. on a `seller_type` transition `NULL → value`, enforces age ≥ 18 from `date_of_birth` (closing the seller-gate bypass and satisfying the "DB-enforced age rule");
  3. leaves ordinary self-edits (name, city, phone, language) untouched.
  Add a matching `rls-smoke` assertion (self-grant `is_admin` must fail) so the fix is regression-guarded. **3-line repro for re-verification post-fix** (run as a signed-in non-admin client): `await c.from('profiles').update({ is_admin: true }).eq('id', myId)` → must return an error and leave `is_admin = false`.

---

## Important Findings

### IMP-1 — Order rows accept non-status column tampering by either party

- **Severity:** important — **confirmed by live probe**
- **Tier check:** RLS Posture Sweep (check 2) / Spec Compliance (check 3)
- **Location:** table `public.orders`; policy `"Buyer or seller updates order"`; trigger `check_order_status_transition`
- **Current state:** The orders UPDATE policy is `WITH CHECK (buyer_id = auth.uid() OR seller_id = auth.uid())` and the role-gating trigger only validates **status** transitions — its second branch is `IF NEW.status IS NOT DISTINCT FROM OLD.status THEN RETURN NEW` ("non-status edits sail through"). So a party can mutate any non-status column on their own order. Confirmed by probe (signed-in buyer on a `pending` order):
  - `UPDATE orders SET quantity = 999` → **succeeded** (DB `quantity = 999`).
  - `UPDATE orders SET seller_id = <other seller>` → **succeeded** (order reassigned to a different seller).
- **Expected state:** Order identity fields (`buyer_id`, `seller_id`, `product_id`, `service_listing_id`, `order_type`, `quantity`) should be immutable after creation; only the intended editable fields (`buyer_note`, `delivery_*` pre-dispatch) should change. Today nothing prevents a buyer from reassigning their order to an innocent seller (spoofing a seller's dashboard / inflating their order counts / corrupting the per-seller scoping of `buyer_cancellation_history`) or unilaterally changing quantity.
- **Recommended fix:** Extend `check_order_status_transition` (it already runs `BEFORE UPDATE`) to reject changes to the identity columns regardless of status — e.g. `IF NEW.buyer_id <> OLD.buyer_id OR NEW.seller_id <> OLD.seller_id OR NEW.product_id IS DISTINCT FROM OLD.product_id OR NEW.service_listing_id IS DISTINCT FROM OLD.service_listing_id OR NEW.order_type <> OLD.order_type OR NEW.quantity <> OLD.quantity THEN RAISE EXCEPTION …`. Low practical impact today (orders are app-created with correct values) but a real integrity gap; same "RLS gates rows, not columns — on writes" root theme as CRIT-1.

### IMP-2 — Systemic unhandled Supabase `error` in older consumer/seller pages (~80 sites)

- **Severity:** important
- **Tier check:** Error Handling Sweep (check 9)
- **Location:** ~33 files under `src/app/**` (consumer + seller dashboards). The newer admin/dispute/server-action code is clean.
- **Current state:** ~80 call sites destructure only `data` (or `await` a mutation bare) without capturing/surfacing `error`, contra CLAUDE.md (*"NEVER destructure only `data` … Always capture `error` and surface it … A swallowed error once hid a real bug for a day"*). Three classes:
  1. **Fire-and-forget mutations (highest concern, ~8) — no error capture at all:** `mes-missions/page.tsx:121` (mark `filled`), `:127` (mark `deleted`); `ma-boutique/produits/page.tsx:62` (product delete); `mon-profil-freelance/page.tsx:86` (skill delete); `mon-profil-freelance/services/page.tsx:59` (service delete); `mes-favoris`/`FavoriteButton.tsx:53` (favorite delete); `poster-mission/page.tsx:123` + `mes-missions/[id]/modifier/page.tsx:120,123` (job_post_skills insert/delete). A silent failure here makes the UI report success while the DB didn't change.
  2. **Public listing/catalog reads that render empty on error (`[proceeds]`):** e.g. `mes-favoris/page.tsx:14`, `mes-demandes/page.tsx:15`, `page.tsx:20/21/28` (homepage), `recherche`, `categorie/[slug]`, `missions` — the exact "silent empty list" swallow CLAUDE.md cites.
  3. **Guarded auth reads (~15, lowest):** the repeated `profiles.select('seller_type')…single()` dashboard guard — degrades safely (`!data` redirect) but still drops the `error`.
- **Expected state:** every Supabase call captures `error` and at minimum `console.error('[Context]', error)`; mutations surface a real failure to the user.
- **Recommended fix:** A focused error-handling PR. Prioritise class 1 (surface the error / show a failure state), then class 2 (log + show an error state instead of empty), then sweep class 3. Not a rewrite — mechanical, file-by-file.

### IMP-3 — `data-model.md` omits ~2 whole tables and several shipped columns

- **Severity:** important (doc drift — the schema source-of-truth is incomplete)
- **Tier check:** Documentation Drift Sweep (check 4)
- **Location:** `docs/data-model.md`
- **Current state:** A grep for `disputes | admin_audit_log | suspended_at | admin_hidden` returns **zero matches**. The doc never documents: the `disputes` table (migration 29), the `admin_audit_log` table (migration 31), the `profiles.suspended_at` / `suspended_reason` suspension columns (migration 23), or the `admin_hidden_at` / `admin_hidden_reason` moderation columns added to `shops`/`products`/`service_listings`/`freelancer_profiles`/`job_posts` (migrations 25–26). All shipped in the Phase-9 admin work (PRs K–T).
- **Expected state:** `data-model.md` is *"the single source of truth for Servyou's database structure and the security rules that protect it."* It should describe every live table and security-relevant column.
- **Recommended fix:** Add sections for `disputes` and `admin_audit_log` (shape + RLS), the profiles suspension columns + the `admin_suspend_user`/`unsuspend` controlled-write path, and the admin-moderation columns + the `enforce_admin_*_lock` triggers. (Bundle into the doc-reconciliation PR with IMP-4.)

### IMP-4 — `roadmap.md` "Today" / "Phase 10" sections are stale

- **Severity:** important (doc drift)
- **Tier check:** Documentation Drift Sweep (check 4)
- **Location:** `docs/roadmap.md` lines 13, 15, 57, 60 (+ CLAUDE.md "What is IN the MVP")
- **Current state:**
  - Line 13: *"Phases 1, 2, 3, 5, 6, 7, and 8 (subtasks 1 and 2) are merged"* — omits **Phase 9 (admin dashboard)**, which has substantially shipped (reports queue, disputes, content moderation, user suspension, stats, audit log).
  - Line 15: *"The migration capture PR (#24) has shipped, putting all **14 migrations** … The foundation document consolidation … is the work **currently in flight**."* — both stale (33 migrations now; the consolidation is long done).
  - Phase 10 list: the **Backup runbook** line (59) was correctly updated to "Authored (PR-X)", but the **Sentry** (57) and **RLS smoke-test** (60) items still read as pending though both shipped (Sentry wired, inert until env set, per `operations.md`; RLS smoke shipped in PR-U). Inconsistent with the backup line.
  - CLAUDE.md "What is IN the MVP" marks Phases 1–3/5 DONE but not Phase 7 (jobs — done) or Phase 9 (admin — largely done). Minor.
- **Expected state:** roadmap reflects current reality (the doc's own rule: *"This document changes as work ships"*).
- **Recommended fix:** Update the "Today" section (Phase 9 progress, 33 migrations, consolidation done) and mark the Sentry/RLS-smoke Phase-10 items shipped, matching the backup line. (Bundle with IMP-3.)

### IMP-5 — `orders` CASCADE-delete on **both** buyer and seller profile deletion

- **Severity:** important (design — **confirm intent**, not a defect)
- **Tier check:** Schema Integrity Sweep (check 1)
- **Location:** `orders_buyer_id_fkey` and `orders_seller_id_fkey` — both `ON DELETE CASCADE`; `disputes_order_id_fkey ON DELETE CASCADE` downstream
- **Current state:** Deleting a profile hard-deletes every order where they are buyer **or** seller (and cascades the order's disputes). Deleting one party therefore erases the **counterparty's** record of that transaction and any attached dispute. This is consistent with the documented intent (`data-model.md`: deleting an auth user removes "all dependent data") but has a real side effect: the surviving party loses sales/purchase history, and a deleted buyer's `buyer_cancellation_history` (the rating foundation) vanishes. (Note `orders.product_id`/`service_listing_id` correctly use `SET NULL`, preserving the order when a *listing* is removed — only the *party* FKs cascade.)
- **Expected state:** At MVP, deletion is admin-mediated and rare, so blast radius is small. But the roadmap's post-launch **self-service account deletion** would make this user-triggered.
- **Recommended fix:** No change now. Before self-service deletion ships, decide between hard-CASCADE vs. soft-delete/anonymize so counterparty records and forensic history survive. Track as a post-launch design item.

### Minor observations

- **MIN-1 (code quality, check 7):** `translateSuspendError` (`signalements/actions.ts:237`, added in PR-Y) is **byte-for-byte identical** to `translateRpcError` (`utilisateurs/actions.ts:13`). Pure duplication — `translateSuspendError` could import the shared one. (`translateModerationError` and the three auth-page `translateError` functions are structural siblings, not exact duplicates — leave as-is.)
- **MIN-2 (performance, check 10):** No N+1 query patterns and no missing indexes found. Two server pages issue independent reads sequentially that could be `Promise.all`'d: `boutique/[id]/page.tsx` (3 reads) and `freelance/[id]/page.tsx` (skills/services/tools/education/certifications). Minor latency only; safe to defer.

---

## What was verified clean

- **Schema integrity:** 33 migrations on disk == 33 in `schema_migrations`, identical order, **zero drift**. RLS **enabled on all 22 public tables** (plus an `rls_auto_enable` helper). FK `ON DELETE` behaviors otherwise sensible — `SET NULL` for `category_id`/`product_id`/`service_listing_id` (preserves orders/listings when a referenced row is removed), `CASCADE` for ownership chains, `RESTRICT` on `admin_audit_log.admin_id` (forensic rows never orphaned).
- **Indexes:** every FK column indexed; `status` / `created_at desc` / `city` indexed where queried; all the expected unique constraints present (`profiles.email`, `favorites` pairs, `job_responses(post,freelancer)`, `shop_payment_methods(shop,method)`, `disputes` one-active-per-order partial unique, etc.).
- **Audit-log coverage (check 5):** **complete.** The 4 admin SECURITY DEFINER RPCs log in-transaction; report actions (claim/resolve/dismiss) and dispute actions (claim/resolve/dismiss) each call `log_admin_action` best-effort with try/catch; PR-Y's suspend-from-report path routes through the logging RPCs. No admin mutation path writes state without an audit row.
- **Test coverage (check 6):** all **14 server actions tested** (0 untested); **0 untested security-sensitive items**. 206 tests across 18 files (live-DB RLS/trigger/constraint tests + mocked action-logic tests).
- **i18n (check 8):** parity test passing; **no hardcoded French user-facing strings** — accented matches were city-name data, comments, or intentional self-language `aria-label`s.
- **Spec compliance (check 3):** post-dispatch cancellation-reason enforced by `check_order_status_transition`; admin-moderation owner-locks present (`enforce_admin_moderation_lock` on products/services, `enforce_admin_marker_lock` on shops/freelancer_profiles/job_posts); `buyer_cancellation_history` present with the refined 6-column `cancelled_by`-aware shape; user-targeted reports have both the inline-suspend path (PR-Y) and content-hide path; WhatsApp progressive phone reveal gated by `get_contact_phone` (relationship-scoped, covered by `progressive-phone.test.ts`). The **one** spec rule not met is the DB-level 18+ gate → folded into CRIT-1.
- **CHECK constraints:** comprehensive (status/role/type/reason enums, non-negative money & stock, `*_terminal_requires_admin_note`, `*_requires_reason`, target-matches-type, suspension-requires-reason).
- **Code quality (check 7):** no dead code (every server action has a caller), no mis-classified server/client components.

---

## Tier 3 (nice-to-have) — deferred

Per scope, the nice-to-have tier was **not** run and is revisited post-launch: dependency
audit (`npm audit`), bundle-size analysis, TypeScript `any`-usage sweep, browser-support
matrix.

---

## Recommended next actions

**PR-Z (must — before any real signup):**
1. **CRIT-1** — `profiles` privileged-column write-protection trigger (block non-admin
   `is_admin`/`suspended_at`/`suspended_reason` writes; enforce 18+ on `seller_type`
   `NULL→value`) + an `rls-smoke` self-grant assertion. **This is the launch-blocker.**
2. **IMP-1** — extend `check_order_status_transition` to freeze order identity columns.

These two are migrations + a smoke assertion, independent of the design phase, and should
land first.

**Fast-follow PRs (should — before launch):**
3. **IMP-2** — error-handling pass (start with the ~8 fire-and-forget mutations).
4. **IMP-3 + IMP-4** — one doc-reconciliation PR (data-model.md tables/columns; roadmap
   Today/Phase-10; CLAUDE.md phase status).

**Track / accept:**
5. **IMP-5** — decide soft-delete vs. CASCADE before post-launch self-service deletion.
6. **MIN-1 / MIN-2** — dedup `translateSuspendError`; optional `Promise.all` on two pages.
   Accept-as-is or fold into any nearby PR.
