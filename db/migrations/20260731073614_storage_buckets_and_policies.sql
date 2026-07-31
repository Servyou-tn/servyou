-- Five buckets. Separate rather than shared because file_size_limit and allowed_mime_types are
-- PER BUCKET (a shared bucket takes the loosest setting of all its tenants), because public/private
-- is a bucket-level property, and because each one's write policy is a different ownership join.
--
-- allowed_mime_types is image/webp ONLY on the four image buckets: the upload action always
-- re-encodes, so WebP is the only thing that can legitimately arrive. Note this is a gate against
-- ACCIDENTS, not attacks -- it checks the CLIENT-DECLARED Content-Type. The real content gate is
-- the server-side decode + re-encode, which a non-image cannot survive.
--
-- file_size_limit is set POST-re-encode, so these are deliberately tight.
-- avatars is capped at 512px/256KB rather than the 2048px ceiling because the largest avatar
-- rendered anywhere is 120px (D4 hero, ui/avatar.tsx 2xl). 512 serves that at 4x. Storing 2048 for
-- a 120px surface would spend the 1 GB free-tier cap -- the binding constraint -- on pixels
-- nothing reads.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars',         'avatars',         true,    262144, array['image/webp']),
  ('product-images',  'product-images',  true,   2097152, array['image/webp']),
  ('shop-assets',     'shop-assets',     true,   2097152, array['image/webp']),
  ('portfolio-media', 'portfolio-media', true,   2097152, array['image/webp']),
  ('verifications',   'verifications',   false, 10485760, array['image/webp','image/jpeg','image/png','application/pdf'])
on conflict (id) do nothing;


-- ---------------------------------------------------------------------------------------------
-- avatars -- the ONLY bucket that ships a writer in this PR.
--
-- Path: {user_id}/{uuid}.webp -- uid-first. freelancer_profiles.profile_id is UNIQUE (one profile
-- per user), so the first path segment compared directly against auth.uid() is a complete
-- ownership test with no subquery.
--
-- Complete set of THREE, because replace-by-new-path means the flow is upload-then-delete-old:
-- INSERT the new object, UPDATE profiles.avatar_url, DELETE the previous object. Never overwrite
-- in place -- on the free tier there is no Smart CDN auto-invalidation, and both Vercel's cache and
-- the CDN key on URL, so an overwrite serves the OLD image until the (deliberately long) TTL expires.
--
-- auth.uid() is wrapped in a scalar subquery so Postgres evaluates it once as an InitPlan rather
-- than per row -- Supabase's documented RLS performance pattern.
-- ---------------------------------------------------------------------------------------------

create policy "avatars: owner inserts under own uid"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

create policy "avatars: owner deletes own"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

-- SELECT is for the OWNER's own management path (the action confirming/cleaning its prior object).
-- It is NOT what makes avatars publicly readable -- the bucket is public, so public reads go
-- through the unauthenticated object URL and bypass RLS entirely.
create policy "avatars: owner reads own"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

-- No UPDATE policy, deliberately. Mirrors public.product_images, which has INSERT/SELECT/DELETE
-- and no UPDATE: replace is delete + insert. It also makes the never-overwrite rule structural
-- rather than a convention the next author has to know.


-- ---------------------------------------------------------------------------------------------
-- product-images and shop-assets -- policies created here, NO WRITER in this PR.
-- They ride with G5/G6/G7 (products) and G3 (shop edit).
--
-- Path: {shop_id}/{product_id}/{uuid}.webp  and  {shop_id}/logo|banner/{uuid}.webp -- shop_id-first.
--
-- WHY shop_id AND NOT uid, recorded in the schema itself: shops.owner_id carries only
-- shops_owner_idx, which is a NON-UNIQUE btree index. ONE OWNER CAN HOLD MULTIPLE SHOPS. A
-- uid-first path could not distinguish two shops belonging to the same person, and shop assets
-- belong to the shop, not to the human. Secondary benefit: this survives a shop transfer to a new
-- owner without moving objects.
--
-- The EXISTS...JOIN shops shape is the one public.product_images already uses for its own INSERT
-- and DELETE policies -- deliberately mirrored rather than reinvented.
-- ---------------------------------------------------------------------------------------------

create policy "product-images: shop owner inserts under own shop"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'product-images'
    and exists (
      select 1 from public.shops s
       where s.id::text = (storage.foldername(name))[1]
         and s.owner_id = (select auth.uid())
    )
  );

create policy "product-images: shop owner deletes own"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'product-images'
    and exists (
      select 1 from public.shops s
       where s.id::text = (storage.foldername(name))[1]
         and s.owner_id = (select auth.uid())
    )
  );

create policy "shop-assets: shop owner inserts under own shop"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'shop-assets'
    and exists (
      select 1 from public.shops s
       where s.id::text = (storage.foldername(name))[1]
         and s.owner_id = (select auth.uid())
    )
  );

create policy "shop-assets: shop owner deletes own"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'shop-assets'
    and exists (
      select 1 from public.shops s
       where s.id::text = (storage.foldername(name))[1]
         and s.owner_id = (select auth.uid())
    )
  );


-- ---------------------------------------------------------------------------------------------
-- portfolio-media -- policies created here, NO WRITER in this PR.
--
-- Path: {user_id}/{item_id}/{uuid}.webp -- uid-first, with item_id in the path per founder
-- decision to prevent enumeration: the bucket is public, so a guessable path is a readable path.
-- The item_id segment means knowing a user's uid does not let you walk their portfolio.
-- Ownership is still segment [1], so the policy does not care about the item_id segment.
--
-- PUBLIC, resolving the spec's incoherent "public read via signed-URL convention": a public
-- bucket bypasses RLS for reads entirely; signed URLs are the PRIVATE-bucket mechanism. It is one
-- or the other. Portfolio work is meant to be seen, and public buckets get a materially better
-- CDN hit rate.
-- ---------------------------------------------------------------------------------------------

create policy "portfolio-media: owner inserts under own uid"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'portfolio-media'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

create policy "portfolio-media: owner deletes own"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'portfolio-media'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );


-- ---------------------------------------------------------------------------------------------
-- verifications -- PRIVATE. Policies created here, NO WRITER in this PR.
--
-- Path: {user_id}/{uuid}.{ext} -- uid-first. The ONLY private bucket, and therefore the only one
-- where a SELECT policy carries real weight: for the four public buckets, reads bypass RLS through
-- the public object URL. Here the policy is what decides who can read AND who can mint a signed
-- URL, because a signed URL can only be created for an object the signer may read. The spec's
-- "admin-only read, admin-only signing" requirement is expressed HERE, not in app code.
--
-- public.is_admin() is the same helper the "Admin reads all profiles" policy already uses.
-- ---------------------------------------------------------------------------------------------

create policy "verifications: owner uploads own document"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'verifications'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

create policy "verifications: owner or admin reads"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'verifications'
    and (
      (storage.foldername(name))[1] = (select auth.uid()::text)
      or public.is_admin()
    )
  );

-- No DELETE policy for the owner, deliberately: a submitted verification document is evidence
-- backing a badge decision, and a freelancer should not be able to withdraw it after review.
-- Removal is an admin/service_role action.
--
-- OPERATIONAL NOTE for whoever builds the admin review surface: a signed URL's token expiry and
-- the cached response's TTL are INDEPENDENT. Revoking or expiring a token does NOT purge its CDN
-- cache entry. To actually cut off access to a document, DELETE THE OBJECT -- do not rely on
-- token expiry alone.


-- ---------------------------------------------------------------------------------------------
-- APPLY NOTES
--
-- Ownership probe, run BEFORE applying (begin; create policy ...; rollback;): storage.objects is
-- owned by supabase_storage_admin and `postgres` is neither superuser nor a member of that role
-- (pg_has_role = false), which suggests CREATE POLICY should fail. It does NOT -- the probe
-- succeeded and rolled back cleanly. Recorded because the inferred answer was wrong and the next
-- person reading pg_has_role will reach the same wrong conclusion.
--
-- RLS smoke test, run after applying, all in a rolled-back block (storage.objects back to 0 rows):
--   T1 own avatar path         PASS (allowed)
--   T2 cross-user avatar path  PASS (blocked)
--   T3 bucket root, no folder  PASS (blocked)
--   T4 non-owned shop          PASS (blocked)
--   T5 private cross-user read PASS (0 rows visible)
-- ---------------------------------------------------------------------------------------------
