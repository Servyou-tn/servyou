-- Removes 8 `product_images` rows that point at `/products/{nike,iphone,skincare}.jpg` — files
-- that HAVE NEVER EXISTED. Verified three ways in docs/design/pr2-broken-image-pointers.md:
-- `git log --all --diff-filter=A -- 'public/products/*'` is empty on every branch; `find public`
-- has no such directory; and the string has only ever appeared in documentation commits, never in
-- application code or a committed seed file. They were inserted straight into the database in two
-- passes on 2026-06-14 (3 rows at 17:01, 5 at 19:28), naming assets nobody authored.
--
-- ── WHY THIS IS A LIVE DEFECT, NOT CLEANUP ───────────────────────────────────────────────────
-- Three shipped surfaces render them, each confirmed by loading it:
--   ·  /                        home page — `product` is the CANONICAL DEFAULT for an
--                               authenticated consumer (app/page.tsx:51). Loaded with a real
--                               consumer session: 8 cards, 64 broken image refs. 6 real plain
--                               consumers can reach it today.
--   ·  /recherche?q=…&type=product  3 cards, 24 broken refs
--   ·  /categories/[slug]       src="/_next/image?url=%2Fproducts%2Fnike.jpg&w=1920&q=75"
-- All three route through ListingResults -> ProductListingCard.
--
--   /_next/image?url=%2Fproducts%2Fnike.jpg  ->  HTTP 400   (control, a real asset -> 200)
--   /products/nike.jpg                       ->  HTTP 404
--
-- ── WHY DELETE RATHER THAN NULL, REPOINT, OR DEFEND IN THE COMPONENT ──────────────────────────
-- `image_url` is NOT NULL, so blanking is not available; it is DELETE or nothing.
--
-- Repointing was rejected: committing real files to public/ re-establishes the repo-asset pattern
-- that image-storage-discovery.md §8 just retired, and uploading seed images to the bucket spends
-- the binding 1 GB cap on fake content that would masquerade as a seller's own.
--
-- Defending in the component was rejected for a sharper reason: these rows are NOT a *missing*
-- image, they are a *present and broken* one. `image_url` is non-null, so every consumer takes the
-- <Image> branch and no null-check can catch the class. Catching it would need runtime
-- broken-image detection — client JS added to a clean server-rendered card, on every product
-- surface, to defend eight rows of bad seed.
--
-- Deleting instead makes zero-image the UNIVERSAL state, so ProductListingCard's existing
-- PackageIcon placeholder — built, and until now unreachable, because 8 of 8 products carried a
-- row — gets exercised on every surface BEFORE G6 ships its writer.
--
-- ── SAFETY ────────────────────────────────────────────────────────────────────────────────────
-- Scoped to the broken prefix rather than truncating the table. `like '/products/%'` anchors at
-- the string start, so it CANNOT match a Supabase Storage URL (those begin `https://`) nor the
-- `/product-images/` bucket path. That makes this idempotent and safe to re-run after G6 ships:
-- on a database with real uploads it matches nothing and deletes zero rows.
--
-- Nothing else reads these rows into a live surface. Five data-layer readers map an image for
-- routes that are ComingSoon stubs (/produits/[id], /marche/produits, /demander/[id] product,
-- getMyOrders, getMyFavorites); G4, admin and G9 never select product_images at all.
--
-- No FK points at product_images, so nothing cascades. Orders do not snapshot an image — that was
-- a deliberate founder decision (image-storage-discovery.md §6b): a thumbnail is decorative, and a
-- frozen URL would not survive its object being deleted anyway.
--
-- Fully reversible. The exact 8 rows, with their original ids and timestamps, are recorded in
-- docs/design/pr2-broken-image-pointers.md for restoration.

do $$
declare v_deleted integer;
begin
  delete from public.product_images where image_url like '/products/%';
  get diagnostics v_deleted = row_count;
  -- Informational, never fatal: on a fresh database, or after a re-run, 0 is the correct answer.
  -- The expected count on production at time of writing is exactly 8.
  raise notice 'removed % placeholder product_images row(s)', v_deleted;
end $$;
