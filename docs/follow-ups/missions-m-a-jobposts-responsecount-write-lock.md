# Missions M-A — `job_posts.response_count` + write lock (`feat/missions-m-a`, 2026-10-26)

## LOW — consumers can still set `job_posts.status`, and edit the content, freely through REST

- ✅ **Closed by migration 76** (`20261027203831_job_posts_write_guards`, 2026-10-27): status transitions, content
  lock and `job_post_skills` lock once answered. The hard-DELETE half is open — see « Consumer hard-DELETE of an answered
  post » below.

- `status` stays column-granted (createAnnonce inserts it; mark-filled / reopen / delete update it), and only the
  CHECK (`open`, `filled`, `expired`, `deleted`) constrains it — no transition guard. On their own posts a
  consumer can un-delete (`deleted` → `open`), reopen past 30 days (the expiry check is app-only, in
  `reopenMissionAction`; the post then shows open but `check_job_response_limits` still refuses every response),
  or INSERT straight at `filled` / `deleted`. **Fix if wanted:** a BEFORE UPDATE transition trigger in the style
  of `check_order_status_transition` (`deleted` terminal; `filled` ↔ `open` only within 30 days).
- The other eight UPDATE-granted columns (title, description, category, city, remote, budgets, deadline) have
  no app writer today (no edit screen) but stay granted, so a consumer can rewrite a post after freelancers
  answered it (bait-and-switch). Pre-existing, not widened by M-A. **Decide when an edit screen is built:**
  narrow the UPDATE grant to `status` until then, or lock content once `response_count > 0`.

## LOW — M-A trade-offs, written down (`20261026173800`)

- **Deadlock window:** a response delete now UPDATEs its post. A post hard-delete (REST DELETE or the
  consumer's account deletion) that cascades into the same response while its freelancer deletes it can
  deadlock (40P01; one side aborts and retries). Rare: the app only soft-deletes posts.
- **Drift is a hard failure:** `CHECK (response_count >= 0)` makes a count that ever drifted low (responses
  written with triggers off / in replica mode) fail the next −1 with 23514 — blocking that response delete
  and any account-deletion cascade through it. Never bulk-load `job_responses` with triggers off; the repair
  is the migration's backfill UPDATE (absolute, idempotent).
- **Redundant index:** `job_posts_status_response_count_idx (status, response_count)` makes
  `job_posts_status_idx (status)` redundant; drop it in a later migration. Counter writes touch an indexed
  column, so they are never HOT updates (negligible at today's volume).

## Note — stale branches that still write `job_posts.updated_at` will fail

- `design/header-production`, `feature/buyer-cancellation-history`, `feature/configurable-workspace-fields-tests-docs`
  and `feature/orders-lifecycle-seller-advance` carry an old `mes-missions` page that updates
  `{ status: 'filled', updated_at: … }` (and a `modifier` page that sends `updated_at`). Under a user JWT that is
  now 42501, and Vercel previews hit the production database. `main` is unaffected; anything revived from those
  branches must drop `updated_at` from the payload.

## ✅ RESOLVED (M-C, migration 69 `20261026195409`, 2026-10-26) — concurrent responses can overshoot the 10-per-post cap (for M-C)

- Fixed: `check_job_response_limits` locks the post FOR UPDATE and reads `response_count`; the 5-active
  cap takes a per-freelancer advisory lock. Both races are exercised by bursts in
  `job-responses-proposal-fields.test.ts`. Original entry:

- `check_job_response_limits` counts rows in a BEFORE trigger without locking the post, so two responses
  arriving together can both see 9. `response_count` is now the natural lock point: in M-C (which owns that
  function, G5 / G7), read it `FOR UPDATE`, or add `CHECK (response_count <= 10)`.

## Observation — 5 orphaned test accounts on production

- `auth.users` holds 5 `@example.com` test accounts created 2026-06-20 … 2026-08-22 (`test-*`, `rls-*`,
  `detail-owner-*` / `detail-responder-*`), left by old runs; no current suite reaps them. Not deleted here —
  the founder's call.
