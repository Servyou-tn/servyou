-- public_profiles: a moderated seller is not listed (except to themselves and to admins).
-- Founder ruling 9 (2026-10-28) on « LOW — public_profiles still exposes name and city of a moderated freelancer
-- (and of a moderated shop owner) » (docs/follow-ups/live-suite-teardown-guard.md, moderated-freelancer read
-- fix). Standards-reference Section 3 A01.
--
-- Live before this migration (verified 2026-10-28): public_profiles = SELECT id, full_name, city, language,
-- seller_type, avatar_url FROM profiles (security_barrier, definer -- intentional: its column list IS the
-- protection, CLAUDE.md), SELECT for anon + authenticated, writes revoked (migration 60). It is keyed on
-- profiles, not on seller moderation, so a moderated shop owner / freelancer stays resolvable by id, and
-- only the app's own filters hide the card. 0 moderated shops / freelancer profiles live.
--
-- After: a profile whose shop or freelancer profile has admin_hidden_at set is filtered out, except for the
-- account itself and for admins (is_admin(); anon and authenticated hold EXECUTE on it and on auth.uid(), which
-- a view's caller needs -- functions in a view run with the caller's EXECUTE). Same six columns, same order,
-- same options; CREATE OR REPLACE keeps the ACL and the write revokes. Never add phone / email /
-- date_of_birth.
--
-- Consequence (decision for the founder, see the report): every surface that resolves a name through
-- public_profiles (23 app modules -- my-orders, seller-orders, order-detail, missions ClientCard, admin
-- signalements reporter names, …) shows its « no name » fallback for a moderated seller, including on a
-- buyer's PAST orders with that seller. Admin pages keep the name (is_admin()).

create or replace view public.public_profiles
with (security_barrier = true)
as
select p.id,
       p.full_name,
       p.city,
       p.language,
       p.seller_type,
       p.avatar_url
  from public.profiles p
 where (    not exists (select 1 from public.shops s
                         where s.owner_id = p.id and s.admin_hidden_at is not null)
        and not exists (select 1 from public.freelancer_profiles f
                         where f.profile_id = p.id and f.admin_hidden_at is not null))
    or p.id = (select auth.uid())
    or (select public.is_admin());

comment on view public.public_profiles is
  'Cross-user read of name / city / language / seller_type / avatar. Its protection IS its column list: never add phone, email or date_of_birth. A moderated seller (shop or freelancer profile with admin_hidden_at) is hidden except to themselves and admins (founder ruling 9, 2026-10-28).';

-- ─── ROLLBACK (do not run as part of this migration) ───────────────────────────────────────────
-- Per README "Rollback paths": apply as a NEW dated forward migration, never by deleting this file.
--
-- create or replace view public.public_profiles
-- with (security_barrier = true)
-- as
-- select id, full_name, city, language, seller_type, avatar_url
--   from public.profiles;
