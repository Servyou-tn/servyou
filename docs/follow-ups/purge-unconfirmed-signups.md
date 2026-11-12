# Purge unconfirmed sign-ups — leftovers (`fix/purge-unconfirmed-signups`, 2026-11-12)

## 1. Nothing alerts when the nightly purge keeps a row or fails

- **What:** the pg_cron job `purge-unconfirmed-signups` deletes row by row. A row that a future FK or trigger refuses
  is kept and logged as a Postgres WARNING (`purge_unconfirmed_signups: kept user <id> …`). Each run is recorded in
  `cron.job_run_details`. Nobody reads either, so a squatted account kept that way lives past 24 hours unnoticed.
- **Why deferred:** no monitoring surface exists for cron jobs or Postgres warnings yet. The function already
  excludes every user the live FKs could block (audit H1 discovery), so a kept row needs a new schema change first.
- **Where it lives:** `public.purge_unconfirmed_signups()`, `cron.job_run_details`; the admin dashboard has no
  system-health panel.
- **Trigger:** the first new FK into `auth.users` / `public.profiles` with ON DELETE RESTRICT / NO ACTION (re-check the
  function's exclusions in the same PR), or when an admin health panel is built (show the last run and any kept rows).
