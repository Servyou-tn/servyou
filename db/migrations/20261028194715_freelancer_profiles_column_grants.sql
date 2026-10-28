-- freelancer_profiles: is_published is never client-written; admin_hidden_* are never client-INSERTed.
-- Follow-ups (docs/follow-ups/security-audit-open-findings.md):
--   « MEDIUM — freelancer_profiles.is_published is owner-settable (publish-gate bypass) »
--   « LOW — admin_hidden_* can be set on INSERT (shops, freelancer_profiles) » -- the shops half is
--   PENDING_shops_admin_marker_insert_grant.sql.
-- Standards-reference Section 3 A01. One file for the table: a second file's column re-grant would silently
-- restore this one's columns.
--
-- Live before this migration (verified 2026-10-28): authenticated holds TABLE-level INSERT / UPDATE /
-- DELETE / SELECT (relacl authenticated=arwd), no column ACLs. So:
--   * is_published (migration 48: « derived, never user-set ») can be PATCHed / INSERTed true on a profile
--     with no active listing, making it and its five child tables readable to anon. The sync trigger lives
--     on service_listings only; enforce_admin_marker_lock covers admin_hidden_* on UPDATE only.
--   * admin_hidden_at / admin_hidden_reason can be set on INSERT (self-moderation with any reason text).
--   10 profiles; 0 published without an active listing; 0 moderated. No row is rewritten.
--
-- Why grants, not a guard trigger: sync_freelancer_is_published is SECURITY DEFINER (owner postgres) but
-- fires inside the user's session, so auth.uid() is still the user there -- an auth.uid() bypass would
-- block the sync. The owner (postgres) is not subject to column grants. admin_hide_content /
-- admin_unhide_content are SECURITY DEFINER too.
--
-- App write paths checked (2026-10-28): mon-profil-freelance/creer (insert profile_id, headline, bio, city;
-- update headline, bio, city), creer/competences (years_experience, portfolio_link), creer/details
-- (working_hours), modifier (headline, bio, years_experience, working_hours, workplace_location,
-- portfolio_link). None names a revoked column. UPDATE of admin_hidden_* stays granted: the existing
-- trigger refuses it to non-admins with its own message (prelaunch-acl-hardening.test.ts asserts it).
-- Column list = every live column (information_schema.columns, 2026-10-28) minus the revoked ones.

revoke insert, update on public.freelancer_profiles from authenticated;

grant insert (id, profile_id, headline, bio, city, portfolio_link, years_experience, languages, created_at,
              updated_at, working_hours, current_workplace, preferred_payment_method, workplace_location)
  on public.freelancer_profiles to authenticated;

grant update (id, profile_id, headline, bio, city, portfolio_link, years_experience, languages, created_at,
              updated_at, working_hours, current_workplace, preferred_payment_method, admin_hidden_at,
              admin_hidden_reason, workplace_location)
  on public.freelancer_profiles to authenticated;

-- A NEW column on freelancer_profiles is now NOT client-writable until a migration grants it.

-- ─── ROLLBACK (do not run as part of this migration) ───────────────────────────────────────────
-- Per README "Rollback paths": apply as a NEW dated forward migration, never by deleting this file.
-- Restores the exact live ACL of 2026-10-28 (authenticated=arwd, no column ACLs):
--
-- revoke insert (id, profile_id, headline, bio, city, portfolio_link, years_experience, languages,
--                created_at, updated_at, working_hours, current_workplace, preferred_payment_method,
--                workplace_location) on public.freelancer_profiles from authenticated;
-- revoke update (id, profile_id, headline, bio, city, portfolio_link, years_experience, languages,
--                created_at, updated_at, working_hours, current_workplace, preferred_payment_method,
--                admin_hidden_at, admin_hidden_reason, workplace_location) on public.freelancer_profiles
--   from authenticated;
-- grant insert, update on public.freelancer_profiles to authenticated;
