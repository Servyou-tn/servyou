# Purge unconfirmed sign-ups — leftovers (`fix/purge-unconfirmed-signups`, 2026-11-12)

## 1. Nothing alerts when the nightly purge fails

- **What:** the pg_cron job `purge-unconfirmed-signups` records each run in `cron.job_run_details`, but nobody reads
  that table. If a future FK or trigger starts refusing the DELETE, the job fails every night silently and squatted
  sign-ups live past 24 hours again.
- **Why deferred:** no monitoring surface exists for cron jobs yet. The function already excludes every user the
  live FKs could block (audit H1 discovery), so a failure needs a new schema change first.
- **Where it lives:** `cron.job_run_details` (job `purge-unconfirmed-signups`); the admin dashboard has no system-health
  panel.
- **Trigger:** the first new FK into `auth.users` / `public.profiles` with ON DELETE RESTRICT / NO ACTION (re-check the
  function's exclusions in the same PR), or when an admin health panel is built (show the last run's status).
