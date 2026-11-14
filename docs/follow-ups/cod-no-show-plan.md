# COD no-show rule (refused deliveries): discovery and plan (`feat/cod-no-show-plan`, 2026-11-14)

Phase 1 only: discovery and a proposed design. **No migration file and no code exist yet.** The founder's numbers are
fixed (decision of 2026-11-13); this plan settles how they are recorded, counted and enforced, and lists what the
founder must decide (« Questions for the founder », at the end). Discovery was read-only on production
(`execute_sql` SELECTs, 2026-11-14).

**The rule, as decided:**
- the seller marks an order « Refusé à la livraison » (the buyer refused it or never collected it);
- 2 refusals of the same buyer within 90 days → that buyer may have only 1 open order at a time, and the seller sees a
  warning on that buyer's orders;
- 3 refusals within 90 days → COD blocked for that buyer for 30 days. COD is the only payment at launch, so this means
  no new orders for 30 days;
- an admin can lift the block, logged in the admin journal.

This pulls forward part of the post-launch « buyer rating and reputation » work (product.md, « The COD friction
reduction features », L125-135; roadmap.md L92-95; data-model.md L199-201: « No buyer-reputation aggregate »).

---

## 1. Today's order lifecycle (live, 2026-11-14)

**Table `orders`** (data-model.md, « Orders: the lifecycle table », L109-148).
- **Statuses:** CHECK `orders_status_check`, with `pending → accepted → prepared → dispatched → in_delivery → arrived →
  received`, plus `cancelled`. Service orders go `pending → accepted → arrived`.
- **No payment-method column:** COD is implicit. `'cod'` is always on in a shop's payment methods
  (`src/lib/types/shop-config.ts:13-21`).
- **Refusal fields:** none exists — no refused / no-show status, column or code anywhere.
  - Sellers are told to cancel with a reason (`aide.g.commandes.a3`: « Il n'existe pas de statut « Refusée » … client
    injoignable »).
  - The UI already has a display-only `refused` pill entry (`src/lib/orders/order-status.ts:62`). It shows the
    cancelled label.
- **Cancellation fields:** `cancelled_by` (`buyer`/`seller`, CHECK), `cancellation_reason` (free text; the seller UI
  stores a preset label), `cancelled_at` (DB-stamped).
- **Timestamps:** `created_at`/`updated_at` (DB clock), `received_at` (DB-stamped), `cancelled_at`. There are no
  per-stage timestamps.
- **Data:** 16 orders, 2 distinct buyers, 0 seller cancellations after dispatch, 0 disputes. **No backfill:** nothing
  live is a refusal, and past cancellations are not converted.

**Who may move an order:** RLS « Buyer or seller updates order » plus column UPDATE grants for `authenticated` on
`status, cancelled_by, cancellation_reason, carrier, tracking_number`. The triggers decide everything else:

| Trigger (BEFORE unless noted) | Rule |
|---|---|
| `trg_check_order_status_transition` | caller must be the buyer or the seller (a NULL caller, i.e. the service role, is refused too). Terminal: `received`, `cancelled`. `cancelled_by` must match the caller's role. A reason is required after `dispatched` (product) or `accepted` (service). Only the buyer confirms receipt, from `arrived`. Only the seller advances, one step at a time; the phone gate applies on accept (23514 `seller_phone_required`). **No admin branch:** admins cannot change a status. |
| `trg_enforce_buyer_cancel_product_only` | a buyer can't cancel a service request (42501 `buyer_cancel_service`) |
| `trg_enforce_order_lifecycle_columns` | `received_at` is DB-stamped. Cancellation fields can't be edited outside the cancelling update. System (NULL uid) writes may set timestamps |
| `trg_set_cancelled_at_on_transition` | `cancelled_at := now()` on the transition to `cancelled` |
| `enforce_order_identity_lock_trigger` | identity columns frozen; carrier/tracking writable by the seller only, never on a terminal order |
| `trg_enforce_order_insert_integrity` | `seller_id` from the item; tier 2 requires `pending` and empty lifecycle columns; the item must be live, the seller not suspended, no self-order, stock |
| `trg_limit_orders` → `enforce_order_rate_limit` | per-buyer advisory lock `orders.rate:<buyer>`. At most 5 `pending` per buyer per seller (23514 `order_cap_seller`), 20 per buyer per 24 h (`order_cap_daily`). Service role exempt |
| `trg_emit_order_event` (AFTER) | writes `order_events` (`created`, `status_change`, with the cancellation reason as `note`) |
| `trg_enforce_active_user` (statement) | a suspended account can't write |

**Old branches:** `feature/orders-lifecycle-seller-advance` and `feature/buyer-cancellation-history` are fully merged
(0 commits ahead of main). The second created the view `buyer_cancellation_history` (`security_invoker`, per-buyer
counts, a « serial-refuser » metric). It counts only `cancelled_by = 'buyer'`, so a no-show the seller cancels is
counted against nobody. Nothing in `src/` reads it (tests only).

**App:**
- **Creates orders:** only `submitProductRequest` / `submitServiceRequest` (`src/app/demander/[id]/actions.ts`). DB
  refusals map through `orderCapKey` (`src/lib/marche/cap-refusal.ts`: 23514 + hint → i18n key; anything else is the
  generic error).
- **Status changes:** `src/app/actions/orders.ts` (advance, cancel, confirm receipt; error keys in
  `src/lib/orders/*-error.ts`).
- **Pages:** buyer `/mes-commandes` (+ `[id]`); seller `/commandes-recues` (+ `[id]`) and `/tableau-de-bord-vendeur`;
  freelancer `/mes-engagements`; admin `/admin/commandes` (read-only), `/admin/litiges`, `/admin/journal`,
  `/admin/utilisateurs/[id]`.

**Neighbours the rule can reuse:**
- `disputes`: an order-scoped report.
  - Buyer or seller creates it once the order is past `pending`; an admin resolves it.
  - Its reasons include `payment_refused` and `buyer_unreachable`; outcomes `sided_buyer` / `sided_seller` /
    `compromise`; one active dispute per order.
  - The admin surface « Litiges » exists (PR #332).
- Admin journal: `log_admin_action(...)` → `admin_audit_log`. The pattern is `admin_suspend_user` /
  `admin_unsuspend_user` (SECURITY DEFINER, `is_admin()` gate, raise on failure, log in the same transaction).

## 2. How a refusal is recorded: two options (founder question 1)

**Option A: a new status `refused`** (terminal, product orders only, seller-only, from `dispatched` / `in_delivery` /
`arrived`).
- Clean to count, and a first-class state with its own tab.
- **Blast radius:** 13 DB functions hard-code the status list, and each would need `refused`:
  - `check_order_status_transition`, `enforce_order_identity_lock`, `enforce_order_lifecycle_columns`,
    `emit_order_event`;
  - `get_contact_phone`;
  - `private.order_status_rank` (would return NULL), `admin_list_orders` (a refused order would sit in « en cours »),
    `admin_count_orders`, `admin_dashboard_stats`, `private.admin_orders`, `private.admin_period_kpis`;
  - `admin_list_deletion_requests` and `admin_process_deletion_request`: they treat anything but `received` /
    `cancelled` as open, so **one refused order would block that buyer's account deletion forever**.
  - App: the `OrderStatus` union and every switch over it, every pill map, and the admin tabs.
- 2 DB PRs (the status first, then the rule), or one very large one.

**Option B (recommended): a refusal is a seller cancellation after dispatch, with a refusal marker.**
- New columns on `orders`:
  - `refusal_reason text` — NULL unless refused; CHECK on a short list (Q4);
  - `refusal_voided_at timestamptz` — set only by an admin RPC.
- A refusal is `status = 'cancelled'`, `cancelled_by = 'seller'`, `refusal_reason` set; its time is the existing
  `cancelled_at`.
- A new BEFORE UPDATE trigger guards the marker, so the load-bearing `check_order_status_transition` stays untouched
  (« once built, stays built »):
  - the marker can be set only in the update that cancels, by the seller, on a product order coming from `dispatched`
    / `in_delivery` / `arrived`;
  - it can never be changed or cleared afterwards;
  - `refusal_voided_at` is never client-writable.
- The cancelling update still carries `cancellation_reason`, which the transition trigger requires after dispatch. The
  UI sends the chosen refusal label there, as it does for the cancel presets.
- Terminal locks, account deletion, the phone reveal (an order cancelled after acceptance keeps it), KPIs and the
  timeline (`emit_order_event` writes the cancellation note) all work unchanged.
- The UI shows « Refusée à la livraison » wherever the marker is set; the display-only `refused` pill entry already
  exists.
- Cost: refusals sit in the « Annulées » tabs unless the UI splits them, and every count filters on the marker.
- 1 DB PR.

The rest of this plan assumes **Option B**. Under Option A, read « refusal » as `status = 'refused'` and add the 13
function changes above as their own DB PR, first.

## 3. Counting and enforcement (in the database)

**A counted refusal:**
- a product order with `status = 'cancelled'`, `cancelled_by = 'seller'`, `refusal_reason` set and
  `refusal_voided_at` NULL;
- counted once per seller, per buyer, per calendar day (Africa/Tunis) (Q5);
- after the buyer's last block lift, if a lift resets the count (Q8).

Its date is `cancelled_at`, stamped by the database, never by the client.

**The windows, exactly.** R90(t) is the number of counted refusals in (t − 90 days, t].
1. **Tier 1, the cap.** At order insert time t, if R90(t) ≥ 2, the buyer may have at most 1 open order. « Open » means
   a product order in `pending` … `arrived` (Q3).
2. **Tier 2, the block.** A counted refusal r is a trigger if R90(r) ≥ 3, counting r itself. The buyer is blocked at
   time t iff a trigger r exists with r ≤ t < r + 30 days.
   - The block is anchored to the refusal that reached 3. A live « 3 in the last 90 days » check would hold the block
     for up to 90 days, not 30.
3. A 4th counted refusal while R90 ≥ 3 is a new trigger and restarts the 30 days.
4. When a block ends, tier 1 still applies while R90(t) ≥ 2. Refusals age out after 90 days.
5. Only new orders are gated. Orders already open when a tier starts are untouched, and so are their sellers.
6. Everything is computed live from `orders` and the lifts table. Nothing is stored as « standing », so voiding a
   refusal or lifting a block takes effect at once, with no drift to repair.

**Enforcement:** a new BEFORE INSERT trigger, `trg_limit_orders_cod` → `enforce_cod_no_show_rule()`. Its name sorts
right after `trg_limit_orders`.
- It follows the `enforce_order_rate_limit` shape:
  - SECURITY DEFINER, `search_path ''`;
  - exempt when `auth.uid()` is NULL or the row's buyer is not the caller;
  - **the same advisory lock key `orders.rate:<buyer>`**, so two concurrent inserts can't both see 0 open orders.
- Block → `raise … using errcode = '23514', hint = 'cod_blocked'`. FR message, about the caller's own account only:
  « Les commandes avec paiement à la livraison sont suspendues pour votre compte jusqu'au <date>. »
- Cap → 23514, `hint = 'cod_open_order_cap'`: « Vous avez déjà une commande en cours. Après plusieurs livraisons
  refusées, une seule commande à la fois est possible. »
- `orderCapKey` maps both hints to i18n keys, as the two existing caps are mapped.
- **The scope** (product orders only, or service requests too) is Q2.

**The shared logic:** `private.buyer_cod_standing(p_buyer uuid) returns (refusals_90d int, open_order_cap boolean,
blocked_until timestamptz)`. It is used by the trigger and the RPCs below, and lives in `private` so PostgREST doesn't
expose it. A partial index on `orders (buyer_id, cancelled_at) where refusal_reason is not null` keeps it cheap.

**New columns and the client:** `authenticated` has table-level INSERT and SELECT on `orders`.
- Every new column is client-insertable, so the insert triggers force it. Extend tier 2 of
  `enforce_order_insert_integrity`, or the lifecycle-columns trigger: `refusal_reason` and `refusal_voided_at` must be
  NULL on insert. This is a must-test.
- Every new column is readable by both parties. So the voiding admin's identity stays out of `orders`: the journal
  holds it.
- The seller sets `refusal_reason` in the cancelling UPDATE. That needs a column UPDATE grant plus a
  `db/client-write-allowlist.json` entry in the same PR.
  - The alternative is a seller RPC `mark_order_refused(order_id, reason)`, which needs neither, but is a second
    write path beside `cancelOrderAction`.
  - Recommended: the column grant, consistent with the cancel flow.

**The seller's warning (Q6).** The seller sees a boolean only: « this buyer has several recent refused deliveries ».
Never the count, the dates or the other sellers.
- Recommended: computed live, for the caller's own open orders only. RPC
  `seller_buyer_cod_warnings(p_order_ids uuid[]) returns setof uuid`, giving the order ids whose buyer currently has
  R90 ≥ 2.
  - It reaches the orders that were already open when the buyer crossed the tier.
- Alternative: a snapshot column `orders.buyer_refusal_warning`, set by the insert trigger.
  - Auditable, and needs no new read.
  - Misses the already-open orders.
  - The buyer can read it on their own row.

**The buyer is told.** RPC `get_my_cod_standing()` (authenticated, the caller only) returns `open_order_cap` and
`blocked_until`, but not the count. It gives:
- the order form a banner before submit (it also closes the « finds out only on submit » gap of
  `orders-jobposts-caps.md` item 3);
- the date for the block message, which can't come from the raw DB message.

A refused order's page explains that the refusal counts, and offers « Contester » (section 4).

**The admin:**
- `admin_lift_cod_block(p_buyer uuid, p_note text)`:
  - writes a row in a new table `cod_block_lifts (id, buyer_id, lifted_by, lifted_at, note)`, with the note required;
  - then `log_admin_action('lift_cod_block', 'user', buyer, before, after, note)`;
  - raises when the buyer is not blocked.
- `admin_void_refusal(p_order uuid, p_note text)` sets `refusal_voided_at`, never the status, and logs
  `void_refusal` / `order`.
- `admin_get_cod_standing(p_buyer uuid)` returns the counts and dates, for `/admin/utilisateurs/[id]`.
- All of them: SECURITY DEFINER, an `is_admin()` gate, `revoke … from public, anon`, `grant execute … to
  authenticated`.
- `cod_block_lifts`:
  - RLS on in the creating migration; admin SELECT only; no client write grants (writes go through the RPC only);
  - anon SELECT revoked, beyond the fail-closed default.
- The lift and the void are state the trigger reads, so they live in that table and that column, never in
  `admin_audit_log`.

**Testability:** the windows read `now()`, so the live tests backdate through the service role.
- `update orders set cancelled_at = …` is a non-status change. The transition trigger returns early, and the
  lifecycle and identity triggers let system writes through.
- The same goes for `cod_block_lifts.lifted_at`.
- The status walk itself needs a signed-in seller with a phone (the accept gate) and a signed-in buyer, because the
  transition trigger refuses a NULL caller.
- The DB PR states this system-write path in its tests.

## 4. Abuse and fairness: proposed answers (the founder decides)

1. **A seller falsely marking « Refusé »:**
   - the status gate: only from `dispatched` / `in_delivery` / `arrived`, product orders only;
   - a structured reason is required;
   - same-day refusals by one seller of one buyer count once (Q5);
   - the buyer is told and can contest (point 3);
   - an admin view of each seller's refusal count, to spot a seller who marks many, is logged for later.
   - Option, not recommended: the block needs refusals from at least 2 different sellers. It would shield a buyer who
     keeps refusing one seller.
2. **From which status:** `dispatched`, `in_delivery`, `arrived` (recommended). Before dispatch nothing was shipped,
   and the seller can cancel normally. Never from a terminal status.
3. **Can the buyer contest:** yes, through `disputes`, which already exists with an admin surface.
   - Add a buyer reason `refusal_contested` (a CHECK change).
   - A dispute resolved `sided_buyer` voids the refusal. Recommended: by an explicit admin action, calling
     `admin_void_refusal` from « Litiges », rather than a trigger, so voiding stays a deliberate, logged act.
   - A contest window (for example 14 days after the refusal) is Q7.
   - **A conflict to settle:** `faq.acheter.q3.a` tells buyers they may refuse a delivery that doesn't match the
     product. Under the rule, that refusal counts.
     - Recommended: such a refusal is contested and voided.
     - The FAQ is rewritten to say « refusez, puis contestez depuis la commande ».
     - Alternatively: a seller reason « produit non conforme » that does not count. But the seller chooses it, and the
       seller has an interest in the counting ones.
4. **What the seller's warning reveals:** a boolean on that buyer's open orders, nothing else: no count, no dates, no
   other seller's name. The buyer's name and phone are already on the order. The buyer sees their own restriction
   (banner and messages): no hidden flag.
5. **Does a lifted block reset the count:**
   - Recommended: yes, a clean slate. Refusals before the lift count for neither tier. A wrongful single refusal is
     voided instead.
   - Alternative: the lift ends the current block only. Then the next refusal blocks again at once, and tier 1 stays.

## 5. Strings (FR / AR / EN)

Every new key goes in `fr.ts`, `ar.ts` and the right `en/*.ts` file (`en/ownership.ts`): `seller.*` /
`buyerOrder.*` / `orders.*` in `en/shop.ts`, `common.*` / `demander.*` in `en/common.ts`. The exception is `admin.*`,
which gets FR + AR only by convention (`t()` falls back to French). **Every AR string below needs native Tunisian review
(`REVIEW_AR_TRANSLATION`).**

| Key (proposed) | FR | AR | EN |
|---|---|---|---|
| `common.status_refused` | Refusée à la livraison (Q9) | مرفوضة عند التسليم | Refused on delivery |
| `seller.orders.refuse_action` | Marquer « Refusée à la livraison » | وضع علامة « مرفوضة عند التسليم » | Mark as refused on delivery |
| `common.refusal_reason_refused_parcel` | Le client a refusé le colis | رفض الزبون الطرد | The customer refused the parcel |
| `common.refusal_reason_not_collected` | Colis non récupéré | لم يتم استلام الطرد | Parcel not collected |
| `common.refusal_reason_unreachable` | Client injoignable à la livraison | تعذّر الوصول إلى الزبون عند التسليم | Customer unreachable at delivery |
| `demander.error.cod_open_order_cap` | Plusieurs de vos livraisons ont été refusées ces 90 derniers jours : une seule commande en cours à la fois. Elle doit être reçue ou annulée avant d'en passer une autre. | تم رفض عدة طلبيات لك عند التسليم خلال آخر 90 يومًا: يمكنك أن تكون لديك طلبية واحدة جارية فقط. يجب استلامها أو إلغاؤها قبل تقديم طلبية أخرى. | Several of your deliveries were refused in the last 90 days, so you can have only one order in progress at a time. It must be received or cancelled before you place another. |
| `demander.error.cod_blocked` | Après 3 livraisons refusées en 90 jours, les commandes avec paiement à la livraison sont suspendues pour votre compte jusqu'au {date}. Si c'est une erreur, contestez le refus depuis la commande concernée. | بعد رفض 3 طلبيات عند التسليم خلال 90 يومًا، تم إيقاف الطلبات بالدفع عند الاستلام لحسابك حتى {date}. إذا كان ذلك خطأ، اعترض على الرفض من صفحة الطلبية المعنية. | After 3 refused deliveries in 90 days, cash-on-delivery orders are paused for your account until {date}. If this is a mistake, contest the refusal from the order's page. |
| `seller.orders.buyer_cod_warning` | Plusieurs livraisons refusées récemment par ce client. Appelez-le pour confirmer avant d'expédier. | رفض هذا الزبون عدة طلبيات عند التسليم مؤخرًا. اتصل به للتأكيد قبل الإرسال. | This customer recently refused several deliveries. Call to confirm before you ship. |
| `buyerOrder.refused_explainer` | Le vendeur a indiqué que la livraison a été refusée. Ce refus compte dans les règles du paiement à la livraison. | أشار البائع إلى أن التسليم قد رُفض. يُحتسب هذا الرفض ضمن قواعد الدفع عند الاستلام. | The seller reported that this delivery was refused. This refusal counts under the cash-on-delivery rules. |
| `buyerOrder.contest_refusal` | Contester ce refus | الاعتراض على هذا الرفض | Contest this refusal |

Other notes:
- Dates use the locale (`date-fns` fr / ar / en), never a hard-coded `fr-FR`.
- The new status label must be locked in design system §6.2. It already has « Declined / Refusé / مرفوض », and the
  existing order labels are feminine (« Annulée », « Reçue »).
- The UI PR rewrites `aide.g.commandes.a3`, which today says « Il n'existe pas de statut « Refusée » », and
  `faq.acheter.q3.a` (section 4, point 3).
- The admin keys: the journal actions `lift_cod_block` / `void_refusal` in both KNOWN lists
  (`admin/journal/_lib/log.ts`, `admin/utilisateurs/[id]` users.ts), `admin.log.action.*` and
  `admin.journal.action.*`.

## 6. Split, must-tests and PR count

**Under Option B: 3 PRs.**

**DB-1 (db-guardian).** One migration, written and stopped for the architect, who applies it.
- On `orders`:
  - columns `refusal_reason`, `refusal_voided_at`;
  - the marker guard trigger;
  - the insert forcing;
  - the column grant and the allowlist entry.
- The rule:
  - `private.buyer_cod_standing`;
  - `trg_limit_orders_cod`;
  - the partial index.
- `cod_block_lifts`, with RLS in the same migration.
- RPCs `get_my_cod_standing`, `seller_buyer_cod_warnings`, `admin_lift_cod_block`, `admin_void_refusal`,
  `admin_get_cod_standing`, with explicit EXECUTE grants.
- `disputes`: the `refusal_contested` reason.
- Regenerated types, and the live tests.
- Rollback: drop the trigger, the functions and the table; drop the 2 columns; restore the disputes CHECK. No existing
  row changes.

**UI-1 (Agent A), after DB-1.**
- Seller: the « Refusée à la livraison » action from `dispatched` / `in_delivery` / `arrived`, in G8 / G9 / G4, with
  the reason picker.
- The refused pill and label everywhere statuses show, buyer side included.
- The buyer's refused-order explainer, and « Contester » (a dispute with `refusal_contested`).
- The help and FAQ rewrites.
- Admin `/admin/commandes` shows the refused pill inside « Annulées ».

**UI-2 (Agent A), after DB-1** (it can run beside UI-1).
- The buyer's order form: the `get_my_cod_standing` banner, and the two hints mapped in `orderCapKey`.
- The seller's warning badge (lists and detail).
- Admin:
  - the standing panel and « Lever le blocage » on `/admin/utilisateurs/[id]`;
  - « Annuler le refus » in « Litiges » on a `refusal_contested` dispute;
  - the journal keys.

Under Option A, add a DB-0 for the status itself and its 13 functions, first: 4 PRs.

**Must-tests (live DB, DB-1).** Each tier is a separate suite. Fixtures use unique prefixes and random passwords, and
cleanup is verified by a read-only count. Sign-ins stay within the budget.

The marker:
1. A seller can refuse from `dispatched`, `in_delivery` and `arrived`.
2. A refusal from `pending` / `accepted` / `prepared` is refused, and so is a refusal on a service order.
3. A buyer can't set the marker, and neither can a third party.
4. The marker can't be changed or cleared afterwards; `refusal_voided_at` can't be written by a client; nothing moves
   out of the cancelled state.
5. A client insert that presets `refusal_reason` / `refusal_voided_at` is overwritten or refused.

Tier 1:

6. With 1 counted refusal, inserts are normal.
7. With 2, the first open order is allowed and the second is refused (`cod_open_order_cap`).
8. A refusal older than 90 days (backdated) doesn't count.
9. Two refusals by one seller on the same day count once.
10. Two concurrent inserts while capped: exactly one wins (the advisory lock).

Tier 2:

11. With 3 counted refusals, an insert is refused (`cod_blocked`) with the right date.
12. At trigger + 30 days (backdated), the block is over and tier 1 applies.
13. A 4th refusal restarts the block.
14. A voided refusal doesn't count, and voiding re-opens the account at once.

Lift:

15. `admin_lift_cod_block` ends the block and resets per Q8.
16. It writes a journal row with the note.
17. It refuses an empty note, and refuses a buyer who isn't blocked.

Privacy and grants:

18. `get_my_cod_standing` returns the caller only, and anon gets nothing.
19. `seller_buyer_cod_warnings` returns only the caller's own orders, never another seller's, and only a boolean.
20. Every `admin_*` RPC refuses a non-admin (42501).
21. `cod_block_lifts` can't be read or written by a client.
22. **A refused order does not block account deletion** (`admin_process_deletion_request` sees it as finished).
23. The phone reveal still works after a refusal.

Plus the mocked unit test for `orderCapKey`'s two new hints. UI-1 and UI-2 follow `servyou-visual-gate`, FR, AR and
EN.

## 7. Logged, not fixed (one PR, one focus)

**Doc drift in data-model.md.**
- **What:**
  - L121 says `delivery_*` is product-only; `submitServiceRequest` sets `delivery_phone`.
  - L136 describes an admin override of status that doesn't exist (the transition trigger has no admin branch).
  - L144 says raw French DB messages reach the user; they are now mapped.
  - L187 still lists `received_at` among the client-writable columns (revoked by `20261028194721`), and omits
    `carrier` / `tracking_number`.
- **Why deferred:** a docs fix outside this plan.
- **Where it lives:** docs/data-model.md.
- **Trigger:** DB-1, which edits the orders section anyway.

**`buyer_cancellation_history` doesn't see seller cancellations.**
- **What:** it counts buyer cancellations only, so no-shows are invisible there. This rule doesn't need it: it reads
  `orders` directly.
- **Why deferred:** the view feeds the post-launch rating system, which isn't planned yet.
- **Where it lives:** the view (migration `20260609150153`).
- **Trigger:** the rating system's design.

## Questions for the founder

1. How is a refusal recorded: Option B (a seller cancellation with a refusal marker, recommended: small blast radius,
   1 DB PR) or Option A (a new `refused` status: 13 functions, 2 DB PRs)?
2. Do the cap and the block cover service requests too, or product orders only (recommended: product orders, which is
   where COD deliveries happen)?
3. Which orders are « open » for the 1-order cap: product orders in `pending` … `arrived` (recommended)?
4. The seller's refusal reasons: the 3 proposed (refused the parcel / not collected / unreachable), all counting?
5. Same-day refusals of one buyer by one seller (2 orders at one door): count once (recommended) or each?
6. The seller's warning: computed live on the buyer's open orders (recommended), or a snapshot at order creation?
7. The contest: through a dispute with a new `refusal_contested` reason, voided by an explicit admin action
   (recommended). Is there a time limit (14 days?), and does the FAQ change to « refuse, then contest »?
8. Does a lifted block reset the count (recommended: yes, a clean slate)?
9. The label: « Refusé à la livraison » as written, or « Refusée à la livraison » to agree with « commande », like
   « Annulée » / « Reçue » (recommended)? It must then be locked in design system §6.2.
10. Is the restriction mentioned in the privacy policy (« politique de confidentialité ») or the terms (CGU)? It is an
    automatic restriction based on a buyer's history; the legal pages follow-up is open.
