# Database Migrations

This folder holds the canonical SQL for every database migration that has been applied to Servyou's production Supabase project (`xggomcitqrkaylqezjjz`).

## Why this folder exists

The production database is the live source of truth for the schema, but a database alone is not a complete engineering artifact. Future maintainers need to read the history of what changed, when, and why. This folder mirrors what Supabase stores internally in `supabase_migrations.schema_migrations`, so the repository is the readable, diff-able, code-reviewable record of every schema change.

This complements `docs/servyou-layer-4-data-model.md`, which describes the intended schema design (the WHAT and the WHY). This folder is the implementation (the HOW), in the exact order it landed.

## File naming convention

Each file follows the pattern:

```
<version>_<name>.sql
```

Where `<version>` is a 14-digit timestamp `YYYYMMDDHHMMSS` (UTC) and `<name>` is the snake_case migration name. This matches Supabase's internal migration naming and sorts chronologically when listed.

Examples:

- `20260603002549_create_profiles_table.sql`
- `20260606141915_orders_lifecycle_expansion.sql`
- `20260606155746_orders_role_gating_trigger.sql`

## Workflow going forward

When a new migration is applied via the Supabase MCP `apply_migration` tool:

1. Note the version (timestamp at the moment of apply) and the name passed to the tool.
2. Create a new file `<version>_<name>.sql` in this folder.
3. Paste the exact SQL that was applied (the `query` argument to `apply_migration`).
4. Commit the new file in the same PR as any application code that depends on the migration (or in its own focused PR if the migration ships standalone).

This is a manual mirror of what Supabase tracks internally. The benefit is that the repository becomes a single self-contained record of the schema's history — readable without database access, reviewable in PRs, and diff-able across branches.

## Historical context

These 45 migrations represent the entire schema history of Servyou from initial setup (June 3, 2026) onward. Migrations are listed in chronological order:

1. **20260603002549_create_profiles_table** — initial `profiles` table with role-based identity (later revised)
2. **20260603174720_revise_profiles_table_to_layer4** — replaced `role` column with `seller_type`, added `date_of_birth`, `phone`, `is_admin` per Layer 4 design
3. **20260603181526_auto_create_profile_on_signup** — `handle_new_user` trigger on `auth.users` insert
4. **20260603182553_categories_and_admin_helper** — `categories` table + `is_admin()` SECURITY DEFINER helper
5. **20260603182611_shops_products_images** — shop, product, and product images tables with RLS
6. **20260603182632_freelancers_skills_services_media** — freelancer profile, skills, service listings, service media tables with RLS
7. **20260603182645_orders** — orders table (unified product/service, COD delivery fields, initial 3-value status)
8. **20260603182702_job_posts_skills_responses** — job board tables with RLS
9. **20260603182716_favorites_and_reports** — favorites (private) and reports (reporter + admin) tables
10. **20260603231958_job_response_fairness_trigger** — `check_job_response_limits` BEFORE INSERT trigger (10 per post, 5 active per freelancer)
11. **20260604000331_profiles_privacy_fix** — replaced permissive read policy with owner-only read + `public_profiles` view + `get_contact_phone` RPC for relationship-scoped contact reveal
12. **20260604090224_add_null_caller_guard_to_get_contact_phone** — defense in depth: explicit NULL check on `auth.uid()` in `get_contact_phone`
13. **20260606141915_orders_lifecycle_expansion** — expanded orders.status from 3 values to 8 (per Layer 4 §4.6), added `cancelled_by`, `cancellation_reason`, `received_at` columns
14. **20260606155746_orders_role_gating_trigger** — `check_order_status_transition` BEFORE UPDATE trigger enforcing buyer/seller role gating, no-skips/no-backwards transitions, cancellation reason pivots
15. **20260606192321_shop_configurable_workspace** — adds the configurable workspace fields to the shops table (shop_type, delivery_setup, working_hours, location_detail) plus shop_payment_methods and shop_categories child tables with RLS policies (per Configurable Workspace Principle in product.md, schema details in data-model.md)
16. **20260606194103_shop_workspace_market_alignment** — Adds preferred_carriers free-text column on shops so owners can name their actual Tunisian carriers (First Delivery, Aramex, Mylerz, Adex, Navex, Bestway, Jetpack, Droppex, Collissimo, FedEx, UPS, Best Delivery, etc.). Expands shop_payment_methods.method CHECK to include 'flouci' alongside cod/bank_transfer/d17/konnect/other. Both changes from the Day-4 Tunisian market research session — Flouci is named in every Tunisian payment article alongside D17/Konnect and was the gap in our enum; 12+ named carriers is the reality every shop owner navigates. Deferred (covered by 'other' for now): paymee, e_dinar, orange_money. Sequenced before PR-F UI so the form ships with full schema in place.
17. **20260606200109_categories_extend_with_market_signals** — Extends the original 10-category taxonomy (seeded by 20260603182553_categories_and_admin_helper) with 4 additions surfaced by the Day-4 Tunisian market research session: Design & Création, Data Science & Analyse, Business & Conseil (the three top-tier categories from Tunisie Freelance that were missing), and Automobile & Accessoires (a high-velocity Tunisian e-commerce segment per Accio research). Also corrects the existing UGC row's Arabic name from the literal-translation form 'محتوى من إنشاء المستخدمين' to 'صناعة محتوى UGC' which matches how Tunisian creators actually refer to themselves. The 10 existing categories with attached data (1 product, 1 service, 3 job posts) were not disturbed beyond the UGC name correction. Brings total categories from 10 to 14. Flat structure preserved at MVP; sub-category nesting is post-launch when real user listings reveal which buckets need splitting.
18. **20260606212937_freelancer_configurable_workspace** — Symmetric parallel to the shop side (PR-E). Adds 3 nullable text columns to freelancer_profiles (working_hours, current_workplace, preferred_payment_method) and 3 new child tables: freelancer_tools (one row per tool/software a freelancer uses, with UNIQUE(freelancer_id, name) preventing dupes), freelancer_education (institution, degree, field, year_start, year_end nullable for ongoing), and freelancer_certifications (name, issuing_org, year_obtained, credential_url). Each child table has 4 RLS policies matching the shop child-table pattern: anyone can SELECT (freelancer profiles and their professional attributes are public, part of the trust signal buyers use to vet freelancers); only the owning freelancer can INSERT/UPDATE/DELETE, checked via EXISTS join through freelancer_profiles.profile_id = auth.uid(). preferred_payment_method left as free-form text per spec; future promotion to enum is a small migration if useful. Education years stored as integers, not dates — freelancers think in 2018-2022, not specific dates. Pure additive migration; existing 2 freelancer rows (marketing expert, createur de contenu test accounts) get NULL on new columns and zero rows in child tables, unchanged otherwise.
19. **20260607134340_admin_overview_stats_rpc** — `admin_overview_stats()` SECURITY DEFINER function backing the admin overview dashboard (PR-I-stats). Returns 8 aggregate counts in a single row (total_users, total_shops, total_freelancers, total_products, total_services, total_job_posts, completed_orders = orders with status 'received', pending_reports = reports with status in 'open'/'under_review'). Gated by `is_admin()` at entry (RAISE EXCEPTION for non-admins); SECURITY DEFINER so it bypasses RLS to count accurately across all source tables — a client-side count(*) would silently under-count on the 7 of 8 tables whose RLS restricts row visibility. Defense in depth at the role layer too: execute revoked from public, granted only to authenticated. Read-only, no schema change.
20. **20260607140858_orders_add_cancelled_at** — Adds `cancelled_at timestamptz null` on orders (mirroring `received_at` for the terminal success state) plus the `set_cancelled_at_on_transition()` BEFORE UPDATE trigger function and its trigger `trg_set_cancelled_at_on_transition`. The trigger stamps `cancelled_at = now()` whenever status transitions into `'cancelled'` (and only then — `old.status is distinct from 'cancelled'`). Named so it sorts after `trg_check_order_status_transition`, so the role-gating trigger validates the transition first and the timestamp is only stamped for transitions the gate accepts. SECURITY INVOKER (default) — no elevated privileges, it just modifies NEW. No application code change: the PR #27 cancellation flow already performs the status UPDATE; the trigger populates the column automatically. Foundation for the post-launch buyer rating system.
21. **20260607140910_buyer_cancellation_history_view** — Adds the `buyer_cancellation_history` view: one aggregate row per buyer with `total_orders`, `cancellations_total`, `cancellations_after_pivot` (cancellations where `cancellation_reason is not null` — i.e. post-dispatch product or post-accept service cancellations, the ones that count against the buyer per the role-gating trigger's pivot), and `last_cancelled_at`. Created `with (security_invoker = true)` so it inherits orders RLS in the caller's context: a buyer sees their own row, a seller sees buyers they've dealt with, admin via service role sees all. Execute locked down — revoked from public, select granted to authenticated only. No consumer code today; the buyer rating system that reads it is post-launch. Data accumulates from MVP onward via migration 20's trigger.
22. **20260607142048_reports_resolved_requires_admin_note** — Adds a CHECK constraint on `reports` enforcing `status <> 'resolved' or admin_note is not null` — a resolved report must carry an `admin_note`, which the reporter sees as the moderation outcome. Pre-resolution states (`open`, `under_review`) still allow a null note. Backs the PR-K admin reports queue (`/admin/signalements`): the resolve action requires a non-empty note in app code too, so the data-quality rule is enforced at two layers (server action friendly-error + DB CHECK as the real guard), mirroring how `cancellation_reason` is required for post-pivot order cancellations. Zero reports existed at apply time so no backfill was needed; applies forward. No other schema change — reports RLS already grants admin SELECT-all and UPDATE-all via `is_admin()`.
23. **20260607145237_profiles_user_suspension** — Adds `suspended_at timestamptz` + `suspended_reason text` columns to `profiles` (NULL = active, NOT NULL = suspended), a CHECK `profiles_suspension_requires_reason` (a suspended row must carry a reason), and an `"Admin reads all profiles"` SELECT policy so admins can read every profile for moderation (the pre-existing owner-only SELECT remains in effect; UPDATE stays owner-only). Adds two SECURITY DEFINER functions backing PR-L's admin user management: `admin_suspend_user(uuid, text)` and `admin_unsuspend_user(uuid)`. Both gate on `is_admin()`; suspend additionally blocks self-suspend (`target = auth.uid()`), requires a non-empty reason, and is idempotent (errors if already suspended); unsuspend errors if not currently suspended. Suspension fields are written only through these controlled functions (admin does NOT get broad UPDATE on profiles). Execute revoked from public, granted to authenticated. Enforcement of the suspended state platform-wide lives in the app layer (`middleware.ts`): a suspended logged-in user is signed out and redirected to `/login?suspended=1` on any protected route.
24. **20260607152956_orders_admin_read_all** — Adds an `"Admin reads all orders"` SELECT policy on `orders` (`using is_admin()`) so the admin user detail page (`/admin/utilisateurs/[id]`) can compute accurate orders-as-buyer and orders-as-seller counts, and so future dispute-resolution surfaces can read any order's lifecycle. The pre-existing buyer/seller-only SELECT policy stays in effect; the admin policy OR's with it. INSERT remains buyer-only; UPDATE stays gated by the role-gating trigger `trg_check_order_status_transition`, which already honors `is_admin()`. Restores the order counts that were temporarily dropped in PR-L because a raw count as admin returned 0 under the old RLS (the same undercount `admin_overview_stats` avoided via SECURITY DEFINER) — this policy is the analogous fix on the read path.
25. **20260607154225_products_services_admin_moderation** — Adds `admin_hidden_at timestamptz` + `admin_hidden_reason text` columns to `products` and `service_listings`, each with a CHECK (`*_admin_moderation_requires_reason`) that a moderated row carries a non-empty reason. Layers on top of the existing `status='hidden'` seller-side feature without breaking it: a seller hiding their own listing leaves `admin_hidden_at` NULL; admin moderation is distinguished by `admin_hidden_at` NOT NULL. A shared SECURITY DEFINER BEFORE UPDATE trigger function `enforce_admin_moderation_lock()` (attached to both tables) prevents non-admins from setting/clearing the admin marker and prevents owners from changing `status` away from `hidden` on admin-moderated content. Two SECURITY DEFINER functions `admin_hide_content(target_type, target_id, reason)` and `admin_unhide_content(target_type, target_id)` are the only paths to set/clear the marker — both gate on `is_admin()`, validate state (hide errors if already moderated / unhide errors if not moderated), and dispatch on `target_type` ('product' / 'service'). Execute revoked from public, granted to authenticated. Backs PR-M's in-place content moderation on the report detail page (`/admin/signalements/[id]`); products and services only (shops / freelancer profiles / job posts deferred to PR-N+).
26. **20260607160156_shops_freelancers_jobs_admin_moderation** — Extends admin content moderation to the remaining three target types. Adds `admin_hidden_at` + `admin_hidden_reason` columns (each with a `*_admin_moderation_requires_reason` CHECK) to `shops`, `freelancer_profiles`, and `job_posts`. Unlike products/service_listings, these tables have no `status='hidden'` seller-side feature, so moderation is encoded **purely** via `admin_hidden_at` NOT NULL — no status flip. A new shared SECURITY DEFINER trigger function `enforce_admin_marker_lock()` (attached to all three via `trg_enforce_admin_marker_lock_*`) prevents non-admins from setting/clearing the marker; it is simpler than `enforce_admin_moderation_lock` because there is no status column to also protect. `admin_hide_content` / `admin_unhide_content` are extended with `shop` / `freelancer_profile` / `job_post` branches (product/service branches unchanged). Public surfaces must filter `admin_hidden_at IS NULL` by hand — there is no `status='active'` filter doing this implicitly (PR-N adds the filter to `/boutique/[id]`, `/freelance/[id]`, `/missions`, `/missions/[id]`).
27. **20260608024024_job_posts_admin_read_all** — Adds an `"Admin reads all job_posts"` SELECT policy (`using is_admin()`) on `job_posts`, OR'd on top of the existing `((status='open') OR (consumer_id=auth.uid()))` policy. Without it, an admin acting on a report whose target is a **non-open** job post couldn't read the row to drive the report-detail moderation UI (the admin isn't the owner and the post isn't open). Same pattern as migration 24's `"Admin reads all orders"`; non-admin behavior is unchanged (Postgres OR's multiple permissive SELECT policies). INSERT/UPDATE on `job_posts` stay gated by their own policies. Bundled with migration 26 because it closes a gap that migration directly exposes.
28. **20260608045653_reports_status_add_dismissed** — Adds `'dismissed'` to the `reports.status` CHECK as a terminal action distinct from `'resolved'` (resolved = admin agreed and took action; dismissed = admin judged the report invalid/spurious, no action against the target). Replaces the old `reports_resolved_requires_admin_note` CHECK with `reports_terminal_requires_admin_note`, which requires a non-null `admin_note` for **either** terminal state (`resolved` or `dismissed`) — the note is the message the reporter sees on close, required for both. Backs PR-O2's Dismiss action on the report detail page (`/admin/signalements/[id]`); the `dismissReport` server action mirrors `resolveReport` (RLS `is_admin()` UPDATE + rowcount-honest guard), and `updated_at` (via `reports_set_updated_at`) is the close timestamp — there is no `resolved_at` column.
29. **20260608133656_disputes_schema_and_rls** — Creates the `disputes` table: the DB foundation for the disputes feature series (PR-P1 of P1 schema → P2 admin queue → P3 buyer create → P4 seller create). A dispute is a special class of report scoped to a specific order (`order_id` FK → `orders`, `on delete cascade`). Columns: `created_by_role` ('buyer'/'seller'), `reason` ('not_delivered'/'wrong_item'/'damaged'/'payment_refused'/'buyer_unreachable'/'other'), `description`, `status` ('open'/'under_review'/'resolved'/'dismissed', default 'open'), `outcome` ('sided_buyer'/'sided_seller'/'compromise' or null), `admin_note`, and `created_at`/`updated_at`. Three data-integrity CHECKs: `disputes_terminal_requires_admin_note` (resolved/dismissed must carry an `admin_note` — the message both parties see on close, mirroring `reports_terminal_requires_admin_note`); `disputes_outcome_only_when_resolved` (`outcome` is set iff `status='resolved'`; dismissed disputes favor no side); `disputes_other_requires_description` (`reason='other'` requires a non-empty `description`). A partial unique index `disputes_one_active_per_order` permits at most one active dispute (`open`/`under_review`) per order at a time while allowing a fresh dispute once the prior one is closed; plus btree indexes on `status` (admin-queue filter), `order_id` (lookups), and `created_at desc` (recency sort), and a `disputes_set_updated_at()` SECURITY DEFINER trigger mirroring the `reports_set_updated_at` pattern. RLS (enabled): SELECT for admin OR a party (buyer/seller) of the referenced order; INSERT by a party only, with `created_by_role` matching their identity on the order and the order past `'pending'`; UPDATE admin-only (status/outcome/admin_note); no DELETE policy — disputes are permanent records. No app code reads or writes the table yet — UI lands in PR-P2..P4. Money movement is out of scope at MVP (COD-only, no payment rail); resolution is informational, not transactional. Mirrored verbatim from the production migration of the same version; the shared TypeScript types (`src/lib/types/dispute.ts`) ship in this same PR so subsequent PRs query the table with one set of literal-union types.
30. **20260608135501_admin_overview_stats_add_disputes** — Extends the `admin_overview_stats()` RPC (migration 19) with a 9th column, `pending_disputes bigint`, counting `disputes` with `status in ('open','under_review')` — the same open/under_review scoping as `pending_reports`, i.e. disputes that need admin action. Because Postgres can't `CREATE OR REPLACE` through a `RETURNS TABLE` shape change, the function is dropped and recreated within the migration (atomic); the body, `SECURITY DEFINER`, `is_admin()` Forbidden gate, and `search_path` are otherwise unchanged. Backs PR-P2's new "Litiges en attente" tile on the admin overview (`/admin`). Read-only, no table change.
31. **20260608165709_admin_audit_log** — Creates the `admin_audit_log` table: the forensic record of every state-changing admin action (strategic reference §9 — every admin action timestamped and attributed to a named user, with the entity affected and the before/after state). Columns: `id`, `admin_id` (FK → `profiles`, `on delete restrict` so an admin's history is never orphaned), `action` and `target_type` (free text by design — a new admin action shouldn't require a CHECK migration; convention is documented in code: action a snake_case verb phrase like `'resolve_report'` / `'hide_content_shop'` / `'suspend_user'`, target_type matching the `reports.target_type` vocabulary plus `'report'` / `'dispute'` / `'user'`), `target_id`, `before_state` / `after_state` (`jsonb`, so each action records its own shape without per-action columns), `note`, `created_at`. Four indexes (`admin_id`; `(target_type, target_id)`; `created_at desc`; `action`). RLS (enabled): admin-only SELECT (the log is admin-internal forensic memory); INSERT gated by `is_admin() and admin_id = auth.uid()` (belt-and-suspenders so an admin can't log actions under another admin's name even via direct INSERT); **no UPDATE and no DELETE policy** — entries are immutable and permanent. Ships the `log_admin_action(p_action, p_target_type, p_target_id, p_before_state, p_after_state, p_note)` SECURITY DEFINER RPC that admin actions call after a successful mutation — it re-checks `is_admin()`, validates non-empty action/target_type, inserts with `admin_id = auth.uid()`, and returns the new row id. Mirrored verbatim from the production migration of the same version (PR-T). Migration 32 wires the four existing admin SECURITY DEFINER RPCs to call this helper in-transaction; the app-side report/dispute server actions call it as a best-effort follow-up after their UPDATE commits.
32. **20260608165819_admin_rpcs_emit_audit_log** — `CREATE OR REPLACE`s the four admin SECURITY DEFINER RPCs (`admin_hide_content`, `admin_unhide_content` from migration 26; `admin_suspend_user`, `admin_unsuspend_user` from migration 23) so each calls `log_admin_action()` (migration 31) after its successful mutation. Because these RPCs and the audit insert run in the **same transaction**, a failed audit write rolls back the whole operation — moderation/suspension and its audit trail are atomic, all-or-nothing. Action names: `hide_content_<type>` / `unhide_content_<type>` (type = product/service/shop/freelancer_profile/job_post), `suspend_user`, `unsuspend_user`; `before_state` / `after_state` capture the `admin_hidden_at` or `suspended_at` transition. No signature or behavior change to the mutations themselves — purely additive logging appended after the existing `if not found` guards. The report and dispute actions (claim/resolve/dismiss) are **not** here: they are bare table UPDATEs whose logging is a best-effort app-level `log_admin_action` call after the UPDATE commits (see `src/app/admin/signalements/actions.ts` and `src/app/admin/litiges/actions.ts`), since separate Supabase round-trips can't share a transaction without wrapping each in its own RPC — heavier than the value. Mirrored verbatim from the production migration of the same version (PR-T).

33. **20260609150153_refine_buyer_cancellation_history** — Redefines the `buyer_cancellation_history` view (created in migration 21) to fix a counting bug before the post-launch buyer-rating system consumes it. The old `cancellations_after_pivot` column filtered on `cancellation_reason is not null` — but the role-gating trigger requires a reason for **both** buyer- and seller-initiated post-dispatch cancellations, so a seller's post-pivot cancel was wrongly counted against the buyer (`cancelled_by='buyer'` is the buyer's record; `cancelled_by='seller'` is the seller's, per product.md). `DROP VIEW` + `CREATE VIEW` — safe because there are zero `src/` consumers (the rating system is post-launch) — with a `cancelled_by`-aware shape: `total_orders`, `cancellations_total` (any initiator), `cancellations_by_buyer`, `cancellations_by_buyer_after_pivot` (the serial-refuser metric: `cancelled_by='buyer'` and a reason was required), `last_buyer_cancelled_at`. Keeps `security_invoker = true` so rows respect orders RLS (buyer sees own global stats, admin sees all, seller sees only their own-relationship slice). Adds `REVOKE SELECT ... FROM anon` — defense in depth, since orders RLS already returned anon zero rows but migration 21's `revoke ... from public` left Supabase's direct anon grant in place. The view `COMMENT` documents that `cancellation_reason is not null` is a proxy for "post-pivot" because the schema does not store status-at-cancellation; it tightens when per-transition timestamps ship post-launch. Mirrored verbatim from the production migration of the same version (PR-W).

34. **20260609190541_lock_profiles_privileged_columns** — Closes the privilege-escalation found by the 2026-06-09 backend audit (PR #58, CRIT-1): any authenticated user could `UPDATE profiles SET is_admin = true` (also self-clear `suspended_at`, self-set `seller_type`) on their own row via the REST API, because RLS gates rows not columns and `authenticated` held a table-level UPDATE grant. Two layers. Layer 1 (primary): a column-level REVOKE is a no-op against a pre-existing table-level grant in PostgreSQL, so the table grant is revoked from anon/authenticated and re-granted as an allow-list of only the columns the app edits (`full_name, city, language, phone, seller_type`); `is_admin` / `suspended_at` / `suspended_reason` / `date_of_birth` / `email` are no longer authenticated-writable (changed only by the admin SECURITY DEFINER RPCs running as owner, or by service_role). Layer 2: the `enforce_profile_admin_marker_lock` BEFORE UPDATE trigger as defense-in-depth, bypass cascade `auth.uid() IS NULL` (service-role / SQL editor) → `is_admin()` (admin RPC paths) → else RAISE 42501. The allow-list inversion (a new pattern in this codebase) was identified by the PR-Z 5-lens adversarial review after it caught the original column-only-REVOKE approach as ineffective.
35. **20260609190755_lock_orders_identity_and_seller_age_gate** — Closes audit IMP-1 (a buyer could reassign `seller_id` / change `quantity` — any non-status column — on their own order; the role-gating trigger only gates status transitions) and adds the DB-level 18+ seller gate (audit IMP-3 / CLAUDE.md "age 18+ to sell must be DB-enforced", previously app-layer only). Same allow-list approach on `orders`: table UPDATE revoked from anon/authenticated and re-granted only on the lifecycle columns (`status, cancelled_by, cancellation_reason, received_at`); identity/delivery/quantity columns frozen. `enforce_order_identity_lock` BEFORE UPDATE trigger as defense-in-depth. `enforce_seller_type_age_gate` BEFORE UPDATE on profiles requires `date_of_birth` present and ≥ 18 when `seller_type` is set (UPDATE-only because seller_type only transitions to non-null via UPDATE — `handle_new_user` always inserts NULL — avoiding any OLD-on-INSERT ambiguity). Both verified by `scripts/rls-smoke.mjs` section F (now 32 assertions).

36. **20260615103000_create_deletion_requests** — `deletion_requests` table recording consumer-initiated, admin-mediated account-deletion requests. Deleting the `auth.users` row is what actually cascades; this table only RECORDS the request (`status='pending'` from the `/mon-compte` flow, admin processes later).
37. **20260615150000_create_data_exports** — `data_exports` table, the portability sibling of migration 36 (GDPR Art. 20 / Loi organique 2004-63). Same shape: user requests, admin prepares and sets `export_url`/`status`. Partial unique index permits one pending export per user.
38. **20260618111508_add_fts_to_products_and_service_listings** — accent-insensitive full-text search. Adds the `unaccent` extension plus an IMMUTABLE `f_unaccent(text)` wrapper (raw `unaccent()` is STABLE, which Postgres rejects in index expressions), then `search_vector` **GENERATED STORED** columns + GIN indexes. ⚠ This is the origin of the PR-F2.3 "search_vector trap": the column is generated, **not** trigger-driven.
39. **20260624230631_service_listings_add_world_class_fields** — lifts `service_listings` toward Fiverr/Upwork parity (PR-F2.3): `deliverables text[]` and siblings, NOT NULL with DEFAULTs so the 8 existing rows backfill cleanly. Deliberately does **not** touch `search_vector` — widening it means DROP + recreate the generated column and its GIN index, deferred to a focused migration.
40. **20260727101731_add_service_listings_delivery_mode** — `delivery_mode text` on `service_listings` (`remote`/`onsite`/`hybrid`, text + CHECK rather than a Postgres ENUM, matching house convention). Nullable by design: NULL = unspecified, and D2 hides the "Mode de prestation" section. Backs the D↔H field-additions pass.
41. **20260729111547_orders_snapshot_and_shipment** — freezes order money and identity. Adds `unit_price_tnd numeric(10,2)` + `item_title text` (both derived server-side at INSERT by the new `set_order_snapshot()` BEFORE INSERT trigger, which **overwrites** any client-supplied value), and `carrier` + `tracking_number` for G9's panel-suivi. Fixes two live bugs: `orders` never captured price or title, so a seller editing `products.price_tnd` retroactively rewrote every past order's displayed figure, and both target FKs being `ON DELETE SET NULL` meant deleting a listing stripped the order's price AND title. Extends `enforce_order_identity_lock` with the two frozen columns plus a seller-only, non-terminal-only clause for carrier/tracking. The other three BEFORE UPDATE triggers are untouched; `CREATE OR REPLACE` rebinds the existing trigger in place so the lock is never absent. No backfill — the 14 pre-existing orders keep NULL, because today's price is not the price then.
42. **20260729111613_order_events** — `order_events`, the append-only order timeline feeding G9's panel-historique and G8's per-state waitTime. Shape is `from_status`/`to_status`, deliberately **not** `admin_audit_log`'s before/after jsonb (a timeline needs transitions, not row diffs). Written only by the new `emit_order_event()` **AFTER INSERT OR UPDATE** trigger — its own trigger, because all four pre-existing ones are BEFORE UPDATE (nothing could emit `'created'`) and they fire alphabetically, which would have logged a null `cancelled_at` on the event that matters most. RLS mirrors the `disputes` SELECT pattern (both parties + admin); no INSERT/UPDATE/DELETE policy.
43. **20260729111728_order_events_revoke_residual_privileges** — corrects migration 42. The enumerated `revoke insert, update, delete` left **TRUNCATE** granted to `authenticated` via Supabase's schema-level default privileges — a write that bypasses RLS, so the table's "append-only" guarantee was not true as applied. Replaced with `revoke all` + `grant select`. Caught by migration 42's own verification query. The same residual TRUNCATE grant exists platform-wide on every `public` table for both `authenticated` and `anon`; that sweep is logged as its own PR.
44. **20260729111938_orders_grant_update_on_shipment_columns** — corrects migration 41. Migration 35 replaced the table-level UPDATE grant on `orders` with a column **allow-list** (`status, cancelled_by, cancellation_reason, received_at`), so `carrier` and `tracking_number` shipped with no update grant at all and the seller could not write them through PostgREST — G9's panel-suivi would have been a dead input. Grants UPDATE on exactly those two columns. `unit_price_tnd` and `item_title` are deliberately excluded: the allow-list keeps them frozen at the privilege layer, with `enforce_order_identity_lock` as the second layer.

45. **20260729112636_orders_shipment_columns_product_only** — `orders_shipment_requires_product` CHECK confining `carrier`/`tracking_number` to `order_type='product'`. A service has no parcel, so a tracking number on one is meaningless data a later report would happily aggregate. Written as "not a product ⇒ both null" rather than "product ⇒ not null", because a product order legitimately has no carrier until dispatch — this constrains WHERE the columns may be populated, not WHEN. All 14 existing rows carry NULL in both, so validation passed without a rewrite.

46. **20260814114009_freelancer_languages** — H2 step 2 "Compétences & langues". Adds `freelancer_languages` (`freelancer_profile_id` FK cascade, `language`/`proficiency` CHECK-constrained codes, `UNIQUE (freelancer_profile_id, language)`), superseding `freelancer_profiles.languages` (a single nullable text column that cannot hold a 1-to-many language×proficiency relation — the frame draws a repeater, the column held one string). RLS is `FOR ALL` owner-scoped (mirrors `shop_payment_methods`/`shop_categories`), deliberately **not** `freelancer_skills`' narrower insert/delete-only shape — that gap is logged as a precedent inconsistency in `docs/follow-ups.md`, not fixed here. `freelancer_profiles.languages` is left in place, unwritten by any code from this PR forward; its 10 pre-existing non-empty values are not backfilled (parsing free-text prose into two enums risks writing wrong data under a real user's name) and are instead dumped verbatim in `docs/follow-ups.md` so the data survives outside the column.

47. **20260902184303_freelancer_profiles_publish_gate** — Accidental no-op. A permission-retry probe during this session's tool-use sent a placeholder query (a bare SQL comment) to `apply_migration` instead of the intended DDL; it executed immediately with no further confirmation and got recorded under this name/version. Contains no schema change — mirrored here verbatim (never renamed/hidden, per this file's own convention) rather than pretending it didn't happen. The real migration is 48.

48. **20260902184507_freelancer_profiles_publish_gate** — Closes the freelancer world-readability gap found while scoping the H3 profile work: all six freelancer tables (`freelancer_profiles`, `freelancer_skills`, `freelancer_tools`, `freelancer_education`, `freelancer_certifications`, `freelancer_languages`) carried a SELECT `using (true)` policy, so a `freelancer_profiles` row was world-readable to anon the instant H2 step 1 inserted it — no publish flag existed to gate on. Adds `is_published boolean not null default false` to `freelancer_profiles`, **derived, never user-set**: true iff the freelancer has ≥1 `service_listings` row with `status='active'`. A single-source-of-truth helper `freelancer_has_active_listing(uuid)` (`security definer`, execute revoked from public/granted to authenticated — *correction 2026-10-26: anon kept EXECUTE through Supabase's direct default grant until migration 68 (`20261026190353`) revoked it from public, anon and authenticated; its only caller is the DEFINER trigger* — Supabase auto-exposes every `public`-schema function as a PostgREST RPC endpoint, so an ungated helper would be a new anon-callable probe) backs both the one-time backfill and the ongoing `sync_freelancer_is_published()` trigger (`AFTER INSERT OR DELETE OR UPDATE OF status, freelancer_profile_id ON service_listings`), so the two rules cannot diverge. The trigger recomputes both the old and new owner on a `freelancer_profile_id` reassignment — app-layer RLS makes that impossible today (`freelancer_profiles.profile_id` is `UNIQUE`, and the "Owner updates own services" policy's `with check` requires old and new owner to both be `auth.uid()`), but nothing at the schema level enforces it, so the trigger doesn't assume single-owner. Backfill (10 of 11 rows published, 1 with no active listing stays unpublished) reuses the same helper function as the trigger, applied once. Replaces all six `using (true)` SELECT policies by their exact existing names with `is_published = true OR profile_id = auth.uid() OR is_admin()` (children via `EXISTS` through `freelancer_profiles`, FK column branched per table — `freelancer_profile_id` on skills/languages, `freelancer_id` on tools/education/certifications, confirmed from `information_schema`, not templated from one name). `is_admin()` is required, not optional: `/admin/signalements/[id]`'s report-review UI and the admin dashboard's freelancer count both already depend on reading `freelancer_profiles` regardless of publish state — confirmed by reading both call sites before writing the policy, not assumed. `public_profiles` (name/city/avatar) is untouched — orthogonal, already narrower, out of scope. `freelancer_links`/`freelancer_portfolio_items` don't exist yet (H3's migration) and are out of scope. Verification: `src/__tests__/freelancer-publish-gate-rls.test.ts` (supersedes `freelancer-config-rls.test.ts`), against fixtures seeded with rows in all five child tables on both a published and an unpublished profile (prod carried zero rows in all five before this PR, so live data alone couldn't distinguish "correctly hidden" from "nothing there") — anon/owner/admin read boundaries, all four trigger transitions (insert, hide, re-activate, delete), and the `!inner`-embed marketplace paths (`getActiveServices` list shape + `service-detail` single-row shape) against real data.

Migration 13 includes a one-row data UPDATE (legacy `'completed'` → `'received'`) because the constraint widening required the legacy row to be reconciled with the new allowed value set. Migration 14 closes the pre-existing wide-open RLS UPDATE policy by adding DB-level transition enforcement above the row-gating policy.

**Numbering note:** this numbered list stopped being kept current after entry 48 — 12 migrations
(`20260804104541` through `20260905194951`) landed in the folder without a corresponding entry
here. That gap predates and is unrelated to the entry below; backfilling it is out of scope for
this PR and is not attempted here.

49. **20260907222557_taxonomy_13_sectors_categories_cutover** — Cutover from the original 8 flat
    service categories (seeded by migration 4, extended by migration 17) to the 13-sector /
    91-subcategory taxonomy locked in `docs/design/taxonomy-services.md` and reconciled into
    `src/lib/taxonomy/service-categories.ts` by the prior PR (#172). Forced ordering: insert the
    13 sectors → backfill all 21 `service_listings` + 4 `job_posts` that pointed at the old 8
    (by id, not title; founder-ruled fan-out for 8 of the 21 listings, since 5 of the 13 sectors
    are new and exist precisely to hold services the old 8 had no bucket for) → assert the old 8
    are fully drained (checked against all five inbound FKs, including `shop_categories`, the one
    that CASCADEs rather than SET NULLs) → delete the old 8 → insert the 91 subcategories. That
    last step must follow the delete: the subcategory `montage-video` (under
    `montage-video-motion`) collides with the just-deleted sector slug of the same name under
    `categories_slug_key`'s table-wide uniqueness — the only collision across all 104 new slugs.
    Also adds `enforce_service_category_kind()` (mirrors `job_response_fairness_trigger`'s shape:
    plpgsql, `SECURITY DEFINER`, pinned `search_path`, French user-facing message), a `BEFORE
    INSERT OR UPDATE OF category_id` trigger on both `service_listings` and `job_posts` enforcing
    `kind in ('service','both')` — the DB half of the read contract migration
    `categories_kind_discriminator` documented but never enforced. NULL `category_id` is exempt
    (2 pre-existing `job_posts` test fixtures carry it and are left untouched — neither founder
    ruling mapped them). The symmetric `products` / `kind in ('product','both')` guard is a real
    gap, deliberately not installed here (logged in `docs/follow-ups.md`). Final in-transaction
    verification (13 sectors, 91 subcategories, 0 categories left under any of the 8 legacy slugs
    at the root, 0 `service_listings` with a null category, 0 `job_posts` that lost a category
    excluding the 2 known-null fixtures, 0 rows filed under a non-service category, 0 orphaned
    subcategories) raises and rolls back the whole migration on any failure rather than reporting
    after the fact. Companion app-code fix in the same PR: `getCategories()`
    (`src/lib/marche/my-data.ts`, backing `/mes-annonces/nouvelle`) gained `.is('parent_id', null)`
    — without it the picker would have silently grown from ~9 options to 105 the moment this
    migration made `categories` a real parent/child table for the first time.

50. **20260908192000_service_listings_draft_status** — Widens `service_listings.status` from
    `('active','hidden')` to `('active','hidden','draft')` ahead of H6 (the service-creation
    wizard, not yet in code) shipping — H6 is the only future writer of `'draft'`, so an
    in-progress service survives leaving the wizard instead of publishing early or being lost.
    `CREATE OR REPLACE`s `admin_hide_content` (migration 32's definition) so its `service` branch
    adds `and status <> 'draft'` to the guard: without it, a freelancer's unpublished draft would
    become admin-hidden-and-moderated the moment any report (mistaken or buggy) targeted one — same
    coercion class as `validateServiceInput` defaulting an unrecognized status to `'active'`, a
    function with no awareness of the new status defaulting to the one that publishes. Reuses the
    exact "not found or already moderated" exception text the pre-existing already-moderated case
    raises, so `actions.ts`'s `translateModerationError()` needs no change. `admin_unhide_content`
    is deliberately untouched: its `WHERE admin_hidden_at is not null` clause only ever matches rows
    `admin_hide_content` itself moderated, which (by this same guard) can never have been `'draft'`
    — there is no state it restores to `'active'` from that it didn't itself verify. The `products`
    branch is untouched too — `products.status` has no `'draft'` value to guard against. Every
    public read path (`/marche/services`, D2, D4's Ses services box) already filtered
    `status='active'` explicitly before this migration, so a draft is invisible there by
    construction; `freelancer_has_active_listing()` filters the same way, so a draft never flips
    `is_published`. `docs/follow-ups.md` logs two items this migration surfaces but does not fix:
    H6 must detect and resume an existing draft or a freelancer can create one and never reach it
    again, and `admin_hide_content`'s failure modes (not-found / already-moderated / now draft) are
    indistinguishable to the caller and unlogged on failure across all five target types.

51. **20260909203226_service_listings_subcategory_id** — Adds `service_listings.subcategory_id`
    (nullable `uuid references categories(id)`) for H6's two-level category cascade: pick a
    sector, then a subcategory within it. `category_id` keeps its existing meaning (the sector —
    every one of the 21 pre-H6 rows already points at a top-level `categories` row) so nothing
    that already reads it (`CATEGORY_ICONS`, `/marche/services` filters, search) needs to change;
    `subcategory_id` carries the leaf the taxonomy cutover migration (49) made real. **For the
    record:** this column was proposed and approved during migration 49's own PR discovery but
    never made it into that applied migration — a gap surfaced by H6 being its first real
    consumer, not new scope invented here.

52. **20261023153918_harden_service_listings_h6** — Hardens `service_listings` before H6 (the
    service-creation wizard) starts writing drafts, per rulings G1–G3 (founder + architect,
    2026-10-23). **G1:** replaces the SELECT policy "Services viewable by everyone" (`using (true)`
    — any draft, owner-paused or admin-moderated row was readable by anyone holding its id through
    the REST API; only the app's own `status='active'` filters kept them off public pages) with
    "Services readable when live, or by owner, buyer, or admin": the public sees `status='active'
    and admin_hidden_at is null`; the owner sees every own row (H5's list and counts, the
    moderation banner, and the `RETURNING` of H5's toggle/delete and H6's `insert().select()` all
    depend on that branch); the admin sees everything via `is_admin()`, so `/admin/signalements/[id]`
    still reads a hidden target to render the unhide UI. The fourth, buyer branch — any listing the
    caller has an order on — is PR-1 discovery decision D1 (founder, 2026-10-23): `/mes-commandes`
    and the E2 recap embed the live listing, and all 10 pre-snapshot service orders have NULL
    `item_title`/`unit_price_tnd`, so without it an owner pausing a service would blank the buyer's
    own order history. It is deliberately not gated on `admin_hidden_at` (a buyer's record of their
    own transaction outlives moderation) and cannot recurse (no `orders` policy references
    `service_listings`). Every public read path already filtered `status='active'` and
    `admin_hidden_at is null` in code, so none of them changes; `/mes-favoris` already dropped
    non-active favourites in code. **G2:** `starting_price_tnd` becomes nullable, with
    `service_listings_price_required_unless_draft` (`status = 'draft' or starting_price_tnd is not
    null`) so only a draft may lack a price; `title` stays NOT NULL. **G3:** the `subcategory_id` FK
    is re-created `on delete set null`, and the new `trg_enforce_service_subcategory_parent`
    (`enforce_service_subcategory_parent()`, SECURITY DEFINER, `BEFORE INSERT OR UPDATE OF
    category_id, subcategory_id`) requires a set `subcategory_id` to be a `kind='service'` child of
    the row's own `category_id`, raising `23514`. It is kept separate from
    `enforce_service_category_kind`, which governs the sector and still accepts `'both'`. By
    decision D2, deleting a sector whose services carry a subcategory **fails** here (the FK nulls
    `category_id` while `subcategory_id` is still set), so those services must be moved first.
    All 21 pre-existing rows were active, priced and had no subcategory, so no backfill was needed.
    `docs/follow-ups.md` logs what this migration surfaces but does not fix: `products`, `shops` and
    `product_images` still read `using (true)` (their own security PR); an orders INSERT never
    checks that the listing is active, because `set_order_snapshot` is SECURITY DEFINER and FK
    checks bypass RLS; and moving a subcategory to another sector is never re-checked against
    `subcategory_id`. Rollback SQL is in a comment block at the bottom of the migration file.

53. **20261023170907_profiles_revoke_client_insert_delete** — CRITICAL hotfix from the
    2026-10-23 security audit. Supabase's default grants had left `anon`/`authenticated` with
    INSERT and DELETE on `profiles` (migration 20260609190541 revoked only UPDATE), and the
    original policies "Users can insert their own profile" / "Users can delete their own profile"
    let a user write their own row. Both guards — `enforce_profile_admin_marker_lock` and
    `enforce_seller_type_age_gate` — are BEFORE UPDATE only, so a signed-in user could delete their
    profile and re-insert it with `is_admin = true` (every admin policy and RPC), a cleared
    `suspended_at`, or a `seller_type` under 18; the delete alone also cascaded away the other
    party's orders and disputes. Revokes INSERT, DELETE and TRUNCATE on `profiles` from `anon` and
    `authenticated` and drops both policies; SELECT and UPDATE are untouched. Safe because
    profiles are created only by `handle_new_user` (SECURITY DEFINER, AFTER INSERT on
    `auth.users`) and removed only by the `auth.users` FK cascade, whose referential action runs as
    the table owner; no app code inserts or deletes profiles, and user-facing deletion goes through
    `deletion_requests`. Verified unexploited before applying: one admin (the founder), 0 of 22
    profiles re-created after their auth user. Rollback SQL is in a comment block at the bottom of
    the migration file — it re-opens the hole, so it must only ever ship with BEFORE INSERT guards.

54. **20261023170918_orders_insert_integrity** — Closes the orders INSERT gap logged by migration
    52. The only INSERT gate was the RLS WITH CHECK `buyer_id = auth.uid()`, so through the REST
    API a signed-in user could order a draft, paused or admin-moderated item (which, since 52's
    buyer branch, also grants READ on that service listing), pin the order on any profile as
    `seller_id` (which also unlocked `get_contact_phone` for that profile — it returns the phone
    whenever any order links caller and target), or insert an order already `received` (inflating
    `get_completed_service_order_count` on the public D4 profile) or past `pending` (opening the
    `disputes` INSERT path). Adds `trg_enforce_order_insert_integrity`
    (`enforce_order_insert_integrity()`, SECURITY DEFINER, BEFORE INSERT), a sibling of
    `set_order_snapshot` that fires before it by name; the snapshot itself is unchanged. **Every
    caller:** `seller_id` is set from the item's owner (product → `shops.owner_id`; service →
    `freelancer_profiles.profile_id`), discarding any client value — the snapshot's unconditional-
    assignment pattern; a missing item raises the snapshot's own `23503`. **Signed-in non-admin
    callers only** (`auth.uid()` NULL and `is_admin()` bypass, like every other orders trigger, so
    seeds, the service role and live-DB fixtures inserting `received`/`cancelled` rows keep
    working): `status` must be `pending` and `cancelled_by`, `cancelled_at`, `cancellation_reason`,
    `received_at`, `carrier`, `tracking_number` NULL (`42501`); the item must be live — product
    `status='active'` (so not `hidden`/`sold_out`), not admin-moderated, shop not admin-moderated;
    service `status='active'` (so not `draft`/`hidden`), not admin-moderated, freelancer profile not
    admin-moderated (`23514`); and the buyer cannot be the seller (`23514`). Both app paths
    (`demander/[id]/actions.ts`) already send `status:'pending'`, the true owner as `seller_id`,
    and only order live items, so neither changes. New inserts only: of the 16 existing orders, 0
    had a mismatched seller, 0 were self-orders, 0 sat on a non-live item; 14 predate
    `order_events`, so their insert-time status is unknowable. The seller age gate is on
    `profiles` (BEFORE UPDATE) and is untouched. Rollback SQL is in a comment block at the bottom
    of the migration file.

55. **20261023182532_seller_capability_integrity** — Closes the HIGH audit finding "`shops` /
    `freelancer_profiles` INSERT bypass the 18+ and one-seller-capability rules" (2026-10-23)
    for those two tables. The sibling `job_responses` path, where an account also acts as a
    freelancer, is not covered and is logged as its own HIGH. Both INSERT policies checked only `owner_id` / `profile_id = auth.uid()` and neither table had
    an INSERT trigger, while the 18+ gate (`enforce_seller_type_age_gate`) is BEFORE UPDATE on
    `profiles.seller_type` — so over REST a consumer of any age could create a shop and/or a
    freelancer profile without ever setting `seller_type`. **Part 1:**
    `enforce_seller_capability()` (SECURITY DEFINER, one function shared by
    `trg_enforce_seller_capability_shops` and `trg_enforce_seller_capability_freelancer_profiles`,
    BEFORE INSERT OR UPDATE OF `owner_id` / `profile_id`): for signed-in non-admin callers the
    row's owner must hold the matching `seller_type` (`shop_owner` / `freelancer`, itself
    age-gated) and must not already own the other capability's row (both `42501`, not `23514` —
    both creation actions map a `23514` from their `seller_type` UPDATE to the age-gate copy, and a
    capability rejection must not read as an age refusal). The owner's `profiles` row is read
    `FOR SHARE` so the check cannot interleave with a `seller_type` switch; UPDATE returns early
    unless the owner actually changes. **Part 2 (founder decision D1):**
    `enforce_seller_capability_switch()` (BEFORE UPDATE OF `seller_type` on `profiles`, sibling of
    the age gate, which is untouched): when `seller_type` actually changes, the new value must
    match every capability row the account owns (`42501`) — without it a shop owner could move to
    NULL or `freelancer` and keep a live shop. Deleting the old content and then switching passes
    Part 2 only for a seller with no orders (`enforce_order_identity_lock` rejects the cascaded
    `SET NULL` on their orders), so a future "switch" flow needs its own design (logged).
    `auth.uid()` NULL and `is_admin()` bypass both parts, like every other guard trigger; rls-smoke
    and twelve live-DB suites (listed in the migration header) seed shops or freelancer profiles
    through the service role without setting `seller_type` and depend on it, and anon is still
    stopped by the RLS WITH CHECK. Both app paths (`ma-boutique/creer`,
    `mon-profil-freelance/creer`) flip `seller_type` first and insert second, so neither changes —
    except for the D2 account below: G2 checks `seller_type` only, so it still shows that account
    the form, and its flip now fails with `42501`, shown as G2's generic error (logged).
    New writes only: of 1 shop and 11 freelancer profiles, 0 accounts owned both and 0 sellers were
    under 18; 1 freelancer profile belongs to a `seller_type` NULL account (adult, unpublished, no
    listings, no orders) and is left as is (founder decision D2). Rollback SQL is in a comment
    block at the bottom of the migration file.
56. **20261023195911_auth_users_null_token_columns_fix** — Data-only repair of `auth.users`,
    applied by the architect on 2026-10-23 and recorded here after the fact; no schema change.
    9 of 22 rows (seeded demo/test accounts) carried NULL in `confirmation_token`,
    `recovery_token`, `email_change_token_new` and `email_change`, which the Supabase Auth service
    reads as non-null strings: any Auth admin call that loads those rows
    (`auth.admin.listUsers`, admin `updateUserById`) failed with HTTP 500, and those accounts
    could not complete password flows. Sets each NULL to `''` — the value GoTrue itself writes for
    "no pending token" — only on rows with at least one NULL; rows with real values are
    untouched. The file is the applied statement plus a trailing newline (without it, same md5 as
    `supabase_migrations.schema_migrations.statements`). Verified after apply: 0 of 22 rows still
    hold a NULL in any of the four columns. Nothing to roll back — restoring NULLs would re-break
    the Auth admin API.
57. **20261023212930_service_listings_short_description** — Applied by the architect 2026-10-23
    (recorded version; executable SQL MD5-verified against `schema_migrations`). Adds
    `service_listings.short_description text` (nullable) for H6 step 2 « Description courte »
    (Figma 461:19405, measured in `docs/design/h6-measurements.md`), plus
    `service_listings_short_description_length` CHECK (≤ 160 characters, drafts included). Nullable
    because the 21 pre-H6 rows have none and H6 drafts are partial; whether a published service
    must carry one is the PR-4 publish-rule ruling. `search_vector` (GENERATED STORED over title +
    description) is deliberately untouched — widening it is its own focused migration. No GRANT:
    the table-level grants cover the new column; no view depends on the table.

58. **20261023212933_categories_photographie_retouche_produit** — Applied by the architect
    2026-10-23 (recorded version; executable SQL MD5-verified; listing e5bec0f8 confirmed under the
    new subcategory, 92 subcategories). Founder ruling (2026-10-23): product photography is a subcategory
    « Photographie & retouche produit » (`photographie-retouche-produit`, kind `service`) under
    `design-graphique-logo`, not a 14th sector (subcategories 91 → 92). Re-files the one waiting
    listing, « Photo produits e-commerce » (`e5bec0f8-…`, a placeholder filing from migration 49),
    into it: `subcategory_id` set, sector unchanged. Parent resolved by slug inside a DO block that
    raises unless the sector exists and exactly 1 listing is re-filed. The listing's `updated_at`
    moves to the apply time. `src/lib/taxonomy/service-categories.ts` gains the same entry in the
    same PR (TS `id` = `categories.slug`). Rollback SQL is in a comment block at the bottom of the
    migration file.

59. **20261023212946_job_responses_responder_integrity** — Closes the HIGH audit finding
    "`job_responses` INSERT bypasses the 18+ and freelancer-capability rules (and unlocks phones)"
    (2026-10-23), including its switch-path corollary. (#57 `20261023212930_service_listings_short_description`
    and #58 `20261023212933_categories_photographie_retouche_produit` are recorded by their own
    PR; until it merges, the Verification query below lists those two as missing.) The only INSERT
    gate was the policy "Freelancer creates own response", `with check (freelancer_id =
    auth.uid())`, and no app code inserts responses — so any signed-in account (consumer,
    self-declared minor, shop owner) could respond to an open post over REST and then read the
    poster's phone through `get_contact_phone`. **Part 1:** `enforce_job_responder_capability()`
    (SECURITY DEFINER), trigger `trg_check_job_responder_capability` BEFORE INSERT on
    `job_responses` — named to fire before `trg_check_job_response_limits` (untouched). For
    signed-in non-admin callers, in order: the row must be the caller's own (checked before any
    lookup, because the trigger runs ahead of the RLS WITH CHECK and its messages must never
    describe another account — this also closes the limits trigger's "déjà répondu" / 5-active
    oracle for signed-in callers), then `seller_type = 'freelancer'`, 18+ (the age gate's own
    expression — redundant for client paths, not for an admin- or service-role-set `seller_type`),
    `suspended_at` NULL, and an owned `freelancer_profiles` row that is not admin-moderated — all
    `42501`. The account's `profiles` row is read `FOR SHARE` (the FK only takes KEY SHARE) so the
    check serializes against a `seller_type` switch. **Part 2 (decision D1):**
    `enforce_seller_capability_switch()` from migration 55, body verbatim plus one conjunct: when
    `seller_type` changes to anything but `freelancer`, the account must hold no `job_responses`
    row at all (`42501`, its own message — migration 55's stays pinned). Any response, not only
    live ones, because `get_contact_phone` ignores post status and expiry; withdrawing responses
    then switching passes. **Part 3 (decision D3):** revokes INSERT and UPDATE on `job_responses`
    from `anon` (it skipped Part 1 and still reached the limits trigger's oracle before RLS) and
    UPDATE from `authenticated` (no UPDATE policy exists). Decision D2: the direct 18+ check is
    kept. Decision D4: moderation shedding by deleting and re-creating the freelancer profile is
    logged, not fixed. A `revoke execute` on the new function was drafted after review and NOT
    applied — the function keeps Supabase's default EXECUTE grants like every other trigger
    function (logged for one hygiene PR). New writes only: all 3 existing responses pass Part 1
    and none is held by a non-freelancer. Verified by
    `src/__tests__/job-responses-integrity.test.ts`. Rollback SQL is in a comment block at the
    bottom of the migration file.
60. **20261023231434_public_profiles_revoke_writes** — CRITICAL hotfix found while reviewing
    migration 61, applied by the architect on 2026-10-24 (the two `revoke` statements verbatim).
    `public_profiles` is a simple view over `profiles`, so Postgres made it auto-updatable; it is
    owned by `postgres` (BYPASSRLS) with `security_invoker = false`, and Supabase's default
    privileges had granted INSERT / UPDATE / DELETE / TRUNCATE on it to `anon` and
    `authenticated`. On such a view the base table's privileges and RLS are checked as the view
    owner, so anyone holding the public anon key could PATCH any account's name, city, language,
    avatar or `seller_type` over PostgREST, or DELETE the row — cascading to that account's shops,
    products, orders on both sides, freelancer profile, listings, job posts, responses, favorites
    and reports. Migration 53 had revoked client INSERT / DELETE on the `profiles` table; the view
    kept them. Revokes every write privilege on `public_profiles` and `buyer_cancellation_history`
    (not updatable, included because a view is never a write path) from `anon` and
    `authenticated`; SELECT stays — `public_profiles`' protection is its column list. No row
    touched. Discovery: 22 users, 22 profiles; 24 h of edge logs showed only GET / HEAD on the
    view (earlier writes cannot be ruled out). Verified after apply: no view in `public` keeps a
    write grant. Live suite `src/__tests__/public-profiles-read-only.test.ts` (anon and a
    signed-in user get `42501` on PATCH / DELETE / POST; SELECT unchanged; the
    `buyer_cancellation_history` revoke is defense in depth — the rewriter refuses writes there
    with `55000` before any privilege check). Rollback SQL (which re-opens the hole) is in a
    comment block at the bottom of the migration file.
61. **20261024191215_suspension_enforcement** — Applied by the architect on 2026-10-24; the
    applied statements match this file once column-0 `--` comment lines and blank lines are
    removed and the rollback block is cut (md5 79590b58, 99 lines; the indented comment inside
    `enforce_active_user()` is part of the applied statements and stays):
    `sed -n '/^-- ─── ROLLBACK/q;p' <file> | grep -v '^--' | grep -v '^$' | md5sum`, and on the
    database side the same filter over `supabase_migrations.schema_migrations.statements` lines.
    Closes the HIGH audit finding "suspension is enforced only in `src/middleware.ts`" for the
    database: until now no policy or trigger read `profiles.suspended_at` (except migration 59's
    `job_responses` check),
    so a suspended user who signed in again or replayed a saved token kept writing over
    PostgREST, storage and every server action. **Part 1:** `is_active_user()` (SECURITY
    DEFINER, empty `search_path`) — false only when the caller's own profile is suspended;
    EXECUTE for `authenticated` and `service_role` only (an intentional lint 0029 finding, like
    `is_admin()`). **Part 2 (decision D1):** `enforce_active_user()`, a STATEMENT-level BEFORE
    trigger function raising `42501` "Ce compte est suspendu." — chosen over restrictive write
    policies because it errors on every write (a policy's USING makes a suspended UPDATE/DELETE
    silently match 0 rows), covers SECURITY DEFINER write paths, and fires before every row
    trigger. The check is on the actor, never the row owner. Decision D2: no admin bypass — an
    active admin passes on their own row, and a bypass would let a suspended admin unsuspend
    themselves (`admin_unsuspend_user` has no self-check); the service role still bypasses.
    **Part 3:** `trg_enforce_active_user` on all 26 tables where `authenticated` holds a
    table-level or column-level write grant (25 table-level, plus `profiles` through its
    column-level UPDATE); full block except D3 (`data_exports`, `deletion_requests`: UPDATE/DELETE
    only, so the GDPR requests stay open) and D4 (`disputes`: UPDATE/DELETE only — the existing
    "Dispute creation by order party" policy already limits an INSERT to the caller's own orders);
    D5 blocks `reports`, D6 blocks `orders` both sides (the counterparty and admins still act),
    D7 blocks own-content deletes, D8 blocks every profile edit. Decisions D1–D8 approved by the
    founder on 2026-10-24. **Part 4:** restrictive INSERT / UPDATE / DELETE policies on
    `storage.objects` with the `(select …)` initplan pattern (DELETE no-ops silently). TRUNCATE is
    not covered (no PostgREST path; grant sweep logged). Migration 59's `job_responses`
    suspension check stays but is now shadowed: this statement trigger fires first, so a
    suspended responder gets "Ce compte est suspendu." New writes only; 0 suspended accounts (and
    0 suspended admins) at discovery, re-verified 2026-10-24. The same PR ships the session side:
    an auth ban mirroring `suspended_at` (`src/lib/auth/auth-ban.ts`, from both admin suspend
    actions, database first) and a middleware matcher inverted to every route but static assets,
    the auth pages and `/monitoring`. Verified by `src/__tests__/suspension-enforcement.test.ts`
    (live: the catalog check against the PostgREST relation set, every table × verb from a
    suspended session and an active control, own-row refusals with ground truth, D3 / D4 / D6,
    storage, a suspended vs an active admin, unsuspension, and the ban against GoTrue). Rollback
    SQL is in a comment block at the bottom of the migration file.

62. **20261024195134_service_listings_price_unit** — Applied by the architect 2026-10-24 (recorded
    version; executable SQL MD5-verified against `schema_migrations`). (#60
    `public_profiles_revoke_writes` and #61 `suspension_enforcement` are recorded by their own PR;
    until it merges, the Verification query below lists those two as missing.) Adds
    `service_listings.price_unit text` + `service_listings_price_unit_check` (`fixed | hour | day |
    month`) for H6 step 3 « Unité » (Figma 459:18966, measured in `docs/design/h6-measurements.md`).
    « Par mois » replaces the frame's « Par projet » — founder ruling D13
    (`docs/design/h6-pr3-deltas.md`). Nullable, no default, no backfill: NULL = not stated, and all
    23 rows (21 live + 2 drafts) were NULL after apply; publish-required + backfill of the 21 is the
    PR-4 ruling. No GRANT/RLS change: table-level grants cover the new column; no view depends on the
    table; `search_vector` untouched. Rollback SQL is in a comment block at the bottom of the
    migration file.
63. **20261024215559_is_admin_requires_active** — Applied by the architect on 2026-10-24; the
    applied statements match this file with the same normalization as #61 (md5 3a05cd3f, 12
    lines). Found by the PR #183 review: `is_admin()` never read `profiles.suspended_at`, so a
    suspended admin kept every admin READ ("Admin reads all profiles": every account's email,
    phone, date_of_birth; the admin branches on orders, disputes, reports, data exports, deletion
    requests, moderation; the verifications bucket) for its token's lifetime, and indefinitely
    whenever its auth ban was missing. Migration 61 already refused its writes; this applies D2 to
    reads, at the gate. `is_admin()` now also requires `suspended_at is null`; LANGUAGE sql, STABLE,
    SECURITY DEFINER, `search_path 'public'`, owner and EXECUTE grants are unchanged (verified after
    apply). 25 policies (1 on `storage.objects`) and 17 functions call it; for an active admin the
    result is unchanged (1 admin, 0 suspended at apply). A suspended admin now gets `Forbidden: admin
    access required` from every admin RPC, `admin_unsuspend_user` on themselves included, and loses
    every admin read. Same PR: `checkAdmin` (`src/lib/auth/require-admin.ts`) rejects a suspended
    admin too. Verified by `src/__tests__/suspension-enforcement.test.ts` (suspended admin: RPCs
    Forbidden, no cross-account profile read; active admin: both work) and `require-admin.test.ts`.
    Rollback SQL is in a comment block at the bottom of the migration file.

64. **20261024215730_service_listings_publish_gate** — Applied by the architect 2026-10-24 (recorded
    version; executable SQL MD5-verified against `schema_migrations`, comments stripped). (#63
    `20261024215559_is_admin_requires_active` is recorded by its own PR; until it merges, the
    Verification query below lists it as missing.) H6 PR-4 « Publier mon service » — G8, rulings
    D30a/D30b in `docs/design/h6-pr4-deltas.md` §3. Adds the pure helper
    `service_listing_publish_problems(service_listings) → text[]` (failing column names under the G4
    publish rules: title 10–80, category + subcategory, tags 1–5 × 1–50, short_description 1–160,
    description 100–2000, price > 0, price_unit, deliverables 3–8 × 5–150, delivery_mode; lengths =
    `char_length` of the btrim'd value) and the BEFORE INSERT/UPDATE trigger
    `trg_service_publish_requirements` (SECURITY DEFINER, `search_path ''`): skipped when
    `auth.uid()` is null (service role, migrations, live-DB fixtures) or the new status is `draft`;
    a non-draft INSERT or a row leaving draft must pass whole; a non-draft → non-draft UPDATE must
    leave every column it CHANGES valid — so the 21 pre-H6 listings (all failing the rules) keep
    pause/unpause and admin unhide. Raises 23514 with hint `service_publish_requirements` and
    detail = failing columns. EXECUTE revoked from public/anon/authenticated on both functions.
    Verified after apply (architect): draft `263c5565` → `[]`; the 21 legacy rows fail the rules and
    stay pause/unpause-able. No table, column, RLS or grant change; `search_vector` untouched.
    Rollback SQL is in a comment block at the bottom of the migration file.

65. **20261025213214_prelaunch_shop_read_rls** — Applied by the architect 2026-10-25 (recorded
    version; executable SQL MD5-verified against `schema_migrations`, comments and whitespace
    stripped: `1de51e23`). Verified after apply (architect): anon counts exactly as predicted
    (products 25, product_images 32, shops 1, shop_payment_methods 1, shop_categories 3, job_posts 5,
    job_post_skills 2); the products → shops → product_images join as anon returns 32 rows (no
    42P17); production `/marche/produits` still renders 12 product links on page 1. Pre-launch security batch PR-1
    (item A; architect decisions 3–6, 2026-10-25; discovery in
    `docs/design/prelaunch-security-batch-discovery.md` §2). The six SELECT policies that were still
    `using (true)` for PUBLIC are replaced, same shape as #52 on `service_listings`. **`shops`:**
    readable when `admin_hidden_at is null`, by the owner, by an admin, or by a buyer who ordered a
    product from that owner (keyed on `orders.seller_id`, never through `products`, so no
    recursion). **`products`:** readable when `status = 'active'`, not moderated **and its shop not
    moderated** (`admin_hide_content('shop')` leaves products active), by the owner, by an admin, or
    by the buyer of an order on it (not gated on moderation, as #52 D1: `order-detail.ts` /
    `my-data.ts` render the live title and image). **`product_images`, `shop_payment_methods`,
    `shop_categories`, `job_post_skills`:** delegate to their parent's policy with a bare `EXISTS`,
    so they inherit every branch. **`job_posts`:** "Open posts or own posts readable" keeps its name
    and gains `admin_hidden_at is null` on the open branch, closing the moderated-open-post read
    (the "refuse responses on a moderated post" half of that follow-up is not in this migration).
    Helper calls are wrapped `(select …)`. The buyer branches cannot be minted: #54 refuses an order
    on a non-live item. They read `orders` as the caller, so anon must keep SELECT on `orders`. Apply
    took 1 product (status hidden) and its 1 image out of public reach; 0 shops, payment methods,
    shop categories, job posts or skills. Every public read path
    already applied the same filters in code, so none changes; a freelancer whose responded-to post
    is later moderated now gets it as null in `freelancer-dashboard.ts`'s activity feed, the same
    already-handled path as a filled post. Write policies, grants and columns are untouched. Verified by
    `src/__tests__/prelaunch-shop-read-rls.test.ts` (live-DB). Rollback SQL is in a comment block at
    the bottom of the migration file.

66. **20261025222218_order_lifecycle_columns** — Applied by the architect 2026-10-25 (recorded
    version; executable SQL MD5-verified against `schema_migrations`, comments and whitespace
    stripped: `5a58f236`). Pre-checked by the architect with a buyer JWT in a rolled-back
    transaction: a client `received_at` of 2000-01-01 was discarded for `now()`, and a
    `cancellation_reason` rewrite was refused 42501. Admin behaviour approved. Pre-launch security batch PR-3
    item E1 (architect decisions 12–13, 2026-10-25; prioritised ahead of PR-2 so H8 PR-2 #191 can
    stop the browser writes). Adds `enforce_order_lifecycle_columns()` (SECURITY DEFINER,
    `search_path ''`, EXECUTE revoked from public/anon/authenticated) and
    `trg_enforce_order_lifecycle_columns` (BEFORE INSERT OR UPDATE on `orders`). For callers with a
    JWT — admins included — `received_at` is `now()` on the transition into
    `received` and on an INSERT at `received`, and otherwise keeps its OLD value (a client value is
    discarded, not refused); `cancelled_by` / `cancellation_reason` may change only inside the
    transition into `cancelled`, else 42501 « Les informations d'annulation ne peuvent pas être
    modifiées. ». Callers without a JWT (service role, migrations, fixtures) keep explicit values,
    but an order INSERTED at `received` with none is still stamped (the trigger's UPDATE-side
    stamp for them is defensive only: `check_order_status_transition` refuses any status change
    without a JWT). **Caveat (post-apply review):** an admin who is a *party* to an order passes
    `check_order_status_transition`'s admin override, so they can leave a terminal state and
    re-enter a transition (restamping `received_at`, rewriting cancel metadata), and can INSERT at
    `cancelled` with any cancel columns; logged in `docs/follow-ups.md`. Fires after
    `trg_check_order_status_transition` and before `trg_set_cancelled_at_on_transition`; no existing
    function or grant changes. No backfill: the one seeded `received` order with a NULL
    `received_at` stays NULL. E2 (revoke `UPDATE (received_at)` from authenticated) follows once H8
    PR-2 has shipped. Verified by `src/__tests__/orders-lifecycle-columns.test.ts` (live-DB).
    Rollback SQL is in a comment block at the bottom of the migration file.
67. **20261026173800_job_posts_response_count** — Applied by the architect 2026-10-26 (recorded
    version; executable SQL MD5-verified against `schema_migrations`, comments and whitespace
    stripped: `092e59eb`). Post-apply checks (architect): authenticated holds column-level INSERT on
    10 `job_posts` columns and UPDATE on 9, anon none; 0 `response_count` mismatches; a real post
    owner's JWT (rolled back) was refused 42501 on `created_at` and allowed on `title`. Missions M-A,
    gaps G3 + G9 (`docs/design/h9-h13-measurements.md` §6.4 on `feat/h9-missions`; decisions 1–7
    approved 2026-10-26); unblocks H9 PR-1. Adds `job_posts.response_count` (integer NOT NULL
    DEFAULT 0, `job_posts_response_count_nonnegative` CHECK ≥ 0, backfilled on the 3 posts with
    responses) kept by `sync_job_post_response_count()` (SECURITY DEFINER, `search_path ''`, EXECUTE
    revoked from public/anon/authenticated) via `trg_sync_job_post_response_count` (AFTER INSERT /
    DELETE / UPDATE OF `job_post_id` on `job_responses`, ±1 — never a recount, which loses updates
    under concurrency); index `job_posts_status_response_count_idx (status, response_count)`. Write
    lock = column grants (the `orders` pattern): table-level INSERT / UPDATE revoked from anon and
    authenticated; authenticated gets back INSERT on createAnnonce's 10 columns and UPDATE on the 9
    content / status columns, so `id`, `created_at`, `updated_at`, `response_count`,
    `admin_hidden_*` (and `consumer_id` on UPDATE) fail any client statement that names them with
    42501, admins included; moderation RPCs are SECURITY DEFINER, unaffected. Every response bumps
    the post's `updated_at` (decision 3; nothing reads it today). **The lock holds only while
    nothing re-grants table-level INSERT / UPDATE on `job_posts` — the security PR-2 grant sweep
    must not.** anon DELETE on `job_posts` is left to that sweep. No existing function, trigger or
    policy changes. Verified by `src/__tests__/job-posts-response-count.test.ts` (live-DB).
    Rollback SQL (restores anon's table-level INSERT / UPDATE too) is at the bottom of the file.
68. **20261026190353_prelaunch_acl_hardening** — Applied by the architect 2026-10-26 (recorded
    version; executable SQL MD5-verified against `schema_migrations`, comments and whitespace
    stripped: `b2345be4`). Pre-launch security batch PR-2, items B + C + D
    (`docs/design/prelaunch-security-batch-discovery.md` §3–5; decisions 2 and 7–11, 2026-10-25,
    plus P2-1 and P2-2, 2026-10-26). **B:** EXECUTE revoked from public/anon/authenticated on the
    24 trigger / event-trigger functions and `freelancer_has_active_listing` (trigger firing does not
    check EXECUTE); the six `is_admin()`-gated admin RPCs revoked from public/anon and granted
    explicitly to authenticated; `search_path ''` on `handle_updated_at` and
    `set_cancelled_at_on_transition`; `f_unaccent` re-created with a qualified body
    (`public.unaccent('public.unaccent'::regdictionary, $1)`, `search_path ''`, same result). Kept:
    `is_admin`, `get_contact_phone`, `get_completed_service_order_count`, `f_unaccent`/`unaccent*`
    (anon + authenticated), `is_active_user` (authenticated). **C:** `data_exports` /
    `deletion_requests` — INSERT only `(user_id)` / `(user_id, reason)`, UPDATE only the processing
    columns, for authenticated; nothing for anon. **D:** TRUNCATE / REFERENCES / TRIGGER / MAINTAIN
    revoked from anon and authenticated on every table and view; every anon INSERT / UPDATE / DELETE
    revoked; authenticated's policy-less DELETE (admin_audit_log, data_exports, deletion_requests,
    disputes, orders, reports) and UPDATE (admin_audit_log, favorites, freelancer_skills,
    job_post_skills, product_images) revoked; anon SELECT revoked on `admin_audit_log` and `disputes`
    only (anon keeps SELECT on `orders`: PUBLIC policies read it as the caller). **D5 + P2-1:**
    default privileges for objects `postgres` creates in `public` — no TRUNCATE / REFERENCES /
    TRIGGER / MAINTAIN for anon or authenticated, no anon INSERT / UPDATE / DELETE, and no EXECUTE
    for public (global) / anon / authenticated. **So every new table needs explicit thought about
    anon writes (none by default) and every new RPC or policy helper needs an explicit
    `GRANT EXECUTE`** (rule recorded in the db-guardian skill). Post-apply checks (architect):
    function EXECUTE matrix as predicted; 0 TRUNCATE and 0 anon write grants; `f_unaccent('Élève à
    Sfax') = 'Eleve a Sfax'`; advisors 0028 = 3, 0029 = 10, 0011 = 0; production smoke on
    `/marche/services`, `/marche/produits`, `/recherche`. Signup (`handle_new_user` after the revoke)
    verified by CC with an admin-API createUser → full `profiles` row. Verified by
    `src/__tests__/prelaunch-acl-hardening.test.ts` (live-DB). Rollback (exact, from live ACL
    dumps) is at the bottom of the file.
69. **20261026195409_job_responses_proposal_fields** — Applied by the architect 2026-10-26 (recorded
    version; executable SQL MD5-verified against `schema_migrations`, comments and whitespace
    stripped: `1abad389`). Post-apply checks (architect): `job_response_skills` RLS on, 3 policies,
    authenticated SELECT / INSERT / DELETE only, anon none; no client EXECUTE on the 4 new or replaced
    functions; the 3 legacy short messages untouched; a freelancer JWT (rolled back) got
    `invalid_links` for a `javascript:` link, the message CHECK for 18 characters, and a valid
    proposal (250 TND, « 5 jours », a Behance link) moved `response_count` to 1. Missions M-C, gaps G4 +
    G5 + G7 (`docs/design/h9-h13-measurements.md` §6.4 on `feat/h9-missions`; MC-1 = 20-character
    floor, MC-2…MC-4 as recommended, 2026-10-26); unblocks H12 and the H11 « MA PROPOSITION » column.
    **G4:** `job_responses` gains `proposed_price_tnd` numeric(10,2), `proposed_timeframe`,
    `portfolio_links` jsonb NOT NULL DEFAULT `'[]'`; per-link rules (http(s) only, url ≤ 500, label ≤ 60,
    keys `url` / `label` only, no duplicate url) in `enforce_job_response_fields()` (BEFORE INSERT /
    UPDATE OF portfolio_links, hint `invalid_links`). New table `job_response_skills` (RLS: responder
    inserts / deletes on their own response, readable with the response; authenticated SELECT /
    INSERT / DELETE, no anon; `trg_enforce_active_user`; at most 8 per response via
    `enforce_job_response_skills_limit()`, hint `too_many_skills`). **Constraint names H12 maps**
    (23514 unless noted): `job_responses_proposal_message_length` (20–1000 after trim, NOT VALID: the 3
    legacy rows of 3–12 characters stay, but any later write of them is checked),
    `job_responses_proposed_price_range` (0 ≤ x < 1 000 000), `job_responses_proposed_timeframe_length`
    (1–60), `job_responses_portfolio_links_shape` (array of ≤ 3), `job_response_skills_skill_length`
    (1–60), unique index `job_response_skills_unique_skill` (23505, case-insensitive). **G5 + G7 +
    races:** `check_job_response_limits()` (now `search_path ''`) keeps every French message and adds
    HINT codes `job_not_found` (23503), `job_unavailable` (moderated post — refused, and no longer
    counted toward the 5-active cap), `job_filled`, `job_deleted`, `job_expired` (stored status or
    > 30 days), `job_closed` (unreachable today — `job_posts.status` allows only open / filled / expired /
    deleted — reserved for a future status), `own_post` (42501), `duplicate` (23505), `job_full`, `cap_active`; it locks
    the post FOR UPDATE (the 10-cap reads the committed `response_count`) and takes a per-freelancer
    advisory lock (the 5-cap), post lock first for every caller. `enforce_job_responder_capability()`:
    same body, hints `not_self`, `not_freelancer`, `under_18`, `suspended` (shadowed for JWT callers
    by `trg_enforce_active_user`'s « Ce compte est suspendu. », MC-4), `no_freelancer_profile`,
    `profile_hidden`. Verified by `src/__tests__/job-responses-proposal-fields.test.ts` (live-DB,
    including both cap races). Rollback (in the file) drops the new columns and table — **lossy once
    H12 has written proposals**.

70. **20261026200934_job_posts_responder_read** — Applied by the architect 2026-10-26 (recorded
    version; executable SQL MD5-verified against `schema_migrations`, comments and whitespace
    stripped: `48594c5b`). Post-apply checks (architect): `has_responded` EXECUTE anon f /
    authenticated t; in a rolled-back block on a live post set to `filled`, the responder read the
    post and their response, another freelancer 0, the post owner read the response (no 42P17), anon
    0. Missions M-B, gap G2 (`docs/design/h9-h13-measurements.md` §6.4 on `feat/h9-missions`, D3;
    M-B-1 approved 2026-10-26: deleted and moderated posts stay hidden, filled and expired become
    readable); unblocks H11's « Fermées » tab, H13's refresh after a post closes and the dashboard's
    « Activité récente » titles. Adds `has_responded(p_job_post_id uuid)` (SQL, STABLE, SECURITY
    DEFINER, `search_path ''`; answers only about the caller's own responses) — EXECUTE revoked from
    public / anon and **granted to authenticated** (P2-2: a policy helper is checked with the caller's
    EXECUTE) — and the `job_posts` SELECT policy « Responders read the posts they answered » **TO
    authenticated**: `status <> 'deleted' and admin_hidden_at is null and has_responded(id)`. The
    helper reads `job_responses` as its owner, so the policy cannot recurse through `job_responses`'
    own post-owner branch. `job_post_skills` follows `job_posts` (EXISTS). No write path changes;
    advisor 0029 = 11 by design. Verified by `src/__tests__/job-posts-responder-read.test.ts`
    (live-DB). Rollback (drop the policy, then the function) is at the bottom of the file.
71. **20261026205458_storage_upload_provenance** — Applied by the architect 2026-10-26 (recorded
    version; executable SQL MD5-verified against `schema_migrations`, comments and whitespace
    stripped: `27ff7345`). Post-apply checks (architect): the helper returns `u/x.webp` for this
    project's URL (query dropped) and NULL for a foreign host or the wrong bucket; 0 existing avatars /
    shop assets / product images fail; a freelancer JWT (rolled back) got 42501 `unverified_upload`
    for a foreign-host avatar and for an own-folder URL without provenance, and NULL passed. Closes the
    column side of « storage provenance missing for avatars and shop assets » (decisions S-1 no
    bypass, S-2 host anchored, 2026-10-26). Adds `storage_public_object_path(url, bucket)` (SQL,
    IMMUTABLE, no client EXECUTE): the object path only when `url` is exactly this project's public URL
    for `bucket`. New triggers `trg_enforce_avatar_provenance` (BEFORE INSERT / UPDATE OF `avatar_url`
    on `profiles`) and `trg_enforce_shop_asset_provenance` (BEFORE INSERT / UPDATE OF `logo_url`,
    `banner_url` on `shops`): a value must be NULL, unchanged, or a URL whose path has an
    `uploaded_objects` record in the right bucket owned by the row's owner — else 42501 « Cette image
    n'a pas été téléversée par Servyou. », HINT `unverified_upload`; no caller bypass (S-1).
    `enforce_product_image_provenance` / `enforce_portfolio_image_provenance` now extract the path with
    the same host-anchored helper (S-2); messages and owner logic unchanged. Raw bytes can still be PUT
    into one's own folder until S-3 (the next PR: uploads through the service role, client INSERT
    storage policies dropped), and no INSERT-guarded column can publish them — **except**
    `freelancer_portfolio_items.image_url` on UPDATE (its trigger is BEFORE INSERT only and the owner
    holds UPDATE; pre-existing; closed by #73). **The host is hard-coded**
    (`xggomcitqrkaylqezjjz.supabase.co`): a custom domain or another project needs the helper redefined. The 5 orphan objects stay (S-4: the
    pre-launch orphan sweep). Note: a provider avatar URL (Google OAuth, if re-enabled) is refused by
    the trigger — it must go through upload + provenance. Verified by
    `src/__tests__/storage-upload-provenance.test.ts` (live-DB). Rollback is at the bottom of the file.
72. **20261026212216_job_response_links_limit_first** — Applied by the architect 2026-10-26 (recorded
    version; executable SQL MD5-verified against `schema_migrations`, comments and whitespace
    stripped: `fd683717`). Post-apply checks (architect, rolled back, freelancer JWT): BEFORE trigger
    order on `job_responses` = `trg_check_job_responder_capability` > `trg_check_job_response_fields` >
    `trg_check_job_response_limits`; 5 000 links → 23514 naming `job_responses_portfolio_links_shape`
    in 4 ms; a `javascript:` link → `invalid_links`. M-C hardening (Sonnet review of #204): the per-link
    loop ran after the post lock and before the 3-link CHECK, so an oversized `portfolio_links` array
    held the post's row lock for O(n²) work. `trg_enforce_job_response_fields` is renamed
    `trg_check_job_response_fields` (fires before the limits trigger takes any lock), and
    `enforce_job_response_fields()` refuses a non-array or more than 3 links up front with the CHECK's
    own error (23514, same message), so H12's mapping is unchanged. Verified by
    `src/__tests__/job-responses-proposal-fields.test.ts` (live-DB). Rollback at the bottom of the file.
73. **20261026212227_portfolio_image_update_provenance** — Applied by the architect 2026-10-26
    (recorded version; MD5 as above: `502081a0`). Post-apply check (architect): the trigger is
    `BEFORE INSERT OR UPDATE OF image_url`. Closes the gap the Sonnet review of #206 found in #71:
    `trg_enforce_portfolio_image_provenance` was BEFORE INSERT only while the owner holds UPDATE, so
    `image_url` could be PATCHed to an unrecorded or foreign URL. The trigger now also fires on
    UPDATE OF `image_url`; an unchanged value passes on its own (the avatar / shop rule). Function body
    otherwise identical to #71's. Verified by `src/__tests__/storage-upload-provenance.test.ts`
    (live-DB). Rollback at the bottom of the file.
74. **20261026222408_storage_drop_client_inserts** — Applied by the architect 2026-10-26, **after**
    PR #208 (S-3: the five upload actions write through the service role) was merged and its production
    deploy was READY (`dpl_F3TPrscFedQuVwxw2B8HAP6uRJdC`, sha `9096331`). Recorded version; executable
    SQL MD5-verified against `schema_migrations`, comments and whitespace stripped: `a68ef8e2`.
    Post-apply check (architect): the only INSERT policies left on `storage.objects` are the restrictive
    « Suspended accounts cannot upload » and « verifications: owner uploads own document ». Drops the
    four permissive client INSERT policies on `avatars`, `portfolio-media`, `shop-assets` and
    `product-images` (decision S-3, 2026-10-26): a signed-in user can no longer PUT raw bytes into those
    buckets; only the service role writes there, through the upload actions after `normalize.ts`,
    ownership re-derivation and the active-caller check (`src/lib/images/upload-guard.ts`). Owner read /
    delete policies, the restrictive suspension policies, buckets and the verifications policy are
    unchanged; no type change. Verified by `src/__tests__/storage-uploads-service-role.test.ts`
    (live-DB) plus a production upload smoke. Rollback (the four policies' exact definitions) is at the
    bottom of the file.

75. **20261027195820_moderated_freelancer_read_rls** — Applied by the architect 2026-10-27 (recorded
    version; executable SQL MD5-verified against `schema_migrations`, comments and whitespace
    stripped: `28621aa3`). Post-apply proof (architect, rolled back, real `admin_hide_content` with an
    admin JWT): a published freelancer with 2 live listings → anon reads profile 0 / listings 0 /
    skills 0; anon still reads the 19 other live listings; `service_listings ⋈ freelancer_profiles ⋈
    freelancer_skills` as anon returns no 42P17; the owner still reads both listings. Follow-up from
    PR #192's discovery (MEDIUM): `admin_hide_content('freelancer_profile')` stamps only
    `admin_hidden_at`, leaving `is_published` true and the listings active, so the profile, its 7 child
    tables and its listings stayed REST-readable. Same shape as #65. **`freelancer_profiles`:**
    readable when published and not moderated, by the owner, by an admin, or by a buyer with a service
    order from that freelancer (keyed on `orders.seller_id`, never through `service_listings`). **The
    policy name is truncated to 63 characters live** (« Freelancer profiles readable when live, or
    by owner, buyer, or » — trailing space included); the file's statements use the full name, which
    Postgres truncates identically. **`service_listings`:** same name as #52; the public branch also
    requires the profile not to be moderated (EXISTS under `freelancer_profiles`' own policy, so it
    also requires `is_published`). **The 7 children** (skills, tools, education, certifications,
    languages, links, portfolio items) keep their names and gain the `admin_hidden_at` conjunct on
    their public branch — an explicit cascade, **not** extended to buyers (decision 1). The optional
    poster → responder branch is **not** applied (decision 2): a moderated responder's headline and
    city come back null to the post author; name and proposal still render. The buyer branch cannot
    be minted by a non-admin: #54's liveness check includes `fp.admin_hidden_at`. Rows that changed
    visibility at apply: 0 (no profile was moderated). Write policies, grants, columns and functions
    untouched. Verified by `src/__tests__/moderated-freelancer-read-rls.test.ts` (live-DB). Rollback
    SQL is in a comment block at the bottom of the file.

76. **20261027203831_job_posts_write_guards** — Applied by the architect 2026-10-27 (recorded
    version; executable SQL MD5-verified against `schema_migrations`, comments and whitespace
    stripped: `04ccda44`). Post-apply proof (architect, rolled back, on a live post with
    `response_count` 1): owner budget edit → 42501 `content_locked`; owner → `expired` → 42501
    `invalid_transition`; open → filled → open passes; the responder's withdrawal while open → 1 row;
    `check_order_status_transition` no longer contains `is_admin()` and keeps its messages and arrows.
    Founder decisions 4–8, 9a and 10 (2026-10-27). JWT callers only (admins included); no-JWT callers
    bypass; no row rewritten. **`job_posts`:** `enforce_job_post_writes()` + `trg_enforce_job_post_writes`
    (BEFORE INSERT OR UPDATE): INSERT only at `open` (42501 `invalid_status`); `deleted` is terminal
    (42501 `job_deleted`); open / filled / expired → deleted always; open ↔ filled only while
    `created_at` is within 30 days (23514 `job_expired`); anything into or out of `expired` 42501
    `invalid_transition`; once `response_count > 0` the 8 content columns are frozen (42501
    `content_locked`). **`job_post_skills`:** `enforce_job_post_skills_lock()` + trigger (BEFORE INSERT OR
    DELETE): `content_locked` once the post has a response; a cascade from a post delete passes (parent
    already gone). **`job_responses`:** DELETE policy « Freelancer withdraws own response while the post
    is open » TO authenticated — own response, post open, not moderated, within 30 days (the rule of H11
    « Retirer », PR #211); otherwise a silent 0-row DELETE. Replaced « Freelancer deletes own response ».
    **`orders` (9a):** `check_order_status_transition` re-created **by a DO block** from
    `pg_get_functiondef()` with only the « Admin override » block removed (it raises if the live text
    differs), so every other byte is unchanged; an admin who is a party now follows the normal chain, and
    no status data-fix path remains. **`orders` (10):** `enforce_order_lifecycle_columns` — on a JWT INSERT
    not at `cancelled` the cancel columns are discarded; at `cancelled`, `cancelled_at` is `now()`. Both
    new functions: SECURITY DEFINER, `search_path ''`, no client EXECUTE. Live at apply: 4 posts became
    content-locked; 5 open posts older than 30 days can now only be deleted; 3 of 4 responses are no
    longer withdrawable. **Not covered (logged):** a consumer can still hard-DELETE an answered post
    (« Consumer deletes own post »), cascading its responses away; a responder can still edit
    `job_response_skills` after the post closes; **a JWT admin still skips #54's tier 2 on INSERT** (an
    admin buyer can insert at `received` / `arrived`, or at `cancelled` with `cancelled_by = 'seller'` —
    only the cancel columns are normalised); the skills lock reads `response_count` without a row lock
    (a skill write racing an uncommitted response can slip through). No type change. Verified by
    `src/__tests__/job-posts-write-guards.test.ts` (live-DB). Rollback at the bottom of the file.

77. **20261027211851_job_posts_no_hard_delete** — Applied by the architect 2026-10-27 (recorded
    version; executable SQL MD5-verified against `schema_migrations`, comments and whitespace
    stripped: `1f8d2c44`). Post-apply proof (architect, rolled back, as the poster of a live post): hard
    DELETE → 42501; UPDATE `status = 'deleted'` → 1 row. Founder decision B (2026-10-27) on #76's
    decision 11: a client hard DELETE of an answered post cascaded away every freelancer's proposal,
    bypassing #76's soft-delete rules. Drops the policy « Consumer deletes own post » and revokes DELETE
    on `job_posts` from authenticated, so every client delete goes through `status = 'deleted'` and is
    refused with 42501 « permission denied for table job_posts » (privilege, before RLS). Unchanged: soft
    delete (`deleteMissionAction`); the FK cascade path (account deletion → profiles → job_posts →
    job_responses / job_post_skills runs as referential actions, which check neither the caller's grants
    nor RLS); the service role's DELETE (admin data fixes, fixtures). anon already held none (#68).
    Rows touched: 0. No type change. Verified by `src/__tests__/job-posts-write-guards.test.ts`,
    `job-posts-response-count.test.ts` and `suspension-enforcement.test.ts` (live-DB). Rollback (grant +
    policy) is at the bottom of the file.
78. **20261027215609_profiles_email_sync** — Applied by the architect 2026-10-27 (recorded version;
    executable SQL MD5-verified against `schema_migrations`, comments and whitespace stripped:
    `e7d1d9a2`). Post-apply proof (architect, rolled back): a sign-in does not touch `profiles`; a
    confirmed change syncs; no client grants. `handle_new_user()` copied `auth.users.email` into
    `profiles.email` at signup only, so a confirmed email change (Secure email change is ON: the address
    waits in `email_change` until both links are confirmed) left `profiles.email` stale for the export
    modal, `/mon-compte` and the admin user pages. Adds `sync_profile_email()` (SECURITY DEFINER,
    `search_path ''`, EXECUTE revoked from public / anon / authenticated — trigger firing does not check
    EXECUTE) and `on_auth_user_email_changed` (AFTER UPDATE OF email on `auth.users`, WHEN the email
    actually changed — GoTrue rewrites the row on every sign-in). A NULL email is skipped
    (`profiles.email` is NOT NULL). The trigger runs in the auth server's transaction with no JWT, so
    every `profiles` BEFORE trigger takes its `auth.uid() is null` bypass. **Decision 1 (approved):** a
    `profiles_email_key` collision fails the email change itself, loudly — never a silent divergence. The
    Supabase-documented pattern; `postgres` holds TRIGGER on `auth.users` (owner `supabase_auth_admin`).
    No backfill (0 mismatches at discovery); no type change. Verified by
    `src/__tests__/profiles-email-sync.test.ts` (live-DB). Rollback at the bottom of the file.

Migrations 79–86 are the security follow-ups batch (`fix/security-followups-batch`, 2026-10-28). The open
DB-side findings were re-verified live (read-only), each fix was written as a PENDING file with a red live
suite, and the architect applied all eight on 2026-10-28 and checked the grants and triggers. Each file's
executable SQL is MD5-verified against `schema_migrations` (comments and whitespace stripped; hash given
per entry). Founder rulings 1–4 (2026-10-28): wording approved; an admin inserts orders at `pending` only;
new columns on `freelancer_profiles` / `shops` / `disputes` need an explicit column GRANT (db-guardian
skill); the affected live suites are updated in the same PR. No row was rewritten and no type changed.
Migrations 79–85 are verified by `src/__tests__/security-followups-batch.test.ts` (live-DB; 14 red before
apply, all green after; the PR #222 review added the moderated, past-30-days and cascade cases for 79). 86 has
no live test. Rollback is at the bottom of each file. The files are byte-identical to what was applied, so
their header comments still name sibling files by their `PENDING_` names; read those as the recorded
`20261028…` names above.

79. **20261028194710_job_response_skills_open_post** (`d96b5747`) — closes « a responder can still add /
    remove `job_response_skills` after the post closes » (#76 Not covered) and M-C's « the 8-skill limit
    is checked before RLS ». Adds `enforce_job_response_skills_window()` (SECURITY DEFINER,
    `search_path ''`, no client EXECUTE) and `trg_check_job_response_skills_window` (BEFORE INSERT OR DELETE
    on `job_response_skills`).
    - JWT callers, admins included, must own the response (42501 `not_self`, « Vous ne pouvez modifier que
      vos propres propositions. »).
    - The post must be open, unmoderated and under 30 days old: #76's withdrawal predicate (42501
      `proposal_locked`).
    - The trigger name sorts before `trg_enforce_job_response_skills_limit`, so a non-responder never
      reaches the count.
    - A DELETE cascaded from a withdrawn response finds no parent and passes. No-JWT callers bypass.
    - `job-responses-proposal-fields.test.ts` now expects `not_self` on a foreign insert.
80. **20261028194712_orders_admin_insert_tier2** (`f81dd727`) — closes « a JWT admin can still INSERT an
    order at any status » (Sonnet review of #76). `enforce_order_insert_integrity` is re-created by a DO
    block from `pg_get_functiondef()`, with only the `is_admin()` early return removed (#76's 9a pattern;
    it raises if the block is not there exactly once).
    - A JWT admin now meets tier 2 like any client: `pending` with every lifecycle column NULL, a live item,
      and not their own item.
    - #76's JWT-INSERT branch of `enforce_order_lifecycle_columns` is now unreachable from a JWT; it stays
      as defence in depth.
    - `job-posts-write-guards.test.ts` and `orders-lifecycle-columns.test.ts` now expect the 42501.
81. **20261028194715_freelancer_profiles_column_grants** (`85fd4304`) — closes « `is_published` is
    owner-settable » and the `freelancer_profiles` half of « `admin_hidden_*` can be set on INSERT ».
    Table-level INSERT / UPDATE is revoked from authenticated, then column lists are re-granted.
    - INSERT: every column except `is_published`, `admin_hidden_at` and `admin_hidden_reason`.
    - UPDATE: every column except `is_published`. The marker lock trigger still refuses `admin_hidden_*` to
      non-admins.
    - `sync_freelancer_is_published`, `admin_hide_content` and `admin_unhide_content` are SECURITY DEFINER
      owned by `postgres`, so column grants do not affect them (checked live). JWT activation still syncs
      (`h5-service-status-cascade.test.ts`).
    - **New columns are not client-writable until granted.**
82. **20261028194717_shops_admin_marker_insert_grant** (`f2fda764`) — the `shops` half of the same LOW.
    Table-level INSERT is revoked from authenticated, and INSERT is re-granted on every column except
    `admin_hidden_at` and `admin_hidden_reason`. UPDATE stays table-level, guarded by the marker lock.
    **New columns are not client-insertable until granted.**
83. **20261028194719_disputes_insert_columns** (`830cdb02`) — closes the `disputes` half of « disputes,
    data_exports and deletion_requests accept admin fields on INSERT »; the other two were closed by #68 C.
    - Table-level INSERT is revoked, and INSERT is granted on (`order_id`, `created_by_role`, `reason`,
      `description`) only: exactly `createDispute`'s payload.
    - A party can no longer insert a dispute that is already `resolved` / `dismissed`, or one with an
      outcome, an admin note or a backdated `created_at`.
    - The admin UPDATE path (`admin/litiges`) is untouched.
84. **20261028194721_orders_received_at_revoke** (`afe6a44c`) — E2, owed since #66 and unblocked by #191.
    Column UPDATE on `received_at` is revoked from authenticated.
    - A client statement that names it is refused whole (42501 `permission denied for table orders`).
      Before, #66's trigger silently discarded the value.
    - The trigger stamp on the transition into `received` is unaffected. INSERT is unchanged (#66
      handles it).
    - `orders-lifecycle-columns.test.ts` is updated.
85. **20261028194726_seller_capability_fail_closed** (`ef4964b7`) — closes « migration 55 locks the
    target owner's profile row before RLS rejects a foreign write ».
    - `enforce_seller_capability()` now refuses a row whose owner is not the caller first (42501
      `not_self`, « Vous ne pouvez créer ce contenu qu'en votre propre nom. »), before its FOR SHARE read.
    - A JWT caller can no longer lock another account's profile, nor learn its seller type or mixed
      capability from the message.
    - Everything else in the body is byte-identical; `search_path` stays `public`.
    - It also covers an owner hand-off (UPDATE OF `owner_id` / `profile_id` to another account), which is
      now `not_self` too; `seller-capability-integrity.test.ts` is updated.
86. **20261028194729_job_post_skills_lock_for_share** (`1f47a3b9`) — closes « the skills lock can race a
    response » (Sonnet review of #76). `enforce_job_post_skills_lock()` now reads `response_count` FOR
    SHARE, so it waits for an in-flight response's transaction, which holds FOR UPDATE on the post. The
    rest of the body is byte-identical. There is no live test: a race against an uncommitted response
    cannot be staged through PostgREST. Verified by reading the definition.

Migrations 87–91 are the security follow-ups batch 2 (`fix/security-followups-batch-2`), founder rulings 5–9 of
2026-10-28. They were written as PENDING files with a red live suite, and the architect applied these five on
2026-10-28 and verified them. Each file's executable SQL is MD5-verified against `schema_migrations` (comments
and whitespace stripped; hash given per entry). Live at apply: 0 suspended accounts, 0 moderated rows, 0
duplicate shop owners. No row was rewritten and no type changed. Verified by
`src/__tests__/security-followups-batch-2.test.ts` (live-DB; the five blocks were red before apply and are green
after). Rollback is at the bottom of each file. Ruling 9's `public_profiles` change was rejected, and its file
was deleted unapplied.

87. **20261028201727_moderated_seller_no_delete** (`8c349a5e`) — ruling 5 (Option A) on « moderation is shed by
    deleting and re-creating the freelancer profile » (D4).
    - Adds `enforce_moderated_row_no_delete()` (SECURITY DEFINER, `search_path ''`, no client EXECUTE).
    - Adds `trg_enforce_moderated_row_no_delete`, BEFORE DELETE on `freelancer_profiles` and `shops`.
    - A JWT caller's DELETE of a row with `admin_hidden_at` set gets 42501 `moderated` (« Ce contenu est en cours
      de modération … »). Admins are included; no-JWT callers, including the account-deletion cascade, bypass.
88. **20261028201733_get_contact_phone_state_gate** (`9532ae46`) — ruling 6. `get_contact_phone(target)` now
    returns NULL when either party is suspended, on every branch.
    - Its two `job_responses` branches also require the post not moderated. The post's status is not checked:
      a filled post is the normal contact path.
    - It is checked at call time, so unlocks granted earlier are withdrawn too.
    - Reading your own phone is unchanged. The ACL is kept (anon + authenticated).
89. **20261028201741_orders_insert_counterparty_stock_timestamps** (`d149ef18`) — rulings 7 (orders half) and
    8 (D2 + D4), in one file because all three change the same function. `enforce_order_insert_integrity`
    tier 2 (JWT callers):
    - a suspended seller → 23514 « Cet article n'est plus disponible. » (the not-live message);
    - `tracks_stock` and `quantity > stock_count` → 23514 « Quantité supérieure au stock disponible. », hint
      `stock`. The product row is read FOR SHARE;
    - `created_at` / `updated_at` are set to `now()`.
    No-JWT callers keep tier 1 only.
90. **20261028201745_job_responses_suspended_poster** (`404606b4`) — ruling 7 (responses half).
    - `check_job_response_limits` is re-created by a guarded DO block, adding one check right after the
      moderation check: a JWT caller's response to a suspended poster's post gets 23514 « Cette annonce n'est
      plus ouverte. », hint `job_unavailable`.
    - Every other byte is unchanged.
91. **20261028201746_shops_one_per_owner** (`bcf0baa0`) — ruling 9 on « `shops.owner_id` is not unique ».
    - Adds the unique index `shops_owner_id_key` on `shops (owner_id)`, for every caller.
    - `createShopAction` maps its 23505 to `shop.create.error.already_owns` (« Vous avez déjà une boutique. »).
    - `shops_owner_idx` is now redundant and is kept.

Migrations 92–95 are the batch-2 follow-ups (#224, follow-up rulings 1, 3 and 5 of 2026-10-28). The architect
applied them on 2026-10-28, after #224 merged. Each file's executable SQL is MD5-verified against
`schema_migrations` (comments and whitespace stripped; hash given per entry).
- Post-apply check (architect, as anon): the marketplace counts are unchanged (25 products, 21 services, 1 shop,
  10 freelancers, 7 posts).
- Both technical choices are approved: the `private` schema, and the two-step reason split.
- `database.types.ts` is regenerated (only `get_moderation_reason` is new), and the admin page's rpc cast is
  removed.
- No row was rewritten. Verified by `src/__tests__/security-followups-batch-2.test.ts` (live-DB).
- The anon EXPLAIN plans for the marketplace reads are in the PR that recorded these. Rollback is at the bottom
  of each file.
- Step 2 of the reason split followed after #224 deployed: entry 96.

92. **20261028205338_get_moderation_reason_fn** (`3d0467c0`) — ruling 9, step 1. Adds
    `get_moderation_reason(target_type, target_id)`, which returns `admin_hidden_reason` to the row's owner
    or to an admin, else NULL (SECURITY DEFINER, `search_path ''`, STABLE). EXECUTE is granted to
    authenticated only. `admin/signalements/[id]` reads the note through it.
93. **20261028205341_moderated_item_no_delete** (`465de81c`) — ruling 5a. Extends #87's
    `trg_enforce_moderated_row_no_delete` to `products` and `service_listings`.
    - A JWT owner's DELETE of a moderated item gets 42501 `moderated`; the delete actions map the hint to
      `*.error_delete_moderated`.
    - A parent that holds a moderated item can't be deleted under a JWT either (the cascade runs under the
      same JWT). This is intended.
94. **20261028205344_job_responses_cap_excludes_suspended_poster** (`8d1cead9`) — ruling 5c.
    - `check_job_response_limits` is re-created by a guarded DO block. The 5-active count also requires the
      post's consumer not to be suspended, the same way the count already skips a moderated post.
    - Every other byte is unchanged.
95. **20261028205353_suspended_content_hidden** (`90f7893b`) — ruling 7, read half (Option A).
    - Adds `private.is_account_active(uuid)`, a SECURITY DEFINER policy helper in the new schema `private`.
      That schema isn't exposed by PostgREST, so the anon EXECUTE a policy helper needs is not also an RPC.
      USAGE and EXECUTE are granted to anon and authenticated.
    - The public branch of the 5 parent SELECT policies (shops, products, freelancer_profiles,
      service_listings, job_posts) now also requires the owning account to be active.
    - The owner, admin, past-buyer and responder branches are unchanged. Child tables follow their parent;
      `public_profiles` is unchanged.
96. **20261028205833_moderation_reason_column_revoke** (`9008d520`) — ruling 9, step 2. The architect applied
    it on 2026-10-28, after #224 (the app side) was merged and deployed and #92 was live.
    - Table-level SELECT on `shops`, `products`, `service_listings`, `freelancer_profiles` and `job_posts` is
      revoked from anon / authenticated.
    - SELECT is re-granted column by column: every column except `admin_hidden_reason`.
    - Row visibility (RLS) is unchanged. The owner and admins read the note through `get_moderation_reason()`.
    - A past buyer or anyone else can no longer read it.
    - **New columns on these five tables need an explicit SELECT grant** (db-guardian skill rule).
    - Verified by `security-followups-batch-2.test.ts`: every client select of the column gets 42501, and
      the rest of the row stays readable.

Migrations 97–98 store the e-mail notification preferences and add shop / freelancer favorites (#228; founder
brief and architect rulings 1–4 of 2026-10-28; Figma 558:38878, 720:62084, 720:62688). The architect applied
both on 2026-10-28.
- Each file's executable SQL is MD5-verified against `schema_migrations` (comments and whitespace stripped;
  hash given per entry).
- Post-apply check (architect, rolled back, as the owner of the existing favorites): still 2 favorites, and a
  shop favorite inserts.
- `database.types.ts` is regenerated: the `notification_preferences` table, plus `favorites.shop_id` /
  `freelancer_profile_id`.
- Verified by `src/__tests__/notification-prefs-favorites.test.ts` (live-DB; 13 red before apply, all green
  after).
- No row was rewritten. Rollback is at the bottom of each file.

97. **20261028221948_notification_preferences** (`05f9e1d0`) — a new table keyed on `profile_id` (→ profiles,
    ON DELETE CASCADE).
    - Five e-mail flags with defaults from Figma (ruling 1): `email_new_orders`, `email_proposals` and
      `email_reviews` default true; `email_low_stock` and `email_newsletter` default false. Plus `updated_at`.
    - « Alertes de sécurité » (always on) and « Notifications sur la plateforme » (Bientôt) are not stored.
    - **No row = all defaults.** The app upserts on first save; nothing is backfilled.
    - **RLS:** the owner can select, insert and update. No delete, no admin bypass, nothing for anon.
    - **Grants (P2-1):** every default grant is revoked, then:
      - SELECT on all columns;
      - INSERT and UPDATE on `profile_id` plus the five flags. `profile_id` is in UPDATE only because a
        PostgREST upsert sets every payload column; the WITH CHECK pins it to the caller.
    - `updated_at` is set by `handle_updated_at` on update and by its default on insert, never by a client.
    - `trg_enforce_active_user` is attached.
98. **20261028221956_favorites_shops_freelancers** (`c05d9735`) — favorites gains two target types.
    - `item_type` also accepts `shop` and `freelancer`, through `shop_id` (→ shops) and `freelancer_profile_id`
      (→ freelancer_profiles), both ON DELETE CASCADE.
    - `favorite_target_matches_type` requires exactly one of the four targets. UNIQUE per user per shop and per
      freelancer, plus a partial index on each new FK.
    - « Users read own favorites » now also requires the caller to be able to read the target, for all four
      types (rulings 2 + 3). A moderated, suspended or unpublished target is hidden, never deleted.
    - « Users insert own favorites » uses the same predicate as its WITH CHECK (ruling 4): you can't favorite
      what you can't see.
    - Delete and grants are unchanged. The 2 existing rows (services) passed the new CHECKs and stay readable.
99. **20261029183540_reports_anti_abuse** (`f34556a4`) — reports: one live report per reporter per target, 10 per
    24 h. Closes `docs/follow-ups/signaler-product-service-b3.md` item 1.
    - INSERT is column-granted to `reporter_id, target_type, target_id, reason, description` (decision 1). A client
      sending `status` / `admin_note` / `created_at` / `updated_at` / `id` gets 42501. `reports` joins the
      never-re-grant-table-level-INSERT list.
    - Partial unique index `reports_one_open_per_reporter_target` (status `open` / `under_review`): a duplicate
      fails 23505 (the app answers « Vous avez déjà signalé ce contenu »); resolving or dismissing frees the slot.
    - `enforce_report_rate_limit` (BEFORE INSERT, row): 10 reports per reporter per rolling 24 h, every status,
      no admin exception (decision 2), 23514 hint `rate_limited`, per-reporter advisory lock, service role bypass.
      A row filed in someone else's name skips the count and RLS refuses it (no quota leak). No client EXECUTE.
    - The recorded statement (MD5 above) carries a shorter header comment than this file; the executable SQL
      is identical (comment-stripped diff, 2026-10-29). 1 existing row (resolved), nothing rewritten.
100. **20261029201248_orders_rate_limit** (`befba692`) — orders: 5 pending per buyer per seller, 20 per buyer per
    24 h. Pre-launch security audit pass 1 finding 2.
    - `enforce_order_rate_limit` (`trg_limit_orders`, BEFORE INSERT, row) refuses 23514 with hint
      `order_cap_seller` / `order_cap_daily` (checked in that order). It runs after
      `trg_enforce_order_insert_integrity` (trigger name order), so it counts the item's real seller. A
      client-supplied `seller_id` cannot dodge it.
    - No grant change: migration 54's trigger already pins `status` / `created_at` / `seller_id`.
    - Service role bypass; a spoofed `buyer_id` is not counted and is left to RLS; per-buyer advisory lock.
    - App: `demander.error.cap_*` (FR + AR). 16 existing orders, nothing rewritten.
101. **20261029201254_job_posts_cap** (`e33147c5`) — job_posts: 5 open per consumer, 10 created per 24 h.
    Pre-launch security audit pass 1 finding 3.
    - `enforce_job_post_cap` (`trg_limit_job_posts`, BEFORE INSERT OR UPDATE OF status, row) runs on an insert and
      on a move to `open` (« Rouvrir »). It refuses 23514 with hint `job_post_cap_open`; an insert can also get
      `job_post_cap_daily`.
    - « Open » = status `open` within the 30-day life. Moderated posts count (decision 2, approved): the owner can
      still soft-delete one.
    - Service role bypass; a spoofed `consumer_id` is left to RLS; per-consumer advisory lock.
    - App: `annonce.error.cap_*` (FR + AR). 8 existing posts, nothing rewritten.
    - For both 100 and 101: the recorded statements (MD5 above) carry shorter header comments. The executable SQL
      is identical (comment-stripped MD5 match, 2026-10-29).
102. **20261029204433_orders_buyer_cancel_product_only** (`9e21a06d`) — a BUYER cannot cancel a SERVICE order. Founder
    ruling E4 (#233), whose `cancelOrderAction` already refused it in the app.
    - `enforce_buyer_cancel_product_only` (`trg_enforce_buyer_cancel_product_only`, BEFORE UPDATE OF status, row)
      refuses the buyer moving a service order to `cancelled`: 42501, hint `buyer_cancel_service`, the action's
      wording. This closes the direct PATCH and the browser-side `CancelOrderModal` write.
    - It fires after `trg_check_order_status_transition`, so the existing errors keep precedence. A forged
      `cancelled_by` or a missing reason after acceptance is still refused by that trigger first.
    - Unchanged: the seller's cancel, the buyer's cancel of a product order, the other transitions, service role.
      No `is_admin()` exception. `check_order_status_transition` itself is untouched.
    - 2 service orders already cancelled by their buyer are terminal and not rewritten.
103. **20261029204435_notification_prefs_missions_column** (`e07ec202`) — `notification_preferences` gains
    `email_missions_matching boolean not null default true` (B5 decision D2).
    - SELECT / INSERT / UPDATE are column-granted to authenticated, like its five siblings. Without the grant, the
      app's upsert naming it would fail 42501 (migration 68).
    - RLS and the table ACL are unchanged. 0 rows at apply.
    - For both 102 and 103: shorter header comments in the recorded statements, identical executable SQL
      (comment-stripped MD5 match, 2026-10-29).
104. **20261030100604_storage_verifications_drop_client_insert** (`ea5bc8ee`) — S1: drops « verifications: owner
    uploads own document », the last permissive client INSERT policy on `storage.objects`.
    - Identity verification is not built and nothing writes to the private bucket (0 objects at apply). Re-add a
      writer when it ships; the file's rollback block holds the exact policy.
    - Every bucket is now service-role write only (the four public ones since 74). The owner / admin read policy on
      verifications stays.
    - The RESTRICTIVE « Suspended accounts cannot upload » stays (approved) but is unobservable while no permissive
      client INSERT exists; `suspension-enforcement.test.ts` pins the active control as refused until then.
    - The recorded statement carries a shorter header comment. The executable SQL is identical.
105. **20261030202059_image_count_caps** (`080411fd`) — upload COUNT caps in the database (architect's final ruling,
    2026-10-30): at most 8 `product_images` per product (`trg_limit_product_images`, BEFORE INSERT) and 6
    `freelancer_portfolio_items` per freelancer profile (`trg_limit_portfolio_items`, BEFORE INSERT or UPDATE OF
    `freelancer_profile_id`).
    - Same shape as 101: SECURITY DEFINER, empty search_path, a per-parent advisory lock, 23514 + hint
      (`product_images_cap` / `portfolio_items_cap`) that the app maps to its FR / AR « limite atteinte » message.
      The service role is not capped.
    - At apply: fullest product 5 images, 0 portfolio items; nothing existing rejected or rewritten.
    - Portfolio uploads are not count-refused (the editor removes then adds before saving); the cap holds at save
      and in the UI. Approved deviation, recorded in `docs/follow-ups/upload-hardening.md`.
    - The recorded statement carries no comments. The executable SQL is identical.
106. **20261030221121_freelancer_url_scheme_checks** (`cab01e96`) — http(s)-only CHECKs (architect's ruling,
    2026-10-30) on the five freelancer link columns rendered as `href` on D4: `freelancer_profiles.portfolio_link`,
    `freelancer_links.url`, `freelancer_portfolio_items.url` / `image_url`, `freelancer_certifications.credential_url`.
    - `^https?://` case-insensitive, NULL allowed, '' refused (the app writes NULL for an empty URL). Binds every
      writer, the service role included; closes the owner's direct REST write that HTTP_URL did not cover.
    - 0 rows in all five at apply; all five constraints validated.
    - `image_url`: the provenance trigger (BEFORE) already refuses anything but this project's portfolio-media URLs
      with an upload record, so its CHECK is an unreachable backstop, kept as ruled.
    - The recorded statement carries no comments. The executable SQL is identical.
107. **20261030231152_fail_closed_default_privileges** (`c79fcc37`) — fail-closed defaults (architect's ruling,
    2026-10-30): `alter default privileges for role postgres in schema public revoke insert, update, delete on tables
    from anon, authenticated`. A table or view postgres creates from now on gets SELECT only for clients; a write
    privilege exists only where a migration GRANTs it. Closes the « new or re-created view is writable » class
    (migration 60).
    - Existing grants untouched: fingerprint `9a02c52fe952050942c6b53e53b2a3cc` / 151 entries before and after.
    - Verified at apply: default ACL `postgres=arwdDxtm anon=r authenticated=r service_role=arwdDxtm`; a probe table
      and view (rolled back) got anon / authenticated SELECT only.
    - Residual: supabase_admin's own defaults in public (platform-created objects), logged in
      `docs/follow-ups/fail-closed-default-privileges.md`.
108. **20261031173228_client_write_grants_rpc** (`84839e6c`) — `public.client_write_grants()`, the live half of
    the client-write allow-list check (architect's CI decision, 2026-10-30). Returns every INSERT / UPDATE /
    DELETE privilege anon, authenticated or PUBLIC holds on a relation in public, table-level (`column_name` NULL)
    and column-level.
    - Read-only (`stable`, catalog only), SECURITY DEFINER, `search_path = ''`, every object schema-qualified.
      EXECUTE revoked from public / anon / authenticated, granted to service_role only: the grant map describes
      the attack surface.
    - At apply: 159 rows, all for authenticated, equal to `db/client-write-allowlist.json`.
    - `client-write-grants-live.test.ts` compares it with the allow-list both ways; the static half
      (`client-write-grants-static.test.ts`) runs in CI on every PR.
    - The recorded statement carries no comments. The executable SQL is identical.
111. **20261031211307_password_change_attempts** (`891e699e`) — `public.password_change_attempts`, the per-account
    limit on wrong current passwords in Mon compte's password change: at most 5 per 15 minutes (pre-beta review M1,
    founder + architect decision 2026-11-01).
    - Service-role only: RLS on with no policy, every client privilege revoked (including the default SELECT new
      tables get since 107); the client-write allow-list is untouched.
    - The app (`src/lib/auth/password-attempts.ts`) inserts the attempt first, then counts the window, so concurrent
      attempts see each other; over the limit its row is removed again. Only a wrong current password keeps its row.
      Rows older than a day are pruned on each insert (indexed on `attempted_at`).
    - The recorded statement carries no top-level comments. The executable SQL is identical.

## Rollback paths

Each migration in this folder represents work that has already been applied to production. Rollback is therefore reverse migration work, not file deletion. If a rollback is ever needed, write a new dated migration that reverses the relevant changes — never delete history from this folder.

For reference, the inverse SQL for migrations 13 and 14 (the most recent two) is documented in the PR descriptions of the PRs that introduced them.

## Verification

Three files carry hand-written timestamps that do **not** match the version Supabase recorded at apply time. The SQL content of each is correct — only the filename version differs:

| File in this folder | Version in `schema_migrations` |
|---|---|
| `20260615103000_create_deletion_requests.sql` | `20260615124837` |
| `20260615150000_create_data_exports.sql` | `20260615132434` |
| `20260625000000_service_listings_add_world_class_fields.sql` | `20260624230631` |

Renaming them would make a naive check pass, but it rewrites artifacts of already-merged PRs to satisfy a query — the wrong trade. Instead the query below **encodes the three as known-divergent by name**, so a clean run means "in sync, with exactly these three documented exceptions" rather than "in sync" hiding three silent mismatches. If a fourth ever appears, it shows up as a mismatch immediately.

To verify this folder is in sync:

```sql
with known_divergent(db_version, file_version, reason) as (
  values
    ('20260615124837', '20260615103000',
     'hand-written timestamp predates the apply version; content correct'),
    ('20260615132434', '20260615150000',
     'hand-written timestamp postdates the apply version; content correct'),
    ('20260624230631', '20260625000000',
     'hand-written timestamp postdates the apply version; content correct')
)
select
  coalesce(k.file_version, m.version) || '_' || m.name || '.sql' as expected_file,
  case
    when k.db_version is null then 'exact'
    else 'known-divergent (db ' || m.version || '): ' || k.reason
  end as status
from supabase_migrations.schema_migrations m
left join known_divergent k on k.db_version = m.version
order by m.version asc;
```

`expected_file` should match the file list in this folder exactly (excluding this README) — compare against `ls *.sql`. Any row whose status is not `exact` is a documented exception; any *file* that does not appear in `expected_file` is real drift and must be reconciled.
