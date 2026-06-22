-- Enable accent-insensitive FTS
CREATE EXTENSION IF NOT EXISTS unaccent;

-- Create an immutable wrapper for unaccent so it can be
-- used in generated columns and indexes (raw unaccent()
-- is STABLE, not IMMUTABLE — Postgres rejects it in
-- index expressions otherwise).
CREATE OR REPLACE FUNCTION public.f_unaccent(text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
STRICT
AS $$
  SELECT unaccent('public.unaccent', $1);
$$;

-- PRODUCTS: add search_vector column + GIN index
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(
      to_tsvector('simple',
        public.f_unaccent(coalesce(title, ''))
      ), 'A'
    ) ||
    setweight(
      to_tsvector('simple',
        public.f_unaccent(coalesce(description, ''))
      ), 'B'
    )
  ) STORED;

CREATE INDEX IF NOT EXISTS products_search_vector_idx
  ON public.products USING GIN (search_vector);

-- SERVICE_LISTINGS: same pattern
ALTER TABLE public.service_listings
  ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(
      to_tsvector('simple',
        public.f_unaccent(coalesce(title, ''))
      ), 'A'
    ) ||
    setweight(
      to_tsvector('simple',
        public.f_unaccent(coalesce(description, ''))
      ), 'B'
    )
  ) STORED;

CREATE INDEX IF NOT EXISTS service_listings_search_vector_idx
  ON public.service_listings USING GIN (search_vector);
