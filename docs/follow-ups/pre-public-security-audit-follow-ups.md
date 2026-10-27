# Pre-public security audit follow-ups (`chore/pre-public-scrub`, 2026-08-26)

## `admin_overview_stats`'s REVOKE-from-`public` didn't hold — `anon` can still execute it live, though `is_admin()` blocks anything happening

- **What:** `db/migrations/20260607134340_admin_overview_stats_rpc.sql` explicitly runs
  `revoke all on function public.admin_overview_stats() from public; grant execute ... to
  authenticated`, intending `anon` to lose EXECUTE entirely — a second layer on top of the
  function's own `is_admin()` gate (the migration's own comment calls it "defense in depth on top
  of the is_admin gate"). A live query against the project
  (`has_function_privilege('anon', <oid>, 'EXECUTE')`) shows `anon` **can still call it** today,
  along with the other `admin_*` SECURITY DEFINER RPCs, `log_admin_action`, `get_contact_phone`,
  and `is_admin` — all flagged by Supabase's advisor as `anon_security_definer_function_executable`.
- **Not exploitable today:** every one of those functions opens with
  `if not public.is_admin() then raise exception 'Forbidden: admin access required'`, confirmed by
  reading each body in `db/migrations/`. `is_admin()` reads `auth.uid()` internally, which is
  `NULL` for an anonymous caller, so `where id = auth.uid()` never matches and it returns `false`.
  An anon call to any `admin_*` RPC reaches the function and is rejected before touching data.
- **Why it's still worth fixing:** the revoke was meant to be a second, independent layer so a bug
  in `is_admin()` alone couldn't expose these endpoints to anonymous callers — right now
  `is_admin()` is the *only* layer, not a second one, because the revoke isn't holding. Likely
  cause: a later default-privilege reset (Supabase grants EXECUTE on new `public`-schema functions
  to `anon`/`authenticated` by default; nothing has reasserted the revoke since this migration ran).
- **Trigger:** a migration that reapplies `revoke execute on function public.admin_overview_stats()
  from public, anon;` (confirming `authenticated` keeps it, since real admins authenticate), plus a
  check of the other `admin_*` functions and `log_admin_action` for the same drift. `get_contact_phone`
  and `is_admin` are intentionally anon-callable (both self-gate correctly on a real relationship /
  return `false`) and don't need the same revoke — don't lump them into the fix by pattern-matching
  on the advisor list alone.
