# Fail-closed default privileges (`fix/fail-closed-default-privileges`, 2026-10-30)

Migration 107 made `postgres`'s defaults in `public` fail-closed (new tables and views: client SELECT only). What it
does not cover, ranked.

## 1. LOW (known residual) — `supabase_admin`'s own default privileges still grant everything in `public`
- **What:** `pg_default_acl` for role `supabase_admin` in `public` grants `arwdDxtm` on tables, `rwU` on sequences and
  `X` on functions to anon and authenticated. An object `supabase_admin` creates in `public` (platform-created only —
  e.g. an extension the dashboard installs into `public`) is born client-writable / executable. `postgres` cannot
  alter another role's defaults, so migration 107 could not.
- **Why deferred:** no migration of ours runs as `supabase_admin` (all 30 tables and 2 views are owned by postgres);
  architect's ruling 2026-10-30: log as a known residual.
- **Where it lives:** `pg_default_acl` (defaclrole = supabase_admin, defaclnamespace = public).
- **Trigger:** any extension or dashboard action that creates objects in `public` — install extensions into the
  `extensions` schema instead, and the live catalog test (client-write allow-list, its own PR) flags any new client
  write privilege whoever created it.

## 2. LOW — `trg_enforce_active_user` is still a per-table list
- **What:** the suspension write guard is attached table by table. A new client-writable table ships without it
  until a migration adds it. Since 107 a new table has no client write unless a migration GRANTs one, so the GRANT
  and the trigger now land in the same reviewed migration — but nothing checks the pair.
- **Why deferred:** out of 107's scope (privileges only).
- **Where it lives:** migration 61 (`suspension_enforcement`) and every later table migration.
- **Trigger:** the client-write allow-list check — extend it to fail when an allow-listed table lacks
  `trg_enforce_active_user`.
