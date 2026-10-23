-- H6 PR-1 -- service_listings hardening ahead of H6 (the service-creation wizard) writing drafts.
-- Rulings G1-G3 (founder + architect, 2026-10-23); the buyer branch in G1 is PR-1 discovery
-- decision D1 (founder, 2026-10-23).
--
-- G1: SELECT stops being `using (true)`. Until now every row -- a draft, an owner-paused service, an
-- admin-moderated one -- was readable by anyone holding its id through the REST API; only the app's
-- own status='active' filters kept those off public pages. The DB now enforces it:
--   * public: live listings only (status='active' and not admin-moderated);
--   * owner: every own row -- H5's list/counts, the moderation banner, and the RETURNING of H5's
--     toggle/delete and H6's insert().select() all depend on this branch;
--   * admin: everything, via is_admin() -- /admin/signalements/[id] reads the hidden target row to
--     render the unhide UI;
--   * buyer (D1): any listing they have an order on. /mes-commandes and the E2 recap embed the live
--     listing, and the 10 pre-snapshot service orders have no item_title/unit_price_tnd to fall
--     back on, so without this branch an owner pausing a service would blank the buyer's own order
--     history. Deliberately not gated on admin_hidden_at: a buyer's record of their own transaction
--     outlives moderation (same reasoning as the order snapshot). No recursion: no orders policy
--     references service_listings.
-- Drop + create in one migration: no window, and a gap would fail closed (no SELECT policy = no
-- rows), never open.
drop policy "Services viewable by everyone" on public.service_listings;

create policy "Services readable when live, or by owner, buyer, or admin"
  on public.service_listings for select
  using (
    (status = 'active' and admin_hidden_at is null)
    or exists (
      select 1
        from public.freelancer_profiles fp
       where fp.id = service_listings.freelancer_profile_id
         and fp.profile_id = (select auth.uid())
    )
    or public.is_admin()
    or exists (
      select 1
        from public.orders o
       where o.service_listing_id = service_listings.id
         and o.buyer_id = (select auth.uid())
    )
  );

comment on policy "Services readable when live, or by owner, buyer, or admin" on public.service_listings is
  'Public: status=active and admin_hidden_at is null. Owner (freelancer_profiles.profile_id = auth.uid()): every own row incl. draft/hidden/moderated. Admin: every row via is_admin(). Buyer: any listing they have an order on, incl. paused/moderated, so their own order history keeps its title/price. Replaced "Services viewable by everyone" (using true) per H6 ruling G1, 2026-10-23.';

-- G2: H6 saves a draft before it has a price. Only a draft may lack one -- publishing (-> active)
-- and pausing (-> hidden) both require it. title stays NOT NULL. The existing
-- service_listings_starting_price_tnd_check (>= 0) is unchanged; NULL passes it.
alter table public.service_listings
  alter column starting_price_tnd drop not null;

alter table public.service_listings
  add constraint service_listings_price_required_unless_draft
  check (status = 'draft' or starting_price_tnd is not null);

comment on constraint service_listings_price_required_unless_draft on public.service_listings is
  'starting_price_tnd may be NULL only while status = draft (H6 saves an in-progress service before its price step). active and hidden rows always carry a price. H6 ruling G2, 2026-10-23.';

-- G3: deleting a subcategory clears the pointer instead of being blocked by it (same action as
-- category_id's FK).
alter table public.service_listings
  drop constraint service_listings_subcategory_id_fkey;

alter table public.service_listings
  add constraint service_listings_subcategory_id_fkey
  foreign key (subcategory_id) references public.categories(id) on delete set null;

-- G3: subcategory_id, when set, must be a kind='service' child of THIS row's category_id. Separate
-- from enforce_service_category_kind on purpose: that one governs the sector (and accepts 'both');
-- this one governs the sector/subcategory pair. Fires on category_id too, so changing the sector
-- alone cannot leave a mismatched pair. Consequence (D2, founder 2026-10-23): deleting a sector
-- whose services carry a subcategory fails here -- the FK sets category_id NULL while subcategory_id
-- is still set -- so those services must be re-homed first. Sectors only change via migrations.
create or replace function public.enforce_service_subcategory_parent()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if new.subcategory_id is not null
     and not exists (
       select 1
         from public.categories c
        where c.id = new.subcategory_id
          and c.parent_id = new.category_id
          and c.kind = 'service'
     )
  then
    raise exception 'Sous-catégorie invalide : elle doit appartenir au secteur choisi.'
      using errcode = '23514';
  end if;

  return new;
end;
$function$;

comment on function public.enforce_service_subcategory_parent() is
  'BEFORE INSERT OR UPDATE OF category_id, subcategory_id on service_listings: a non-null subcategory_id must reference a categories row with kind = service and parent_id = NEW.category_id (so a NULL category_id with a subcategory set is rejected). Raises 23514. H6 ruling G3, 2026-10-23. SECURITY DEFINER.';

create trigger trg_enforce_service_subcategory_parent
  before insert or update of category_id, subcategory_id on public.service_listings
  for each row execute function public.enforce_service_subcategory_parent();

-- ─── ROLLBACK (do not run as part of this migration) ───────────────────────────────────────────
-- Per README "Rollback paths": apply as a NEW dated forward migration, never by deleting this file.
--
-- drop trigger if exists trg_enforce_service_subcategory_parent on public.service_listings;
-- drop function if exists public.enforce_service_subcategory_parent();
--
-- alter table public.service_listings drop constraint service_listings_subcategory_id_fkey;
-- alter table public.service_listings
--   add constraint service_listings_subcategory_id_fkey
--   foreign key (subcategory_id) references public.categories(id);
--
-- alter table public.service_listings drop constraint service_listings_price_required_unless_draft;
-- -- NOT NULL can only return once no row lacks a price. Check first, then the founder decides per
-- -- row whether to delete each price-less draft or price it:
-- --   select id, title, status from public.service_listings where starting_price_tnd is null;
-- alter table public.service_listings alter column starting_price_tnd set not null;
--
-- drop policy "Services readable when live, or by owner, buyer, or admin" on public.service_listings;
-- create policy "Services viewable by everyone" on public.service_listings for select using (true);
