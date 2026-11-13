# Phone reveal — stale and vacuous phone assertions in live suites (`test/phone-reveal-stale-controls`, 2026-11-13)

The three entries first logged here are closed by #365's commit 3, per the architect's review: `progressive-phone.integration`
(4) now asserts the rule's pair, the three batch-2 suspension / moderation tests run on a direction that reveals the phone,
and `profiles-rls` fails loudly on its phone seeds and teardown. One item is still open.

## 1. LOW — `progressive-phone.integration` teardown swallows errors

- **What:** `afterAll` ignores the errors of its `job_responses` / `job_posts` deletes and of `deleteUser`, and never
  counts what is left (`src/__tests__/progressive-phone.integration.test.ts`, `afterAll`). A failed cleanup would leave
  `phone-test-*@example.com` accounts and a « Test phone-collection mission » post on production without failing the
  run. A read-only count after #365's live run found 0 of each.
- **Why deferred:** the architect's list for commit 3 named only `profiles-rls`'s teardown. This file's phone seed was
  fixed in the same commit (it now throws), because the freelancer's phone became load-bearing.
- **Where it lives:** `src/__tests__/progressive-phone.integration.test.ts` (in `INTEGRATION_GLOBS`).
- **Fix / trigger:** the same pattern as `profiles-rls` after #365: run every step, collect the errors, throw them
  together, then count this run's own ids and fail on anything left. Next time the suite is edited.
