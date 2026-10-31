-- client_write_grants(): the live half of the client-write allow-list check (architect's ruling, 2026-10-30, after
-- migration 107 made the defaults fail-closed). Returns every INSERT / UPDATE / DELETE privilege that anon,
-- authenticated or PUBLIC holds on a relation in schema public — table-level (column_name NULL) and column-level —
-- so src/__tests__/client-write-grants-live.test.ts can compare the real catalog with db/client-write-allowlist.json in
-- both directions. The static half runs in CI without a database (client-write-grants-static.test.ts).
--
-- Read-only (STABLE, catalog reads only). SECURITY DEFINER so the caller needs no catalog access beyond EXECUTE, with
-- an empty search_path and every object schema-qualified. Executable by service_role ONLY: the grant map describes
-- the attack surface, so it is not exposed to anon / authenticated (and not to PUBLIC, revoked explicitly even though
-- migration 68's default already withholds it).
--
-- Live on 2026-10-31: the query below returns 159 rows, all for authenticated (0 for anon / PUBLIC), equal to the
-- allow-list file entry for entry. Grants fingerprint after 107: 9a02c52fe952050942c6b53e53b2a3cc / 151 (this
-- migration adds no table or column grant, so it is unchanged).

create function public.client_write_grants()
returns table (relation text, grantee text, privilege text, column_name text)
language sql
stable
security definer
set search_path = ''
as $$
  with rel as (
    select c.oid, c.relname, c.relacl
      from pg_catalog.pg_class c
     where c.relnamespace = 'public'::pg_catalog.regnamespace
       and c.relkind in ('r', 'v', 'm', 'p', 'f')
  )
  select r.relname::text,
         case a.grantee when 0 then 'PUBLIC' else a.grantee::pg_catalog.regrole::text end,
         a.privilege_type::text,
         null::text
    from rel r
   cross join lateral pg_catalog.aclexplode(r.relacl) a
   where a.privilege_type in ('INSERT', 'UPDATE', 'DELETE')
     and (a.grantee = 0 or a.grantee::pg_catalog.regrole::text in ('anon', 'authenticated'))
  union all
  select r.relname::text,
         case a.grantee when 0 then 'PUBLIC' else a.grantee::pg_catalog.regrole::text end,
         a.privilege_type::text,
         att.attname::text
    from rel r
    join pg_catalog.pg_attribute att
      on att.attrelid = r.oid and att.attnum > 0 and not att.attisdropped and att.attacl is not null
   cross join lateral pg_catalog.aclexplode(att.attacl) a
   where a.privilege_type in ('INSERT', 'UPDATE')
     and (a.grantee = 0 or a.grantee::pg_catalog.regrole::text in ('anon', 'authenticated'))
$$;

revoke execute on function public.client_write_grants() from public, anon, authenticated;
grant execute on function public.client_write_grants() to service_role;

-- Post-apply verification:
--   1. select count(*) from public.client_write_grants();  → 159 (as the service role / postgres)
--   2. select grantee, privilege_type from information_schema.routine_privileges
--       where routine_schema = 'public' and routine_name = 'client_write_grants';
--      → EXECUTE for postgres and service_role only.
--   3. src/__tests__/client-write-grants-live.test.ts (live): service_role's rows equal the allow-list both ways; anon
--      and a signed-in user get 42501 calling it.
--
-- Rollback:
--   drop function public.client_write_grants();
