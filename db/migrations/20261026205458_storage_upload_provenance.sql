-- Storage upload provenance -- close the « raw bytes PUT straight to the Storage REST API » bypass on the
-- image columns that render bytes. docs/follow-ups.md « LOW — storage provenance missing for avatars and
-- shop assets » (the owed Storage-REST provenance PR).
--
-- Live on 2026-10-26:
--   * Buckets avatars (256 KB), shop-assets, product-images, portfolio-media (2 MB) are public and accept only
--     the declared MIME image/webp -- declared by the client, not sniffed. An authenticated user may INSERT
--     objects under their own uid folder (avatars, portfolio-media) or their own shop folder (shop-assets,
--     product-images); no client UPDATE policy exists (objects are immutable; the three « Suspended accounts »
--     policies are RESTRICTIVE). So any signed-in user can PUT arbitrary bytes labelled image/webp into their
--     own folder, skipping normalize.ts (decode, strip metadata, re-encode, size caps).
--   * The app uploads with the user's own session after normalizing, verifies the stored size, then records
--     public.uploaded_objects (bucket, path, owner_id) with the SERVICE ROLE before it writes the URL anywhere
--     (src/lib/images/provenance.ts) -- avatars, shop logo / banner, product images and portfolio images alike.
--   * Only product_images and freelancer_portfolio_items check that record (enforce_product_image_provenance /
--     enforce_portfolio_image_provenance). profiles.avatar_url (column-granted to authenticated) and
--     shops.logo_url / banner_url (table-level UPDATE) are free text: a PATCH can point them at a raw-PUT
--     object in the caller's folder, or at any URL at all.
--   * Both existing triggers match only the path SUFFIX ('/object/public/<bucket>/(.*)$'), not the host: an
--     image_url of https://evil.example/storage/v1/object/public/product-images/<a path I uploaded> passes.
--   * Data: avatar_url set on 2 profiles, logo_url / banner_url on 1 shop each -- all 4 have a provenance
--     record; 33 of 33 product_images.image_url use this project's host; 0 portfolio items. 5 storage objects
--     in the four buckets have no provenance record (orphans: pre-provenance uploads or raw PUTs).
--
-- After it:
--   * public.storage_public_object_path(url, bucket): the object path when `url` is exactly this project's
--     public URL for `bucket` (host anchored, query string dropped), else NULL. IMMUTABLE, no table access.
--   * profiles.avatar_url and shops.logo_url / banner_url accept NULL, an unchanged value, or a URL whose path
--     has an uploaded_objects record in the right bucket owned by the row's owner (profiles.id /
--     shops.owner_id). Anything else -- a foreign host, a raw-PUT object, another user's object -- is refused
--     42501 with HINT unverified_upload. No caller bypass (same as the product / portfolio triggers): the
--     service role and admins set these columns only to NULL or to a recorded upload.
--   * enforce_product_image_provenance / enforce_portfolio_image_provenance anchor the host the same way
--     (decision S-2); their messages and everything else are unchanged.
--   Raw bytes can still be PUT into one's own folder (decision S-3), but nothing can publish them: every column
--   that renders an uploaded image now requires a provenance record, which only the app's service-role step
--   writes after normalize.ts.
--
-- Not changed: storage policies, buckets, uploaded_objects, any existing row. Every existing value passes.

create or replace function public.storage_public_object_path(p_url text, p_bucket text)
returns text
language sql
immutable
set search_path to ''
as $function$
  -- This project's public object URL, exactly as storage.from(bucket).getPublicUrl(path) builds it.
  select nullif(
    split_part(
      substr(p_url, length('https://xggomcitqrkaylqezjjz.supabase.co/storage/v1/object/public/' || p_bucket || '/') + 1),
      '?', 1),
    '')
  where left(p_url, length('https://xggomcitqrkaylqezjjz.supabase.co/storage/v1/object/public/' || p_bucket || '/'))
      = 'https://xggomcitqrkaylqezjjz.supabase.co/storage/v1/object/public/' || p_bucket || '/';
$function$;

revoke execute on function public.storage_public_object_path(text, text) from public, anon, authenticated;

-- ── profiles.avatar_url ─────────────────────────────────────────────────────────────────────────────────
create or replace function public.enforce_avatar_provenance()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_path text;
begin
  if new.avatar_url is null
     or (tg_op = 'UPDATE' and new.avatar_url is not distinct from old.avatar_url) then
    return new;
  end if;
  v_path := public.storage_public_object_path(new.avatar_url, 'avatars');
  if v_path is null or not exists (
    select 1 from public.uploaded_objects uo
     where uo.bucket = 'avatars' and uo.path = v_path and uo.owner_id = new.id
  ) then
    raise exception 'Cette image n''a pas été téléversée par Servyou.'
      using errcode = '42501', hint = 'unverified_upload';
  end if;
  return new;
end;
$function$;

revoke execute on function public.enforce_avatar_provenance() from public, anon, authenticated;

create trigger trg_enforce_avatar_provenance
  before insert or update of avatar_url on public.profiles
  for each row execute function public.enforce_avatar_provenance();

-- ── shops.logo_url / banner_url ─────────────────────────────────────────────────────────────────────────
create or replace function public.enforce_shop_asset_provenance()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_url  text;
  v_path text;
begin
  foreach v_url in array array[
    case when new.logo_url is not null
              and (tg_op = 'INSERT' or new.logo_url is distinct from old.logo_url) then new.logo_url end,
    case when new.banner_url is not null
              and (tg_op = 'INSERT' or new.banner_url is distinct from old.banner_url) then new.banner_url end
  ] loop
    continue when v_url is null;
    v_path := public.storage_public_object_path(v_url, 'shop-assets');
    if v_path is null or not exists (
      select 1 from public.uploaded_objects uo
       where uo.bucket = 'shop-assets' and uo.path = v_path and uo.owner_id = new.owner_id
    ) then
      raise exception 'Cette image n''a pas été téléversée par Servyou.'
        using errcode = '42501', hint = 'unverified_upload';
    end if;
  end loop;
  return new;
end;
$function$;

revoke execute on function public.enforce_shop_asset_provenance() from public, anon, authenticated;

create trigger trg_enforce_shop_asset_provenance
  before insert or update of logo_url, banner_url on public.shops
  for each row execute function public.enforce_shop_asset_provenance();

-- ── S-2: anchor the host in the two existing provenance triggers (same messages, same owner logic) ──────
create or replace function public.enforce_product_image_provenance()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_path        text;
  v_shop_owner  uuid;
begin
  -- Host-anchored since this migration (storage_public_object_path): a foreign host carrying a valid path
  -- suffix no longer passes.
  v_path := public.storage_public_object_path(new.image_url, 'product-images');

  if v_path is null or v_path = '' then
    raise exception 'product-images provenance check failed: % is not a recognized product-images object url', new.image_url;
  end if;

  select s.owner_id into v_shop_owner
  from public.products p
  join public.shops s on s.id = p.shop_id
  where p.id = new.product_id;

  if v_shop_owner is null then
    raise exception 'product-images provenance check failed: product % has no resolvable shop owner', new.product_id;
  end if;

  if not exists (
    select 1 from public.uploaded_objects uo
    where uo.bucket = 'product-images'
      and uo.path = v_path
      and uo.owner_id = v_shop_owner
  ) then
    raise exception 'product-images provenance check failed: % has no validated upload record for owner %', v_path, v_shop_owner;
  end if;

  return new;
end;
$function$;
-- The live body of 2026-10-26 with only the path extraction swapped.
create or replace function public.enforce_portfolio_image_provenance()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_path   text;
  v_owner  uuid;
begin
  v_path := public.storage_public_object_path(new.image_url, 'portfolio-media');

  if v_path is null or v_path = '' then
    raise exception 'portfolio-media provenance check failed: % is not a recognized portfolio-media object url', new.image_url;
  end if;

  select fp.profile_id into v_owner
  from public.freelancer_profiles fp
  where fp.id = new.freelancer_profile_id;

  if v_owner is null then
    raise exception 'portfolio-media provenance check failed: freelancer_profile % has no resolvable owner', new.freelancer_profile_id;
  end if;

  if not exists (
    select 1 from public.uploaded_objects uo
    where uo.bucket = 'portfolio-media'
      and uo.path = v_path
      and uo.owner_id = v_owner
  ) then
    raise exception 'portfolio-media provenance check failed: % has no validated upload record for owner %', v_path, v_owner;
  end if;

  return new;
end;
$function$;

-- ── S-3 (NOT in this migration; needs app code): stop the raw PUT itself ────────────────────────────────
-- After the four upload actions (uploadAvatarAction, uploadShopAsset, updateShopAsset,
-- uploadProductImageAction, uploadPortfolioImageAction) upload through the service-role client (they already
-- normalize first and already use it for provenance), the client INSERT policies can go:
--   drop policy "avatars: owner inserts under own uid" on storage.objects;
--   drop policy "shop-assets: shop owner inserts under own shop" on storage.objects;
--   drop policy "product-images: shop owner inserts under own shop" on storage.objects;
--   drop policy "portfolio-media: owner inserts under own uid" on storage.objects;
-- (the owner read / delete policies and the restrictive suspension policies stay).

-- Post-apply verification:
--   1. select public.storage_public_object_path(
--        'https://xggomcitqrkaylqezjjz.supabase.co/storage/v1/object/public/avatars/u/x.webp?t=1', 'avatars')
--      = 'u/x.webp'; with host https://evil.example/... -> NULL; with bucket 'shop-assets' -> NULL.
--   2. every current avatar_url / logo_url / banner_url / product_images.image_url still passes:
--      select count(*) from public.profiles where avatar_url is not null
--        and not exists (select 1 from public.uploaded_objects uo where uo.bucket = 'avatars'
--          and uo.path = public.storage_public_object_path(avatar_url, 'avatars') and uo.owner_id = profiles.id);  -- 0
--      (same shape for shops x2 and product_images via shops.owner_id) -- 0 each.
--   3. as a user JWT in a rolled-back transaction: PATCH own avatar_url to https://example.com/a.webp ->
--      42501 unverified_upload; to own public URL of an object with no provenance row -> 42501; to NULL -> ok.
--
-- Rollback:
--   drop trigger trg_enforce_avatar_provenance on public.profiles; drop function public.enforce_avatar_provenance();
--   drop trigger trg_enforce_shop_asset_provenance on public.shops; drop function public.enforce_shop_asset_provenance();
--   -- re-run both CREATE OR REPLACEs above with the previous extraction line instead of the helper call:
--   --   v_path := split_part(substring(new.image_url from '/object/public/product-images/(.*)$'), '?', 1);
--   --   v_path := split_part(substring(new.image_url from '/object/public/portfolio-media/(.*)$'), '?', 1);
--   -- (and the product function's removed comment lines), then:
--   drop function public.storage_public_object_path(text, text);
