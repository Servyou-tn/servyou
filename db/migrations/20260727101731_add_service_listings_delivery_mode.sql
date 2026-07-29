-- D2 service detail: "Mode de prestation" section.
-- Modelled as a 3-value enum (text + CHECK), not a boolean: a boolean cannot express
-- 'hybrid', and Tunisian services genuinely split three ways. Matches the existing
-- convention on profiles.seller_type / profiles.language / service_listings.status,
-- which are all text + CHECK rather than a Postgres ENUM type.
--
-- Nullable by design: NULL = the freelancer has not said, and D2 hides the whole
-- "Mode de prestation" section when it is null. NULL passes a bare = ANY(...) CHECK
-- in Postgres, which is exactly how profiles.seller_type already behaves.
--
-- No RLS change: service_listings already has RLS enabled with a public SELECT
-- policy ("Services viewable by everyone", qual = true) and owner-scoped
-- INSERT/UPDATE/DELETE. RLS gates rows, not columns, so the new column inherits
-- the table's existing policies and needs no new grant.

alter table public.service_listings
  add column delivery_mode text;

alter table public.service_listings
  add constraint service_listings_delivery_mode_check
  check (delivery_mode = any (array['remote'::text, 'onsite'::text, 'hybrid'::text]));

comment on column public.service_listings.delivery_mode is
  'How the service is delivered: remote | onsite | hybrid. NULL = unspecified; the D2 detail page hides the "Mode de prestation" section when null.';
