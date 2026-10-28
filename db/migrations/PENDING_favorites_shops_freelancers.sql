-- favorites: shops and freelancers become favoritable; a favorite is read only while its target is visible.
-- Founder brief (2026-10-28) for F1 « Mes favoris » Boutiques / Freelances tabs (Figma 720:62084 / 720:62688, read
-- via fig.mjs dump 2026-10-28; disabled in the app since PR #141 because the table had no shop / freelancer FK).
-- Standards-reference Section 3 A01.
--
-- Live before this migration (verified 2026-10-28): favorites(id, user_id, item_type, product_id,
-- service_listing_id, created_at); CHECKs favorites_item_type_check (product | service) and
-- favorite_target_matches_type (exactly the matching FK set); UNIQUE (user_id, product_id) and
-- (user_id, service_listing_id); FKs ON DELETE CASCADE; RLS « Users read / insert / delete own favorites »
-- (user_id = auth.uid(), PUBLIC role); trg_enforce_active_user; grants anon SELECT, authenticated SELECT / INSERT /
-- DELETE (no UPDATE -- favorites are toggled by insert / delete). 2 rows, both item_type 'service', both
-- pointing at an active, unmoderated service of a published, unmoderated freelancer: none breaks the new CHECKs,
-- and both stay readable under the new SELECT policy.
--
-- After:
--   1. item_type also accepts 'shop' and 'freelancer'; new nullable FKs shop_id -> shops(id) and
--      freelancer_profile_id -> freelancer_profiles(id), both ON DELETE CASCADE (like the existing two);
--      favorite_target_matches_type requires exactly the one FK that matches item_type; UNIQUE per user on each;
--      a partial index on each new FK so a shop / profile delete's cascade does not scan favorites.
--   2. SELECT (« Users read own favorites », same name, same PUBLIC role) additionally requires the target to be
--      readable BY THE CALLER: an EXISTS on the target table, evaluated under that table's own RLS -- so a
--      moderated or suspended (migration 95) shop / product / service / freelancer drops out of « Mes favoris »
--      (and an unpublished freelancer profile, which is not public either), and comes back when unhidden: the
--      favorite row is never deleted. Applied to all four types (the brief's « reads must respect the target's
--      visibility »); the owner / past-buyer branches of the target policies still apply as everywhere.
--   3. INSERT / DELETE policies and grants unchanged (« RLS same as today »). The new columns are covered by
--      authenticated's table-level INSERT; anon's SELECT grant matches no policy (anon reads nothing), unchanged.
-- No row is rewritten. Column privileges: the EXISTS subqueries name only `id` on each target (granted).

-- ─── 1. columns, checks, uniqueness ───────────────────────────────────────────────────────────
alter table public.favorites
  add column shop_id uuid references public.shops (id) on delete cascade,
  add column freelancer_profile_id uuid references public.freelancer_profiles (id) on delete cascade;

alter table public.favorites drop constraint favorites_item_type_check;
alter table public.favorites add constraint favorites_item_type_check
  check (item_type = any (array['product', 'service', 'shop', 'freelancer']));

alter table public.favorites drop constraint favorite_target_matches_type;
alter table public.favorites add constraint favorite_target_matches_type check (
     (item_type = 'product'    and product_id is not null and service_listing_id is null and shop_id is null and freelancer_profile_id is null)
  or (item_type = 'service'    and service_listing_id is not null and product_id is null and shop_id is null and freelancer_profile_id is null)
  or (item_type = 'shop'       and shop_id is not null and product_id is null and service_listing_id is null and freelancer_profile_id is null)
  or (item_type = 'freelancer' and freelancer_profile_id is not null and product_id is null and service_listing_id is null and shop_id is null)
);

alter table public.favorites add constraint favorites_user_id_shop_id_key unique (user_id, shop_id);
alter table public.favorites add constraint favorites_user_id_freelancer_profile_id_key unique (user_id, freelancer_profile_id);

create index favorites_shop_id_idx on public.favorites (shop_id) where shop_id is not null;
create index favorites_freelancer_profile_id_idx on public.favorites (freelancer_profile_id) where freelancer_profile_id is not null;

-- ─── 2. reads follow the target's visibility ──────────────────────────────────────────────────
alter policy "Users read own favorites" on public.favorites
  using (
    user_id = (select auth.uid())
    and (
         (item_type = 'product'    and exists (select 1 from public.products p where p.id = favorites.product_id))
      or (item_type = 'service'    and exists (select 1 from public.service_listings sl where sl.id = favorites.service_listing_id))
      or (item_type = 'shop'       and exists (select 1 from public.shops s where s.id = favorites.shop_id))
      or (item_type = 'freelancer' and exists (select 1 from public.freelancer_profiles fp where fp.id = favorites.freelancer_profile_id))
    )
  );

comment on policy "Users read own favorites" on public.favorites is
  'Own favorites whose target the caller can currently read (the target table''s own RLS applies inside the EXISTS): a moderated / suspended / unpublished target is hidden, never deleted. 2026-10-28.';

-- ─── ROLLBACK (do not run as part of this migration) ───────────────────────────────────────────
-- Per README "Rollback paths": apply as a NEW dated forward migration, never by deleting this file.
-- Lossy for shop / freelancer favorites (they must be deleted before the old CHECKs can return).
--
-- alter policy "Users read own favorites" on public.favorites using (user_id = auth.uid());
-- delete from public.favorites where item_type in ('shop', 'freelancer');
-- drop index if exists public.favorites_freelancer_profile_id_idx;
-- drop index if exists public.favorites_shop_id_idx;
-- alter table public.favorites drop constraint favorites_user_id_freelancer_profile_id_key;
-- alter table public.favorites drop constraint favorites_user_id_shop_id_key;
-- alter table public.favorites drop constraint favorite_target_matches_type;
-- alter table public.favorites add constraint favorite_target_matches_type check (
--   ((item_type = 'product') and (product_id is not null) and (service_listing_id is null))
--   or ((item_type = 'service') and (service_listing_id is not null) and (product_id is null)));
-- alter table public.favorites drop constraint favorites_item_type_check;
-- alter table public.favorites add constraint favorites_item_type_check
--   check (item_type = any (array['product', 'service']));
-- alter table public.favorites drop column freelancer_profile_id, drop column shop_id;
