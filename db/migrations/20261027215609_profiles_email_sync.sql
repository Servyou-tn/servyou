-- profiles.email follows auth.users.email after a confirmed email change.
-- Standards-reference Section 3 A04 (data integrity); docs/data-model.md "profiles".
--
-- Live before this migration: handle_new_user() (AFTER INSERT on auth.users) copies new.email into
-- profiles.email once, at signup. Nothing follows a later change. With "Secure email change" ON, a user's
-- supabase.auth.updateUser({ email }) stores the address in auth.users.email_change and only writes
-- auth.users.email once BOTH links are confirmed (the admin API writes it directly). From then on
-- profiles.email is stale -- the export modal (ExportDataModal / ConfidentialiteTab), /mon-compte and the
-- admin user pages read it. The app never writes profiles.email itself (clients hold SELECT only on that
-- column; /mon-compte locks it). Live at discovery: 22 profiles, 0 mismatches, 0 pending changes.
--
-- Supabase supports this: auth.users is owned by supabase_auth_admin, postgres holds TRIGGER on it, the
-- existing on_auth_user_created trigger uses the same pattern, and the Supabase docs show this exact
-- AFTER UPDATE sync (SECURITY DEFINER, search_path ''). The trigger fires inside the auth server's own
-- transaction, as supabase_auth_admin: the function runs as its owner (postgres). Trigger firing does not
-- check EXECUTE, so no grant is needed and every client grant is revoked (P2-1 / P2-2: not a policy
-- helper, so nobody needs to call it).
--
-- Safety:
--   * No JWT in the auth server's session -> auth.uid() is null, so every profiles BEFORE UPDATE trigger
--     takes its bypass (admin-marker lock, seller age gate, enforce_active_user); a suspended user's
--     confirmed change syncs too.
--   * A NULL new email (phone-only / anonymous users, none today) is skipped: profiles.email is NOT NULL.
--   * profiles.email is UNIQUE. auth.users.email is unique too and the two are in sync, so a collision
--     means drift. It then raises inside the auth transaction and the email change itself fails -- loud,
--     never a silent divergence (decision 1).
--   * WHEN (old.email is distinct from new.email): GoTrue rewrites auth.users on every sign-in
--     (last_sign_in_at, ...), and `UPDATE OF email` alone fires whenever email is in the SET list.
--   * No backfill: 0 mismatches at discovery.

create or replace function public.sync_profile_email()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
begin
  if new.email is null then
    return new;
  end if;

  update public.profiles
     set email = new.email
   where id = new.id
     and email is distinct from new.email;

  return new;
end;
$function$;

comment on function public.sync_profile_email() is
  'AFTER UPDATE OF email on auth.users (when it changed): copies the confirmed address into profiles.email. NULL is skipped (profiles.email is NOT NULL). Runs as postgres inside the auth server''s transaction; a UNIQUE collision fails the email change itself. No client EXECUTE. 2026-10-27.';

revoke execute on function public.sync_profile_email() from public, anon, authenticated;

create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row
  when (old.email is distinct from new.email)
  execute function public.sync_profile_email();

-- ─── ROLLBACK (do not run as part of this migration) ───────────────────────────────────────────
-- Per README "Rollback paths": apply as a NEW dated forward migration, never by deleting this file.
--
-- drop trigger if exists on_auth_user_email_changed on auth.users;
-- drop function if exists public.sync_profile_email();
