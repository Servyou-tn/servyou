-- shops: admin_hidden_at / admin_hidden_reason are never client-INSERTed.
-- Follow-up: « LOW — admin_hidden_* can be set on INSERT (shops, freelancer_profiles) »
-- (docs/follow-ups/security-audit-open-findings.md); the freelancer_profiles half is
-- PENDING_freelancer_profiles_column_grants.sql. Standards-reference Section 3 A01.
--
-- Live before this migration (verified 2026-10-28): authenticated holds TABLE-level INSERT / UPDATE /
-- DELETE / SELECT on shops (relacl authenticated=arwd), no column ACLs; enforce_admin_marker_lock is
-- BEFORE UPDATE only. An owner can create their shop already « admin-moderated » with any reason text
-- (self-harm only, but the marker is meant to be admin-written). 0 moderated shops; no row is rewritten.
--
-- App write paths checked (2026-10-28): ma-boutique/creer inserts (owner_id, name, city, description).
-- UPDATE is untouched: the marker lock trigger already refuses non-admins (prelaunch-acl-hardening.test.ts
-- asserts its message), and every app update names other columns.
-- Column list = every live column (information_schema.columns, 2026-10-28) minus the two markers.

revoke insert on public.shops from authenticated;

grant insert (id, owner_id, name, description, city, logo_url, banner_url, created_at, updated_at, shop_type,
              delivery_setup, working_hours, location_detail, preferred_carriers)
  on public.shops to authenticated;

-- A NEW column on shops is now NOT client-insertable until a migration grants it (UPDATE stays table-level).

-- ─── ROLLBACK (do not run as part of this migration) ───────────────────────────────────────────
-- Per README "Rollback paths": apply as a NEW dated forward migration, never by deleting this file.
--
-- revoke insert (id, owner_id, name, description, city, logo_url, banner_url, created_at, updated_at,
--                shop_type, delivery_setup, working_hours, location_detail, preferred_carriers)
--   on public.shops from authenticated;
-- grant insert on public.shops to authenticated;
