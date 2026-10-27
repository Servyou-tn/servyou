# Pre-existing integration-test fixture collision — `buyer-cancellation-history.test.ts` / `order-delivery-fee-snapshot.test.ts` (found 2026-09-03)

- **What:** both files' `beforeAll` call a `make*WithProduct(sellerId)` helper multiple times
  (2–3 sellers) that hardcodes a single literal shop name (`'BCH Shop'`, `'DFee Shop'`) with no
  per-call uniqueness suffix. The second and third calls now fail with
  `duplicate key value violates unique constraint "shops_name_lower_key"`, so both suites'
  `beforeAll` throws and every `it()` in the file reports skipped rather than passing.
- **Reproduces independent of any other change:** confirmed by running
  `npx vitest run --config vitest.integration.config.ts src/__tests__/buyer-cancellation-history.test.ts src/__tests__/order-delivery-fee-snapshot.test.ts`
  in isolation, on `main`, with no other test files in the run.
- **Cause:** `shops_name_lower_key` (migration `20260811055734_shops_name_unique_and_asset_select`)
  added a case-insensitive unique index on `shops.name` after these two fixture files were written;
  neither was updated to give each of its multiple shop-per-seller fixtures a distinct name.
- **Not fixed here:** found while running the full `npm run test:integration` suite as part of the
  provenance-gate PR (`uploaded_objects` / `enforce_product_image_provenance`), which touches
  neither file nor the `shops` table. Out of this PR's scope per CLAUDE.md's one-PR-one-focus rule.
- **Trigger:** its own small PR — suffix each `make*WithProduct` call's shop name with the seller id
  or a short random id, matching how every other live-DB fixture in this codebase (e.g.
  `uploaded-objects-provenance-rls.test.ts`'s `Provenance Test Shop ${randomUUID().slice(0,8)}`)
  already avoids this class of collision.
- **Still red (seen again 2026-09-05, `feat/d4-public-profile`):** first seen during the H3 build,
  still failing on the same `shops_name_lower_key` duplicate across multiple sessions since — the
  tests are not cleaning up after themselves, so orphaned rows from past runs keep colliding with
  the next one. Two integration tests permanently red is noise that will mask a real failure.
  Needs a teardown fix in addition to the `make*WithProduct` naming fix above, plus a one-time
  cleanup of the orphaned rows already sitting in the DB. Not tied to any page PR.
