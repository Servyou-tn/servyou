# Pre-launch test-data wipe (`chore/prelaunch-test-data-wipe`, 2026-11-02)

## After the wipe is applied

- **What:** rename `PENDING_prelaunch_wipe_test_data.sql` to the recorded version and add its README entry; then
  read-only: `auth.users` = 1, `profiles` = 1, `categories` = 111, `storage.objects` = 0; click-through: `/marche`,
  `/marche/services`, `/missions` show their empty states (no error state), the admin dashboard and
  `/admin/utilisateurs` load with one account.
- **Why deferred:** the founder applies it, after deleting the 4 Storage folders listed in the file's header.
- **Where it lives:** `db/migrations/`.
- **Trigger:** the apply.

## Live-DB test suites will recreate test accounts

- **What:** the live suites (`*-live.test.ts`, fixtures with unique prefixes) create and clean up their own accounts
  on production; a failed cleanup leaves test rows behind again after launch.
- **Why deferred:** not part of the wipe; worth a launch-eve decision (run them only before launch, or against a
  Supabase branch afterwards).
- **Where it lives:** `src/__tests__/*-live.test.ts`, `vitest.integration.config.ts`.
- **Trigger:** the first live-suite run after launch.
