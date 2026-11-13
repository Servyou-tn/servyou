-- Nightly encrypted backup, PR #367 commit 1: read-only login role for the backup job. No password here (set by the founder as a SCRAM verifier).
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