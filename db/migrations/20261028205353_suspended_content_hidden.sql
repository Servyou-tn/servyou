-- A suspended account's public content is hidden (founder ruling 7, read half; ruling 3 of 2026-10-28 approves
-- the recommended Option A of docs/design/suspended-content-read-plan.md). Standards-reference Section 3 A01.
--
-- Live before this migration (verified 2026-10-28): 0 SELECT policies read profiles.suspended_at, so a suspended
-- account's shop, products, service listings, freelancer profile (and its child tables) and job posts stay
-- public. Each child table already follows its parent (product_images -> products, shop_categories /
-- shop_payment_methods -> shops, the seven freelancer child tables -> freelancer_profiles, job_post_skills ->
-- job_posts: their policies EXISTS-read the parent as the caller, so the parent's RLS applies), so only the 5
-- parent policies change. 0 suspended accounts live: nothing disappears at apply. No row is rewritten.
--
-- After: each parent policy's PUBLIC branch additionally requires the owning account to be active, through
-- private.is_account_active(uuid). The owner, admin, past-buyer branches -- and job_posts' separate
-- « Responders read the posts they answered » / « Admin reads all job_posts » policies -- are unchanged: the owner
-- still sees their own content, a past buyer still sees their order's shop / product / listing / freelancer.
-- Unsuspending restores visibility at once (nothing stored). public_profiles is NOT changed (ruling 3: past
-- counterparties keep seeing names).
-- products / service_listings get the check inside their own parent EXISTS too, explicitly, rather than relying
-- only on the parent's RLS applying inside the subquery.
-- Each USING below = the live expression (2026-10-28) + the is_account_active conjunct; nothing else moves.
-- P2-2: the helper is evaluated with the CALLER's EXECUTE (and schema USAGE) inside a PUBLIC-role policy, so anon
-- and authenticated are granted both explicitly -- without them every anonymous marketplace read fails 42501.

-- ─── helper (in a schema PostgREST does not expose) ───────────────────────────────────────────
-- A policy helper needs the caller's EXECUTE, so anon must hold it. In public it would also be an anon RPC
-- (/rest/v1/rpc/is_account_active) answering « is account X suspended » for ANY uuid. In the new schema
-- `private` (not in PostgREST's exposed schemas) it is reachable only from SQL -- here, the policies. USAGE on the
-- schema is granted to anon / authenticated so the policy expression can resolve it.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated;

create or replace function private.is_account_active(p_account uuid)
returns boolean
language sql
stable
security definer
set search_path to ''
as $function$
  select not exists (
    select 1 from public.profiles p
     where p.id = p_account
       and p.suspended_at is not null
  );
$function$;

revoke execute on function private.is_account_active(uuid) from public;
grant execute on function private.is_account_active(uuid) to anon, authenticated;

comment on function private.is_account_active(uuid) is
  'True unless the given account is suspended. Policy helper for the public branches of the 5 parent read policies (founder ruling 7, 2026-10-28). Lives in private so it is not an API endpoint.';

-- ─── the 5 parent policies ─────────────────────────────────────────────────────────────────────
alter policy "Shops readable when live, or by owner, buyer, or admin" on public.shops
  using (
    ((admin_hidden_at is null) and private.is_account_active(owner_id))
    or (owner_id = (select auth.uid()))
    or (select public.is_admin())
    or (exists (select 1 from public.orders o
                 where o.seller_id = shops.owner_id
                   and o.order_type = 'product'
                   and o.buyer_id = (select auth.uid())))
  );

alter policy "Products readable when live, or by owner, buyer, or admin" on public.products
  using (
    ((status = 'active') and (admin_hidden_at is null)
      and (exists (select 1 from public.shops s
                    where s.id = products.shop_id
                      and s.admin_hidden_at is null
                      and private.is_account_active(s.owner_id))))
    or (exists (select 1 from public.shops s
                 where s.id = products.shop_id
                   and s.owner_id = (select auth.uid())))
    or (select public.is_admin())
    or (exists (select 1 from public.orders o
                 where o.product_id = products.id
                   and o.buyer_id = (select auth.uid())))
  );

alter policy "Freelancer profiles readable when live, or by owner, buyer, or " on public.freelancer_profiles
  using (
    ((is_published = true) and (admin_hidden_at is null) and private.is_account_active(profile_id))
    or (profile_id = (select auth.uid()))
    or (select public.is_admin())
    or (exists (select 1 from public.orders o
                 where o.seller_id = freelancer_profiles.profile_id
                   and o.order_type = 'service'
                   and o.buyer_id = (select auth.uid())))
  );

alter policy "Services readable when live, or by owner, buyer, or admin" on public.service_listings
  using (
    ((status = 'active') and (admin_hidden_at is null)
      and (exists (select 1 from public.freelancer_profiles fp
                    where fp.id = service_listings.freelancer_profile_id
                      and fp.admin_hidden_at is null
                      and private.is_account_active(fp.profile_id))))
    or (exists (select 1 from public.freelancer_profiles fp
                 where fp.id = service_listings.freelancer_profile_id
                   and fp.profile_id = (select auth.uid())))
    or (select public.is_admin())
    or (exists (select 1 from public.orders o
                 where o.service_listing_id = service_listings.id
                   and o.buyer_id = (select auth.uid())))
  );

alter policy "Open posts or own posts readable" on public.job_posts
  using (
    ((status = 'open') and (admin_hidden_at is null) and private.is_account_active(consumer_id))
    or (consumer_id = (select auth.uid()))
  );

-- ─── ROLLBACK (do not run as part of this migration) ───────────────────────────────────────────
-- Per README "Rollback paths": apply as a NEW dated forward migration, never by deleting this file.
-- The live USING expressions of 2026-10-28, then drop the helper:
--
-- alter policy "Shops readable when live, or by owner, buyer, or admin" on public.shops using (
--   (admin_hidden_at is null) or (owner_id = (select auth.uid())) or (select public.is_admin())
--   or (exists (select 1 from public.orders o where o.seller_id = shops.owner_id and o.order_type = 'product'
--               and o.buyer_id = (select auth.uid()))));
-- alter policy "Products readable when live, or by owner, buyer, or admin" on public.products using (
--   ((status = 'active') and (admin_hidden_at is null) and (exists (select 1 from public.shops s
--     where s.id = products.shop_id and s.admin_hidden_at is null)))
--   or (exists (select 1 from public.shops s where s.id = products.shop_id and s.owner_id = (select auth.uid())))
--   or (select public.is_admin())
--   or (exists (select 1 from public.orders o where o.product_id = products.id and o.buyer_id = (select auth.uid()))));
-- alter policy "Freelancer profiles readable when live, or by owner, buyer, or " on public.freelancer_profiles using (
--   ((is_published = true) and (admin_hidden_at is null)) or (profile_id = (select auth.uid()))
--   or (select public.is_admin())
--   or (exists (select 1 from public.orders o where o.seller_id = freelancer_profiles.profile_id
--               and o.order_type = 'service' and o.buyer_id = (select auth.uid()))));
-- alter policy "Services readable when live, or by owner, buyer, or admin" on public.service_listings using (
--   ((status = 'active') and (admin_hidden_at is null) and (exists (select 1 from public.freelancer_profiles fp
--     where fp.id = service_listings.freelancer_profile_id and fp.admin_hidden_at is null)))
--   or (exists (select 1 from public.freelancer_profiles fp where fp.id = service_listings.freelancer_profile_id
--               and fp.profile_id = (select auth.uid())))
--   or (select public.is_admin())
--   or (exists (select 1 from public.orders o where o.service_listing_id = service_listings.id
--               and o.buyer_id = (select auth.uid()))));
-- alter policy "Open posts or own posts readable" on public.job_posts using (
--   ((status = 'open') and (admin_hidden_at is null)) or (consumer_id = (select auth.uid())));
-- drop function if exists private.is_account_active(uuid);
-- drop schema if exists private;  -- only if nothing else lives in it
