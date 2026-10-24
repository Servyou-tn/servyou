-- fix(security): public_profiles is read-only. CRITICAL hotfix found while reviewing the suspension
-- migration (2026-10-24). public_profiles is a simple view (`select id, full_name, city, language,
-- seller_type, avatar_url from profiles`), so Postgres makes it auto-updatable; it is owned by
-- postgres (BYPASSRLS) with security_invoker = false, and Supabase's default privileges granted
-- INSERT / UPDATE / DELETE / TRUNCATE on it to anon and authenticated. On such a view the base
-- table's privileges and RLS are checked as the view OWNER, so through PostgREST anyone holding the
-- public anon key could:
--   * PATCH /rest/v1/public_profiles?id=eq.<anyone> -- rename any account, change its city /
--     language / avatar_url, or set its seller_type (the age gate and the capability switch both
--     bypass when auth.uid() is NULL);
--   * DELETE the same row -- deleting the profile, which cascades to that account's shops (and
--     products), orders on both sides, freelancer profile (and listings), job posts, job responses,
--     favorites and reports. Only admins are shielded (admin_audit_log is ON DELETE RESTRICT).
-- INSERT through the view fails anyway (email and date_of_birth are NOT NULL and not in the view).
-- Migration 53 revoked client INSERT / DELETE on the profiles TABLE; the view kept them.
--
-- Fix: revoke every write privilege on both views from anon and authenticated. SELECT stays --
-- public_profiles' protection IS its column list (CLAUDE.md), and it is SECURITY DEFINER on purpose.
-- buyer_cancellation_history (security_invoker, GROUP BY, not updatable) is included for the same
-- rule: a view is never a write path. No row is touched.
--
-- Discovery (2026-10-24): 22 auth users, 22 profiles, 0 users without a profile, 0 under-18
-- sellers; edge logs (24 h, the retention the tool can reach) show 8 GET + 1 HEAD on
-- public_profiles and no PATCH / DELETE / POST. Earlier writes cannot be ruled out from the logs.

revoke insert, update, delete, truncate on public.public_profiles from anon, authenticated;
revoke insert, update, delete, truncate on public.buyer_cancellation_history from anon, authenticated;

-- ─── ROLLBACK (do not run as part of this migration) ───────────────────────────────────────────
-- Per README "Rollback paths": apply as a NEW dated forward migration, never by deleting this file.
-- Re-opens the hole above -- never ship it.
--
-- grant insert, update, delete, truncate on public.public_profiles to anon, authenticated;
-- grant insert, update, delete, truncate on public.buyer_cancellation_history to anon, authenticated;
