-- H6 (the service-creation wizard, /mes-services/creer) needs a two-level category cascade:
-- pick a sector, then a subcategory within it. Both are rows in `categories` (self-referential
-- via parent_id — 13 top-level sectors, 91 child subcategories, taxonomy_13_sectors_categories_
-- cutover migration). This column was proposed and approved during that migration's own PR
-- discovery but never made it into the applied migration — a gap, not new scope, closed here
-- because H6 is the first real consumer.

alter table public.service_listings
  add column subcategory_id uuid references public.categories(id);

comment on column public.service_listings.subcategory_id is
  'The chosen leaf category (categories.parent_id IS NOT NULL). category_id stays the sector
   (categories.parent_id IS NULL) for compatibility with existing sector-level consumers
   (CATEGORY_ICONS, /marche/services filters, search). Set by H6''s step 1 cascade.';
