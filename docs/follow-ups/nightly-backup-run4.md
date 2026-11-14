# Nightly backup after run #4: exact privileges (`docs/backup-run4-privileges`, 2026-11-14)

Run #4 (2026-11-14, after servyou-backups PR #3) was the first green restore: 62 tables, 391 rows,
and the extras and the structure matched exactly. Its privilege comparison, which only warned
then, found 118 lists wider than production's. A Supabase target creates the restored objects
with its own default privileges, and `schema.sql`'s GRANTs only add to them. The restored
database gave `anon` and `authenticated` every privilege on all 32 tables and 2 views, and
EXECUTE on 78 functions. The fix is servyou-backups PR #4: the bundle carries `privileges.sql`,
restored last, and the restore check now fails on any privilege difference. Earlier items stay in
`nightly-backup.md`, `nightly-backup-run1.md` and `nightly-backup-run3.md`.

## 1. TRIGGER: a bundle made before servyou-backups PR #4 restores with wider grants

**What:** every bundle made before PR #4 merged has no `privileges.sql`. That covers the bundles
of `nightly-backup-run3.md` item 1, plus run #4's of 2026-11-14 (uploaded about 18:38 UTC), and
any night until the merge. Restored with the runbook's step 3, such a bundle comes back with the
target's defaults: `anon` and `authenticated` get everything on every table, and EXECUTE on every
function in `public`. RLS still holds rows, but column-level locks and the "no client EXECUTE"
rule do not. The fix: as `postgres`, right after `create extension … pg_cron` and before
`roles.sql`, in the same transaction, run:
```sql
alter default privileges for role postgres in schema public revoke all on tables from public, anon, authenticated, service_role, postgres;
alter default privileges for role postgres in schema public revoke all on sequences from public, anon, authenticated, service_role, postgres;
alter default privileges for role postgres in schema public revoke all on functions from public, anon, authenticated, service_role, postgres;
alter default privileges for role postgres grant execute on functions to public;
```
Why it works:
- `schema.sql` then creates each object with Postgres' built-in default, the base pg_dump writes
  its GRANTs and REVOKEs against.
- Its own `ALTER DEFAULT PRIVILEGES` lines at the end rebuild production's defaults.
- The fourth line covers a target that already revokes EXECUTE from PUBLIC everywhere, as
  production does. Without it, the 3 functions that production lets PUBLIC execute would come
  back narrower.

A bundle made before PR #3 also needs that item's cron edit.

**Why deferred:** this follows from how pg_dump writes privileges, but no drill has proven it.
The PC has no Docker, and the nightly job only restores the newest bundle.
**Where it lives:** `docs/operations.md`, « Restore drill procedure », step 3, which points here.
The private repo's README, « Restoring », has the same steps.
**Trigger:** any drill or real restore from a bundle made before the merge. If production is
still up, run the private repo's `sql/acls.sql` on both databases afterwards and compare them,
leaving out the `default-platform` lines. The item lapses once those bundles have expired from B2.
`daily/` keeps 30 days, and a `monthly/` copy exists only for the 1st.

## 2. MEDIUM: the founder's next run is the first real proof of `privileges.sql`

**What:** `privileges.sql` was verified read-only on production only:
- a dry generation (a plain SELECT, nothing applied): 139 blocks, 518 lines;
- a round trip: the lines, parsed back with `makeaclitem()`, rebuild all 245 privilege lists
  exactly (2 schemas, 34 relations, 87 functions, 115 column lists, 7 default entries of
  `postgres`).

No statement has run against a real Postgres yet. Applying GRANTs to production, even in a
rolled-back transaction, would be a production write, and this PC has no Docker for a local
Postgres. The next run proves the rest:
- the statements' syntax;
- that `postgres` may run each one on the target, schema `public` included (owned by
  `pg_database_owner`);
- that the target's lists end up exactly production's: 249 lists, counting the 4 `unaccent`
  functions, which `privileges.sql` leaves to the extension.

**Why deferred:** only a run can prove it, and runs are the founder's to trigger.
**Where it lives:** servyou-backups README, « First run checklist » and « Reading a red run ».
**Trigger:** the first run after PR #4 merges. Green means `Restore check passed: every count,
the structure and all 249 privilege lists match production exactly`. A red run at
`privileges.sql line N`, or on the privilege lists, names the statement or the lists.

## 3. LOW: the default privileges of Supabase's own roles are compared as a warning only

**What:** `sql/acls.sql` now marks the default privileges of Supabase's own roles (`supabase_*`)
as `default-platform`: today 21 entries of `supabase_admin` and `supabase_auth_admin`. They only
warn, for two reasons:
- the restore runs as `postgres`, which is not a member of those roles and can't set them;
- Supabase's local image differs from the hosted platform on 4 of them: `realtime`'s table
  grant options, and the `supabase_functions` entries, which only the local image has. Run #4
  showed both.

The hard check still covers objects those roles create in our schemas, through their own lists:
the 4 `unaccent` functions, for example.
**Why deferred:** a platform difference, not a backup defect. A new project gets the platform's
own defaults.
**Where it lives:** servyou-backups `sql/acls.sql`, `scripts/restore-check.sh` step 7.
**Trigger:** the default privileges of any other role (`anon`, a custom role) are compared like
the rest. `privileges.sql` sets only those of `postgres`, so the first such entry on production
turns the check red until `sql/privileges.sql` covers that role. Extend it then.

## 4. LOW: a drill can't compare privileges with production's

**What:** production's privilege lists (`prod-acls.tsv`) stay out of the bundle, so a drill on
the founder's PC can run `privileges.sql` but has nothing to compare the result against.
`privileges.sql` itself encodes production's lists, and the nightly check proves it applies
exactly.
- Option: add the lists to the bundle (names and privilege lists, no rows), so step 5 of the
  drill can diff them like `counts.tsv`.

**Why deferred:** the nightly check already compares them every night, and the drill
procedure is a separate change.
**Where it lives:** `docs/operations.md`, « Restore drill procedure », step 5; servyou-backups
`scripts/backup.sh` (`prod-acls.tsv`).
**Trigger:** the first quarterly drill.

## 5. LOW: the privileges of types and domains are neither reset nor compared

**What:** `sql/acls.sql` and `sql/privileges.sql` cover schemas, tables, views, sequences,
columns, functions and default privileges, the scope of PR #4. They leave out the privileges of
types and domains in `public` and `private` (`pg_type.typacl`; our enums, for example). A Supabase
target has no `postgres` defaults for types in `public` (run #4 showed none), so the restored
types most likely keep pg_dump's lists exactly. But no check proves it, and a change there would
pass unnoticed.
**Why deferred:** outside this PR's scope, and nothing observed differs.
**Where it lives:** servyou-backups `sql/acls.sql`, `sql/privileges.sql`.
**Trigger:** the next change to those two files, or any migration that grants or revokes on a
type.

## 6. LOW: a default of `postgres` in a schema the target lacks would stop the restore

**What:** `privileges.sql` resets every default entry `postgres` has on production: today `public`,
`storage` and the global ones. If production ever gets an entry in a schema the restore target
doesn't have (a platform schema only the hosted image creates), its `ALTER DEFAULT PRIVILEGES … IN
SCHEMA` errors and the whole restore stops at that line. The reverse also stops the check: a
target default in a schema production has none in. The log names the line in both cases.
**Why deferred:** neither exists today. Both fail loudly with the schema's name, and a fix needs
the real case.
**Where it lives:** servyou-backups `sql/privileges.sql` (the `dkey` set).
**Trigger:** a red run at `privileges.sql line N: … schema "…" does not exist`, or a lone
`+default postgres in <schema>` line in the privilege check.

## 7. LOW: due now that run #4 was green

**What:** two earlier items waited for the first green run, and run #4 was one. Neither is in
this PR, which keeps to privileges:
- `nightly-backup-run1.md` item 1: flip the runbook's status line;
- `nightly-backup-run3.md` item 2: the cron job's description in « What a bundle holds ».

**Why deferred:** one PR, one focus. The status line is the architect's call, after PR #4's
first run.
**Where it lives:** `docs/operations.md`, « Nightly encrypted backup ».
**Trigger:** the first green run after PR #4 merges.
