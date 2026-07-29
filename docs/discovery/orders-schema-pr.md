# Discovery Report — Orders schema PR (G4 · G8 · G9 unblock)

**Status:** REPORT ONLY. No migration written, nothing applied. Awaiting founder approval.
**Date:** 2026-07-29
**Target:** `public.orders` (+ one new table)
**Method:** live reads against `xggomcitqrkaylqezjjz`, cross-checked against shipped code.

---

## 0. The finding that reframes the brief

**`orders` does not freeze money at all today. Not the fee — the price.**

`orders` has no `unit_price` column. G9 renders the unit price from a **live join**:

```
seller-order-detail.ts:95-96   products ( title, price_tnd ), service_listings ( title, starting_price_tnd )
seller-order-detail.ts:130     const rawPrice = product?.price_tnd ?? service?.starting_price_tnd ?? null
```

Three consequences, all live in production right now:

1. **A seller editing `products.price_tnd` retroactively rewrites every past order's displayed price.** A COD order delivered at 45 TND shows 60 TND after a price change. Nothing records what was agreed.
2. `orders_product_id_fkey` is **`ON DELETE SET NULL`**. If a product row is deleted, the order loses its price *and* its title — `itemTitle` falls back to `''`.
3. Because of (2) interacting with the `order_target_matches_type` CHECK, deleting a product that has orders currently **fails outright** (the SET NULL would violate the CHECK). That is a latent blocker for G7's delete-product flow — logged, out of scope here.

**Why this decides the brief:** the stated reason G9 omits the Total row is *"a total equal to the subtotal would be a wrong number on a COD invoice"* (`[id]/page.tsx:158-159`). A total that adds a **frozen** `delivery_fee` to a **live-joined** price is also a wrong number — just less visibly, and it drifts silently on the first price edit. Freezing the fee alone builds a half-frozen invoice.

So `orders.unit_price_tnd` is **not a fifth column competing with the four.** It is the precondition for `delivery_fee_tnd` earning its place. If you cut it, my recommendation is to also cut the Total row and ship `delivery_fee` as a display-only line item — but not to ship a Total.

---

## 1. Where each column belongs, and why

### `delivery_fee_tnd` — on the **order**, snapshotted. Source of truth is a separate question.

Two distinct things are being conflated, and they need two different homes:

| | Declared fee (the seller's price list) | Charged fee (what this buyer owes) |
|---|---|---|
| Home | `products` or `shops` | `orders` |
| Changes | whenever the seller edits it | never, after order creation |
| Role | input to the next order | the agency's revenue claim |

**The charged fee must be on `orders`.** Your profit model — *the agency takes the declared fee* — makes this fee a **revenue record**, not a display value. A revenue record that a seller can retroactively edit is not a revenue record. This is the single strongest argument in the report: the fee is the agency's money, so it must be frozen at the moment the buyer agreed to it.

**The declared fee is where it gets awkward, and I recommend deferring it.**

- `products.delivery_fee_tnd` would ship **dead**: there is no `/mes-produits` route. G5/G6/G7 are Figma-only, not built. Nothing could write it.
- `shops.delivery_fee_tnd` would also ship dead: there is no shop-edit route either (`/ma-boutique` does not exist; only `/devenir-vendeur`). `shops.delivery_setup` is free **text**, not a number.
- ⚠ **Open question — the shape may be wrong entirely.** Tunisian COD delivery is typically priced **per destination governorate**, not flat per product. The governorate *is* captured today (folded into `delivery_address` as `"{street}, {governorate}"`, `demander/[id]/actions.ts:92`). If real pricing is per-governorate, a flat scalar on `products` or `shops` is the wrong shape and wants a rate table — which is a much bigger PR and should not be decided under time pressure.

**Recommendation:** ship `orders.delivery_fee_tnd` now. Defer the declared-fee source to whichever PR builds a seller surface that can write it (G6/G7), by which point the per-governorate question will have been answered. In the interim the fee is set by the order-creation path — see §3.

### `carrier` + `tracking_number` — on the **order**

Both are per-shipment facts, not seller preferences. `shops.preferred_carriers` **does exist** (text, nullable) — I verified it, the follow-ups note is accurate — but it is a shop-level *default*, not a per-slip choice. A shop can ship one order by Aramex and the next by First Delivery. Per-order.

### Print-receipt timestamp — **not a column.** It is an event. See §4.

### `order_events` — its own table. See §4.

---

## 2. What belongs inside `enforce_order_identity_lock`

Current frozen list (verified from the live function body): `buyer_id`, `seller_id`, `product_id`, `service_listing_id`, `order_type`, `quantity`, `buyer_note`, `delivery_name`, `delivery_address`, `delivery_phone`.

| Column | Frozen? | Why |
|---|---|---|
| `delivery_fee_tnd` | **YES — add to the lock** | It is the agency's revenue. Editable = a seller can revise what the agency earned after the fact. |
| `unit_price_tnd` | **YES — add to the lock** | Same argument; it is the amount the buyer agreed to. |
| `carrier` | **NO** | Chosen at dispatch, and legitimately corrected (wrong carrier picked). |
| `tracking_number` | **NO** | Entered after dispatch — cannot be frozen at creation, as you said. Also legitimately corrected (typo in a 12-digit code). |
| print stamp | **N/A** | Append-only event row; immutability comes from the table having no UPDATE policy. |

⚠ **Note on the lock's actual strength.** It opens with `if auth.uid() is null then return new; end if;` — a session guard, not an absolute one. Any service-role or SQL-editor write bypasses it silently. That is fine for its purpose but should not be mistaken for a hard integrity guarantee.

---

## 3. Backfill for existing orders — and a correction to the count

**The brief says 5 existing orders. The live count is 11:** 4 product + 7 service.

| order_type | status | n |
|---|---|---|
| product | pending / prepared / arrived / received | 1 each = **4** |
| service | pending 2, accepted 2, arrived 1, received 3, cancelled 2 | **7** |

**The honest option: `numeric(10,2) NULL`, no default, no backfill.**

- `NOT NULL DEFAULT 0` asserts *"the agency earned nothing on these four orders."* That is a fabricated financial claim about real transactions — the same class of error as the mocked "2 840 TND" you already rejected on G4.
- `NOT NULL` with a made-up figure is worse.
- **NULL means "this order predates fee capture," which is exactly true.** G9 then renders the Livraison row only when the value is non-null — the same has-data/no-data discipline already shipped for the cancellation entry.

Same reasoning for `unit_price_tnd`: nullable, and — one honest option available here — it *could* be backfilled from today's `products.price_tnd`, but I recommend **not** doing so. That value is the price *now*, not the price *then*; writing it into a frozen column would launder a guess into a permanent record.

**Recommended CHECK:** `CHECK (order_type <> 'service' OR delivery_fee_tnd IS NULL)`. Cheap, and it stops the fee quietly becoming a generic surcharge field on service orders where no physical delivery exists.

⚠ **The parallel question for `unit_price_tnd` on service orders.** For a service the only available source is `service_listings.starting_price_tnd` — explicitly a *starting* price — while the buyer's actual figure is a budget folded into `buyer_note` (`demander/[id]/actions.ts:168`). Freezing a starting price as "the agreed unit price" would be the same class of fabrication this report rejects everywhere else. Two honest options: extend the CHECK to make `unit_price_tnd` product-only, **or** keep it on both and document that on a service order it records *"the listed starting price at the time of the request"* and nothing more. I lean product-only — service pricing is negotiated off-platform at MVP, so there is no agreed unit price to freeze.

---

## 4. `order_events`

### Shape

One row per state change, append-only. Deliberately **not** modelled on `admin_audit_log`'s `before_state`/`after_state` jsonb — a timeline needs *from → to*, not whole-row diffs.

```
id           uuid pk
order_id     uuid not null → orders(id) on delete cascade
event_type   text not null    -- 'status_change' | 'print' | 'whatsapp_contact'
from_status  text null        -- null on insert + non-status events
to_status    text null
actor_id     uuid null → profiles(id) ON DELETE SET NULL   -- null for system
                          -- SET NULL, not the NO ACTION default: `deletion_requests` /
                          -- `data_exports` mean account deletion is a real path, and a
                          -- NO ACTION fk here would block it. Events survive a deleted
                          -- actor with `actor_role` intact — correct for an audit trail.
actor_role   text null        -- 'buyer' | 'seller' | 'system'
note         text null
created_at   timestamptz not null default now()
```

Index on `(order_id, created_at)`.

### What writes to it — and why the existing triggers cannot

**The four existing triggers are all `BEFORE UPDATE`. There is no INSERT trigger on `orders` at all.** Two independent reasons not to bolt an emitter onto them:

1. **Nothing can emit "order created"** — the first entry G9's historique needs. That requires a new **AFTER INSERT** trigger regardless.
2. **BEFORE triggers fire in alphabetical name order:** `enforce_order_identity_lock_trigger` → `orders_set_updated_at` → `trg_check_order_status_transition` → `trg_set_cancelled_at_on_transition`. An emitter added to any of the first three would run *before* `cancelled_at` is populated and would log a null timestamp on exactly the event that matters most.

Beyond ordering, a BEFORE trigger writing audit rows is wrong in principle — it fires before the row is durable, so a later constraint failure leaves an event for a transition that never happened.

**Recommendation: one new `AFTER INSERT OR UPDATE` trigger. Do not touch the existing four.**

**The print stamp needs a different path.** `window.print()` is client-side; no trigger can observe it. It needs an explicit **SECURITY DEFINER RPC**, mirroring the existing `log_admin_action(p_action, p_target_type, p_target_id, p_before_state, p_after_state, p_note)` pattern — which I verified exists and is SECURITY DEFINER.

⚠ **State it honestly in the UI:** the event records *"print was invoked,"* not *"paper came out."* The timeline must not present it as proof a document exists. Same caveat applies to any WhatsApp event — we can record that the seller opened the prefilled link, never that a message was sent.

### Does it solve G8's waitTime gap? — Yes, with two caveats

`waitTime` is **not in the codebase at all** (zero grep matches) — it is a Figma prop on `OrderActionRow 488:24951` that was never rendered. So this is new rendering, not a changed region.

The query is `max(created_at) WHERE order_id = ... AND to_status = orders.status`.

- **Caveat 1:** null for all 11 existing orders. G8 shows the wait only on orders created after this lands. Consistent with §3.
- **Caveat 2:** G8 is a **list**. Per-row lookup is N+1 — it needs a lateral join or a small view in `seller-orders.ts`, not a loop.

**The cheaper competitor, named so you can take it instead:** a single `orders.status_changed_at` column closes waitTime alone at a fraction of the cost — one column, set by the existing `BEFORE UPDATE` chain, no new table, no N+1. It does **not** serve the historique panel, which needs the full sequence. If G9's historique is the thing you'd cut, take `status_changed_at` and drop `order_events` entirely. That is the real fork in this PR.

---

## 5. RLS — and the hole the new columns walk into

### Hole 1 — INSERT is column-blind too, and freezing a forged number is worse than not freezing it

```
orders INSERT policy:  WITH CHECK (buyer_id = auth.uid())
```

That is the *only* gate on creation. It is column-blind exactly like the UPDATE policy below, and `enforce_order_identity_lock` is **BEFORE UPDATE only** — it never runs on INSERT.

**So a buyer can insert an order from the browser with `delivery_fee_tnd = 0` and `unit_price_tnd = 1`** (they satisfy `buyer_id = auth.uid()` trivially), and the identity lock then protects that forged value **forever**. Freezing a number nobody validated is worse than not freezing it at all.

`submitProductRequest` already re-fetches the product server-side and derives `seller_id` rather than trusting the client — but nothing *forces* creation through that action. The RLS policy is the real boundary, and it does not check values.

**Required, and it changes §8:** a **BEFORE INSERT trigger** that derives both money columns server-side from `products` / `service_listings` and overwrites whatever the client submitted. Same posture as `advanceOrderAction` deriving the next status instead of accepting it (`actions.ts:80`) — the value is computed, never supplied.

### Hole 2 — UPDATE is column-blind, and buyers write from the browser

```
orders UPDATE policy:  USING (buyer_id = auth.uid() OR seller_id = auth.uid())
                       WITH CHECK (same)
```

**It is column-blind.** And buyers write to `orders` **directly from the browser** — `ReceiptConfirmButton.tsx:32` and `CancelOrderModal.tsx:80`, both `'use client'`, both on `@/lib/supabase/client`. `check_order_status_transition` explicitly lets non-status edits through (*"Non-status edits sail through"*).

**Therefore: any new column is buyer-writable from the browser console the moment it lands, unless the DB stops it.** A buyer could set their own `delivery_fee_tnd` to 0.

### The fix is a trigger guard, not a policy

Column-level `REVOKE UPDATE` **cannot** express this — buyer and seller are both the `authenticated` role. Postgres column privileges are per-role, and here the two parties share one.

| Column | Read | Write | Mechanism |
|---|---|---|---|
| `unit_price_tnd` | both parties + admin (existing SELECT policy, unchanged) | **DB-derived at INSERT, nobody after** | BEFORE INSERT trigger (hole 1) **+** add to `enforce_order_identity_lock` frozen list |
| `delivery_fee_tnd` | same | **DB-derived at INSERT, nobody after** | same |
| `carrier` | same | **seller only** | new clause in the lock: reject if changed and `auth.uid() <> seller_id` |
| `tracking_number` | same | **seller only** (buyer-read, as you specified) | same clause |

No change to the SELECT policy is needed — buyer-read of tracking comes free from the existing `buyer_id = auth.uid() OR seller_id = auth.uid()`.

### `order_events` RLS

Enabled in the creating migration, per the standing rule.

- **SELECT:** `EXISTS (SELECT 1 FROM orders WHERE orders.id = order_events.order_id AND (orders.buyer_id = auth.uid() OR orders.seller_id = auth.uid()))`, plus `is_admin()`. This mirrors the existing `disputes` SELECT policy almost exactly — an established pattern, not a new one.
- **INSERT:** **no policy for `authenticated`.** Rows arrive only via the SECURITY DEFINER trigger and the print RPC. A direct client INSERT must be impossible, or the timeline is forgeable.
- **UPDATE / DELETE:** none, ever. Append-only, same posture as `admin_audit_log`.

---

## 6. Shipped surfaces that change

**Mapping your "four omitted panels" precisely — it is 2 panels + 2 rows:**

| # | Surface | File · region | Unblocked by |
|---|---|---|---|
| 1 | **G9 panel-suivi** (`497:26411`) | `src/app/commandes-recues/[id]/page.tsx` — absent, documented at **:36-47** | `carrier` + `tracking_number` |
| 2 | **G9 panel-historique** (`504:27042`) | same file, same comment block **:41-46** | `order_events` |
| 3 | **G9 Livraison row** | same file, **:158-159** | `delivery_fee_tnd` |
| 4 | **G9 Total row** | same file, **:158-159** | `delivery_fee_tnd` **+ `unit_price_tnd`** (§0) |
| 5 | **G4 Bénéfice net** | `src/app/tableau-de-bord-vendeur/page.tsx` **:126-142** (`value="—"`, `muted`) | ⚠ see below |
| 6 | **G8 waitTime** | `src/app/commandes-recues/_components/OrderActionRow.tsx` — **new rendering, the prop is not currently in code** | `order_events` or `status_changed_at` |
| 7 | **Delivery documents** | bordereau `510:27851`, bon de livraison `504:27094` — not built | `delivery_fee` + `carrier`; `Réf.` still blocked (§7) |
| 8 | **G8 multi-select** | `src/app/commandes-recues/page.tsx` **:32-37** | unblocks only once (7) has a destination |

**Supporting changes:** `src/app/actions/orders.ts` gains a seller carrier/tracking action (the file's existing three-layer pattern extends cleanly); `src/lib/marche/seller-order-detail.ts` gains the new selects; `src/lib/marche/seller-dashboard.ts` gains the aggregate; `src/lib/marche/seller-orders.ts` gains the waitTime lateral join; `demander/[id]/actions.ts` must write the two frozen money columns at INSERT.

⚠ **G4's "Bénéfice net" is undefined, and the definition changes the answer.** If the agency takes the declared fee, then from the **shop owner's** side net ≠ the fee — they collect price+fee at the door and remit the fee, so their net is `price × qty`. Under that reading **`delivery_fee` does not unblock G4 at all — `unit_price_tnd` does.** Under "total collected − agency fee" it needs both. I am not picking one; it is a product decision and it determines whether item 5 above ships in this PR. Note also that whichever way it goes, `seller.dashboard.tile.profit_soon` needs replacing in **both** `fr.ts` and `ar.ts`.

---

## 7. What I would NOT add

| Not adding | Why |
|---|---|
| **`printed_at` column** | Superseded by an `order_events` row. A column plus an event duplicates the same fact, and G9's historique wants it as a timeline entry anyway. **This is one of your five — I am recommending against it.** |
| **`total_tnd`** | Fully derivable from `unit_price × quantity + delivery_fee`. Storing it invites the exact drift this PR exists to fix. |
| **`accepted_at` / `prepared_at` / `dispatched_at` / `in_delivery_at` / `arrived_at`** | Five columns doing generically what `order_events` does. This is precisely the "six that half-work" trap — and they still would not record *who* acted. |
| **`carriers` lookup table** | `shops.preferred_carriers` is already free text and unused. A FK'd catalogue is a Phase 3 question. |
| **Bordereau / slip table for `Réf. RAM-…`** | Requires deciding whether a bordereau is *persisted* or *regenerated on demand*. That question is unanswered, and per the approved `@media print` + `window.print()` method it may never need persisting. Defer with the documents. |
| **`before_state` / `after_state` jsonb on events** | Copying `admin_audit_log` here would be cargo-culting. A timeline needs from/to status, not whole-row diffs. |
| **`products.delivery_fee_tnd`** *(conditional)* | Ships dead — no `/mes-produits` route exists to write it. Belongs with G6/G7, unless you want it staged early. And the per-governorate question may make the scalar shape wrong regardless (§1). |
| **`orders.governorate`** | Tempting while nearby, but it is out of this PR's scope and the fold is already covered by a round-trip test. One PR, one focus. |

---

## 8. Recommendation — the shortest set that earns its place

**Four columns + one table:**

1. `orders.unit_price_tnd numeric(10,2) NULL` — DB-derived at INSERT, then frozen (the precondition, §0)
2. `orders.delivery_fee_tnd numeric(10,2) NULL` — same, + CHECK null-on-service
3. `orders.carrier text NULL` — seller-write
4. `orders.tracking_number text NULL` — seller-write, buyer-read
5. `order_events` + one AFTER INSERT OR UPDATE trigger + one print RPC

Plus **two trigger changes**, both required by §5:
- extend `enforce_order_identity_lock` (2 new frozen columns + 1 seller-only clause for carrier/tracking)
- **one new BEFORE INSERT trigger** deriving the two money columns server-side (hole 1 — without it the frozen columns freeze whatever a browser client submitted)

**No change to the existing four triggers' bodies beyond `enforce_order_identity_lock`.**

**If you want it smaller:** drop `order_events`, take `orders.status_changed_at` instead, and accept that G9's panel-historique stays absent. That is 5 columns, no new table, no new RLS surface — and it still closes G8's waitTime and all four G9 items except the timeline.

**Two decisions I need from you before any SQL is written:**
1. **Bénéfice net definition** — seller's margin, or agency-fee-net? Decides whether G4 ships in this PR.
2. **`order_events` vs `status_changed_at`** — is G9's historique panel worth the table?

**Awaiting founder approval before proceeding.**
