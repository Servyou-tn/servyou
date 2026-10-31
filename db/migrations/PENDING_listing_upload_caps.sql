-- Listing and upload limits (pre-beta security review M2 / M3 — docs/security/pre-beta-review-2026-10-31.md F1 / F2;
-- founder + architect decision 2026-10-31):
--   * at most 100 products per shop                                         hint products_per_shop_cap
--   * at most 20 service listings per freelancer profile (drafts included)   hint services_per_freelancer_cap
--   * at most 100 image uploads per account per rolling 24 h (product images, portfolio, avatars)
--                                                                            hint daily_upload_cap
-- Same shape as migration 105 (image_count_caps): BEFORE INSERT, SECURITY DEFINER, empty search_path, a per-parent
-- advisory lock so two concurrent inserts cannot both pass the count, 23514 + a hint the app maps to its FR / AR
-- message.
--
-- ⚑ One deliberate difference, flagged for the architect: the upload cap does NOT bypass on auth.uid() IS NULL.
-- Every uploaded_objects row is written by the service role (recordUploadProvenance, after the app's own
-- ownership + suspension checks), so the usual bypass would switch the cap off for every real upload. It counts by
-- owner_id whoever writes; only a row flagged `backfilled` (the provenance backfill) is exempt. shop-assets (logo /
-- banner, one each per shop) are not counted, as ruled.
--
-- The app refuses BEFORE storing anything (a count in the upload actions), so a refused upload leaves no orphan file;
-- this trigger is the backstop for a concurrent burst.
--
-- Live on 2026-10-31 (nothing existing is rejected or rewritten):
--   * fullest shop: 26 products; fullest freelancer profile: 10 service listings;
--   * uploaded_objects: 37 rows (avatars 2, shop-assets 2, product-images 33); busiest owner-day: 33 uploads;
--   * no trigger on uploaded_objects; indexes products_shop_idx, service_listings_freelancer_idx and
--     uploaded_objects_owner_idx serve the three counts.

create function public.enforce_products_per_shop_cap()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  if (select auth.uid()) is null then
    return new;
  end if;

  perform pg_advisory_xact_lock(hashtextextended('products.cap:' || new.shop_id::text, 0));

  select count(*) into v_count
    from public.products
   where shop_id = new.shop_id;

  if v_count >= 100 then
    raise exception 'Cette boutique a déjà 100 produits, le maximum.'
      using errcode = '23514', hint = 'products_per_shop_cap';
  end if;

  return new;
end;
$$;

create trigger trg_limit_products_per_shop
  before insert on public.products
  for each row execute function public.enforce_products_per_shop_cap();

create function public.enforce_services_per_freelancer_cap()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  if (select auth.uid()) is null then
    return new;
  end if;

  perform pg_advisory_xact_lock(hashtextextended('service_listings.cap:' || new.freelancer_profile_id::text, 0));

  select count(*) into v_count
    from public.service_listings
   where freelancer_profile_id = new.freelancer_profile_id;

  if v_count >= 20 then
    raise exception 'Ce profil a déjà 20 services, le maximum.'
      using errcode = '23514', hint = 'services_per_freelancer_cap';
  end if;

  return new;
end;
$$;

create trigger trg_limit_services_per_freelancer
  before insert on public.service_listings
  for each row execute function public.enforce_services_per_freelancer_cap();

create function public.enforce_daily_upload_cap()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  -- Not auth.uid(): these rows are written by the service role (see the header). Only the backfill is exempt.
  if new.backfilled or new.bucket not in ('product-images', 'portfolio-media', 'avatars') then
    return new;
  end if;

  perform pg_advisory_xact_lock(hashtextextended('uploads.daily:' || new.owner_id::text, 0));

  select count(*) into v_count
    from public.uploaded_objects
   where owner_id = new.owner_id
     and bucket in ('product-images', 'portfolio-media', 'avatars')
     and created_at > now() - interval '24 hours';

  if v_count >= 100 then
    raise exception 'Vous avez envoyé 100 photos en 24 heures, le maximum.'
      using errcode = '23514', hint = 'daily_upload_cap';
  end if;

  return new;
end;
$$;

create trigger trg_limit_daily_uploads
  before insert on public.uploaded_objects
  for each row execute function public.enforce_daily_upload_cap();

-- Trigger functions need no EXECUTE grant (not checked when a trigger fires); the PUBLIC default is already
-- revoked globally (migration 68), so none of them is an RPC. No table or column grant changes (allow-list
-- untouched).

-- Post-apply verification:
--   1. select tgname from pg_trigger where tgname in ('trg_limit_products_per_shop', 'trg_limit_services_per_freelancer',
--      'trg_limit_daily_uploads');  → 3 rows
--   2. src/__tests__/listing-caps-live.test.ts (products + uploads) and services-cap-live.test.ts (live, 1 sign-in
--      each): the 101st product / 21st service is refused 23514 + hint; the service role is not capped on
--      listings; the 101st upload row in 24 h is refused for any writer; a backfilled row and a shop-assets row pass.
--
-- Rollback:
--   drop trigger trg_limit_products_per_shop on public.products;
--   drop trigger trg_limit_services_per_freelancer on public.service_listings;
--   drop trigger trg_limit_daily_uploads on public.uploaded_objects;
--   drop function public.enforce_products_per_shop_cap();
--   drop function public.enforce_services_per_freelancer_cap();
--   drop function public.enforce_daily_upload_cap();
