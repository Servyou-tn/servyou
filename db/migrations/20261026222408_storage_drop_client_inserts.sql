-- S-3 -- stop the raw PUT itself: clients can no longer INSERT objects into the four public image buckets.
-- docs/follow-ups.md « storage provenance missing for avatars and shop assets » (column side closed by
-- migration 71); decision S-3 approved 2026-10-26.
--
-- ⚠ APPLY ONLY AFTER PR `fix/storage-uploads-service-role` IS MERGED AND DEPLOYED TO PRODUCTION. Before that,
-- the live upload actions still write with the user's session and need these policies: dropping them first
-- breaks every avatar / shop / product / portfolio upload until the deploy lands. After that PR the actions
-- write through the service role (src/lib/images/upload-guard.ts) and no longer use them.
--
-- Live on 2026-10-26:
--   * storage.objects INSERT policies for authenticated (PERMISSIVE):
--       « avatars: owner inserts under own uid », « portfolio-media: owner inserts under own uid »,
--       « shop-assets: shop owner inserts under own shop », « product-images: shop owner inserts under own shop »,
--     plus « verifications: owner uploads own document » (private bucket, no writer yet -- kept);
--     the RESTRICTIVE « Suspended accounts cannot upload » (kept: still covers verifications).
--   * No client UPDATE policy (objects are immutable); owner read / delete policies per bucket.
--   * Since migration 71 nothing a client PUTs can be published, but it can still be stored: up to the bucket
--     size cap per object, unbounded in count, un-normalized.
--
-- After it: with no permissive INSERT policy left for those buckets, a client PUT is refused by RLS
-- (« new row violates row-level security policy »). Only the service role writes new objects there -- the
-- upload actions, after normalize.ts, after re-deriving ownership and checking the caller is active. Owner
-- read / delete policies, the restrictive suspension policies, buckets and the verifications policy are
-- unchanged.

drop policy "avatars: owner inserts under own uid" on storage.objects;
drop policy "portfolio-media: owner inserts under own uid" on storage.objects;
drop policy "shop-assets: shop owner inserts under own shop" on storage.objects;
drop policy "product-images: shop owner inserts under own shop" on storage.objects;

-- Post-apply verification:
--   1. select polname from pg_policy where polrelid = 'storage.objects'::regclass and polcmd = 'a';
--      -> « Suspended accounts cannot upload » (restrictive) and « verifications: owner uploads own document » only.
--   2. src/__tests__/storage-uploads-service-role.test.ts (live): a signed-in user's PUT into their own folder
--      of each bucket is refused; the service role's PUT works; the owner can still read and delete their own
--      objects.
--   3. production smoke after the deploy: change an avatar, a shop logo, add a product image and a portfolio
--      image -- each succeeds.
--
-- Rollback (the exact live definitions of 2026-10-26):
--   create policy "avatars: owner inserts under own uid" on storage.objects for insert to authenticated
--     with check ((bucket_id = 'avatars') and ((storage.foldername(name))[1] = (select (auth.uid())::text as uid)));
--   create policy "portfolio-media: owner inserts under own uid" on storage.objects for insert to authenticated
--     with check ((bucket_id = 'portfolio-media') and ((storage.foldername(name))[1] = (select (auth.uid())::text as uid)));
--   create policy "shop-assets: shop owner inserts under own shop" on storage.objects for insert to authenticated
--     with check ((bucket_id = 'shop-assets') and ((storage.foldername(name))[1] in
--       (select (s.id)::text as id from public.shops s where (s.owner_id = (select auth.uid() as uid)))));
--   create policy "product-images: shop owner inserts under own shop" on storage.objects for insert to authenticated
--     with check ((bucket_id = 'product-images') and ((storage.foldername(name))[1] in
--       (select (s.id)::text as id from public.shops s where (s.owner_id = (select auth.uid() as uid)))));
