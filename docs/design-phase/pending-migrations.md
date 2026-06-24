# Pending migrations

Migrations deliberately deferred out of a feature PR because they carry a heavier risk profile
than the feature itself and deserve their own focused change. Each entry records the technical
approach and how to verify it when it ships.

---

## PR-F2.X.search — Make tags + deliverables searchable

**Status:** Pending after PR-F2.3 (added the columns 2026-06-25; search integration deferred).

**Why deferred:** `service_listings.search_vector` is a GENERATED STORED column (config
`to_tsvector('simple', f_unaccent(...))` over title[A] + description[B]), **not** a trigger.
Including `tags` + `deliverables` in search means DROP + recreate the generated column **and** its
GIN index — a materially different risk profile than the additive column changes PR-F2.3 made.
It deserves a focused migration (the migration-discipline call, per CLAUDE.md).

**Technical approach when shipped:**

```sql
ALTER TABLE public.service_listings DROP COLUMN search_vector;

ALTER TABLE public.service_listings
  ADD COLUMN search_vector tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector('simple', f_unaccent(coalesce(title, ''))),                              'A') ||
    setweight(to_tsvector('simple', f_unaccent(coalesce(description, ''))),                        'B') ||
    setweight(to_tsvector('simple', f_unaccent(coalesce(array_to_string(tags, ' '), ''))),         'C') ||
    setweight(to_tsvector('simple', f_unaccent(coalesce(array_to_string(deliverables, ' '), ''))), 'D')
  ) STORED;

CREATE INDEX service_listings_search_vector_idx
  ON public.service_listings USING gin (search_vector);
```

Keep the **same** `'simple'` + `f_unaccent` config as the existing column (do NOT switch to
`'french'`). `f_unaccent` must remain IMMUTABLE (it already is — the current generated column
relies on it).

**Tested:** after the recreate, verify a search query matches on a tag keyword and on a
deliverable keyword that does **not** appear in title/description (proving the new weights land);
confirm the GIN index is used (`EXPLAIN`) and that existing title/description search is unchanged.
