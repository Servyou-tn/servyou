-- Repairs an ALIAS CAPTURE in the four shop-scoped storage policies created by
-- 20260731073614_storage_buckets_and_policies, and adds the SELECT policy that
-- product-images needs before it can carry a writer.
--
-- ── THE DEFECT ────────────────────────────────────────────────────────────────────────────────
-- The origin migration wrote, inside `exists (select 1 from public.shops s ...)`:
--
--     s.id::text = (storage.foldername(name))[1]
--
-- `name` was intended as storage.objects.name (the object path). But public.shops HAS a `name`
-- column, and the inner FROM shadows the outer relation, so Postgres silently resolved it to
-- shops.name and stored it that way:
--
--     s.id::text = (storage.foldername(s.name))[1]        -- the shop's DISPLAY NAME
--
-- storage.foldername() strips the final path segment, so a shop name with no '/' yields an empty
-- array and [1] is NULL. Measured against the live row (id f4757d2d-…, name 'OM shop'):
--
--     (storage.foldername('OM shop'))[1]  ->  NULL
--     s.id::text = NULL                   ->  NULL   ⇒ the policy NEVER grants
--
-- All four affected policies are therefore DEAD: no authenticated user can write or delete an
-- object in product-images or shop-assets. `storage.objects` holds 0 rows across every bucket,
-- so nothing has ever exercised them and there is no data to migrate or repair.
--
-- The uid-first buckets (avatars, portfolio-media, verifications) are UNAFFECTED — they have no
-- subquery, so `name` resolved to storage.objects.name as intended. A sweep of every policy in
-- the database calling foldername() found exactly these four, and no others anywhere.
--
-- ── WHY THE SHAPE CHANGES, AND NOT JUST THE QUALIFICATION ─────────────────────────────────────
-- Simply qualifying to `objects.name` INSIDE the exists() would be correct, and was verified to
-- parse. It is not what ships here, because it leaves the predicate in the exact shape that
-- produced the bug — a later edit dropping the qualifier re-breaks it silently, with a policy that
-- still looks right and a test suite that still passes if it never attempts a write.
--
-- Instead foldername() is HOISTED OUT of the subquery entirely. At that position no `shops` column
-- is in scope at all, so the capture is not merely fixed, it is UNREPRESENTABLE — bare `name`
-- there could not bind to shops even if the qualifier were removed.
--
-- Note this deliberately DIVERGES from the public.product_images policy shape that the origin
-- migration mirrored. That mirroring is what produced the defect: product_images references
-- `product_images.product_id`, a name that does not collide, so the pattern was safe there and
-- unsafe here. The collision — not the pattern — is the thing to design against.
--
-- A path with no folder segment ('a.webp') makes the left side NULL, so the predicate evaluates
-- to NULL rather than false. RLS treats NULL as not-true and denies, which is the intended
-- outcome; it is recorded here so a reader does not mistake it for an oversight.
--
-- ⚑ `objects.name` is written for the reader; POSTGRES STORES IT AS BARE `name`. Verified with a
-- self-rolling-back probe policy before this migration was written: the deparsed form comes back
--
--     (storage.foldername(name))[1] in (select (s.id)::text from shops s where …)
--
-- with `name` at the OUTER level — versus the broken policies, which deparse to
-- `(storage.foldername(s.name))[1]` INSIDE the subquery. That difference is not cosmetic: it is
-- Postgres's own deparser reporting which relation the reference bound to. So the post-apply
-- check is exact — if `pg_get_expr` shows `s.name`, the capture is still there; if it shows bare
-- `name`, it is provably gone.
--
-- ── SAFETY ────────────────────────────────────────────────────────────────────────────────────
-- There is no window in which access widens. The policies being replaced grant NOTHING today, so
-- drop-then-create moves deny-all -> deny-all -> grant-correctly, inside one transaction. No
-- other permissive policy covers these buckets. Public READ of these public buckets does not go
-- through RLS at all (the /object/public/ endpoint bypasses it), so the new SELECT policy cannot
-- restrict any existing read path — it only adds the authenticated .list() capability that a
-- writer's cleanup requires.
--
-- The drops are deliberately NOT `if exists`. All four names were read from pg_policy, so they are
-- known to be present. `if exists` would let a mistyped name no-op the drop while the create still
-- runs, leaving the CORRECT policy live alongside the DEAD one — and permissive policies OR
-- together, so the result would pass every test while quietly accumulating a second policy. An
-- unconditional drop fails the migration loudly instead. Post-apply, storage.objects must hold
-- exactly 12 policies (11 today + the new SELECT), not 13.


-- ── product-images ────────────────────────────────────────────────────────────────────────────

drop policy "product-images: shop owner inserts under own shop" on storage.objects;

create policy "product-images: shop owner inserts under own shop"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'product-images'
    and (storage.foldername(objects.name))[1] in (
      select s.id::text from public.shops s where s.owner_id = (select auth.uid())
    )
  );

drop policy "product-images: shop owner deletes own" on storage.objects;

create policy "product-images: shop owner deletes own"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'product-images'
    and (storage.foldername(objects.name))[1] in (
      select s.id::text from public.shops s where s.owner_id = (select auth.uid())
    )
  );

-- NEW. product-images had INSERT and DELETE but no SELECT.
--
-- Public-bucket reads bypass RLS by URL, so rendering never needed this. But `.list()` DOES go
-- through SELECT RLS, and the writer's cleanup path depends on it: the avatar writer calls
-- .list() to sweep stale objects (mon-compte/actions.ts sweepAvatarFolder) and .remove() to roll
-- back an orphan when the DB write fails. Without this policy G6's equivalent sweep would see an
-- empty folder and silently leave every orphan behind.
--
-- `avatars: owner reads own` exists for exactly this reason and is the precedent being followed.
-- shop-assets and portfolio-media still have no SELECT policy; that is left alone deliberately —
-- a SELECT policy is part of shipping a WRITER, and theirs ship with G3 and the portfolio surface.
create policy "product-images: shop owner reads own"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'product-images'
    and (storage.foldername(objects.name))[1] in (
      select s.id::text from public.shops s where s.owner_id = (select auth.uid())
    )
  );


-- ── shop-assets ───────────────────────────────────────────────────────────────────────────────
-- Same defect, same origin migration, no writer yet (G3 « Modifier ma boutique »). Repaired here
-- rather than left dead, so G3 does not have to rediscover it. No SELECT policy is added: G3 is
-- the writer that will need one, and it ships with G3.

drop policy "shop-assets: shop owner inserts under own shop" on storage.objects;

create policy "shop-assets: shop owner inserts under own shop"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'shop-assets'
    and (storage.foldername(objects.name))[1] in (
      select s.id::text from public.shops s where s.owner_id = (select auth.uid())
    )
  );

drop policy "shop-assets: shop owner deletes own" on storage.objects;

create policy "shop-assets: shop owner deletes own"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'shop-assets'
    and (storage.foldername(objects.name))[1] in (
      select s.id::text from public.shops s where s.owner_id = (select auth.uid())
    )
  );
