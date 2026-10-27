-- Moderated freelancers stop being REST-readable -- follow-up from PR #192's discovery (MEDIUM).
-- Same class and shape as migration 65 (products / shops) and migration 52 (service_listings);
-- standards-reference Section 3 A01.
--
-- Live before this migration: admin_hide_content('freelancer_profile') stamps ONLY
-- freelancer_profiles.admin_hidden_at. Nothing else moves: is_published is derived from ACTIVE
-- LISTINGS only (freelancer_has_active_listing), so it stays true, and the listings stay active. The
-- SELECT policies never look at admin_hidden_at on this branch of the graph:
--   * freelancer_profiles: `is_published OR owner OR admin`;
--   * its 7 children (skills, tools, education, certifications, languages, links, portfolio items):
--     `fp.is_published OR owner OR admin`, inline, each reading freelancer_profiles;
--   * service_listings (migration 52): public branch = `status = 'active' AND admin_hidden_at IS NULL`,
--     with no look at the profile.
-- Proven live (rolled back): a published profile moderated through the real RPC stayed readable to anon --
-- the profile row, its 9 live listings and its skills / tools / education / certification / languages.
-- Only the app's own `.is('freelancer_profiles.admin_hidden_at', null)` filters kept it off public pages.
--
-- Shape, mirroring migration 65: public = live rows; owner = every own row; admin = everything; buyer =
-- what they ordered. Rows that stop being public at apply: 0 (no profile is moderated today; 11 profiles,
-- 10 published, 23 listings of which 21 live, all stay exactly as readable as now).
--
-- Safety:
--   * Acyclic: service_listings -> freelancer_profiles -> orders, children -> freelancer_profiles ->
--     orders. freelancer_profiles never reads service_listings (is_published is a column), and no orders
--     policy reads any of these tables (orders SELECT = admin | buyer/seller by column). No other policy
--     in the schema references freelancer_profiles or service_listings (checked live). A
--     freelancer_profiles -> service_listings edge would recurse (42P17); do not add one.
--   * The freelancer_profiles buyer branch is keyed on orders.seller_id (= freelancer_profiles.profile_id,
--     set by trg_enforce_order_insert_integrity, migration 54) and order_type = 'service', never through
--     service_listings. It cannot be minted by a non-admin: migration 54's liveness check includes
--     fp.admin_hidden_at (read live, asserted by the suite); an admin skips its tier 2 but reads everything.
--   * The branches read orders as the CALLER, so anon keeps SELECT on orders (PR-2's grant sweep leaves it).
--   * Children: the buyer branch of the PROFILE would otherwise leak a moderated profile's skills,
--     education, certifications ... to any past buyer (they would pass `is_published`, which stays true
--     after moderation). The children therefore carry the cascade themselves instead of delegating bare.
--   * Every drop + create pair is in this one transaction: no window, and a gap would fail closed (no
--     SELECT policy = no rows), never open. Policy names are kept where they exist; only the semantics,
--     the comments and (for freelancer_profiles) the name change. Helper calls use (select ...).
--   * No write policy, grant, column, trigger or function changes.

-- ─── freelancer_profiles ────────────────────────────────────────────────────────────────────────
drop policy "Freelancer profiles viewable by everyone" on public.freelancer_profiles;

create policy "Freelancer profiles readable when live, or by owner, buyer, or admin"
  on public.freelancer_profiles for select
  using (
    (is_published = true and admin_hidden_at is null)
    or profile_id = (select auth.uid())
    or (select public.is_admin())
    or exists (
      select 1
        from public.orders o
       where o.seller_id = freelancer_profiles.profile_id
         and o.order_type = 'service'
         and o.buyer_id = (select auth.uid())
    )
  );

comment on policy "Freelancer profiles readable when live, or by owner, buyer, or admin" on public.freelancer_profiles is
  'Public: is_published (>= 1 active listing, the publish gate) and not admin-moderated. Owner: profile_id = auth.uid(), every own row incl. moderated. Admin: is_admin(). Buyer: a moderated or unpublished profile stays readable to anyone who ordered a service from it, so order recaps keep the freelancer (order-detail.ts, my-orders.ts, my-data.ts embed freelancer_profiles); keyed on orders.seller_id, never through service_listings (recursion). Not extended to the children below. Replaced "Freelancer profiles viewable by everyone" (is_published OR owner OR admin, no moderation look), follow-up from PR #192, 2026-10-27.';

-- ─── service_listings: public branch also requires the profile not to be moderated ──────────────
-- admin_hide_content('freelancer_profile') leaves every listing active. The cascade EXISTS runs under
-- freelancer_profiles' own policy above, as products' cascade runs under shops' in migration 65.
drop policy "Services readable when live, or by owner, buyer, or admin" on public.service_listings;

create policy "Services readable when live, or by owner, buyer, or admin"
  on public.service_listings for select
  using (
    (
      status = 'active'
      and admin_hidden_at is null
      and exists (
        select 1
          from public.freelancer_profiles fp
         where fp.id = service_listings.freelancer_profile_id
           and fp.admin_hidden_at is null
      )
    )
    or exists (
      select 1
        from public.freelancer_profiles fp
       where fp.id = service_listings.freelancer_profile_id
         and fp.profile_id = (select auth.uid())
    )
    or (select public.is_admin())
    or exists (
      select 1
        from public.orders o
       where o.service_listing_id = service_listings.id
         and o.buyer_id = (select auth.uid())
    )
  );

comment on policy "Services readable when live, or by owner, buyer, or admin" on public.service_listings is
  'Public: status = active, not admin-moderated, and its freelancer profile not admin-moderated (admin_hide_content(freelancer_profile) leaves the listings active). Owner (freelancer_profiles.profile_id = auth.uid()): every own row incl. draft/hidden/moderated. Admin: is_admin(). Buyer: any listing they have an order on, incl. paused/moderated, deliberately not gated on moderation (migration 52 D1). Same name as migration 52, cascade conjunct added by the moderated-freelancer fix, 2026-10-27.';

-- ─── the 7 children: readable when the profile is live, or own, or admin ────────────────────────
-- Same name and shape as today, one added conjunct on the public branch. The EXISTS reads
-- freelancer_profiles under its own policy, so a child is never readable while its parent is not.
drop policy "Anyone can view freelancer certifications" on public.freelancer_certifications;
create policy "Anyone can view freelancer certifications"
  on public.freelancer_certifications for select
  using (exists (
    select 1 from public.freelancer_profiles fp
     where fp.id = freelancer_certifications.freelancer_id
       and ((fp.is_published and fp.admin_hidden_at is null) or fp.profile_id = (select auth.uid()) or (select public.is_admin()))
  ));

drop policy "Anyone can view freelancer education" on public.freelancer_education;
create policy "Anyone can view freelancer education"
  on public.freelancer_education for select
  using (exists (
    select 1 from public.freelancer_profiles fp
     where fp.id = freelancer_education.freelancer_id
       and ((fp.is_published and fp.admin_hidden_at is null) or fp.profile_id = (select auth.uid()) or (select public.is_admin()))
  ));

drop policy "Languages viewable by everyone" on public.freelancer_languages;
create policy "Languages viewable by everyone"
  on public.freelancer_languages for select
  using (exists (
    select 1 from public.freelancer_profiles fp
     where fp.id = freelancer_languages.freelancer_profile_id
       and ((fp.is_published and fp.admin_hidden_at is null) or fp.profile_id = (select auth.uid()) or (select public.is_admin()))
  ));

drop policy "Links viewable by everyone" on public.freelancer_links;
create policy "Links viewable by everyone"
  on public.freelancer_links for select
  using (exists (
    select 1 from public.freelancer_profiles fp
     where fp.id = freelancer_links.freelancer_profile_id
       and ((fp.is_published and fp.admin_hidden_at is null) or fp.profile_id = (select auth.uid()) or (select public.is_admin()))
  ));

drop policy "Portfolio items viewable by everyone" on public.freelancer_portfolio_items;
create policy "Portfolio items viewable by everyone"
  on public.freelancer_portfolio_items for select
  using (exists (
    select 1 from public.freelancer_profiles fp
     where fp.id = freelancer_portfolio_items.freelancer_profile_id
       and ((fp.is_published and fp.admin_hidden_at is null) or fp.profile_id = (select auth.uid()) or (select public.is_admin()))
  ));

drop policy "Skills viewable by everyone" on public.freelancer_skills;
create policy "Skills viewable by everyone"
  on public.freelancer_skills for select
  using (exists (
    select 1 from public.freelancer_profiles fp
     where fp.id = freelancer_skills.freelancer_profile_id
       and ((fp.is_published and fp.admin_hidden_at is null) or fp.profile_id = (select auth.uid()) or (select public.is_admin()))
  ));

drop policy "Anyone can view freelancer tools" on public.freelancer_tools;
create policy "Anyone can view freelancer tools"
  on public.freelancer_tools for select
  using (exists (
    select 1 from public.freelancer_profiles fp
     where fp.id = freelancer_tools.freelancer_id
       and ((fp.is_published and fp.admin_hidden_at is null) or fp.profile_id = (select auth.uid()) or (select public.is_admin()))
  ));

comment on policy "Anyone can view freelancer certifications" on public.freelancer_certifications is
  'Public: profile published and not admin-moderated. Owner: own profile. Admin: is_admin(). Not extended to buyers (a past buyer reads the profile row, not its certifications). admin_hidden_at conjunct added 2026-10-27.';
comment on policy "Anyone can view freelancer education" on public.freelancer_education is
  'Public: profile published and not admin-moderated. Owner: own profile. Admin: is_admin(). Not extended to buyers. admin_hidden_at conjunct added 2026-10-27.';
comment on policy "Languages viewable by everyone" on public.freelancer_languages is
  'Public: profile published and not admin-moderated. Owner: own profile (also via "Owner manages own languages", unchanged). Admin: is_admin(). Not extended to buyers. admin_hidden_at conjunct added 2026-10-27.';
comment on policy "Links viewable by everyone" on public.freelancer_links is
  'Public: profile published and not admin-moderated. Owner: own profile. Admin: is_admin(). Not extended to buyers. admin_hidden_at conjunct added 2026-10-27.';
comment on policy "Portfolio items viewable by everyone" on public.freelancer_portfolio_items is
  'Public: profile published and not admin-moderated. Owner: own profile. Admin: is_admin(). Not extended to buyers. admin_hidden_at conjunct added 2026-10-27.';
comment on policy "Skills viewable by everyone" on public.freelancer_skills is
  'Public: profile published and not admin-moderated. Owner: own profile. Admin: is_admin(). Not extended to buyers. admin_hidden_at conjunct added 2026-10-27.';
comment on policy "Anyone can view freelancer tools" on public.freelancer_tools is
  'Public: profile published and not admin-moderated. Owner: own profile. Admin: is_admin(). Not extended to buyers. admin_hidden_at conjunct added 2026-10-27.';

-- ─── OPTIONAL (decision 2 in the report -- NOT part of the default apply) ──────────────────────
-- The job poster reads the headline / city of freelancers who answered their post
-- (annonce-detail.ts). A moderated responder's headline and city would now come back null for the poster
-- (name and proposal still render: they come from public_profiles and job_responses). To keep them, add
-- this branch to the freelancer_profiles policy above:
--
--   or exists (
--     select 1 from public.job_responses jr
--      where jr.freelancer_id = freelancer_profiles.profile_id
--   )
--
-- job_responses' own SELECT policy lets the post owner and the responder read it, so the EXISTS is
-- already scoped to "the caller sent or received it". Acyclic: job_responses -> job_posts, and no job_posts
-- policy reads freelancer_profiles. Costs one more read grant on a moderated profile (headline, bio, city
-- and the other columns, not the children).

-- ─── ROLLBACK (do not run as part of this migration) ───────────────────────────────────────────
-- Per README "Rollback paths": apply as a NEW dated forward migration, never by deleting this file.
-- Restores the exact pre-migration policies (all PUBLIC, no TO clause, bare auth.uid()).
--
-- drop policy "Anyone can view freelancer tools" on public.freelancer_tools;
-- create policy "Anyone can view freelancer tools" on public.freelancer_tools for select using (exists (select 1 from public.freelancer_profiles fp where fp.id = freelancer_tools.freelancer_id and (fp.is_published = true or fp.profile_id = auth.uid() or public.is_admin())));
-- drop policy "Skills viewable by everyone" on public.freelancer_skills;
-- create policy "Skills viewable by everyone" on public.freelancer_skills for select using (exists (select 1 from public.freelancer_profiles fp where fp.id = freelancer_skills.freelancer_profile_id and (fp.is_published = true or fp.profile_id = auth.uid() or public.is_admin())));
-- drop policy "Portfolio items viewable by everyone" on public.freelancer_portfolio_items;
-- create policy "Portfolio items viewable by everyone" on public.freelancer_portfolio_items for select using (exists (select 1 from public.freelancer_profiles fp where fp.id = freelancer_portfolio_items.freelancer_profile_id and (fp.is_published = true or fp.profile_id = auth.uid() or public.is_admin())));
-- drop policy "Links viewable by everyone" on public.freelancer_links;
-- create policy "Links viewable by everyone" on public.freelancer_links for select using (exists (select 1 from public.freelancer_profiles fp where fp.id = freelancer_links.freelancer_profile_id and (fp.is_published = true or fp.profile_id = auth.uid() or public.is_admin())));
-- drop policy "Languages viewable by everyone" on public.freelancer_languages;
-- create policy "Languages viewable by everyone" on public.freelancer_languages for select using (exists (select 1 from public.freelancer_profiles fp where fp.id = freelancer_languages.freelancer_profile_id and (fp.is_published = true or fp.profile_id = auth.uid() or public.is_admin())));
-- drop policy "Anyone can view freelancer education" on public.freelancer_education;
-- create policy "Anyone can view freelancer education" on public.freelancer_education for select using (exists (select 1 from public.freelancer_profiles fp where fp.id = freelancer_education.freelancer_id and (fp.is_published = true or fp.profile_id = auth.uid() or public.is_admin())));
-- drop policy "Anyone can view freelancer certifications" on public.freelancer_certifications;
-- create policy "Anyone can view freelancer certifications" on public.freelancer_certifications for select using (exists (select 1 from public.freelancer_profiles fp where fp.id = freelancer_certifications.freelancer_id and (fp.is_published = true or fp.profile_id = auth.uid() or public.is_admin())));
--
-- drop policy "Services readable when live, or by owner, buyer, or admin" on public.service_listings;
-- create policy "Services readable when live, or by owner, buyer, or admin" on public.service_listings for select
--   using (((status = 'active' and admin_hidden_at is null)
--     or exists (select 1 from public.freelancer_profiles fp where fp.id = service_listings.freelancer_profile_id and fp.profile_id = (select auth.uid()))
--     or public.is_admin()
--     or exists (select 1 from public.orders o where o.service_listing_id = service_listings.id and o.buyer_id = (select auth.uid()))));
--
-- drop policy "Freelancer profiles readable when live, or by owner, buyer, or admin" on public.freelancer_profiles;
-- create policy "Freelancer profiles viewable by everyone" on public.freelancer_profiles for select
--   using ((is_published = true) or (profile_id = auth.uid()) or public.is_admin());
