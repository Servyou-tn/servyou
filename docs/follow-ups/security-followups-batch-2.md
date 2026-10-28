# Security follow-ups batch 2 (`fix/security-followups-batch-2`, 2026-10-28)

Founder rulings 5–9 (2026-10-28) are written as seven `db/migrations/PENDING_*.sql` files, plus a plan for the read half
of ruling 7 (`docs/design/suspended-content-read-plan.md`). The red proof is
`src/__tests__/security-followups-batch-2.test.ts`: 18 red and 2 controls green before apply.

## Apply order / preconditions

- **`PENDING_moderation_reason_owner_admin_only` must be applied only after an app PR has deployed.** That PR stops
  selecting `admin_hidden_reason` in:
  - `admin/signalements/[id]/page.tsx:141` (switch it to `rpc('get_moderation_reason')`);
  - `lib/marche/annonce-detail.ts:126`;
  - `lib/marche/seller-products-query.ts:95`.

  It also changes `actions/products.ts:~808`'s `.update(…).select()` (RETURNING \*) to `select('id')`. Applied
  first, those paths return 42501 in production.
- All the other files are independent and can be applied in any order.

## Logged, not fixed

- **LOW — item-level moderation evasion.** An owner can still delete a moderated product or service listing and
  re-create it. Ruling 5 covers freelancer profiles and shops only.
- **LOW — G2 copy in one race.** `createShopAction` maps every 23505 to the « name taken » copy. With
  `shops_owner_id_key`, a double-submit race that beats the action's « already owns a shop » check would show that copy.
- **LOW — suspended posters still use up cap slots.** Responses to a suspended poster's open posts still count toward a
  freelancer's 5-active cap.
- **Merge note.** This branch and #222 each add one line after `profiles-email-sync` in `vitest.config.ts`'s
  `INTEGRATION_GLOBS`. Whichever merges second needs a one-line conflict fix.
