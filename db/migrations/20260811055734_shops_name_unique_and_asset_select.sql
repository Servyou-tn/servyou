-- G2 "Créer ma boutique" step 1 — two additions:
--
-- 1. Case-insensitive uniqueness on shops.name. A plain UNIQUE(name) would let "OM shop" and
--    "OM Shop" coexist — exactly the near-copy collision a unique-name guarantee exists to
--    prevent. Founder-directed: CREATE UNIQUE INDEX on lower(name), not a UNIQUE constraint on
--    the raw column. The app-side pre-check must query case-insensitively (ilike / lower(name) =
--    lower($1)) to match, or the friendly inline check and this index disagree and a caller who
--    passed the pre-check still hits 23505 at insert. discovery: one live shops row ("OM shop"),
--    no collision, no existing index on name — see docs/design/g2-discovery.md §4/§6.
CREATE UNIQUE INDEX shops_name_lower_key ON public.shops (lower(name));

-- 2. shop-assets SELECT policy — G2 is the first real writer to this bucket (not G3, which the
--    origin migration 20260731073614 assumed). normalizeShopLogo/normalizeShopBanner's
--    post-upload `.info()` integrity check (same forensics as #122) goes through storage.objects
--    SELECT RLS — public-bucket reads bypass RLS only via the /object/public/ URL, not via the
--    authenticated .info()/.list() API. Mirrors the identical shape already live for avatars
--    ("owner reads own") and product-images ("shop owner reads own", migration 20260804104541).
CREATE POLICY "shop-assets: shop owner reads own"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'shop-assets'
    AND (storage.foldername(objects.name))[1] IN (
      SELECT s.id::text FROM public.shops s WHERE s.owner_id = (SELECT auth.uid())
    )
  );
