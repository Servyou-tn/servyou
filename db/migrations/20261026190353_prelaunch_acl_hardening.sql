-- Pre-launch security batch, PR-2 -- items B (function EXECUTE + search_path), C (data_exports /
-- deletion_requests column INSERT grants) and D (default-grant sweep + default privileges). Discovery and
-- the approved SQL: docs/design/prelaunch-security-batch-discovery.md sections 3-5 and 9; architect
-- decisions 2 and 7-11 (2026-10-25, all as recommended). One migration, three sections (decision 2).
--
-- Re-verified live on 2026-10-26, after migrations 65-67 (PostgreSQL 17.6; applied as postgres, which owns
-- every function and relation below):
--   * B: the function ACL list is unchanged from the discovery. The three functions added since
--     (enforce_order_lifecycle_columns, sync_job_post_response_count, service_listing_publish_problems)
--     are already closed to anon / authenticated.
--   * C: data_exports and deletion_requests hold 0 rows; the only app writers send {user_id} and
--     {user_id, reason}; there is no app-side UPDATE of either table.
--   * D: no write policy is satisfiable by anon (0 rows); the dead authenticated privileges are exactly
--     DELETE on admin_audit_log, data_exports, deletion_requests, disputes, orders, reports and UPDATE on
--     admin_audit_log, favorites, freelancer_skills, job_post_skills, product_images; no policy outside
--     their own reads admin_audit_log or disputes, and no select string embeds either. job_posts lost anon
--     INSERT / UPDATE in migration 67 (anon DELETE remains, removed here).
--
-- None of this changes what any app path can do (verified per item in the discovery): every revoked
-- privilege is either unreachable through RLS or not used by any code path. EXECUTE is not checked when a
-- trigger fires (precedent: enforce_service_publish_requirements, enforce_order_lifecycle_columns and
-- sync_job_post_response_count already have no client EXECUTE and fire for JWT writers).
--
-- After this migration every new table / function created by postgres in public is closed by default for
-- TRUNCATE / REFERENCES / TRIGGER / MAINTAIN and EXECUTE: a new RPC needs an explicit GRANT EXECUTE.
-- supabase_admin's own default-privilege entries are not alterable as postgres and are left as they are.

-- ── B1 / B1b / B2: trigger, event-trigger and internal-helper functions -- closed to every client role ──
-- service_role keeps its direct grant.
revoke execute on function
  public.check_job_response_limits(), public.check_order_status_transition(), public.disputes_set_updated_at(),
  public.emit_order_event(), public.enforce_admin_marker_lock(), public.enforce_admin_moderation_lock(),
  public.enforce_job_responder_capability(), public.enforce_order_identity_lock(),
  public.enforce_order_insert_integrity(), public.enforce_portfolio_image_provenance(),
  public.enforce_product_image_provenance(), public.enforce_profile_admin_marker_lock(),
  public.enforce_seller_capability(), public.enforce_seller_capability_switch(),
  public.enforce_seller_type_age_gate(), public.enforce_service_category_kind(),
  public.enforce_service_subcategory_parent(), public.handle_new_user(), public.set_order_snapshot(),
  public.sync_freelancer_is_published(), public.rls_auto_enable(),
  public.enforce_active_user(), public.handle_updated_at(), public.set_cancelled_at_on_transition(),
  public.freelancer_has_active_listing(uuid)
from public, anon, authenticated;

-- ── B3: admin RPCs -- each opens with `if not public.is_admin() then raise`; the admin UI calls them as
-- authenticated, which keeps EXECUTE explicitly. PUBLIC is revoked too (an anon-only revoke would leave it).
revoke execute on function
  public.admin_hide_content(text, uuid, text), public.admin_unhide_content(text, uuid),
  public.admin_suspend_user(uuid, text), public.admin_unsuspend_user(uuid),
  public.admin_overview_stats(), public.log_admin_action(text, text, uuid, jsonb, jsonb, text)
from public, anon;
grant execute on function
  public.admin_hide_content(text, uuid, text), public.admin_unhide_content(text, uuid),
  public.admin_suspend_user(uuid, text), public.admin_unsuspend_user(uuid),
  public.admin_overview_stats(), public.log_admin_action(text, text, uuid, jsonb, jsonb, text)
to authenticated;

-- Kept as they are (discovery section 3): is_admin (evaluated in PUBLIC-role policies), get_contact_phone and
-- get_completed_service_order_count (the public D4 page), is_active_user (authenticated only), f_unaccent and
-- the unaccent functions (generated-column expressions check EXECUTE as the writer).

-- ── B4: search_path. The two plpgsql trigger functions only call now() (pg_catalog is always searched).
alter function public.handle_updated_at() set search_path = '';
alter function public.set_cancelled_at_on_transition() set search_path = '';
-- f_unaccent calls unaccent() unqualified, so a bare search_path = '' would break it -- and with it every
-- products / service_listings write through the generated search_vector. Qualify the body; same result.
create or replace function public.f_unaccent(text)
returns text
language sql
immutable
parallel safe
strict
set search_path = ''
as $$ select public.unaccent('public.unaccent'::regdictionary, $1) $$;

-- ── C: data_exports / deletion_requests -- the user names only themselves (and a reason); the status,
-- processing columns, timestamps and id are the system's. A non-pending status no longer sidesteps the
-- one-pending-per-user index. Admins (is_admin() UPDATE policies) may touch only the processing columns.
revoke insert, update on public.data_exports, public.deletion_requests from anon, authenticated;
grant insert (user_id) on public.data_exports to authenticated;
grant insert (user_id, reason) on public.deletion_requests to authenticated;
grant update (status, processed_at, processed_by, export_url) on public.data_exports to authenticated;
grant update (status, processed_at, processed_by) on public.deletion_requests to authenticated;

-- ── D1: nothing a client reaches uses these (MAINTAIN, PG17, includes LOCK TABLE).
revoke truncate, references, trigger, maintain on all tables in schema public from anon, authenticated;
-- ── D2: anon never writes (no write policy is satisfiable without auth.uid() / is_admin()).
revoke insert, update, delete on all tables in schema public from anon;
-- ── D3: privileges authenticated holds but no policy ever lets it use.
revoke delete on public.admin_audit_log, public.data_exports, public.deletion_requests,
                 public.disputes, public.orders, public.reports from authenticated;
revoke update on public.admin_audit_log, public.favorites, public.freelancer_skills,
                 public.job_post_skills, public.product_images from authenticated;
-- ── D4: the two tables no policy grants anon and no anon path embeds.
revoke select on public.admin_audit_log, public.disputes from anon;
-- anon keeps SELECT everywhere else -- orders included: PUBLIC-role policies on service_listings, products
-- and shops read orders as the caller.

-- ── D5: default privileges for what postgres creates from now on.
alter default privileges for role postgres in schema public
  revoke truncate, references, trigger, maintain on tables from anon, authenticated;
-- The global form: PUBLIC's EXECUTE on new functions is Postgres' built-in default, not a schema entry.
alter default privileges for role postgres revoke execute on functions from public;
alter default privileges for role postgres in schema public revoke execute on functions from anon, authenticated;
-- Decision P2-1 (approved 2026-10-26, beyond the original spec): without it every NEW table would still
-- default to anon INSERT / UPDATE / DELETE, so D2's "anon never writes" would break on the next table
-- (M-C's job_response_skills). D2 is now the default too.
alter default privileges for role postgres in schema public revoke insert, update, delete on tables from anon;

-- Post-apply verification (expected results; discovery section 9):
--   1. signup smoke: auth.admin.createUser -> a profiles row exists (handle_new_user still fires).
--   2. select proname, has_function_privilege('anon', oid, 'EXECUTE') a,
--             has_function_privilege('authenticated', oid, 'EXECUTE') u
--        from pg_proc where pronamespace = 'public'::regnamespace and prokind = 'f' order by 1;
--      trigger / event / helper rows f/f; the six admin RPCs f/t; is_admin, get_contact_phone,
--      get_completed_service_order_count, f_unaccent, unaccent* t/t; is_active_user f/t.
--      Advisors: 0028 = 3, 0029 = 10, 0011 = 0.
--   3. no table in public grants TRUNCATE to anon or authenticated; no table grants anon INSERT / UPDATE /
--      DELETE; authenticated column grants on data_exports = INSERT (user_id), UPDATE (4 columns), on
--      deletion_requests = INSERT (user_id, reason), UPDATE (3 columns).
--   4. proconfig shows search_path on handle_updated_at, set_cancelled_at_on_transition and f_unaccent;
--      select public.f_unaccent('Élève') = 'Eleve'.
--   5. in a rolled-back transaction: create table public.zz_probe (id int) -> relrowsecurity = true
--      (ensure_rls still fires) and its ACL carries no TRUNCATE / REFERENCES / TRIGGER / MAINTAIN for anon
--      or authenticated.
--
-- Rollback (each section independent; restores exactly the privileges this file removes, from live ACL dumps
-- taken 2026-10-26 -- a blanket "grant ... on all tables" would over-grant order_events, uploaded_objects,
-- profiles and the two views, and a blanket PUBLIC grant would over-grant five functions that never had it):
--   -- B (24 of the B1 functions held PUBLIC + anon + authenticated; freelancer_has_active_listing anon +
--   -- authenticated only; of the admin RPCs, two held PUBLIC + anon, four anon only)
--   grant execute on function <the B1 list minus freelancer_has_active_listing(uuid)> to public, anon, authenticated;
--   grant execute on function public.freelancer_has_active_listing(uuid) to anon, authenticated;
--   grant execute on function public.admin_overview_stats(), public.log_admin_action(text, text, uuid, jsonb, jsonb, text) to public, anon;
--   grant execute on function public.admin_hide_content(text, uuid, text), public.admin_unhide_content(text, uuid),
--     public.admin_suspend_user(uuid, text), public.admin_unsuspend_user(uuid) to anon;
--   alter function public.handle_updated_at() reset search_path;
--   alter function public.set_cancelled_at_on_transition() reset search_path;
--   create or replace function public.f_unaccent(text) returns text language sql immutable parallel safe strict
--     as $$ SELECT unaccent('public.unaccent', $1); $$;
--   -- C (column grants first, then the table-level grants below restore INSERT / UPDATE)
--   revoke insert (user_id), update (status, processed_at, processed_by, export_url) on public.data_exports from authenticated;
--   revoke insert (user_id, reason), update (status, processed_at, processed_by) on public.deletion_requests from authenticated;
--   -- D1-D4, per grantee and table
--   grant insert, update, delete, truncate, references, trigger, maintain on
--     public.categories, public.data_exports, public.deletion_requests, public.favorites,
--     public.freelancer_certifications, public.freelancer_education, public.freelancer_languages,
--     public.freelancer_links, public.freelancer_portfolio_items, public.freelancer_profiles,
--     public.freelancer_skills, public.freelancer_tools, public.job_post_skills, public.product_images,
--     public.products, public.reports, public.service_listings, public.shop_categories,
--     public.shop_payment_methods, public.shops to anon;
--   grant select, insert, update, delete, truncate, references, trigger, maintain on public.admin_audit_log, public.disputes to anon;
--   grant delete, truncate, references, trigger, maintain on public.job_posts, public.job_responses to anon;
--   grant insert, delete, truncate, references, trigger, maintain on public.orders to anon;
--   grant references, trigger, maintain on public.profiles, public.public_profiles, public.buyer_cancellation_history to anon;
--   grant truncate, references, trigger, maintain on
--     public.categories, public.freelancer_certifications, public.freelancer_education, public.freelancer_languages,
--     public.freelancer_links, public.freelancer_portfolio_items, public.freelancer_profiles, public.freelancer_tools,
--     public.job_posts, public.job_responses, public.products, public.service_listings, public.shop_categories,
--     public.shop_payment_methods, public.shops to authenticated;
--   grant update, truncate, references, trigger, maintain on public.favorites, public.freelancer_skills,
--     public.job_post_skills, public.product_images to authenticated;
--   grant delete, truncate, references, trigger, maintain on public.disputes, public.orders, public.reports to authenticated;
--   grant update, delete, truncate, references, trigger, maintain on public.admin_audit_log to authenticated;
--   grant insert, update, delete, truncate, references, trigger, maintain on public.data_exports, public.deletion_requests to authenticated;
--   grant references, trigger, maintain on public.profiles, public.public_profiles, public.buyer_cancellation_history to authenticated;
--   -- D5
--   alter default privileges for role postgres in schema public grant truncate, references, trigger, maintain on tables to anon, authenticated;
--   alter default privileges for role postgres grant execute on functions to public;
--   alter default privileges for role postgres in schema public grant execute on functions to anon, authenticated;
--   alter default privileges for role postgres in schema public grant insert, update, delete on tables to anon;  -- P2-1
