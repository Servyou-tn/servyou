-- Closes the storage-provenance gap: today, `createProductAction`/`addProductImageAction` only
-- check that a caller-supplied image path starts with `{shopId}/{productId}/` — both segments are
-- server-derived, so that check stops attaching another shop's or product's object, but it does
-- NOT check that the object at that path was ever produced by `normalizeProductImage`'s
-- decode/re-encode gate (src/lib/images/normalize.ts). The `product-images` storage RLS policy
-- (20260731073614 + 20260804104541) legitimately lets a shop owner PUT any bytes under their own
-- shop's prefix — that grant has to exist for the real upload action to work. So today, an
-- authenticated shop owner can direct-PUT arbitrary, unvalidated bytes into their own prefix,
-- entirely bypassing normalize.ts, and then reference that path via `imagePaths` /
-- `addProductImageAction`'s `path` — both of which pass the prefix check because the path IS under
-- their own shop. `uploaded_objects` is the missing link: a provenance record written ONLY by the
-- four server actions that actually ran the normalize pipeline, which a new trigger on
-- `product_images` requires before it will accept a row.
--
-- Scope of this migration: the table, its RLS (deny-all), the trigger, and a backfill of the 37
-- pre-existing referencing rows (33 product_images + 2 avatars + 2 shop-assets) so historical
-- uploads — which predate this table and were never run through normalize.ts — are not retroactively
-- broken. Reconciliation of storage objects with no referencing row at all is explicitly OUT of
-- scope; that is a separate, later PR (see docs/design/image-storage-discovery.md §6c).

-- ── TABLE ─────────────────────────────────────────────────────────────────────────────────────
create table public.uploaded_objects (
  id         uuid primary key default gen_random_uuid(),
  bucket     text not null references storage.buckets(id),
  path       text not null,
  owner_id   uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  backfilled boolean not null default false,
  unique (bucket, path)
);

create index uploaded_objects_owner_idx on public.uploaded_objects(owner_id);

comment on table public.uploaded_objects is
  'Provenance record for every object written through this app''s upload pipeline (normalizeAvatar/normalizeProductImage/normalizeShopLogo/normalizeShopBanner). Written ONLY by the four upload server actions (uploadAvatarAction, uploadProductImageAction, uploadShopAsset, updateShopAsset), using a service_role client — never the caller''s own session. Read by enforce_product_image_provenance() to prove a product_images.image_url was actually produced by the normalize pipeline, not a direct PUT to storage under a caller''s own permitted prefix.';

-- ── RLS: DENY-ALL, DELIBERATELY, TO EVERY ROLE ───────────────────────────────────────────────
--
-- ⚠ LOAD-BEARING, READ BEFORE "FIXING" THIS ⚠
--
-- This table has RLS enabled and ZERO policies — no INSERT, UPDATE, DELETE, or SELECT policy for
-- `authenticated` or `anon`, on purpose. Do NOT add an `owner_id = auth.uid()` policy here. That is
-- the standard ownership pattern everywhere else in this schema (shops, products, product_images,
-- freelancer_profiles, ...), and it is WRONG for this table specifically: `uploaded_objects` exists
-- to prove a caller's own client did NOT write a given row. An `owner_id = auth.uid()` INSERT policy
-- would let exactly the attacker this table defends against forge their own provenance row for a
-- path they PUT directly — self-certifying the very thing the trigger is supposed to verify
-- independently. The only correct writer is a service_role client running inside a 'use server'
-- action that has already run the object through normalize.ts (see recordUploadProvenance in
-- src/lib/images/provenance.ts). service_role bypasses RLS entirely, so it needs no policy either.
--
-- Also revoke the schema-level default privileges Supabase grants automatically — a bare
-- `enable row level security` with no policies blocks SELECT/INSERT/UPDATE/DELETE, but RLS does NOT
-- gate TRUNCATE, and 20260729111728_order_events_revoke_residual_privileges found this exact grant
-- still present platform-wide. Closed here at table creation rather than left for a follow-up.
alter table public.uploaded_objects enable row level security;

revoke all on public.uploaded_objects from anon, authenticated, public;

-- ── TRIGGER: require provenance before a product_images row can reference a path ────────────────
--
-- SECURITY DEFINER is required so the trigger can read uploaded_objects even though the
-- triggering INSERT runs as `authenticated` (which holds no grant on that table at all).
create or replace function public.enforce_product_image_provenance()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_path        text;
  v_shop_owner  uuid;
begin
  -- Same marker convention as the app's own pathFromProductPublicUrl (src/app/actions/products.ts)
  -- and pathFromPublicUrl (ma-boutique/modifier/actions.ts) -- restated, not shared, because SQL
  -- and TS cannot share a function body; keep the marker in sync if the URL shape ever changes.
  v_path := split_part(substring(new.image_url from '/object/public/product-images/(.*)$'), '?', 1);

  if v_path is null or v_path = '' then
    raise exception 'product-images provenance check failed: % is not a recognized product-images object url', new.image_url;
  end if;

  -- The path's first segment is a shop_id, not a user id (see the storage RLS policies) -- the
  -- real owner to check provenance against is the USER who owns that shop, via the same
  -- products.shop_id -> shops.owner_id join createProductAction already runs for its prefix check.
  select s.owner_id into v_shop_owner
  from public.products p
  join public.shops s on s.id = p.shop_id
  where p.id = new.product_id;

  if v_shop_owner is null then
    -- products.product_id is NOT NULL + FK, so this should be unreachable; if it ever fires, fail
    -- closed rather than silently accept an unattributable row.
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
$$;

comment on function public.enforce_product_image_provenance() is
  'BEFORE INSERT trigger function on product_images. Requires a matching (bucket=product-images, path, owner_id) row in uploaded_objects, where owner_id is the real owner of the shop the product belongs to (products.shop_id -> shops.owner_id). Blocks a caller from attaching an object they PUT directly into storage under their own permitted prefix but never ran through normalizeProductImage. Raises with the substring "provenance check failed", matched by the app the same way it already matches "admin-moderated" (src/app/actions/products.ts).';

create trigger trg_enforce_product_image_provenance
before insert on public.product_images
for each row execute function public.enforce_product_image_provenance();

-- ── BACKFILL: the 37 pre-existing referencing rows ───────────────────────────────────────────
--
-- These 33 product_images + 2 profiles.avatar_url + 2 shops.{logo,banner}_url rows all predate
-- this table and normalize.ts's integration into every upload path -- none of them was ever
-- validated by the pipeline this migration now gates. They are backfilled with `backfilled = true`
-- and their REAL `created_at` read from storage.objects (never `now()`), so a future reorder/replace
-- that re-inserts one of these product_images rows is not retroactively broken by a gate that did
-- not exist when the row was created. Only product_images has a trigger today, so avatars/shop-assets
-- are backfilled for historical completeness and consistency, not because anything currently checks
-- them.
--
-- owner_id is derived from the path's segment (a shop_id for product-images/shop-assets, a user id
-- for avatars) and CROSS-CHECKED against the referencing row's actual owner in the same statement
-- (the join predicate below IS that cross-check -- a path segment that didn't match its row's real
-- owner would simply produce zero matching rows, which the count assertion at the end would catch).
do $$
declare
  v_expected integer;
  v_inserted integer;
begin
  insert into public.uploaded_objects (bucket, path, owner_id, created_at, backfilled)
  select
    'product-images',
    split_part(substring(pi.image_url from '/object/public/product-images/(.*)$'), '?', 1),
    s.owner_id,
    o.created_at,
    true
  from public.product_images pi
  join public.products p on p.id = pi.product_id
  join public.shops s on s.id = p.shop_id
  join storage.objects o
    on o.bucket_id = 'product-images'
   and o.name = split_part(substring(pi.image_url from '/object/public/product-images/(.*)$'), '?', 1)
  where (storage.foldername(o.name))[1] = s.id::text
  on conflict (bucket, path) do nothing;

  insert into public.uploaded_objects (bucket, path, owner_id, created_at, backfilled)
  select
    'avatars',
    split_part(substring(pr.avatar_url from '/object/public/avatars/(.*)$'), '?', 1),
    pr.id,
    o.created_at,
    true
  from public.profiles pr
  join storage.objects o
    on o.bucket_id = 'avatars'
   and o.name = split_part(substring(pr.avatar_url from '/object/public/avatars/(.*)$'), '?', 1)
  where pr.avatar_url is not null
    and (storage.foldername(o.name))[1] = pr.id::text
  on conflict (bucket, path) do nothing;

  insert into public.uploaded_objects (bucket, path, owner_id, created_at, backfilled)
  select 'shop-assets', src.path, src.owner_id, src.created_at, true
  from (
    select
      split_part(substring(s.logo_url from '/object/public/shop-assets/(.*)$'), '?', 1) as path,
      s.owner_id, o.created_at
    from public.shops s
    join storage.objects o
      on o.bucket_id = 'shop-assets'
     and o.name = split_part(substring(s.logo_url from '/object/public/shop-assets/(.*)$'), '?', 1)
    where s.logo_url is not null
      and (storage.foldername(o.name))[1] = s.id::text
    union all
    select
      split_part(substring(s.banner_url from '/object/public/shop-assets/(.*)$'), '?', 1) as path,
      s.owner_id, o.created_at
    from public.shops s
    join storage.objects o
      on o.bucket_id = 'shop-assets'
     and o.name = split_part(substring(s.banner_url from '/object/public/shop-assets/(.*)$'), '?', 1)
    where s.banner_url is not null
      and (storage.foldername(o.name))[1] = s.id::text
  ) src
  on conflict (bucket, path) do nothing;

  -- Recomputed at apply time rather than hardcoded to 37: this is a live production database and
  -- the real count could have moved between discovery and apply. What must hold regardless of the
  -- exact number is that EVERY referencing row got a backfilled provenance row -- a mismatch here
  -- means some row's path/owner failed to resolve against storage.objects (a broken pointer, the
  -- same class the placeholder-pointer migration 20260804125106 found once already) and the
  -- migration should fail loudly rather than silently ship a gap.
  select
    (select count(*) from public.product_images) +
    (select count(*) from public.profiles where avatar_url is not null) +
    (select count(*) from public.shops where logo_url is not null) +
    (select count(*) from public.shops where banner_url is not null)
  into v_expected;

  select count(*) into v_inserted from public.uploaded_objects where backfilled = true;

  if v_inserted <> v_expected then
    raise exception 'uploaded_objects backfill produced % rows but % referencing rows exist -- a path failed to resolve against storage.objects', v_inserted, v_expected;
  end if;

  raise notice 'uploaded_objects backfill: % rows across product_images + avatars + shop-assets, all predate normalize.ts and were never validated by it', v_inserted;
end $$;
