-- Wrong current-password attempts on Mon compte › Changer le mot de passe: at most 5 per account per 15 minutes
-- (pre-beta review M1; founder + architect decision 2026-11-01). The per-attempt Turnstile token is friction, not a
-- limit, and Supabase Auth's per-IP limit sees the server's egress IP — so the account-level limit lives here.
--
-- The table is written and read ONLY by the server with the service role (changePasswordAction, after its own auth
-- check). RLS is enabled with no policy, and every client privilege is revoked: since migration 107 a new table
-- still gets anon / authenticated SELECT by default, so SELECT is revoked explicitly too. No client write privilege
-- → the client-write allow-list is untouched.
--
-- How the app uses it (src/app/mon-compte/actions.ts): it INSERTS a row for the attempt first, then COUNTS the
-- account's rows in the last 15 minutes — counting after inserting means concurrent attempts see each other, so no
-- burst gets past 5. Over the limit: its own row is deleted and the attempt refused. A wrong current password keeps
-- the row; any other outcome (success, failed bot check, Auth error) deletes it, so only wrong passwords count. Each
-- insert also prunes rows older than a day (indexed on attempted_at).

create table public.password_change_attempts (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  attempted_at timestamptz not null default now()
);

create index password_change_attempts_user_time_idx on public.password_change_attempts (user_id, attempted_at);
create index password_change_attempts_time_idx on public.password_change_attempts (attempted_at);

alter table public.password_change_attempts enable row level security;

revoke all on public.password_change_attempts from public, anon, authenticated;

comment on table public.password_change_attempts is
  'Wrong current-password attempts (Mon compte). Service role only: RLS on, no policy, no client privilege. '
  'At most 5 per account per 15 min (src/app/mon-compte/actions.ts). Rows older than a day are pruned on insert.';

-- Post-apply verification:
--   1. select relrowsecurity from pg_class where oid = 'public.password_change_attempts'::regclass;  → true
--   2. select grantee, privilege_type from information_schema.role_table_grants
--       where table_name = 'password_change_attempts' and grantee in ('anon', 'authenticated');  → 0 rows
--   3. src/__tests__/password-change-attempts-live.test.ts (live, 1 sign-in): a signed-in user cannot read, insert,
--      update or delete rows (42501); the service role can.
--   4. client-write-grants-live.test.ts still equals the allow-list (no new client write).
--
-- Rollback:
--   drop table public.password_change_attempts;
