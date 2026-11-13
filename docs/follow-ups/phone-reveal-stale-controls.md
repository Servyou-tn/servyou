# Phone reveal — stale and vacuous phone assertions in live suites (`test/phone-reveal-stale-controls`, 2026-11-13)

Found while rewriting the two stale controls from #363's live run (`profiles-rls`, `security-followups-batch-2`) to
the phone reveal rule (migration `20261101181237_phone_reveal_rule`, founder decision D7, kept by
`20261101201344_phone_reveal_deleted_post`): a mission reveals owner → freelancer only, and an order reveals the seller
to the buyer only once accepted. This PR is test-only and changes nothing below.

## 1. HIGH — `progressive-phone.integration` still expects a freelancer to read the client's phone

- **What:** test `(4) get_contact_phone returns consumer phone end-to-end after job_response link`
  (`src/__tests__/progressive-phone.integration.test.ts:143-146`) expects `clientFreelancer → consumer` to return
  `+21620000099`. Under the rule that is NULL, so the test goes red on its next live run. Its reverse half
  (`:149-151`) is vacuous: the freelancer has no phone, so it passes whatever the rule does, and it ignores the RPC's
  `error`.
- **Why deferred:** outside this brief, which named only the two tests from #363's live run.
- **Where it lives:** `src/__tests__/progressive-phone.integration.test.ts` (in `INTEGRATION_GLOBS`).
- **Fix / trigger:** the same pair as this PR's fix: freelancer → client NULL, plus a service-role read proving the
  client's phone is seeded; give the freelancer a phone so consumer → freelancer returns it. Do it before the next
  live run of that suite.

## 2. LOW — three suspension / moderation tests in `security-followups-batch-2` now prove less than their titles

- **What:** the rule makes some halves NULL whatever the suspension or moderation state, so those halves cannot fail:
  - `the seller suspended: the past buyer no longer reads their phone (orders branch)` (`:359-363`): buyer → seller
    is NULL on the still-pending fixture order anyway, so the whole test is vacuous.
  - `the poster suspended: …` (`:354`) and `the post moderated: …` (`:367`): the responder → poster half is NULL by
    the rule. The poster → responder half still carries each test.
- **Why deferred:** the brief allowed changing only the control. This PR's new order control proves that seller →
  buyer returns the phone on the pending order, which is what a real suspension check needs.
- **Where it lives:** `src/__tests__/security-followups-batch-2.test.ts`, describe
  `get_contact_phone — no unlock through a moderated post or with a suspended party`.
- **Fix / trigger:** for the seller-suspended test, assert `phoneOf(sellerClient, buyerId)` is NULL while the seller
  is suspended. No other suite checks a suspended seller on the orders branch: `phone-reveal-seller-live.test.ts:67`
  covers a suspended buyer only. The "either party suspended" check itself sits at the top of the function and stays
  proven by the poster → responder half and by that buyer case. Drop the responder → poster halves, or mark them
  "by the rule". Next time that suite is edited.

## 3. LOW — `profiles-rls` fixture writes and teardown swallow errors

- **What:** `createUser` ignores the error of its `profiles.update({ phone })` (`src/__tests__/profiles-rls.test.ts:64`).
  `afterAll` ignores the errors of its `job_responses` / `job_posts` deletes and of `deleteUser` (`:95-99`), and never
  counts what is left. This PR's two tests are covered: (a) reads the client's seeded phone through the client's own
  session, and (b) fails if the freelancer's phone was not seeded. A failed seed now fails a test, but with an
  assertion message rather than the update's error. A read-only count after this PR's live run found 0
  `rls-*@example.com` profiles and 0 `RLS test mission` posts.
- **Why deferred:** fixture plumbing shared by unchanged tests; out of scope.
- **Where it lives:** `src/__tests__/profiles-rls.test.ts` (helpers and `afterAll`). The foreign-response guard for
  the same direct delete is already logged in `live-suite-teardown-guard.md`.
- **Fix / trigger:** throw on each error and assert a zero count at the end, like `security-followups-batch-2`'s
  `afterAll`. Next time the suite is edited.
