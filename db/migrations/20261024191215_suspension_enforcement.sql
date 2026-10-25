-- fix(security): a suspended account cannot write. Until now profiles.suspended_at was enforced only
-- by src/middleware.ts, which clears the auth cookies on a closed allowlist of routes -- a list that
-- has drifted (it misses /demander, /mes-commandes, /mes-produits, /commandes-recues, /mon-compte,
-- /parametres and every dashboard, and lists eight routes that no longer exist). No RLS policy and
-- no trigger read suspended_at except migration 59's job_responses check, so a suspended user who
-- signs in again or replays a saved access token keeps writing over PostgREST, storage and every
-- server action. Closes docs/follow-ups.md "Security audit -- open findings (2026-10-23)", HIGH
-- "suspension is enforced only in src/middleware.ts" -- for the database. The auth-level ban and the
-- middleware matcher ship as app code in the same PR.
--
-- Part 1 -- public.is_active_user(): false only when the caller (auth.uid()) has a profiles row
-- with suspended_at set; true for every other caller, the service role and anon included (no
-- auth.uid(), no row). SECURITY DEFINER with an empty search_path so it reads suspended_at even if
-- the profiles self-read policy ever changes -- a SECURITY INVOKER version would silently return
-- true (fail open) the day that policy stopped matching. It only ever reads the caller's own row.
-- EXECUTE is revoked from public and anon (Supabase's default privileges grant anon directly) and
-- kept for authenticated and service_role -- the storage policies in Part 4 evaluate it as
-- authenticated. Like is_admin(), it is an intentional lint 0029 finding.
--
-- Part 2 -- public.enforce_active_user(), a STATEMENT-level BEFORE trigger function. Decision D1
-- (mechanism, approved) -- chosen over RESTRICTIVE write policies on every table:
--   * it raises 42501 'Ce compte est suspendu.' on every write a suspended caller attempts, even a
--     0-row one. A restrictive policy's USING clause would make a suspended UPDATE / DELETE match
--     0 rows with no error, and app code that does not check the row count would report success;
--   * it also covers writes made through SECURITY DEFINER functions in the caller's session (today
--     only the admin RPCs), which bypass RLS but not triggers;
--   * BEFORE STATEMENT triggers fire before every row-level trigger, so the suspension error always
--     surfaces first and no row trigger (snapshots, FOR SHARE reads, caps) runs for a suspended
--     caller. There are no other statement-level triggers in public today;
--   * one trigger per table, one indexed PK lookup per executed statement (per parent row under
--     an FK cascade, which runs one statement per parent).
-- The cost of statement level: no NEW / OLD, so a row-dependent exception (for example "a
-- suspended buyer may still cancel their own pending order") would need a row-level trigger on
-- that table instead -- see decision D6.
-- The check is on the ACTOR (auth.uid()), never on the row's owner: active users keep working on
-- rows that belong to a suspended account (a buyer cancelling an order from a suspended seller, an
-- admin hiding a suspended user's content). Decision D2 (admin bypass, approved): NONE, unlike the other guard
-- triggers. An active admin passes anyway because their own suspended_at is NULL, so a bypass would
-- only ever help a suspended admin -- and admin_unsuspend_user has no self-check, so with a bypass a
-- suspended admin could unsuspend themselves. auth.uid() NULL (service role, the SQL editor, the
-- auth service's own cascades) still bypasses; that branch runs BEFORE the helper call, so an anon
-- write keeps failing on RLS exactly as today instead of on "permission denied for function".
-- SECURITY INVOKER on purpose: it needs no privilege of its own, and lints 0028 / 0029 only flag
-- SECURITY DEFINER functions.
--
-- Part 3 -- the triggers. Every public TABLE (relkind 'r') on which authenticated holds a
-- table-level OR column-level INSERT, UPDATE or DELETE grant gets trg_enforce_active_user: 26
-- tables -- 25 with table-level grants plus profiles, whose only client write is its column-level
-- UPDATE grant (a table-level-only catalog query returns 25). The two views are not tables: a write
-- through public_profiles is rewritten onto profiles and would still hit this trigger for a
-- signed-in caller, but anon could write through it with RLS bypassed -- closed by migration 60
-- (20261023231434_public_profiles_revoke_writes); no view in public keeps a write grant
-- (re-verified 2026-10-24). Most tables block all three events. Decisions D1-D8 were approved by
-- the founder on 2026-10-24; the blocks below choose the events per table, so each can be changed
-- or dropped on its own:
--   D3 data_exports / deletion_requests -- a suspended user can still request an export or the
--      deletion of their data (GDPR rights; both are admin-processed). Trigger on UPDATE / DELETE
--      only, so a suspended admin cannot process them.
--   D4 disputes -- a suspended user can still open a dispute, on their own orders only: the
--      existing INSERT policy "Dispute creation by order party" already requires the caller to be
--      the order's buyer (created_by_role 'buyer') or seller (created_by_role 'seller') and the
--      order to be past 'pending'; admin-reviewed. UPDATE / DELETE only. Drop to INSERT OR UPDATE
--      OR DELETE to block.
--   D5 reports -- BLOCKED: a suspended account must not flag other people's content; contesting a
--      suspension goes through support. Change to UPDATE / DELETE to allow.
--   D6 orders -- BLOCKED, both sides: a suspended buyer cannot order or cancel, a suspended seller
--      cannot accept, ship or cancel. Their counterparties and admins still can. Allowing "cancel my
--      own pending order" needs a row-level trigger instead (Part 2).
--   D7 own-content deletes -- BLOCKED everywhere (shops, products, listings, profiles, job posts,
--      responses, portfolio, favorites): the content may be the evidence behind the suspension.
--      Deleting one's data goes through deletion_requests (D3).
--   D8 profiles -- BLOCKED, every column. LanguageToggle writes the lang cookie first and only
--      logs a failed profiles.language write, so the language switch keeps working (it logs the
--      raw error object -- logged in docs/follow-ups.md).
--   D3 / D4 caveat: those INSERT policies check only ownership / being a party, and authenticated
--      holds table-level INSERT, so ANY user (suspended or not) can already insert a dispute with
--      status 'resolved' and an admin_note, or an export / deletion request already 'completed'
--      with processed_by set. Pre-existing for every account and logged in docs/follow-ups.md;
--      allowing suspended users there adds no new power.
-- Migration 59's job_responses suspension check stays (extend, don't replace) but is now fully
-- shadowed: it applies only to signed-in non-admin callers, and this trigger, which fires first,
-- already refuses every signed-in suspended caller.
--
-- Part 4 -- storage.objects: RESTRICTIVE policies (a trigger in Supabase's storage schema is not
-- ours to add). An upload (INSERT) raises "new row violates row-level security policy" for a
-- suspended caller; UPDATE and DELETE match 0 rows silently -- acceptable, nothing changes (and
-- storage.objects has no permissive UPDATE policy today; the restrictive one guards a future one). The
-- (select public.is_active_user()) wrapper is evaluated once per statement (initplan), not per row.
-- Covers all five buckets, verifications included.
--
-- Not covered here (decisions / follow-ups): active users can still order from a suspended seller,
-- respond to a suspended consumer's job post, and read a suspended account's phone through
-- get_contact_phone; a suspended seller's shop, listings and profile stay publicly visible. Each is
-- a product call, not a write by the suspended account -- logged in docs/follow-ups.md. TRUNCATE
-- is not covered either: the trigger fires on INSERT / UPDATE / DELETE only, and TRUNCATE skips RLS
-- and DELETE triggers. anon and authenticated still hold TRUNCATE on these tables; PostgREST cannot
-- issue it, so the fix is the grant sweep already logged under "Supabase advisor hygiene".
--
-- New writes only; no row is rewritten. Discovery (2026-10-23, re-verified 2026-10-24): 22
-- profiles, 0 suspended accounts (0 suspended admins, 1 admin), so applying this locks no one out;
-- no other statement-level trigger in public and no object named is_active_user /
-- enforce_active_user / trg_enforce_active_user; the only direct SECURITY DEFINER writers
-- (admin_hide_content, admin_unhide_content, admin_suspend_user, admin_unsuspend_user,
-- log_admin_action) all check is_admin().

-- ─── Part 1 ─────────────────────────────────────────────────────────────────────────────────────
create or replace function public.is_active_user()
returns boolean
language sql
stable
security definer
set search_path to ''
as $function$
  select not exists (
    select 1
      from public.profiles p
     where p.id = (select auth.uid())
       and p.suspended_at is not null
  );
$function$;

comment on function public.is_active_user() is
  'False only when the caller (auth.uid()) has a profiles row with suspended_at set; true otherwise (service role, anon, missing row). Reads only the caller''s own row. SECURITY DEFINER so it fails closed if the profiles self-read policy changes. EXECUTE: authenticated and service_role only. Used by enforce_active_user() and the storage.objects restrictive policies. 2026-10-24.';

revoke execute on function public.is_active_user() from public, anon;
grant execute on function public.is_active_user() to authenticated, service_role;

-- ─── Part 2 ─────────────────────────────────────────────────────────────────────────────────────
create or replace function public.enforce_active_user()
returns trigger
language plpgsql
set search_path to ''
as $function$
begin
  -- Service role, SQL editor, auth-service cascades. Before the helper call: anon has no EXECUTE.
  if (select auth.uid()) is null then
    return null;
  end if;
  if not public.is_active_user() then
    raise exception 'Ce compte est suspendu.'
      using errcode = '42501';
  end if;
  return null;
end;
$function$;

comment on function public.enforce_active_user() is
  'BEFORE INSERT / UPDATE / DELETE FOR EACH STATEMENT (trg_enforce_active_user). Raises 42501 when the caller (auth.uid()) is suspended -- checked on the actor, not the row owner, so active users keep acting on a suspended account''s rows. auth.uid() NULL bypasses; NO admin bypass (an active admin passes on their own row; a suspended admin must not). Fires before every row-level trigger. 2026-10-24.';

-- ─── Part 3 ─────────────────────────────────────────────────────────────────────────────────────
-- Core: every write blocked (D7, D8).
create trigger trg_enforce_active_user before insert or update or delete on public.profiles
  for each statement execute function public.enforce_active_user();
create trigger trg_enforce_active_user before insert or update or delete on public.shops
  for each statement execute function public.enforce_active_user();
create trigger trg_enforce_active_user before insert or update or delete on public.shop_categories
  for each statement execute function public.enforce_active_user();
create trigger trg_enforce_active_user before insert or update or delete on public.shop_payment_methods
  for each statement execute function public.enforce_active_user();
create trigger trg_enforce_active_user before insert or update or delete on public.products
  for each statement execute function public.enforce_active_user();
create trigger trg_enforce_active_user before insert or update or delete on public.product_images
  for each statement execute function public.enforce_active_user();
create trigger trg_enforce_active_user before insert or update or delete on public.freelancer_profiles
  for each statement execute function public.enforce_active_user();
create trigger trg_enforce_active_user before insert or update or delete on public.freelancer_skills
  for each statement execute function public.enforce_active_user();
create trigger trg_enforce_active_user before insert or update or delete on public.freelancer_tools
  for each statement execute function public.enforce_active_user();
create trigger trg_enforce_active_user before insert or update or delete on public.freelancer_education
  for each statement execute function public.enforce_active_user();
create trigger trg_enforce_active_user before insert or update or delete on public.freelancer_certifications
  for each statement execute function public.enforce_active_user();
create trigger trg_enforce_active_user before insert or update or delete on public.freelancer_languages
  for each statement execute function public.enforce_active_user();
create trigger trg_enforce_active_user before insert or update or delete on public.freelancer_links
  for each statement execute function public.enforce_active_user();
create trigger trg_enforce_active_user before insert or update or delete on public.freelancer_portfolio_items
  for each statement execute function public.enforce_active_user();
create trigger trg_enforce_active_user before insert or update or delete on public.service_listings
  for each statement execute function public.enforce_active_user();
create trigger trg_enforce_active_user before insert or update or delete on public.job_posts
  for each statement execute function public.enforce_active_user();
create trigger trg_enforce_active_user before insert or update or delete on public.job_post_skills
  for each statement execute function public.enforce_active_user();
create trigger trg_enforce_active_user before insert or update or delete on public.job_responses
  for each statement execute function public.enforce_active_user();
create trigger trg_enforce_active_user before insert or update or delete on public.favorites
  for each statement execute function public.enforce_active_user();
-- Admin-only tables: an active admin passes; a suspended admin does not (D2).
create trigger trg_enforce_active_user before insert or update or delete on public.categories
  for each statement execute function public.enforce_active_user();
create trigger trg_enforce_active_user before insert or update or delete on public.admin_audit_log
  for each statement execute function public.enforce_active_user();

-- D6 orders: blocked both sides.
create trigger trg_enforce_active_user before insert or update or delete on public.orders
  for each statement execute function public.enforce_active_user();

-- D5 reports: blocked. (Allow instead: before update or delete.)
create trigger trg_enforce_active_user before insert or update or delete on public.reports
  for each statement execute function public.enforce_active_user();

-- D4 disputes: a suspended party can still open one. (Block instead: before insert or update or delete.)
create trigger trg_enforce_active_user before update or delete on public.disputes
  for each statement execute function public.enforce_active_user();

-- D3 data_exports / deletion_requests: a suspended user can still file a request.
create trigger trg_enforce_active_user before update or delete on public.data_exports
  for each statement execute function public.enforce_active_user();
create trigger trg_enforce_active_user before update or delete on public.deletion_requests
  for each statement execute function public.enforce_active_user();

-- ─── Part 4 ─────────────────────────────────────────────────────────────────────────────────────
create policy "Suspended accounts cannot upload"
  on storage.objects as restrictive for insert to authenticated
  with check ((select public.is_active_user()));

create policy "Suspended accounts cannot update objects"
  on storage.objects as restrictive for update to authenticated
  using ((select public.is_active_user()))
  with check ((select public.is_active_user()));

create policy "Suspended accounts cannot delete objects"
  on storage.objects as restrictive for delete to authenticated
  using ((select public.is_active_user()));

-- ─── ROLLBACK (do not run as part of this migration) ───────────────────────────────────────────
-- Per README "Rollback paths": apply as a NEW dated forward migration, never by deleting this file.
-- Re-opens the hole: a suspended account can again write everywhere until its token expires and
-- the middleware catches it. No data to undo -- nothing is rewritten.
--
-- drop policy if exists "Suspended accounts cannot upload" on storage.objects;
-- drop policy if exists "Suspended accounts cannot update objects" on storage.objects;
-- drop policy if exists "Suspended accounts cannot delete objects" on storage.objects;
-- do $$
-- declare t text;
-- begin
--   for t in select c.relname from pg_trigger tg join pg_class c on c.oid = tg.tgrelid
--             where tg.tgname = 'trg_enforce_active_user' and c.relnamespace = 'public'::regnamespace
--   loop
--     execute format('drop trigger trg_enforce_active_user on public.%I', t);
--   end loop;
-- end $$;
-- drop function if exists public.enforce_active_user();
-- drop function if exists public.is_active_user();
