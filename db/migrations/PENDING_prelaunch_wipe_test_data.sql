-- PRE-LAUNCH WIPE of all test data (founder task, 2026-11-02). DATA ONLY — no schema, grant or type change.
-- Prepared by CC, NOT applied: the founder applies it. IRREVERSIBLE — there is no rollback. Take a backup first
-- (Supabase dashboard → Database → Backups) if anything might be needed again.
--
-- KEEPS: the admin account 0f4c929b-05e4-474e-b2ce-a3c84443a0ad (moatezsahbeni500@gmail.com) — auth user, identity,
-- profile — plus every reference / system table: categories (111 rows, the taxonomy — a seed, but product data, not
-- test data), storage buckets (5), migration history, auth / storage / realtime / vault internals.
-- DELETES: every other account and everything they own or touch (list below), and the admin's own test content
-- (decisions D1–D3). Nothing else.
--
-- ─── Exactly what it deletes (live counts, read-only, 2026-11-02 — the block REFUSES to run if any differs) ───────
-- Accounts (13 — every account except the admin):
--   moatezsahbeni500+freelance@gmail.com · moatezsahbeni500+freelance2@gmail.com · moatezservyou@gmail.com (owner of
--   « OM shop » since migration 20261102202911) · 9 demo freelancers demo.*@servyou.invalid (ids de300001-…-000000000001
--   to …09) · e3-seed-1785179234007@servyou-gate.test (gate seed).
--   auth.users 13 · public.profiles 13 · auth.identities 4 · auth.flow_state 1 — and, by FK cascade from auth.users,
--   auth.sessions / refresh_tokens / mfa_amr_claims (173 / 174 / 173 today; session counts move with every sign-in, so
--   they are reported, not asserted).
-- Shop « OM shop »: shops 1 · products 26 · product_images 33 · shop_categories 3 · shop_payment_methods 1.
-- Freelancers: freelancer_profiles 10 · service_listings 23 · freelancer_certifications 1 · freelancer_education 1 ·
--   freelancer_languages 3 · freelancer_skills 3 · freelancer_tools 2 · freelancer_links 0 · freelancer_portfolio_items 0.
-- Missions: job_posts 8 (7 by test accounts + 1 by the admin, D1) · job_post_skills 4 · job_responses 4 ·
--   job_response_skills 1.
-- Orders: orders 16 (6 product + 10 service) · order_events 2 · disputes 0.
-- Other: favorites 3 · reports 1 · contact_messages 1 (D3) · uploaded_objects 38 (the upload records of the files
--   below) · notification_preferences 0 · password_change_attempts 0 · data_exports 0 · deletion_requests 0.
-- Kept by decision: admin_audit_log 8 (D2).
--
-- ─── Files: delete them FIRST, through the Storage API (SQL cannot) ─────────────────────────────────────────────────
-- storage.protect_delete() refuses DELETE on storage.objects from SQL, and forcing it would leave the files in the
-- storage backend. So, BEFORE running this block, in the Supabase dashboard → Storage, delete these 4 folders (38 files;
-- the admin owns none):
--   product-images / f4757d2d-705c-48c8-bd58-37a35c7bdab3   (34 files: OM shop's product photos, 1 with no owner)
--   shop-assets    / f4757d2d-705c-48c8-bd58-37a35c7bdab3   (2: OM shop's logo and banner)
--   avatars        / 88913fcc-3bfe-4df7-a060-63fe94773600   (1: +freelance's avatar)
--   avatars        / c138ca3e-1774-45be-ad65-2071c91cfe3e   (1: +freelance2's avatar)
-- The block checks that storage.objects holds no file outside the admin's own and refuses otherwise.
--
-- ─── Decisions (defaults below; tell CC to flip one) ──────────────────────────────────────────────────────────────
--   D1. The admin's own mission post (« creation de identite visuelle… », open, 2026-08-23, 1 skill, 0 responses) is
--       test content → DELETED.
--   D2. admin_audit_log (8 rows: the admin's moderation actions on test content) → KEPT as the audit trail. Its
--       target_id has no FK, so the rows survive the targets.
--   D3. contact_messages (1, 2026-11-01, sent by a test account) → DELETED (its FK would only null the sender).
--
-- ─── How it works ───────────────────────────────────────────────────────────────────────────────────────────────────
-- One DO block = one transaction: any failed check rolls everything back. As postgres (SQL editor / MCP) auth.uid() is
-- NULL, so every guard trigger (enforce_active_user, enforce_moderated_row_no_delete, the job / skill locks) bypasses
-- itself; the two AFTER DELETE triggers only recount (sync_job_post_response_count → job_posts.response_count,
-- sync_freelancer_is_published → freelancer_profiles.is_published) on rows deleted in the same block. Deletes go
-- child → parent explicitly, so each count is checked and no ON DELETE SET NULL update fires (orders are deleted before
-- products / listings). Each delete must remove exactly the expected number of rows; to re-run after the data moved,
-- run the PREVIEW query at the end of this file, then update the expected numbers (and this header) together.

do $$
declare
  c_admin constant uuid := '0f4c929b-05e4-474e-b2ce-a3c84443a0ad';
  v_users uuid[];
  v_shops uuid[];
  v_fps   uuid[];
  v_posts uuid[];
  v_orders uuid[];
  n int;  -- rows removed by the last delete; each must equal the header's count, else the whole block rolls back
begin
  -- ── Preconditions ──────────────────────────────────────────────────────────────────────────────────────────────────
  if not exists (select 1 from public.profiles where id = c_admin and is_admin
                   and email = 'moatezsahbeni500@gmail.com') then
    raise exception 'Le compte admin attendu est introuvable : rien n''est supprimé.' using errcode = 'P0002';
  end if;
  if exists (select 1 from public.profiles where is_admin and id <> c_admin) then
    raise exception 'Un autre compte administrateur existe : le wipe le supprimerait. Rien n''est supprimé.'
      using errcode = '23514';
  end if;
  if exists (select 1 from storage.objects where owner_id is distinct from c_admin::text) then
    raise exception 'Des fichiers restent dans Storage (voir l''en-tête) : supprimez-les d''abord par le dashboard. Rien n''est supprimé.'
      using errcode = '23514';
  end if;

  -- ── The sets to delete ─────────────────────────────────────────────────────────────────────────────────────────────
  select coalesce(array_agg(id), '{}') into v_users from auth.users where id <> c_admin;
  select coalesce(array_agg(id), '{}') into v_shops from public.shops where owner_id = any(v_users);
  select coalesce(array_agg(id), '{}') into v_fps from public.freelancer_profiles where profile_id = any(v_users);
  -- D1: the admin's own posts go too, so every post goes.
  select coalesce(array_agg(id), '{}') into v_posts from public.job_posts
   where consumer_id = any(v_users) or consumer_id = c_admin;
  select coalesce(array_agg(id), '{}') into v_orders from public.orders
   where buyer_id = any(v_users) or seller_id = any(v_users);

  if cardinality(v_users) <> 13 then
    raise exception 'Comptes à supprimer : % au lieu de 13. Rien n''est supprimé (relancez l''aperçu).', cardinality(v_users)
      using errcode = '23514';
  end if;

  -- ── Deletes, child → parent; each count must match the header ──────────────────────────────────────────────────────
  delete from public.disputes where order_id = any(v_orders);
  get diagnostics n = row_count; if n <> 0 then raise exception 'disputes: % au lieu de 0', n using errcode = '23514'; end if;
  delete from public.order_events where order_id = any(v_orders);
  get diagnostics n = row_count; if n <> 2 then raise exception 'order_events: % au lieu de 2', n using errcode = '23514'; end if;
  delete from public.orders where id = any(v_orders);
  get diagnostics n = row_count; if n <> 16 then raise exception 'orders: % au lieu de 16', n using errcode = '23514'; end if;

  delete from public.favorites
   where user_id = any(v_users) or shop_id = any(v_shops) or freelancer_profile_id = any(v_fps)
      or product_id in (select id from public.products where shop_id = any(v_shops))
      or service_listing_id in (select id from public.service_listings where freelancer_profile_id = any(v_fps));
  get diagnostics n = row_count; if n <> 3 then raise exception 'favorites: % au lieu de 3', n using errcode = '23514'; end if;
  delete from public.reports where reporter_id = any(v_users);
  get diagnostics n = row_count; if n <> 1 then raise exception 'reports: % au lieu de 1', n using errcode = '23514'; end if;

  delete from public.job_response_skills where job_response_id in
    (select id from public.job_responses where freelancer_id = any(v_users) or job_post_id = any(v_posts));
  get diagnostics n = row_count; if n <> 1 then raise exception 'job_response_skills: % au lieu de 1', n using errcode = '23514'; end if;
  delete from public.job_responses where freelancer_id = any(v_users) or job_post_id = any(v_posts);
  get diagnostics n = row_count; if n <> 4 then raise exception 'job_responses: % au lieu de 4', n using errcode = '23514'; end if;
  delete from public.job_post_skills where job_post_id = any(v_posts);
  get diagnostics n = row_count; if n <> 4 then raise exception 'job_post_skills: % au lieu de 4', n using errcode = '23514'; end if;
  delete from public.job_posts where id = any(v_posts);
  get diagnostics n = row_count; if n <> 8 then raise exception 'job_posts: % au lieu de 8', n using errcode = '23514'; end if;

  delete from public.service_listings where freelancer_profile_id = any(v_fps);
  get diagnostics n = row_count; if n <> 23 then raise exception 'service_listings: % au lieu de 23', n using errcode = '23514'; end if;
  delete from public.freelancer_certifications where freelancer_id = any(v_fps);
  get diagnostics n = row_count; if n <> 1 then raise exception 'freelancer_certifications: % au lieu de 1', n using errcode = '23514'; end if;
  delete from public.freelancer_education where freelancer_id = any(v_fps);
  get diagnostics n = row_count; if n <> 1 then raise exception 'freelancer_education: % au lieu de 1', n using errcode = '23514'; end if;
  delete from public.freelancer_languages where freelancer_profile_id = any(v_fps);
  get diagnostics n = row_count; if n <> 3 then raise exception 'freelancer_languages: % au lieu de 3', n using errcode = '23514'; end if;
  delete from public.freelancer_links where freelancer_profile_id = any(v_fps);
  get diagnostics n = row_count; if n <> 0 then raise exception 'freelancer_links: % au lieu de 0', n using errcode = '23514'; end if;
  delete from public.freelancer_portfolio_items where freelancer_profile_id = any(v_fps);
  get diagnostics n = row_count; if n <> 0 then raise exception 'freelancer_portfolio_items: % au lieu de 0', n using errcode = '23514'; end if;
  delete from public.freelancer_skills where freelancer_profile_id = any(v_fps);
  get diagnostics n = row_count; if n <> 3 then raise exception 'freelancer_skills: % au lieu de 3', n using errcode = '23514'; end if;
  delete from public.freelancer_tools where freelancer_id = any(v_fps);
  get diagnostics n = row_count; if n <> 2 then raise exception 'freelancer_tools: % au lieu de 2', n using errcode = '23514'; end if;
  delete from public.freelancer_profiles where id = any(v_fps);
  get diagnostics n = row_count; if n <> 10 then raise exception 'freelancer_profiles: % au lieu de 10', n using errcode = '23514'; end if;

  delete from public.product_images where product_id in (select id from public.products where shop_id = any(v_shops));
  get diagnostics n = row_count; if n <> 33 then raise exception 'product_images: % au lieu de 33', n using errcode = '23514'; end if;
  delete from public.products where shop_id = any(v_shops);
  get diagnostics n = row_count; if n <> 26 then raise exception 'products: % au lieu de 26', n using errcode = '23514'; end if;
  delete from public.shop_categories where shop_id = any(v_shops);
  get diagnostics n = row_count; if n <> 3 then raise exception 'shop_categories: % au lieu de 3', n using errcode = '23514'; end if;
  delete from public.shop_payment_methods where shop_id = any(v_shops);
  get diagnostics n = row_count; if n <> 1 then raise exception 'shop_payment_methods: % au lieu de 1', n using errcode = '23514'; end if;
  delete from public.shops where id = any(v_shops);
  get diagnostics n = row_count; if n <> 1 then raise exception 'shops: % au lieu de 1', n using errcode = '23514'; end if;

  -- D3: every contact message from a test account (or with no account).
  delete from public.contact_messages where user_id is distinct from c_admin;
  get diagnostics n = row_count; if n <> 1 then raise exception 'contact_messages: % au lieu de 1', n using errcode = '23514'; end if;
  delete from public.notification_preferences where profile_id = any(v_users);
  get diagnostics n = row_count; if n <> 0 then raise exception 'notification_preferences: % au lieu de 0', n using errcode = '23514'; end if;
  delete from public.password_change_attempts where user_id = any(v_users);
  get diagnostics n = row_count; if n <> 0 then raise exception 'password_change_attempts: % au lieu de 0', n using errcode = '23514'; end if;
  delete from public.data_exports where user_id = any(v_users);
  get diagnostics n = row_count; if n <> 0 then raise exception 'data_exports: % au lieu de 0', n using errcode = '23514'; end if;
  delete from public.deletion_requests where user_id = any(v_users);
  get diagnostics n = row_count; if n <> 0 then raise exception 'deletion_requests: % au lieu de 0', n using errcode = '23514'; end if;
  delete from public.uploaded_objects where owner_id = any(v_users);
  get diagnostics n = row_count; if n <> 38 then raise exception 'uploaded_objects: % au lieu de 38', n using errcode = '23514'; end if;

  delete from public.profiles where id = any(v_users);
  get diagnostics n = row_count; if n <> 13 then raise exception 'profiles: % au lieu de 13', n using errcode = '23514'; end if;
  delete from auth.flow_state where user_id = any(v_users);
  get diagnostics n = row_count; if n <> 1 then raise exception 'auth.flow_state: % au lieu de 1', n using errcode = '23514'; end if;
  delete from auth.identities where user_id = any(v_users);
  get diagnostics n = row_count; if n <> 4 then raise exception 'auth.identities: % au lieu de 4', n using errcode = '23514'; end if;
  -- Cascades auth.sessions → refresh_tokens / mfa_amr_claims, and any one_time_tokens / mfa rows.
  delete from auth.users where id = any(v_users);
  get diagnostics n = row_count; if n <> 13 then raise exception 'auth.users: % au lieu de 13', n using errcode = '23514'; end if;

  -- ── End state: only the admin and the reference data remain ────────────────────────────────────────────────────────
  if (select count(*) from auth.users) <> 1 or (select count(*) from public.profiles) <> 1
     or exists (select 1 from public.shops) or exists (select 1 from public.products)
     or exists (select 1 from public.freelancer_profiles) or exists (select 1 from public.service_listings)
     or exists (select 1 from public.job_posts) or exists (select 1 from public.orders)
     or exists (select 1 from public.favorites) or exists (select 1 from public.reports)
     or exists (select 1 from public.uploaded_objects) or exists (select 1 from auth.sessions where user_id <> c_admin)
     or not exists (select 1 from public.profiles where id = c_admin and is_admin)
     or (select count(*) from public.categories) <> 111
     or (select count(*) from public.admin_audit_log) <> 8 then
    raise exception 'Vérification finale échouée : rien n''est supprimé.' using errcode = '23514';
  end if;

  raise notice 'Wipe terminé : 13 comptes et leurs données supprimés ; restent le compte admin, 111 catégories, 8 lignes d''audit.';
end
$$;

/* ─── PREVIEW (read-only) — run alone to see what the block would delete today ─────────────────────────────────────────
with a as (select '0f4c929b-05e4-474e-b2ce-a3c84443a0ad'::uuid as aid),
     u as (select id from auth.users, a where id <> aid),
     s as (select id from public.shops where owner_id in (select id from u)),
     f as (select id from public.freelancer_profiles where profile_id in (select id from u)),
     p as (select id from public.job_posts, a where consumer_id in (select id from u) or consumer_id = aid),
     o as (select id from public.orders where buyer_id in (select id from u) or seller_id in (select id from u))
select 'auth.users' t, (select count(*) from u) n
union all select 'storage files left (must be 0)', (select count(*) from storage.objects, a where owner_id is distinct from aid::text)
union all select 'orders', (select count(*) from o)
union all select 'order_events', (select count(*) from public.order_events where order_id in (select id from o))
union all select 'shops', (select count(*) from s)
union all select 'products', (select count(*) from public.products where shop_id in (select id from s))
union all select 'product_images', (select count(*) from public.product_images where product_id in (select id from public.products where shop_id in (select id from s)))
union all select 'freelancer_profiles', (select count(*) from f)
union all select 'service_listings', (select count(*) from public.service_listings where freelancer_profile_id in (select id from f))
union all select 'job_posts', (select count(*) from p)
union all select 'job_responses', (select count(*) from public.job_responses where freelancer_id in (select id from u) or job_post_id in (select id from p))
union all select 'favorites', (select count(*) from public.favorites where user_id in (select id from u))
union all select 'uploaded_objects', (select count(*) from public.uploaded_objects where owner_id in (select id from u))
union all select 'contact_messages', (select count(*) from public.contact_messages, a where user_id is distinct from aid);
*/
