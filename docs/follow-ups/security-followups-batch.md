# Security follow-ups batch (`fix/security-followups-batch`, 2026-10-28)

Live re-verification (read-only, 2026-10-28) of every open DB-side finding in `security-audit-open-findings.md`,
`jobresponses-integrity.md`, `pre-public-security-audit-follow-ups.md`, `suspension-enforcement.md`,
`live-suite-teardown-guard.md` and `missions-m-c-…md`. Eight fixes were written as PENDING files, and the architect
applied all eight on 2026-10-28 (migrations 79–86, `20261028194710` … `20261028194729`). The proof is
`src/__tests__/security-followups-batch.test.ts`: 14 red / 5 controls green before apply, 19/19 green after.

## ✅ Done in this PR (founder rulings 1–4, 2026-10-28)

- Wording approved. An admin inserts orders at `pending` only.
- The db-guardian skill now says that new columns on `freelancer_profiles` / `shops` / `disputes` need an explicit
  column GRANT.
- Live suites updated for the new refusals:
  - `job-posts-write-guards.test.ts`: the admin inserts with cancel columns or at `cancelled` are now refused, and
    the terminal-state order is seeded by the service role.
  - `orders-lifecycle-columns.test.ts`: the admin insert at `received` is refused, and three `received_at` writes
    now get 42501 (E2).
  - `job-responses-proposal-fields.test.ts`: a foreign skill insert is now `not_self`.
  - `seller-capability-integrity.test.ts`: handing a shop or a profile to another account is now `not_self` (found
    by the regression run, not in the original list).

## Second batch (founder rulings 5–9, 2026-10-28): moved to `fix/security-followups-batch-2`

Each of these now has a ruling, and they ship as their own PENDING batch.

- **5:** refuse deleting a freelancer profile or a shop while it is moderated.
- **6:** `get_contact_phone` refuses when the post is moderated or either party is suspended.
- **7:** refuse new orders and responses aimed at a suspended account. Hiding a suspended account's content in the
  read policies gets a plan only.
- **8:** orders `created_at` / `updated_at` are forced on insert, and the stock rule moves into the trigger.
- **9:** one shop per owner; `admin_hidden_reason` readable by its owner and admins only; `public_profiles` hides
  moderated sellers.

## Out of scope (ruling 10, confirmed)

- The "switch seller type" flow design.
- The storage content-gate gap.
- Auth leaked-password protection.
- The docs, performance and test-password items.
