-- notification_preferences: one more email toggle, email_missions_matching (« missions qui correspondent à mon
-- profil »), default ON.
-- Architect brief (2026-10-29) step 2b; B5 decision D2. Standards-reference Section 3 A01 (explicit, column-level grants).
--
-- Live before this migration (verified 2026-10-29; table created by migration 97, 20261028221948):
--   * columns profile_id, email_new_orders (default true), email_proposals (true), email_reviews (true),
--     email_low_stock (false), email_newsletter (false), updated_at;
--   * grants are column-level for authenticated: SELECT on every column; INSERT / UPDATE on profile_id and the five
--     flags. No anon grant, no table-level write grant;
--   * 0 rows, so the NOT NULL default backfills nothing.
--
-- After: email_missions_matching boolean NOT NULL DEFAULT true. Granted to authenticated for SELECT, INSERT and
-- UPDATE exactly like its five siblings: the app's PostgREST upsert names every flag. Without this grant, any app
-- insert / update / select naming the column fails 42501 (migration 68: default privileges are closed). RLS is
-- unchanged (owner-only select / insert / update), and so is the table-level ACL (nothing re-granted).

alter table public.notification_preferences
  add column email_missions_matching boolean not null default true;

grant select (email_missions_matching), insert (email_missions_matching), update (email_missions_matching)
  on public.notification_preferences to authenticated;

-- ─── ROLLBACK (do not run as part of this migration) ───────────────────────────────────────────
-- Per README "Rollback paths": apply as a NEW dated forward migration, never by deleting this file.
--
-- alter table public.notification_preferences drop column if exists email_missions_matching;
