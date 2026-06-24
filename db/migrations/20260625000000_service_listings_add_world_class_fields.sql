-- Migration: service_listings_add_world_class_fields
-- Applied 2026-06-25 via Supabase apply_migration (founder-approved per the migration gate).
-- Lifts service_listings toward industry standard (Fiverr/Upwork) — PR-F2.3.
-- Per spec Section 11.1. The 8 existing rows backfill with the NOT NULL DEFAULTs; all CHECKs pass.
--
-- NOTE: search_vector (a GENERATED STORED column, config to_tsvector('simple', f_unaccent(...)) over
-- title[A] + description[B], created in 20260618111508) is intentionally NOT touched here — adding
-- tags/deliverables to search means DROP + recreate the generated column + its GIN index, a heavier
-- change deferred to a focused migration. See docs/design-phase/pending-migrations.md (PR-F2.X.search).

ALTER TABLE public.service_listings
  ADD COLUMN deliverables    text[]   NOT NULL DEFAULT '{}',
  ADD COLUMN revisions_count smallint NOT NULL DEFAULT 1,
  ADD COLUMN tags            text[]   NOT NULL DEFAULT '{}',
  ADD COLUMN buyer_briefing  text;

ALTER TABLE public.service_listings
  ADD CONSTRAINT service_listings_revisions_range
    CHECK (revisions_count BETWEEN 0 AND 10),
  ADD CONSTRAINT service_listings_deliverables_count
    CHECK (cardinality(deliverables) <= 8),
  ADD CONSTRAINT service_listings_tags_count
    CHECK (cardinality(tags) <= 10),
  ADD CONSTRAINT service_listings_buyer_briefing_length
    CHECK (buyer_briefing IS NULL OR length(buyer_briefing) <= 1000);

COMMENT ON COLUMN public.service_listings.deliverables
  IS 'Bullet list of what the buyer receives. Min 3, max 8 entries enforced by app validator.';
COMMENT ON COLUMN public.service_listings.revisions_count
  IS 'Number of free revisions included in the base price.';
COMMENT ON COLUMN public.service_listings.tags
  IS 'Search keywords for discovery. Min 3, max 5 entries enforced by app validator, lowercase.';
COMMENT ON COLUMN public.service_listings.buyer_briefing
  IS 'Instructions for what the client must provide before work begins.';
