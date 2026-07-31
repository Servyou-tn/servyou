-- Verified retired on BOTH sides before dropping:
--   Code:   src/lib/marche/service-detail.ts:8-10 documents the removal -- the fetch was deleted
--           because the table holds zero rows, the per-service gallery was retired in favour of
--           portfolio-per-freelancer, and D2 (Figma 666:55479 / 668:55920) has no gallery region.
--   Figma:  the registry has gallery nodes only for G6 (532:32201) and D1 (563:39552) -- both
--           PRODUCT surfaces. No H6 field-galerie, no H7 section-Galerie.
--   Data:   0 rows.
--   Deps:   0 dependent views/rules (pg_depend checked before applying).
--
-- So this is not "a badly shaped table" -- it is a well-shaped table for a surface that no longer
-- exists. Its structure is nearly identical to product_images, which is exactly why it looks
-- extensible; extending it would resurrect a retired surface. Freelancer sample work is served by
-- portfolio_items (per freelancer), which is a LATER PR -- it is not created here.
--
-- Its RLS policies and the FK to service_listings drop with the table.
drop table public.service_media;

-- Post-apply: service_media absent from information_schema.tables, 0 orphaned policies.
