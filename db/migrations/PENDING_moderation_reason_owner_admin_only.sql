-- admin_hidden_reason: readable only by the row's owner and by admins (never public, never a past buyer).
-- Founder ruling 9 (2026-10-28) on « LOW (Sonnet review of #75) — freelancer_profiles.admin_hidden_reason is
-- readable by the owner and, since #75, by a past buyer » and its « Same question for shops / products /
-- service_listings / job_posts » (docs/follow-ups/live-suite-teardown-guard.md). Standards-reference Section 3
-- A01.
--
-- ⚠ APPLY ONLY AFTER the app PR that stops selecting the column has DEPLOYED (see « App precondition »).
--   Applied first, every listed read path fails 42501 in production.
--
-- Live before this migration (verified 2026-10-28): anon and authenticated hold TABLE-level SELECT on all five
-- tables that carry admin_hidden_reason (shops, products, service_listings, freelancer_profiles, job_posts), no
-- column-level SELECT ACLs. So whoever passes a row's SELECT policy reads the moderator's note: the owner (fine),
-- an admin (fine), and also a past buyer (shops / freelancer_profiles / products / service_listings buyer
-- branches) and anyone reading a row whose policy does not filter moderation. 0 moderated rows live; no policy
-- and no view references the column; no invoker-rights function reads these tables.
--
-- After:
--   1. SELECT on the five tables is re-granted column by column to anon and authenticated, every live column
--      (information_schema.columns, 2026-10-28) except admin_hidden_reason. Row visibility (RLS) is unchanged.
--   2. public.get_moderation_reason(target_type text, target_id uuid) returns the reason when the caller is an
--      admin or the row's owner (shop owner_id; product -> its shop's owner; freelancer profile_id; service
--      listing -> its freelancer profile's profile_id; job post consumer_id), else NULL. SECURITY DEFINER,
--      search_path '', STABLE; EXECUTE for authenticated only (an RPC the app calls; anon never needs it).
--      target_type uses admin_hide_content's names ('shop', 'product', 'freelancer_profile', 'service',
--      'job_post'); anything else returns NULL.
--
-- App precondition (grep 2026-10-28) -- these selects must drop admin_hidden_reason first:
--   * src/app/admin/signalements/[id]/page.tsx:141  .select('id, admin_hidden_at, admin_hidden_reason')
--       -> select without it; read the reason with rpc('get_moderation_reason', …) (admins pass).
--   * src/lib/marche/annonce-detail.ts:126          (job_posts; selected but never rendered)
--   * src/lib/marche/seller-products-query.ts:95    (products; mapped to adminHiddenReason, never rendered)
--   * src/app/actions/products.ts:~808              `.update(…).select().maybeSingle()` = RETURNING *, which
--       needs SELECT on every column -> select('id') (it only tests for a row).
--   No other client select names the column or uses `*` on these tables.
-- New columns on these five tables are no longer client-readable until granted (rule for the db-guardian skill).

-- ─── 1. column-level SELECT ─────────────────────────────────────────────────────────────────────
revoke select on public.shops, public.products, public.service_listings, public.freelancer_profiles,
                 public.job_posts
  from anon, authenticated;

grant select (id, owner_id, name, description, city, logo_url, banner_url, created_at, updated_at, shop_type,
              delivery_setup, working_hours, location_detail, preferred_carriers, admin_hidden_at)
  on public.shops to anon, authenticated;

grant select (id, shop_id, category_id, title, description, price_tnd, status, tracks_stock, stock_count,
              created_at, updated_at, admin_hidden_at, search_vector, delivery_fee_tnd)
  on public.products to anon, authenticated;

grant select (id, freelancer_profile_id, category_id, title, description, starting_price_tnd, delivery_time,
              status, created_at, updated_at, admin_hidden_at, search_vector, deliverables, revisions_count, tags,
              buyer_briefing, delivery_mode, subcategory_id, short_description, price_unit)
  on public.service_listings to anon, authenticated;

grant select (id, profile_id, headline, bio, city, portfolio_link, years_experience, languages, created_at,
              updated_at, working_hours, current_workplace, preferred_payment_method, admin_hidden_at,
              is_published, workplace_location)
  on public.freelancer_profiles to anon, authenticated;

grant select (id, consumer_id, title, description, budget_min, budget_max, category_id, city, is_remote, deadline,
              status, created_at, updated_at, admin_hidden_at, response_count)
  on public.job_posts to anon, authenticated;

-- ─── 2. owner / admin read ──────────────────────────────────────────────────────────────────────
create or replace function public.get_moderation_reason(target_type text, target_id uuid)
returns text
language plpgsql
stable
security definer
set search_path to ''
as $function$
declare
  v_caller uuid := (select auth.uid());
  v_owner  uuid;
  v_reason text;
begin
  if v_caller is null then
    return null;
  end if;

  if target_type = 'shop' then
    select s.owner_id, s.admin_hidden_reason into v_owner, v_reason
      from public.shops s where s.id = target_id;
  elsif target_type = 'product' then
    select s.owner_id, p.admin_hidden_reason into v_owner, v_reason
      from public.products p join public.shops s on s.id = p.shop_id where p.id = target_id;
  elsif target_type = 'freelancer_profile' then
    select fp.profile_id, fp.admin_hidden_reason into v_owner, v_reason
      from public.freelancer_profiles fp where fp.id = target_id;
  elsif target_type = 'service' then
    select fp.profile_id, sl.admin_hidden_reason into v_owner, v_reason
      from public.service_listings sl join public.freelancer_profiles fp on fp.id = sl.freelancer_profile_id
     where sl.id = target_id;
  elsif target_type = 'job_post' then
    select jp.consumer_id, jp.admin_hidden_reason into v_owner, v_reason
      from public.job_posts jp where jp.id = target_id;
  else
    return null;
  end if;

  if v_owner = v_caller or public.is_admin() then
    return v_reason;
  end if;
  return null;
end;
$function$;

revoke execute on function public.get_moderation_reason(text, uuid) from public, anon;
grant execute on function public.get_moderation_reason(text, uuid) to authenticated;

comment on function public.get_moderation_reason(text, uuid) is
  'The moderator''s note on a shop / product / freelancer_profile / service / job_post, for its owner or an admin; NULL for anyone else. admin_hidden_reason has no client SELECT grant (founder ruling 9, 2026-10-28).';

-- ─── ROLLBACK (do not run as part of this migration) ───────────────────────────────────────────
-- Per README "Rollback paths": apply as a NEW dated forward migration, never by deleting this file.
-- Restores the live ACL of 2026-10-28 (table-level SELECT for anon and authenticated, no column SELECT ACLs):
--
-- drop function if exists public.get_moderation_reason(text, uuid);
-- revoke select (id, owner_id, name, description, city, logo_url, banner_url, created_at, updated_at, shop_type,
--                delivery_setup, working_hours, location_detail, preferred_carriers, admin_hidden_at)
--   on public.shops from anon, authenticated;
-- revoke select (id, shop_id, category_id, title, description, price_tnd, status, tracks_stock, stock_count,
--                created_at, updated_at, admin_hidden_at, search_vector, delivery_fee_tnd)
--   on public.products from anon, authenticated;
-- revoke select (id, freelancer_profile_id, category_id, title, description, starting_price_tnd, delivery_time,
--                status, created_at, updated_at, admin_hidden_at, search_vector, deliverables, revisions_count,
--                tags, buyer_briefing, delivery_mode, subcategory_id, short_description, price_unit)
--   on public.service_listings from anon, authenticated;
-- revoke select (id, profile_id, headline, bio, city, portfolio_link, years_experience, languages, created_at,
--                updated_at, working_hours, current_workplace, preferred_payment_method, admin_hidden_at,
--                is_published, workplace_location)
--   on public.freelancer_profiles from anon, authenticated;
-- revoke select (id, consumer_id, title, description, budget_min, budget_max, category_id, city, is_remote,
--                deadline, status, created_at, updated_at, admin_hidden_at, response_count)
--   on public.job_posts from anon, authenticated;
-- grant select on public.shops, public.products, public.service_listings, public.freelancer_profiles,
--                 public.job_posts to anon, authenticated;
