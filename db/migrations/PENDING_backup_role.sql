-- Nightly encrypted backup (audit gap: no backups on the Free plan), PR chore/nightly-backup, commit 1:
-- a read-only login role for the backup job. The job itself (pg_dump → zstd → age → Backblaze B2) lives in the
-- private repo Servyou-tn/servyou-backups; plan approved by the architect 2026-11-13 (D1–D7).
--
-- This file holds NO password. The role cannot log in until Moatez sets one in the SQL editor (founder step 10);
-- the password then lives only in the private repo's secret BACKUP_DB_URL. Note for that step: log_statement is
-- 'ddl' on this project, so a plaintext ALTER ROLE … PASSWORD would be written to the Postgres logs. Set it as a
-- SCRAM-SHA-256 verifier computed locally instead (the runbook will give the command).
--
-- Why a new role and not postgres (live, read-only discovery, 2026-11-13):
--   * The backup reads what Supabase's official three-file dump reads: roles, schema, and data including auth.users
--     (with password hashes), the storage.objects rows and cron.job. postgres can read all of it, but it can also
--     write everything: a leaked postgres password is a full takeover. A leaked servyou_backup password reads what a
--     backup holds anyway, and writes nothing.
--   * Per-table grants cannot cover it: postgres cannot grant SELECT on 12 auth tables (oauth_*, webauthn_*, scim_*,
--     mfa_recovery_*, refresh_tokens_id_seq) nor USAGE on schema auth, which it does not own. The built-in role
--     pg_read_all_data (postgres holds it WITH ADMIN OPTION) gives SELECT on every table, view and sequence and USAGE
--     on every schema, and nothing else: no write, no EXECUTE.
--   * BYPASSRLS is required: pg_dump turns row_security off and stops at the first table whose RLS would filter rows
--     (every public table has RLS on). postgres has BYPASSRLS, so it may give it (PostgreSQL 16+ rule).
--   * Supabase's own supabase_read_only_user has this exact shape, but it is reserved (supautils.reserved_roles) and
--     postgres cannot set its password.
--   * `supabase db dump` (CLI 3.1.0, dry-run) runs every dump with --role postgres, i.e. SET ROLE postgres, which only
--     a member of postgres can do. So the job runs the CLI's same pg_dumpall / pg_dump commands itself (pinned
--     PostgreSQL 17 client), minus --role. This role is never made a member of postgres.
--
-- What a leaked password would allow: reading everything a backup holds. No write: the role gets no table write grant
-- and no EXECUTE (pg_read_all_data has none; the only extra rights are PUBLIC's), and the public schema has 0
-- SECURITY DEFINER volatile functions that PUBLIC may execute (the two PUBLIC ones are STABLE). The session defaults
-- below (read-only transactions, 10-minute statement timeout) are a seat belt, not the boundary: a session can SET
-- them back, and pg_dump sets statement_timeout to 0 itself. The boundary is the missing write grants; the job's
-- timeout-minutes bounds its run time.
--
-- Not done here, on purpose:
--   * no password, no VALID UNTIL (an expired password would fail every nightly run), no membership in postgres, no
--     CREATEDB / CREATEROLE / REPLICATION, no connection limit (the job opens one connection at a time);
--   * no grant to anon / authenticated / PUBLIC: client-write allow-list untouched. No type change (roles are not in
--     database.types.ts).
--
-- Connection (founder step 11): session pooler, port 5432, user servyou_backup.xggomcitqrkaylqezjjz. Not the direct
-- host (IPv6 only; GitHub runners are IPv4 only), not port 6543 (transaction mode, unsuited to pg_dump).
--
-- Pre-apply check (read-only), wider than the public-schema count above: what PUBLIC (and so this role) may do
-- outside SELECT. Expected: no row with a write privilege, no schema with CREATE, and no SECURITY DEFINER volatile
-- function except ones reviewed as harmless.
--   select 'schema CREATE' as kind, n.nspname as obj from pg_namespace n, aclexplode(n.nspacl) a
--    where a.grantee = 0 and a.privilege_type = 'CREATE'
--   union all
--   select 'table ' || a.privilege_type, n.nspname || '.' || c.relname from pg_class c
--     join pg_namespace n on n.oid = c.relnamespace, aclexplode(c.relacl) a
--    where a.grantee = 0 and a.privilege_type not in ('SELECT')
--   union all
--   select 'secdef volatile', n.nspname || '.' || p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')'
--     from pg_proc p join pg_namespace n on n.oid = p.pronamespace
--    where p.prosecdef and p.provolatile = 'v' and n.nspname not in ('pg_catalog', 'information_schema')
--      and (p.proacl is null or exists (select 1 from aclexplode(p.proacl) a
--                                        where a.grantee = 0 and a.privilege_type = 'EXECUTE'));

create role servyou_backup with
  login
  bypassrls
  inherit
  nosuperuser
  nocreatedb
  nocreaterole
  noreplication;

grant pg_read_all_data to servyou_backup;

alter role servyou_backup set default_transaction_read_only = on;
alter role servyou_backup set statement_timeout = '10min';

-- Self-check: the role has exactly these attributes, one inherited membership and two session defaults; otherwise
-- the whole migration rolls back.
do $$
declare
  r record;
  v_members name[];
  v_inherits boolean;
begin
  select rolcanlogin, rolbypassrls, rolinherit, rolsuper, rolcreaterole, rolcreatedb, rolreplication,
         rolconnlimit, rolvaliduntil, rolconfig
    into r
    from pg_roles
   where rolname = 'servyou_backup';
  if not found then
    raise exception 'servyou_backup was not created';
  end if;

  if not (r.rolcanlogin and r.rolbypassrls and r.rolinherit)
     or r.rolsuper or r.rolcreaterole or r.rolcreatedb or r.rolreplication
     or r.rolconnlimit <> -1 or r.rolvaliduntil is not null then
    raise exception 'servyou_backup has unexpected attributes';
  end if;

  select array_agg(g.rolname order by g.rolname), bool_and(m.inherit_option)
    into v_members, v_inherits
    from pg_auth_members m
    join pg_roles g on g.oid = m.roleid
   where m.member = 'servyou_backup'::regrole;
  if v_members is distinct from array['pg_read_all_data']::name[] or not v_inherits then
    raise exception 'servyou_backup must inherit pg_read_all_data and be a member of nothing else (got %)', v_members;
  end if;

  if coalesce(cardinality(r.rolconfig), 0) <> 2
     or not exists (select 1 from unnest(r.rolconfig) c where c in ('default_transaction_read_only=on',
                                                                   'default_transaction_read_only=true'))
     or not exists (select 1 from unnest(r.rolconfig) c where c like 'statement_timeout=%') then
    raise exception 'servyou_backup session defaults differ: %', r.rolconfig;
  end if;
end
$$;

-- Rollback (the role owns nothing; its membership goes with it):
-- drop role servyou_backup;
