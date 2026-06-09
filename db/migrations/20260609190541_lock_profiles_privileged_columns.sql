-- Closes audit CRIT-1 (PR #58): any authenticated user could UPDATE profiles SET is_admin=true
-- (and self-clear suspended_at, self-set seller_type) on their own row via the REST API,
-- because RLS gates rows not columns and authenticated held a table-level UPDATE grant.
--
-- Two real layers:
--   Layer 1 (privilege, primary guard): a column-level REVOKE is a NO-OP against a pre-existing
--     TABLE-level grant in PostgreSQL, so we REVOKE the table grant and GRANT back an allow-list
--     of only the columns the app legitimately updates. (New pattern in this codebase; the PR-N
--     enforce_admin_marker_lock was trigger-only. The PR-Z 5-lens review caught the column-only
--     REVOKE as ineffective and the allow-list inversion as the sound fix.)
--   Layer 2 (trigger, defense-in-depth): guards the privileged columns in case Supabase default
--     privileges ever re-grant them.

-- Layer 1
REVOKE UPDATE ON public.profiles FROM anon, authenticated;
GRANT UPDATE (full_name, city, language, phone, seller_type) ON public.profiles TO authenticated;
-- Deliberately NOT granted to authenticated: is_admin / suspended_at / suspended_reason
-- (changed only by the admin SECURITY DEFINER RPCs running as owner, or by service_role /
-- SQL editor); date_of_birth + email (no app flow updates them — keeping date_of_birth
-- non-editable also means the 18+ check at seller signup cannot be undone later).
-- service_role retains its table-level grant (it bypasses RLS by design).

-- Layer 2
CREATE OR REPLACE FUNCTION public.enforce_profile_admin_marker_lock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
begin
  -- Bypass cascade (PR-Z):
  --   auth.uid() IS NULL = service-role key / postgres SQL editor / pg_cron (no end-user JWT):
  --     intentional bypass for bootstrap admin-grant, admin-promotion-via-SQL, and rls-smoke.
  --   is_admin()         = admin user (admin RPCs run with the calling admin's uid):
  --     intentional bypass for admin RPC paths.
  --   authenticated non-admin = blocked from the protected columns below.
  if auth.uid() is null then
    return new;
  end if;
  if public.is_admin() then
    return new;
  end if;
  if old.is_admin is distinct from new.is_admin then
    raise exception 'Admin status can only be changed by an admin' using errcode = '42501';
  end if;
  if old.suspended_at is distinct from new.suspended_at then
    raise exception 'Suspension status can only be changed by an admin' using errcode = '42501';
  end if;
  if old.suspended_reason is distinct from new.suspended_reason then
    raise exception 'Suspension reason can only be changed by an admin' using errcode = '42501';
  end if;
  return new;
end;
$function$;

CREATE TRIGGER enforce_profile_admin_marker_lock_trigger
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_profile_admin_marker_lock();