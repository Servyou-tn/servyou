# Random fixture passwords + test-admin cleanup — audit H6 follow-ups (`test/random-fixture-passwords`, 2026-11-12)

## 1. rls-smoke.mjs still revokes admin only by deleting the account

**What:** `scripts/rls-smoke.mjs` promotes `charlie` to `is_admin = true` (Phase 3). It removes the right only by reaping
every test-domain account. This PR made its password random per run, but did not move an `is_admin = false` ahead of
its reap.
**Why deferred:** the script is never run by agents (it deletes EVERY `@rls-smoke.servyou.invalid` account on
production), so a change to its cleanup could not be tested here. The random password already removes the public
sign-in risk. If it ever crashes and leaves `charlie` as admin, every admin-granting suite's `assertNoTestAdmin()`
fails on its next run and names the account.
**Where it lives:** `scripts/rls-smoke.mjs`, Phase 3 and its reap.
**Trigger:** the next time rls-smoke is changed or run on purpose. Then demote before the reap, or retire the script
(the vitest live suites cover the same policies).

## 2. assertNoTestAdmin is global to the test domain

**What:** the final check fails a suite if ANY `@rls-smoke.servyou.invalid` account is an admin, not only that suite's
own. Two admin-granting suites running at the same time would fail each other's check.
**Why deferred:** by design. The db-guardian rule is one live suite at a time (`--no-file-parallelism`, one agent),
and a global check is what catches a leftover admin from ANOTHER suite's crashed run.
**Where it lives:** `src/__tests__/fixture-admin.ts`.
**Trigger:** only if live suites are ever run in parallel. Then scope the check to the suite's own prefix and add a
separate sweep.
