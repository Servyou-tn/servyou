-- H6 PR-3 (step 3 « Tarif ») — the price unit the « Unité » field writes. Founder ruling D13
-- (2026-10-24, closes G5): four values « Fixe · Par heure · Par jour · Par mois », stored
-- fixed | hour | day | month. Figma 459:18966 `field-unite` draws « Par projet » as the fourth
-- segment; the founder replaced it with « Par mois » (monthly packages: community managers, coaches,
-- assistants) — a founder-approved Figma deviation (docs/design/h6-pr3-deltas.md D13).
--
-- text + CHECK, not a Postgres enum type: the same convention as delivery_mode, status and
-- profiles.seller_type. NULL passes the bare = ANY(...) CHECK, exactly like delivery_mode.
--
-- Nullable, no default, no backfill. NULL = "not stated": the 21 active listings predate the field,
-- and a default would silently declare every one of them « Fixe ». Whether a published service must
-- carry a unit (and what the 21 get) is a PR-4 publish rule, decided with that backfill.
--
-- No RLS or grant change: service_listings has table-level grants and row policies only, which
-- cover a new column; no view selects from service_listings; search_vector is not touched.

alter table public.service_listings
  add column price_unit text;

alter table public.service_listings
  add constraint service_listings_price_unit_check
  check (price_unit = any (array['fixed'::text, 'hour'::text, 'day'::text, 'month'::text]));

comment on column public.service_listings.price_unit is
  'How starting_price_tnd is charged: fixed | hour | day | month (H6 step 3 « Unité », founder ruling D13). NULL = not stated (listings created before H6 PR-3). No surface displays it yet.';

-- Rollback (reverse migration, never delete this file):
-- alter table public.service_listings drop constraint service_listings_price_unit_check;
-- alter table public.service_listings drop column price_unit;
