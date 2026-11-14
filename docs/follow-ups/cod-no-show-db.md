# COD no-show rule, DB PR: follow-ups (`feat/cod-no-show-db`, 2026-11-14)

The DB side of the COD no-show rule (plan and founder decisions: `docs/follow-ups/cod-no-show-plan.md`, PR #375). This
PR ships the migration (PENDING until the architect applies it), the server actions and the tests. Nothing here is
visible yet: no page calls the new actions or RPCs. These are the items it leaves to others, ranked.

## 1. UI-1 (Agent A): the seller's « Refusée à la livraison » and the refused order everywhere

**What:**
- **Seller action:** wire `refuseDeliveryAction({ orderId, reason, revalidate })` (`src/app/actions/orders.ts`) into
  G8 / G9 / G4.
  - Offer it for a product order in `dispatched` / `in_delivery` / `arrived` (`isRefusable` in
    `src/lib/orders/refusal.ts`).
  - Reason picker: `REFUSAL_REASONS`, labels `common.refusal_reason_*`.
- **The refused state everywhere:**
  - Show « Refusée à la livraison » wherever the order's `refusal_reason` is set: the display-only `refused` pill entry
    in `src/lib/orders/order-status.ts`, and a new `common.status_refused` label in FR, AR and EN.
  - A refused order stays `cancelled` in the database. Every list that wants the pill must select `refusal_reason`.
- **Buyer's refused order:** the explainer, and « Contester ce refus ».
  - The contest is `createDispute(orderId, 'refusal_contested', …)`; offer it only within 14 days of `cancelled_at`.
  - The new dispute keys already exist: `dispute.reason_refusal_contested`, `dispute.error_contest_*`.
  - **Don't gate the button on `hasActiveDispute()`** (`src/lib/marche/order-detail.ts`). It answers true for ANY
    active dispute, so a seller's own `payment_refused` dispute would hide the buyer's contest until the 14 days run
    out. The database lets the two coexist (the split index, decision 2 of the PENDING file). The button needs a
    contest-aware check: an active dispute with `reason = 'refusal_contested'`.
- **Text rewrites:**
  - `aide.g.commandes.a3`, which says there is no « Refusée » status;
  - `faq.acheter.q3.a`, which becomes « refusez, puis contestez »;
  - the CGU paragraph and the privacy-policy line (decision 10).
- **Vocabulary:** lock « Refusée à la livraison » in design system §6.2.

**Why deferred:** UI work, Agent A's PRs (plan section 6).
**Where it lives:** the files named above; plan section 5 has the proposed strings.
**Trigger:** the architect applies the migration.

## 2. UI-2 (Agent A): the buyer's banner, the seller's warning, the admin controls

**What:**
- **Buyer:** the order form reads `getMyCodStanding` (`src/lib/orders/cod-standing.ts`) and shows a banner before
  submit.
  - The two refusals are already mapped: `submitProductRequest` answers `demander.error.cod_open_order_cap` and
    `demander.error.cod_blocked` (with the date).
- **Seller:** the warning badge on lists and detail, from `seller_buyer_cod_warnings(order_ids)`. It returns the ids to
  flag, yes or no only.
- **Admin:**
  - on `/admin/utilisateurs/[id]`, the standing from `admin_get_cod_standing`, and « Lever le blocage »
    (`liftCodBlock` in `src/app/admin/utilisateurs/actions.ts`);
  - in « Litiges », on a `refusal_contested` dispute, « Annuler le refus » (`voidRefusal(orderId, note, disputeId)` in
    `src/app/admin/litiges/actions.ts`).
- **Journal:** add `lift_cod_block` and `void_refusal` to both KNOWN lists (`src/app/admin/journal/_lib/log.ts`,
  `src/app/admin/utilisateurs/[id]` users.ts), with `admin.log.action.*` and `admin.journal.action.*` keys in FR + AR.
  Until then the two actions show as « Action d'administration ».

**Why deferred:** UI work, Agent A's PRs.
**Where it lives:** the files named above.
**Trigger:** the architect applies the migration (it can run beside UI-1).

## 3. LOW: data-model.md, the orders section

**What:**
- The section must describe the refusal marker, `cod_block_lifts` and the rule.
- Fix the drift logged in the plan, section 7:
  - L121: `delivery_*` is set by service requests too;
  - L136: there is no admin status override;
  - L144: DB messages are mapped, not shown raw;
  - L187: the column grant list.

**Why deferred:** the docs describe what is applied: they change with the migration's rename, in this PR's second
commit.
**Where it lives:** docs/data-model.md, « Orders: the lifecycle table ».
**Trigger:** the architect applies the migration.

## 4. INFO: `buyer_cancellation_history` still does not see refusals

**What:** the view counts buyer cancellations only. The rule reads `orders` directly, so nothing depends on it.
**Why deferred:** it feeds the post-launch rating system, which isn't designed yet (plan section 7).
**Where it lives:** the view (migration `20260609150153`).
**Trigger:** the rating system's design.
