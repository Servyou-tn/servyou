-- fix(security): a suspended admin is not an admin. Found by the PR #183 review (security specialist
-- + adversarial pass, 2026-10-24). public.is_admin() never read profiles.suspended_at, so a suspended
-- admin kept every admin READ — "Admin reads all profiles" (every account's email, phone,
-- date_of_birth), the admin SELECT branches on orders, disputes, reports, data_exports,
-- deletion_requests and the moderated catalogue, and the verifications bucket — for as long as its
-- access token lived (≤ 3600 s), and indefinitely whenever its auth ban was missing (a failed sync, a
-- direct RPC suspension). Migration 61's trigger already refuses its WRITES; this applies decision
-- D2's reasoning ("a suspended admin must not keep admin power") to reads, at the gate.
--
-- Change: is_admin() additionally requires suspended_at IS NULL. Everything else about the function
-- is kept exactly as live (LANGUAGE sql, STABLE, SECURITY DEFINER, search_path 'public'); CREATE OR
-- REPLACE keeps its owner (postgres), its EXECUTE grants and any comment. It is a SECURITY DEFINER
-- read of the caller's own row, so it sees suspended_at whatever RLS says.
--
-- Blast radius: 25 policies (1 on storage.objects) and 17 functions call is_admin(). For every
-- caller whose admin row has suspended_at NULL the result is unchanged — today that is every admin
-- (1 admin, 0 suspended, 2026-10-24). For a suspended admin:
--   * every is_admin() policy branch closes; each policy falls back to its owner branch;
--   * every admin RPC (admin_suspend_user / admin_unsuspend_user / admin_hide_content /
--     admin_unhide_content / log_admin_action / admin_overview_stats) raises 'Forbidden: admin access
--     required' before any write — admin_unsuspend_user on themselves included, so D2 now holds at
--     the gate and not only at migration 61's trigger;
--   * the guard triggers' is_admin() bypasses (marker locks, age gate, capability checks, order
--     transitions) stop applying to them — moot, migration 61 refuses their writes first.
--
-- App side, to ship with this migration's record (not before it is applied): checkAdmin
-- (src/lib/auth/require-admin.ts) selects suspended_at with is_admin and rejects a suspended admin;
-- suspension-enforcement.test.ts's suspended-admin RPC cases then expect 'Forbidden: admin access
-- required' (an admin-only TABLE write still meets migration 61's trigger first), plus a read case:
-- a suspended admin's session no longer reads another account's profile.
--
-- No row is touched. Rollback restores the previous body (below).

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $function$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and is_admin = true and suspended_at is null
  );
$function$;

-- ─── ROLLBACK (do not run as part of this migration) ───────────────────────────────────────────
-- Per README "Rollback paths": apply as a NEW dated forward migration, never by deleting this file.
-- Re-opens admin reads for a suspended admin.
--
-- create or replace function public.is_admin()
-- returns boolean
-- language sql
-- stable
-- security definer
-- set search_path to 'public'
-- as $function$
--   select exists (
--     select 1 from public.profiles
--     where id = auth.uid() and is_admin = true
--   );
-- $function$;
