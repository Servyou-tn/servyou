# Nightly backup after run #3 — follow-ups (`docs/backup-run3-followups`, 2026-11-14)

Run #3 (2026-11-14, after servyou-backups PR #2) restored `roles.sql`, `schema.sql` and `data.sql`.
It stopped at the last line of `extras.sql`, the pg_cron job: `XX000`. The fix is servyou-backups
PR #3. These items make the runbook right for a real restore, too. Earlier items stay in
`nightly-backup.md` and `nightly-backup-run1.md`.

## 1. TRIGGER — a bundle made before servyou-backups PR #3 needs one hand edit to restore

**What:** every bundle made before PR #3 merged fails at its last line when restored as `postgres`, as the
runbook's « Restore drill procedure » does. That covers 2026-11-13, both of 2026-11-14, and any night until
the merge. Two facts cause it:
- `extras.sql` ends with one `SELECT cron.schedule_in_database(<name>, <schedule>, <command>, 'postgres', 'postgres', …)`
  line per job;
- pg_cron 1.6.4 refuses any username from a non-superuser, even the caller's own (« must be superuser to
  create a job for another role »), and `postgres` is no superuser on Supabase.

The restore is one transaction, so nothing stays. The steps:
1. Before step 3, move those lines out of `extras.sql`.
2. After the restore, still as `postgres`, run `select cron.schedule(<name>, <schedule>, <command>);` for each one,
   with the values from its line. Those bundles hold one job, and its statement is exactly migration #130's
   (`db/migrations/20261112204634_purge_unconfirmed_signups.sql`):
   `select cron.schedule('purge-unconfirmed-signups', '17 3 * * *', $$select public.purge_unconfirmed_signups()$$);`
3. Then compare the counts (step 5). The cron job is counted too.

Bundles made after the merge pass the job's role only when it is not the restoring role, and restore as they are.
**Why deferred:** the runbook changes when PR #3 is merged and proven by a green run. Until then, this note is
the procedure.
**Where it lives:** `docs/operations.md`, « Restore drill procedure », step 3. The private repo's README,
« Restoring », has the same steps. After PR #3, a failed `extras.sql` statement in the nightly log prints a cron
job only up to its name, since a job's command can hold a key. A restore by hand prints psql's full messages on the
operator's own screen only.
**Trigger:** any drill or real restore from a bundle made before the merge. The item lapses once those bundles
have expired from B2.

## 2. LOW — the runbook's description of the cron job

**What:** `docs/operations.md`, « What a bundle holds », says `extras.sql` recreates `purge-unconfirmed-signups`
« through `cron.schedule_in_database` ». After PR #3 the description should add that the job's role is passed only
when it is not the restoring role. Restored as `postgres`, the job belongs to `postgres` again, as on production.
A job of another role needs a superuser.
**Why deferred:** PR #3 is not merged yet. It belongs with run #1 follow-up 1, the status flip after the first
green run.
**Where it lives:** `docs/operations.md`, « Nightly encrypted backup » → `extras.sql`.
**Trigger:** the first green run (the same edit as `nightly-backup-run1.md` item 1).

## 3. LOW — `session_replication_role` is still `replica` after `data.sql`

**What:** the restore sets `session_replication_role = replica` before `data.sql` and never resets it, so
`extras.sql` and anything after it in the same session run with ordinary triggers and foreign-key checks off.
This was checked as the possible cause of run #3, and it is not: pg_cron writes its job through SPI with no foreign
key, and clears its own job cache. The runbook's restore is one `psql` command that exits, so nothing runs after it.
A hand restore that keeps the session open for fixes must run `set session_replication_role = origin` first.
**Why deferred:** no observed effect; the restore check and the runbook command both end the session.
**Where it lives:** `docs/operations.md`, « Restore drill procedure », step 3.
**Trigger:** the next edit of that step, or any restore done in an interactive session.
