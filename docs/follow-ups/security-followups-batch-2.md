# Security follow-ups batch 2 (`fix/security-followups-batch-2`, 2026-10-28)

Founder rulings 5–9, plus the follow-up rulings 1–5, both of 2026-10-28. The proof is
`src/__tests__/security-followups-batch-2.test.ts` (live-DB).

## ✅ Applied (migrations 87–91, `20261028201727` … `20261028201746`)

These cover moderated seller no-delete, the `get_contact_phone` state gate, the orders counterparty / stock /
timestamps rules, responses to a suspended poster, and one shop per owner. Details are in the migrations README.
All five suite blocks are green.

**Rejected:** `public_profiles` hiding moderated sellers (follow-up ruling 2). Past counterparties keep seeing names,
and discovery is already filtered. The file was deleted unapplied.

## PENDING in this PR (red until applied)

| File | Ruling | Apply when |
|---|---|---|
| `PENDING_suspended_content_hidden.sql` | 7, read half (Option A, approved) | any time |
| `PENDING_moderated_item_no_delete.sql` | 5a | any time (app mapping ships in this PR) |
| `PENDING_job_responses_cap_excludes_suspended_poster.sql` | 5c | any time |
| `PENDING_get_moderation_reason_fn.sql` | 9, step 1 | any time; before or with this PR's deploy |
| `PENDING_moderation_reason_column_revoke.sql` | 9, step 2 | **only after** step 1 is applied **and** this PR is merged and deployed |

- **The app side ships in this PR.** The admin signalements page reads the note through `get_moderation_reason()`;
  until step 1 is applied the page logs the RPC error and shows « — ».
- `annonce-detail` and `seller-products-query` no longer select the column.
- `actions/products.ts` already used `select('id')`; only a comment said `.select()`.
- Delete actions map hint `moderated` to `*.error_delete_moderated`, and `createShopAction` maps
  `shops_owner_id_key` to `shop.create.error.already_owns`.

## On apply (owed by whoever records them)

- After `PENDING_get_moderation_reason_fn`: regenerate `database.types.ts` and remove the `rpc` cast in
  `admin/signalements/[id]/page.tsx`.
- After `PENDING_moderation_reason_column_revoke`: add a db-guardian skill rule. New columns on `shops`, `products`,
  `service_listings`, `freelancer_profiles` and `job_posts` would not be client-readable without an explicit
  column SELECT grant. Also, never re-grant table-level SELECT on them, which would reopen `admin_hidden_reason`.
- After `PENDING_suspended_content_hidden`: record the `private` schema convention. A policy helper that anon must
  execute lives in `private` (USAGE granted to anon / authenticated), not `public`, so it is not an RPC endpoint.

## Logged, not fixed

- **LOW — H11's « active proposals » counters ignore poster suspension.** They may show one more active proposal
  than the database counts while a poster is suspended (cosmetic).
- **Note — a parent that holds a moderated item can't be deleted under a JWT.** Since `PENDING_moderated_item_no_delete`,
  deleting a shop or freelancer profile that contains a moderated product / service is refused (cascade under the same
  JWT). This is intended; no app path deletes a shop or profile today.
