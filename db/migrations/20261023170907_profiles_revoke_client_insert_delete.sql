-- CRITICAL hotfix (found by the security audit on fix/orders-insert-integrity, 2026-10-23; applied by
-- the architect the same day). Per standards-reference Section 3 A01 (broken access control).
--
-- Exploit: Supabase's default grants left anon/authenticated with INSERT and DELETE on
-- public.profiles (20260609190541 only revoked UPDATE), and 20260603002549's policies let a user
-- insert and delete their OWN row. Both guard triggers -- enforce_profile_admin_marker_lock and
-- enforce_seller_type_age_gate -- are BEFORE UPDATE only. So a signed-in user could
--   DELETE /rest/v1/profiles?id=eq.<uid>
--   POST   /rest/v1/profiles {"id":"<uid>","is_admin":true,"date_of_birth":"1970-01-01",...}
-- and is_admin() returned true: every admin policy, admin RPC, PII read and verification document.
-- The same path cleared suspended_at, set any seller_type under 18, and -- through the
-- orders/disputes ON DELETE CASCADE -- erased the counterparties' order history and disputes.
--
-- Why removing both is safe:
--   * rows are created only by handle_new_user(), SECURITY DEFINER, fired AFTER INSERT on
--     auth.users -- it runs as its owner, not as the signing-up role;
--   * rows are removed only by the profiles.id -> auth.users(id) ON DELETE CASCADE, whose
--     referential action runs as the table owner; user-facing deletion goes through
--     deletion_requests;
--   * no app code (src/, scripts/) inserts into or deletes from profiles.
-- UPDATE and SELECT are untouched. Verified unexploited before applying: one admin (the founder),
-- and 0 of 22 profiles re-created after their auth user.
revoke insert, delete, truncate on public.profiles from anon, authenticated;

drop policy "Users can insert their own profile" on public.profiles;
drop policy "Users can delete their own profile" on public.profiles;

-- ─── ROLLBACK (do not run as part of this migration) ───────────────────────────────────────────
-- Per README "Rollback paths": apply as a NEW dated forward migration, never by deleting this file.
-- WARNING: this re-opens the self-admin hole above. Only ever pair it with BEFORE INSERT guards on
-- is_admin / suspended_at / suspended_reason / seller_type (and a DELETE that cannot cascade into
-- other users' orders).
--
-- grant insert, delete, truncate on public.profiles to anon, authenticated;
-- create policy "Users can insert their own profile"
--   on public.profiles for insert
--   with check (auth.uid() = id);
-- create policy "Users can delete their own profile"
--   on public.profiles for delete
--   using (auth.uid() = id);
