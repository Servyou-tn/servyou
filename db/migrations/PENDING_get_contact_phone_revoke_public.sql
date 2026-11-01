-- get_contact_phone: revoke EXECUTE from PUBLIC (architect's hygiene note on migration 113, 2026-11-01). The function
-- predates migration 68's global PUBLIC revoke, so its ACL still carries `=X/postgres` (PUBLIC). Harmless today — an
-- anonymous caller gets NULL — but the explicit grants are the intent: anon, authenticated, service_role keep EXECUTE.
--
-- Live on 2026-11-01: proacl = {=X/postgres, postgres=X/postgres, anon=X/postgres, authenticated=X/postgres,
-- service_role=X/postgres}.

revoke execute on function public.get_contact_phone(uuid) from public;

-- Post-apply verification:
--   select array_to_string(proacl, ' ') from pg_proc where oid = 'public.get_contact_phone(uuid)'::regprocedure;
--   → postgres=X/postgres anon=X/postgres authenticated=X/postgres service_role=X/postgres  (no leading « =X »)
--   phone-reveal-*-live tests still pass (anon / authenticated callers unchanged).
--
-- Rollback:
--   grant execute on function public.get_contact_phone(uuid) to public;
