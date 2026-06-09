# DATA MODEL — THE SCHEMA AND THE RULES INSIDE IT

This is the single source of truth for Servyou's database structure and the security rules that protect it. It replaces the original Layer 4 (Data Model) and Layer 5 (Security and Permissions) documents.

The schema is also captured executably in `/db/migrations/` — every migration applied to production lives there as canonical SQL, mirrored from `supabase_migrations.schema_migrations`. This document describes the *why* and the shape; the migrations folder is the *what* and the exact bytes.

## Data model philosophy

Every table has a unique identifier (`uuid` primary key) and timestamps for creation and update. Relationships are strictly enforced by the database via foreign keys, so orphaned or broken data is impossible. The structure is designed so future additions — liberal professionals, small companies, in-platform payment, reviews, notifications — attach as new tables without tearing up existing ones.

Money is always stored as Tunisian Dinars with two decimal places (`numeric(10,2)`). Fixed platform text users see, such as category names, is stored in both French and Arabic, a direct consequence of the two-language commitment.

Beyond the universal identity core, **profile fields are optional by default**. Each user assembles their own profile by filling in only the fields that are true for them. This is the schema expression of the Configurable Workspace Principle: Servyou provides the building blocks; each individual user fills in what fits their situation. A university student freelancer leaves "current workplace" blank; a full-time professional fills it in. A dropshipper leaves stock-tracking off; a physical-shop seller turns it on. The schema accommodates this diversity by making non-core columns nullable and structuring multi-value attributes as their own child tables.

## The three layers of security

Servyou's security is built in three layers, each enforced at a different level. **Every business rule must be enforced at the database layer.** Application-layer guards are convenience for the user experience; they are not security. A malicious actor bypassing the frontend hits the database rules directly and still cannot violate them.

**Layer 1 — Authentication.** Supabase Auth handles password hashing, session tokens, email verification, password reset, and account recovery. Servyou never stores passwords directly. The `auth.users` table is Supabase's; `public.profiles.id` is a foreign key to it with `on delete cascade`, so deleting an auth user automatically removes their profile and all dependent data.

**Layer 2 — Row Level Security (RLS).** Every table has RLS enabled. Policies define exactly who can read, insert, update, and delete each row. Policies use `auth.uid()` to identify the calling user and compare against the row's ownership fields. RLS runs in the database, so it is enforced regardless of which client (web, mobile, API) makes the request.

**Layer 3 — Database triggers and SECURITY DEFINER functions.** Business rules that go beyond simple row ownership — fairness limits, transition validation, role-gated state changes — are enforced as `BEFORE INSERT` or `BEFORE UPDATE` triggers. These run in the database with elevated privileges (SECURITY DEFINER) and reject the operation with a `RAISE EXCEPTION` if a rule is violated. The frontend never has to decide whether an operation is legal; the database is the authority.

## The identity core: profiles

One central `profiles` table holds the universal identity every user shares, since everyone is at least a buyer.

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK, FK to `auth.users(id)` ON DELETE CASCADE |
| full_name | text | required |
| email | text | required, unique |
| date_of_birth | date | required, used for the 16+/18+ age rule |
| city | text | nullable |
| language | text | `'fr'` or `'ar'`, default `'fr'` |
| phone | text | nullable, progressively collected |
| seller_type | text | nullable, `'freelancer'` or `'shop_owner'` |
| is_admin | boolean | default false, separate protected flag |
| created_at | timestamptz | auto |
| updated_at | timestamptz | auto via `handle_updated_at` trigger |

A single `seller_type` field expresses the optional seller capability: empty for a pure consumer; `'freelancer'` or `'shop_owner'` once upgraded; never both at once. Future branched roles (such as `'liberal_professional'`, `'small_company'`) are added as new accepted values plus their own child tables. Admin status is a separate boolean, kept out of `seller_type` to preserve the developer/admin separation.

**The profiles RLS posture is owner-only read.** The original schema had a permissive "everyone can read profiles" policy that exposed private fields (date_of_birth, email, phone) to anonymous users via the public REST API. This was corrected in a dedicated migration. Today the SELECT policy is `auth.uid() = id` — a user can read only their own profile row.

For public read access to safe fields (full_name, city, language, seller_type), a separate `public_profiles` view exists with `security_barrier = true, security_invoker = false`. The view exposes only the four safe columns and is granted SELECT to `anon` and `authenticated`. This is the pattern that lets a consumer see "Sold by Ahmed's Shop" on a product page without exposing Ahmed's date of birth.

For relationship-scoped phone reveal (a buyer needs to call a seller they just ordered from, a freelancer needs to call a consumer whose job they responded to), the `get_contact_phone(target uuid)` SECURITY DEFINER function returns the target's phone only when one of four conditions holds: the caller is the target themselves, the caller and target are buyer/seller on an order together, the caller is a freelancer who responded to the target's job post, or the caller is the consumer who posted a job the target freelancer responded to. Outside these relationships, the function returns NULL. The function includes a NULL-caller guard at the top — if `auth.uid()` is NULL (no authenticated user), it returns NULL immediately.

## Categories: the unified taxonomy

A single `categories` table serves products, service listings, and job posts as one taxonomy, because Tunisian sellers cross between products and services.

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| name_fr | text | required |
| name_ar | text | required |
| slug | text | required, unique, URL-friendly |
| parent_id | uuid | nullable, FK to categories(id) ON DELETE SET NULL — enables nesting |

Categories are admin-controlled. RLS: anyone can read; only admins (`is_admin()` SECURITY DEFINER function) can insert, update, or delete. The structure expresses the sector/specialization distinction — sector is a top-level category, specialization is a nested sub-category via parent_id. Skills (the freelancer's own tags) are a separate system.

## Shops and products

The `shops` table holds one row per shop, linked to its owner.

| Column | Type | Notes |
|---|---|---|
| id, owner_id, name, description, city, logo_url, banner_url | | core |
| shop_type | enum | `'physical'`, `'online_only'`, `'dropshipper'` — nullable |
| delivery_setup | enum | `'self_delivery'`, `'third_party'`, `'buyer_pickup'` — nullable |
| working_hours | text | nullable, free-form |
| location_detail | text | nullable, free-form for neighborhood or pickup address |
| preferred_carriers | text | nullable, free-form for naming preferred Tunisian delivery carriers (First Delivery, Aramex, Mylerz, …) |

The `shop_type = 'dropshipper'` value is reserved for **domestic** Tunisian dropshippers sourcing from Tunisian suppliers. International dropshipping is out of MVP scope; future support would add a new value like `'international_dropshipper'` with the regulatory and trust infrastructure in place.

Two child tables capture multi-value shop attributes. The `shop_payment_methods` table holds one row per accepted payment method (method enum: `'cod'`, `'bank_transfer'`, `'d17'`, `'flouci'`, `'konnect'`, `'other'`). The `shop_categories` table holds one row per category specialty, linking shop_id to category_id.

The `products` table holds one row per product, linked to its shop and to a category. Dropshipping-friendly stock handling via `tracks_stock` boolean plus `stock_count` integer (meaningful only when tracks_stock is true). Status enum: `'active'`, `'hidden'`, `'sold_out'`. Units sold is always calculated live from the orders table, never stored as a separate counter.

The `product_images` table holds one row per image, linked to its product, with display_order for ordering.

RLS on shops, products, and product_images: anyone reads (these are public marketplace surfaces); only the shop owner manages their own. The ownership check is `owner_id = auth.uid()` directly on shops, and indirected through the parent shop for products and product_images.

## Freelancers and services

The `freelancer_profiles` table holds the professional layer on top of the central profile.

| Column | Type | Notes |
|---|---|---|
| id, profile_id (unique), headline, bio, city, portfolio_link, years_experience, languages | | core |
| working_hours | text | nullable, free-form |
| current_workplace | text | nullable, free-form |
| preferred_payment_method | text | nullable, free-form or future small enum |

Three child tables capture multi-value freelancer attributes. The `freelancer_skills` table holds one row per skill tag. The `freelancer_tools` table holds one row per tool or software. The `freelancer_education` table holds one row per education entry (institution, degree, field, year_start, year_end nullable for ongoing). The `freelancer_certifications` table holds one row per certification (name, issuing organization, year obtained, optional credential URL).

The `service_listings` table holds one row per service, linked to the freelancer and to a category. Starting price in TND, delivery time as flexible text, status enum (`'active'`, `'hidden'`).

The `service_media` table holds one row per work sample linked to a service listing, with media_type enum (`'image'`, `'video'`).

RLS on freelancer_profiles, freelancer_skills, service_listings, service_media: anyone reads; only the owning freelancer manages.

## Orders: the lifecycle table

A single `orders` table holds both product and service requests, so the buyer's "My Requests" page and both seller dashboards read from one place.

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| buyer_id | uuid | FK to profiles |
| seller_id | uuid | FK to profiles |
| order_type | text | `'product'` or `'service'` |
| product_id | uuid | nullable, FK to products |
| service_listing_id | uuid | nullable, FK to service_listings |
| delivery_name, delivery_address, delivery_phone | text | nullable, set for product orders only |
| buyer_note | text | nullable |
| quantity | integer | default 1, CHECK ≥ 1 |
| status | text | the 8-value lifecycle below |
| cancelled_by | text | nullable, `'buyer'` or `'seller'` |
| cancellation_reason | text | nullable |
| received_at | timestamptz | nullable, set when status reaches `'received'` |
| created_at, updated_at | timestamptz | auto |

A CHECK constraint enforces that exactly one of `product_id` / `service_listing_id` is filled, matching `order_type`.

**The 8-stage lifecycle.** The `status` field holds one of: `'pending'` (starting state), `'accepted'` (seller commits), `'prepared'` (product orders only — seller has packed it), `'dispatched'` (product orders only — handed to delivery, this is the dispatch line), `'in_delivery'` (product orders only — delivery in progress), `'arrived'` (delivery has reached the buyer), `'received'` (buyer confirmed receipt — terminal success), `'cancelled'` (parallel terminal state). Service orders skip the middle states and move `'accepted'` → `'arrived'` directly.

**The role-gating trigger** (`check_order_status_transition`, BEFORE UPDATE on orders) is the load-bearing enforcement. The trigger enforces, in order:

1. Admin override: `is_admin()` calls always pass.
2. Non-status edits (buyer_note, delivery_phone, etc.) sail through.
3. Caller role resolution: caller must be `OLD.buyer_id` (resolves to `'buyer'`) or `OLD.seller_id` (resolves to `'seller'`); otherwise rejected.
4. Terminal lock: orders in `'received'` or `'cancelled'` cannot transition out.
5. Cancellation path: `NEW.cancelled_by` must be non-null and match caller role; post-pivot cancellation (product: `dispatched`+; service: `accepted`+) requires `cancellation_reason`.
6. Buyer-only `'received'`: only the buyer can move `arrived` → `received`.
7. Seller-only chain advancement: only the seller can advance through the chain, with strict adjacency per order type (product chain: pending→accepted→prepared→dispatched→in_delivery→arrived; service chain: pending→accepted→arrived).

The trigger uses `RAISE EXCEPTION` with French error messages, which surface to the user directly. The RLS UPDATE policy above the trigger is intentionally wide (`buyer_id = auth.uid() OR seller_id = auth.uid()`) — narrow gating belongs in the trigger because it depends on the diff between OLD and NEW.

**The buyer-cancellation-history view** aggregates cancellations per buyer for the post-launch buyer-rating system. Read-only, built from the orders table, it stores no new data: one row per buyer with `buyer_id`, `total_orders`, `cancellations_total` (any initiator), `cancellations_by_buyer` (`cancelled_by='buyer'`), `cancellations_by_buyer_after_pivot` (buyer-initiated where a reason was required — the serial-refuser metric, using `cancellation_reason IS NOT NULL` as a proxy for post-pivot until per-transition timestamps ship), and `last_buyer_cancelled_at`. It is `security_invoker=true`, inheriting orders RLS: a buyer sees their own global stats, an admin sees all, a seller sees only the slice of orders they share with that buyer.

RLS on orders: only the buyer and the seller of a given order can SELECT it (delivery data is private). Only the buyer can INSERT (buyer_id must equal auth.uid()). Either party can UPDATE (subject to trigger gating).

## Job posts, skills, responses

The `job_posts` table holds one row per job a consumer posts: consumer_id, title, description, budget_min and budget_max in TND, category_id, city, is_remote boolean, deadline date, status enum (`'open'`, `'filled'`, `'expired'`, `'deleted'`).

The `job_post_skills` table holds one row per skill wanted on a post.

The `job_responses` table holds one row per freelancer responding to a post: job_post_id, freelancer_id, proposal_message, with a `unique(job_post_id, freelancer_id)` constraint preventing duplicate responses.

**The fairness-limit trigger** (`check_job_response_limits`, BEFORE INSERT on job_responses) enforces the two locked limits: max 10 responses per post, max 5 active responses per freelancer (active = post still open AND not past the 30-day expiry). The trigger also enforces post-open status, post non-expiry, and prohibits self-response. Limits are encoded as constants in the trigger and mirrored in `src/lib/job-constants.ts` for client-side display — both must be updated together.

RLS on job_posts: open posts readable by everyone, plus the poster's own posts at any status; only the poster manages. RLS on job_post_skills: anyone reads (needed for filtering); managed by the post owner. RLS on job_responses: readable by the post owner and the responding freelancer; freelancer creates own; freelancer deletes own.

## Favorites and reports

The `favorites` table holds one row per saved item: user_id, item_type enum (`'product'` or `'service'`), product_id or service_listing_id (exactly one, enforced by CHECK), with `unique(user_id, product_id)` and `unique(user_id, service_listing_id)` preventing duplicates. Private to each user — RLS allows SELECT, INSERT, DELETE only when `user_id = auth.uid()`.

The `reports` table holds one row per report: reporter_id, target_type enum (`'shop'`, `'product'`, `'freelancer_profile'`, `'service'`, `'job_post'`, `'user'`), target_id, reason enum (`'fake_scam'`, `'offensive'`, `'wrong_category'`, `'other'`), optional description text, status enum (`'open'`, `'under_review'`, `'resolved'`), admin_note text shown to the reporter when resolved.

RLS on reports: the reporter creates and reads their own; admins read all and update (to resolve). The acknowledgment-and-outcome flow makes reporting a real case rather than a cosmetic button — the user sees their problem treated seriously.

## Admin, moderation, disputes, and the audit log

The admin layer (Phase 9) adds moderation, dispute resolution, user suspension, and a forensic audit log on top of the marketplace core. Admin status is the `profiles.is_admin` boolean, read by the `is_admin()` SECURITY DEFINER function that gates every admin policy and RPC.

**User suspension.** `profiles.suspended_at` (nullable timestamptz) and `suspended_reason` (nullable text) mark a suspended account, with a CHECK requiring a reason when suspended. Suspension is written only through the `admin_suspend_user(target, reason)` / `admin_unsuspend_user(target)` SECURITY DEFINER RPCs (admin-gated, self-suspend blocked, audit-logged). Platform-wide enforcement of the suspended state lives in `middleware.ts`.

**Content moderation.** `shops`, `products`, `service_listings`, `freelancer_profiles`, and `job_posts` each carry `admin_hidden_at` (nullable timestamptz) + `admin_hidden_reason` (nullable text), with a CHECK requiring a reason when set. Only admins set or clear the marker — enforced by `enforce_admin_moderation_lock` (products/service_listings, which also have a seller `status='hidden'`) and `enforce_admin_marker_lock` (shops/freelancer_profiles/job_posts). `admin_hide_content` / `admin_unhide_content` SECURITY DEFINER RPCs are the only write path; public surfaces filter `admin_hidden_at IS NULL` at the application layer.

**Disputes.** The `disputes` table is a report scoped to a specific order: `order_id` (FK → orders ON DELETE CASCADE), `created_by_role` (`'buyer'`/`'seller'`), `reason` (enum: `not_delivered`/`wrong_item`/`damaged`/`payment_refused`/`buyer_unreachable`/`other`), `description`, `status` (`open`/`under_review`/`resolved`/`dismissed`), `outcome` (`sided_buyer`/`sided_seller`/`compromise`, set iff resolved), `admin_note` (required on a terminal state), and timestamps. A partial unique index permits one active dispute per order. RLS: the order's parties and admins read; a party creates (role matching their identity on the order, order past `pending`); admin updates. Resolution is informational at MVP (no payment rail, no money movement).

**Audit log.** `admin_audit_log` is the immutable forensic record of every state-changing admin action: `admin_id` (FK → profiles ON DELETE RESTRICT), `action` + `target_type` (free text), `target_id`, `before_state` / `after_state` (jsonb), `note`, `created_at`. RLS: admin-only SELECT; INSERT gated by `is_admin() AND admin_id = auth.uid()`; **no UPDATE and no DELETE policy** — entries are permanent. The `log_admin_action(...)` SECURITY DEFINER RPC is the write path; the four admin content/user RPCs log in-transaction, while the report/dispute server actions log best-effort after their UPDATE commits.

## Column-level write protection (the privileged-column locks)

RLS gates rows, not columns — so on owner-writable tables, privileged columns must be protected at the column-privilege and trigger layers as well. A column-level `REVOKE` does **not** subtract from a pre-existing table-level grant in PostgreSQL, so the pattern is an allow-list inversion: revoke table `UPDATE`, then grant back only the columns the app legitimately edits. Two tables carry these locks (added in PR-Z to close the 2026-06-09 audit's CRIT-1 and IMP-1):

- **`profiles`.** `authenticated` holds `UPDATE` only on `full_name, city, language, phone, seller_type`. `is_admin`, `suspended_at`, `suspended_reason`, `date_of_birth`, and `email` are not authenticated-writable — they change only through the admin SECURITY DEFINER RPCs (running as owner) or the service role. `enforce_profile_admin_marker_lock` is the defense-in-depth trigger; `enforce_seller_type_age_gate` enforces the 18+ rule at the DB layer when `seller_type` is set.
- **`orders`.** `authenticated` holds `UPDATE` only on the lifecycle columns `status, cancelled_by, cancellation_reason, received_at`; the identity columns (`buyer_id, seller_id, product_id, service_listing_id, order_type, quantity, buyer_note, delivery_*`) are frozen after creation (column grant + `enforce_order_identity_lock`). The role-gating trigger continues to govern status transitions.

The trigger bypass cascade for all three locks is: `auth.uid() IS NULL` (service-role / SQL-editor / cron) → allow; `is_admin()` (admin RPC paths) → allow; otherwise a protected-column change raises `42501`. These locks are exercised by `scripts/rls-smoke.mjs` section F.

## Migration discipline

Every schema change goes through Supabase's `apply_migration` tool, which records the migration in `supabase_migrations.schema_migrations` and runs the SQL transactionally. Failures are clean — partial application is impossible.

After each successful apply, the canonical SQL is mirrored to `/db/migrations/<version>_<name>.sql` in the repository. The version is the 14-digit UTC timestamp Supabase assigns; the name matches the `name` parameter passed to `apply_migration`. This mirroring is manual but disciplined: the repository becomes the readable, diff-able, code-reviewable record of every schema change, complementing Supabase's internal log.

For destructive operations (DROP, ALTER that removes columns or constraints), a Step 0 discovery query confirms the current state before the migration is drafted. The migration is shown in plain SQL with the dependency ordering explicit, the founder authorizes it in plain words, then it is applied. Rollback paths are documented in the PR description.

## What the schema deliberately does not have at MVP

No notifications table. No reviews or ratings table. No payment-records table. No buyer-reputation aggregate (the cancellation history view is the foundation but the rating system is post-launch). No per-transition timestamps on orders (`accepted_at`, `prepared_at`, `dispatched_at`, `arrived_at`) — these are useful analytics columns later but represent premature optimization without real data to analyze; sequenced for post-launch. No follow/follower relationships (Servyou is not a social network). No messaging table (WhatsApp is the messaging layer at MVP).

Each of these is a deliberate deferral, not a forgotten requirement. They are added when the carriage is ready to carry them.

## What every Claude Code session must remember about the data model

The schema is the source of truth. The application code follows it. When the application contradicts the schema, the schema wins.

Every business rule must be enforced at the database layer. Application-layer guards are convenience for the user; they are not security.

Migrations are forward-only and transactional. Past migrations live in `/db/migrations/` and `supabase_migrations.schema_migrations`. New migrations are added; old ones are never edited.

Sensitive fields (date_of_birth, email, phone, delivery_*, cancellation_reason) are protected by RLS at the row level and by view scoping at the column level. New tables that hold sensitive data inherit the same posture: owner-only read by default, public-safe views or SECURITY DEFINER functions for the exceptions.
