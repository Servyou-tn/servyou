-- H6 PR-2 -- service_listings.short_description, for H6 step 2 « Description courte ».
--
-- Figma 461:19405 (measured 2026-10-23, docs/design/h6-measurements.md, read 2) draws two fields on
-- step 2: a single-line « Description courte » (counter 0/160, « Le résumé qui apparaît dans les
-- résultats de recherche. ») above « Description détaillée » (counter 0/2000). The detailed one is the
-- existing `description` column. The short one has no column today.
--
-- Nullable on purpose:
--   * the 21 pre-H6 rows have no short description and nothing to derive one from;
--   * H6 autosaves partial drafts, so a draft saved on step 1 has none yet.
-- Whether a published service must carry one is a PR-4 publish-rule decision (G4/G8), not this one.
--
-- The 160-character cap is the field's own limit and holds for drafts too (the wizard's input has
-- maxlength=160), so it is enforced here rather than left to the app. length() on text counts
-- characters, same as service_listings_buyer_briefing_length.
--
-- NOT touched, deliberately:
--   * search_vector -- a GENERATED STORED column over title + description (migration 38). Adding
--     short_description to it means dropping and recreating the generated column and its GIN index;
--     that is a focused migration of its own (logged in docs/follow-ups.md), not a side effect here.
--   * grants -- anon/authenticated/service_role hold TABLE-level privileges on service_listings
--     (checked 2026-10-23 via information_schema.table_privileges), so the new column is covered by
--     them; RLS (migration 52's SELECT policy, owner-only INSERT/UPDATE/DELETE) gates the rows.
--   * no view depends on service_listings (information_schema.view_table_usage, 2026-10-23).

alter table public.service_listings
  add column short_description text;

alter table public.service_listings
  add constraint service_listings_short_description_length
  check (short_description is null or length(short_description) <= 160);

comment on column public.service_listings.short_description is
  'One-line summary shown in search results (H6 step 2 « Description courte », Figma 461:19405). NULL until the freelancer writes one; max 160 characters. Not part of search_vector.';

comment on constraint service_listings_short_description_length on public.service_listings is
  'short_description is at most 160 characters (H6 step 2 counter 0/160). Applies to drafts too.';

-- ─── ROLLBACK (do not run as part of this migration) ───────────────────────────────────────────
-- Per README "Rollback paths": apply as a NEW dated forward migration, never by deleting this file.
-- Dropping the column destroys every short description written since; export them first if needed:
--   select id, short_description from public.service_listings where short_description is not null;
--
-- alter table public.service_listings drop constraint service_listings_short_description_length;
-- alter table public.service_listings drop column short_description;
