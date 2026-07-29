# Migration Proposal — Orders snapshot + shipment + events

**Status:** PROPOSED. Nothing applied. Awaiting statement-level founder approval.
**Date:** 2026-07-29
**Follows:** `docs/discovery/orders-schema-pr.md` (discovery approved 2026-07-29)
**Scope per founder ruling:** `unit_price_tnd` + frozen title + `carrier` + `tracking_number` + `order_events`.
`delivery_fee_tnd` **deferred entirely**. Print stamp is an event, not a column.

---

## 0. Three things to decide before you read the SQL

### 0.1 The title column should be called `item_title`

Recommended: **`item_title text NULL`**.

- It maps 1:1 onto the shipped type field `itemTitle` (`seller-order-detail.ts:37`), which already normalises `products.title` and `service_listings.title` into one value. No translation layer.
- It is **type-neutral**. `product_title` would be wrong — the column serves service orders too, and `service_listing_id` is *also* `ON DELETE SET NULL`, so services have the identical loss bug.
- No `_snapshot` suffix: the freeze is documented by `enforce_order_identity_lock`, and every other column on `orders` is bare. `item_title_snapshot` would be the only column on the table explaining its own mechanism.

Pairs cleanly as `item_title` + `unit_price_tnd` — matching `itemTitle` + `unitPrice`.

### 0.2 ⚠ I am reversing my earlier lean on service orders — please confirm

In discovery I leaned **product-only** for `unit_price_tnd`, on the grounds that `starting_price_tnd` is a *starting* price and freezing it as "agreed price" would be fabrication. **I now recommend snapshotting both types**, because your §1 framing changes the weight:

> "past orders currently rewrite themselves when a seller edits a price, and lose their price entirely if a product is deleted"

That bug is **not product-only**. `orders_service_listing_id_fkey` is also `ON DELETE SET NULL`, and 7 of 11 existing orders are services. Product-only would leave the majority of the bug unfixed.

The honest resolution is semantic, not structural: on a service order the column records **"the listed starting price at the time of the request"** — which is exactly what G9 displays today, only frozen instead of drifting. It is not a claim about an agreed fee; service pricing is still negotiated off-platform and lands in `buyer_note`.

**If you disagree, the change is one line** — add `and new.order_type = 'product'` to the trigger's assignment and a CHECK. Say the word and I will re-issue.

### 0.3 The print RPC is NOT in this migration — it would ship dead

You approved the print stamp as an `order_events` row, and I have kept `'print'` in the `event_type` vocabulary. But the **writer** is deferred: `window.print()` is client-side, so it needs a SECURITY DEFINER RPC, and the only callers are the bordereau and bon de livraison — both still blocked, because the bordereau's `LIVRAISON` column needs the `delivery_fee` you just deferred.

Shipping the RPC now means shipping a function nothing calls. It belongs in the documents PR. The CHECK constraint already permits the value, so that PR adds a function and touches no constraint.

---

## 1. Migration 1 of 2 — `orders_snapshot_and_shipment`

Proposed version: `20260729xxxxxx_orders_snapshot_and_shipment`

```sql
-- Freeze the money and the identity of what was ordered, and add the two shipment
-- columns G9's panel-suivi needs.
--
-- WHY THE SNAPSHOT: `orders` never captured the price or the title -- G9 read them
-- through a live join to products/service_listings. Two live bugs followed:
--   1. A seller editing products.price_tnd retroactively rewrote every past order's
--      displayed price. Nothing recorded what the buyer actually agreed to.
--   2. Both target FKs are ON DELETE SET NULL, so deleting a listing stripped the
--      order's price AND title.
-- Per docs/discovery/orders-schema-pr.md Section 0.

-- 1. The frozen pair. Nullable because 11 existing orders predate capture and there is
--    no honest value to invent for them -- see Section 3 (backfill).
alter table public.orders add column unit_price_tnd numeric(10,2);
alter table public.orders add column item_title     text;

comment on column public.orders.unit_price_tnd is
  'Unit price in TND frozen at order creation. Derived server-side by set_order_snapshot(); '
  'never accepted from the client. On a service order this records the LISTED STARTING PRICE '
  'at request time, not an agreed fee -- service pricing is negotiated off-platform at MVP. '
  'NULL on the 11 orders that predate this column.';

comment on column public.orders.item_title is
  'Title of the ordered product or service, frozen at creation. Survives listing deletion '
  '(both target FKs are ON DELETE SET NULL). NULL on orders predating this column.';

-- 2. The two shipment columns. Deliberately NOT frozen: tracking is entered after
--    dispatch, and both are legitimately corrected (wrong carrier picked, typo in a
--    12-digit code). Seller-write is enforced in enforce_order_identity_lock below,
--    NOT by column privileges -- buyer and seller are both the `authenticated` role,
--    so a column-level REVOKE cannot distinguish them.
alter table public.orders add column carrier         text;
alter table public.orders add column tracking_number text;

comment on column public.orders.carrier is
  'Per-shipment carrier for THIS order. Distinct from shops.preferred_carriers, which is a '
  'shop-level default -- a shop may ship one order by Aramex and the next by First Delivery.';
```

### 1.2 The BEFORE INSERT trigger — the reason the freeze is safe

```sql
-- Derive the frozen columns server-side and OVERWRITE anything the client submitted.
--
-- This is load-bearing, not defensive. The orders INSERT policy is
-- `WITH CHECK (buyer_id = auth.uid())` -- column-blind -- and enforce_order_identity_lock
-- is BEFORE UPDATE only, so it never runs on INSERT. Without this trigger a buyer could
-- insert unit_price_tnd = 1 straight from the browser client and the identity lock would
-- then protect that forged value forever. Freezing an unvalidated number is worse than
-- not freezing it.
--
-- Same posture as advanceOrderAction deriving the next status rather than accepting it
-- (src/app/actions/orders.ts:80): the value is computed, never supplied.
create or replace function public.set_order_snapshot()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_title text;
  v_price numeric(10,2);
begin
  if new.order_type = 'product' then
    select p.title, p.price_tnd
      into v_title, v_price
      from public.products p
     where p.id = new.product_id;
  elsif new.order_type = 'service' then
    select s.title, s.starting_price_tnd
      into v_title, v_price
      from public.service_listings s
     where s.id = new.service_listing_id;
  end if;

  -- The FK would reject a bogus target anyway, but raising here makes the invariant
  -- explicit: every row created from now on HAS a title and a price.
  if v_title is null then
    raise exception 'Impossible de créer la commande : article introuvable.'
      using errcode = '23503';
  end if;

  -- Unconditional assignment. Any client-supplied value is discarded here.
  new.item_title     := v_title;
  new.unit_price_tnd := v_price;

  return new;
end;
$$;

-- No BEFORE INSERT trigger exists on orders today (all four existing triggers are
-- BEFORE UPDATE), so there is no ordering interaction to reason about.
create trigger trg_set_order_snapshot
  before insert on public.orders
  for each row execute function public.set_order_snapshot();
```

### 1.3 Extending the identity lock

```sql
-- Adds the two frozen columns to the existing lock, and adds a SEPARATE seller-only
-- clause for carrier/tracking (not frozen -- entered after dispatch).
--
-- Only enforce_order_identity_lock is touched. The other three BEFORE UPDATE triggers
-- are left exactly as they are.
--
-- NOTE ON THE EXISTING GUARD, unchanged: the `auth.uid() is null` early return makes
-- this a SESSION guard, not an absolute one. Service-role and SQL-editor writes bypass
-- it. That is intended (admin data fixes) but should not be mistaken for hard integrity.
create or replace function public.enforce_order_identity_lock()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if auth.uid() is null then
    return new;
  end if;
  if public.is_admin() then
    return new;
  end if;

  if new.buyer_id is distinct from old.buyer_id
     or new.seller_id is distinct from old.seller_id
     or new.product_id is distinct from old.product_id
     or new.service_listing_id is distinct from old.service_listing_id
     or new.order_type is distinct from old.order_type
     or new.quantity is distinct from old.quantity
     or new.buyer_note is distinct from old.buyer_note
     or new.delivery_name is distinct from old.delivery_name
     or new.delivery_address is distinct from old.delivery_address
     or new.delivery_phone is distinct from old.delivery_phone
     -- NEW: the frozen pair.
     or new.unit_price_tnd is distinct from old.unit_price_tnd
     or new.item_title is distinct from old.item_title then
    raise exception 'Order identity columns cannot be modified' using errcode = '42501';
  end if;

  -- NEW: carrier + tracking are editable, but by the SELLER only. The orders UPDATE
  -- policy is column-blind and buyers write to this table from the browser
  -- (ReceiptConfirmButton.tsx, CancelOrderModal.tsx), so without this clause a buyer
  -- could set their own tracking number.
  if new.carrier is distinct from old.carrier
     or new.tracking_number is distinct from old.tracking_number then

    if auth.uid() is distinct from old.seller_id then
      raise exception 'Seul le vendeur peut renseigner le transporteur et le numéro de suivi.'
        using errcode = '42501';
    end if;

    -- Terminal states are closed to shipment edits too. check_order_status_transition
    -- guards STATUS out of received/cancelled, but it explicitly lets non-status edits
    -- "sail through" -- so without this a seller could attach a tracking number to a
    -- cancelled order, and the timeline would present it as a live shipment.
    if old.status in ('received', 'cancelled') then
      raise exception 'Cette commande est terminée : le suivi ne peut plus être modifié.'
        using errcode = '42501';
    end if;
  end if;

  return new;
end;
$$;
```

**On the two error messages.** The existing identity message stays English and untouched — it is shipped behaviour and never surfaces to a user (no UI edits those columns). The new one is French because it *does* surface: `advanceOrderAction` passes `updateError.message` straight to the seller (`actions.ts:95`).

**The trigger itself is NOT recreated** — `CREATE OR REPLACE FUNCTION` rebinds the existing `enforce_order_identity_lock_trigger` in place. No DROP, no window where the lock is absent.

---

## 2. Migration 2 of 2 — `order_events`

Proposed version: `20260729xxxxxx_order_events`

```sql
-- Append-only timeline of what happened to an order. Feeds G9's panel-historique
-- (504:27042) and G8's per-state waitTime.
--
-- NOT modelled on admin_audit_log's before_state/after_state jsonb: a timeline needs
-- from -> to status, not whole-row diffs.
create table public.order_events (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references public.orders(id) on delete cascade,
  event_type  text not null check (event_type in ('created','status_change','print')),
  from_status text,
  to_status   text,
  -- ON DELETE SET NULL, not the NO ACTION default: deletion_requests/data_exports mean
  -- account deletion is a real path, and NO ACTION here would block it. Events survive a
  -- deleted actor with actor_role intact -- which is what an audit trail should do.
  actor_id    uuid references public.profiles(id) on delete set null,
  actor_role  text check (actor_role in ('buyer','seller','admin','system')),
  note        text,
  created_at  timestamptz not null default now()
);

comment on table public.order_events is
  'Append-only order timeline. Written ONLY by emit_order_event() (SECURITY DEFINER trigger). '
  'No INSERT/UPDATE/DELETE policy exists and those privileges are revoked from authenticated -- '
  'a client-forgeable timeline is worse than no timeline.';

-- One index serves both consumers. Events per order are bounded by the lifecycle
-- (max ~8: created + 6 product transitions + a terminal), so the waitTime filter on
-- to_status runs over a handful of rows already located by order_id. A second index on
-- (order_id, to_status, created_at) would be premature at this cardinality.
create index order_events_order_id_created_at_idx
  on public.order_events (order_id, created_at desc);
```

### 2.1 RLS

```sql
alter table public.order_events enable row level security;

-- Read: both parties to the order, plus admin. Mirrors the shipped disputes SELECT
-- policy almost exactly -- an established pattern on this database, not a new one.
create policy "Order events visible to parties and admin"
  on public.order_events for select
  to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.orders o
      where o.id = order_events.order_id
        and (o.buyer_id = auth.uid() or o.seller_id = auth.uid())
    )
  );

-- NO insert/update/delete policy, deliberately. Rows arrive only via the SECURITY
-- DEFINER trigger (owned by postgres, so it bypasses RLS).
--
-- Belt AND braces: this is the one case in this PR where privileges DO work, because
-- nobody in `authenticated` should ever write here -- unlike carrier/tracking, where
-- buyer and seller share the role and only a trigger can tell them apart.
--
-- Supabase's schema-level DEFAULT PRIVILEGES grant on new public tables, so these
-- revokes are stripping grants that were just handed out, not pre-empting them. Two
-- limits worth stating plainly rather than trusting:
--   * a REVOKE only strips what is granted TODAY -- a later migration issuing a broad
--     GRANT would silently re-open this table;
--   * the effective posture must be VERIFIED, not assumed. Section 3.2 does that.
revoke insert, update, delete on public.order_events from authenticated;
revoke all on public.order_events from anon;
revoke all on public.order_events from public;
grant select on public.order_events to authenticated;
```

### 2.2 The AFTER trigger

```sql
-- AFTER INSERT OR UPDATE, its own trigger. The existing four are untouched.
--
-- WHY NOT REUSE THEM -- two independent reasons:
--   1. All four are BEFORE UPDATE. Nothing can emit 'created', which is the first entry
--      the historique needs.
--   2. BEFORE triggers fire in alphabetical name order, putting
--      trg_set_cancelled_at_on_transition LAST. An emitter bolted into any earlier one
--      would log a null cancelled_at on exactly the event that matters most.
-- Beyond ordering, a BEFORE trigger writing audit rows is wrong in principle: it fires
-- before the row is durable, so a later constraint failure would leave an event for a
-- transition that never happened.
create or replace function public.emit_order_event()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_actor uuid := auth.uid();
  v_role  text;
begin
  -- Resolve the actor against THIS order. Seeds and service-role writes have no
  -- auth.uid() and land as 'system' rather than being mislabelled.
  -- Order matters: party-hood is checked BEFORE is_admin(), so an admin who is also the
  -- buyer records as 'buyer' (what they did), while an admin acting on someone else's
  -- order records as 'admin' (also what they did). 'system' is the genuine fallback.
  if v_actor is null then
    v_role := 'system';
  elsif v_actor = new.buyer_id then
    v_role := 'buyer';
  elsif v_actor = new.seller_id then
    v_role := 'seller';
  elsif public.is_admin() then
    v_role := 'admin';
  else
    v_role := 'system';
  end if;

  if tg_op = 'INSERT' then
    insert into public.order_events
      (order_id, event_type, from_status, to_status, actor_id, actor_role)
    values
      (new.id, 'created', null, new.status, v_actor, v_role);
    return null;
  end if;

  -- UPDATE: only a status change is an event. Edits to carrier/tracking are not
  -- timeline entries -- they are corrections to a field, and logging every keystroke-
  -- level correction would bury the lifecycle in noise.
  if new.status is distinct from old.status then
    insert into public.order_events
      (order_id, event_type, from_status, to_status, actor_id, actor_role, note)
    values
      (new.id, 'status_change', old.status, new.status, v_actor, v_role,
       case when new.status = 'cancelled' then new.cancellation_reason else null end);
  end if;

  return null;  -- return value is ignored for AFTER triggers
end;
$$;

create trigger trg_emit_order_event
  after insert or update on public.orders
  for each row execute function public.emit_order_event();
```

---

## 3. Backfill

**There is no backfill statement. That is the answer, not an omission.**

No `UPDATE` is run against the 11 existing orders, and no `DEFAULT` is attached to any new column.

| Column | Existing 11 rows | Why not backfilled |
|---|---|---|
| `unit_price_tnd` | NULL | Today's `price_tnd` is the price *now*, not the price *then*. Writing it into a frozen column would launder a guess into a permanent financial record. |
| `item_title` | NULL | Same. |
| `carrier` / `tracking_number` | NULL | Never captured; nothing to recover. |
| `order_events` | zero rows | Per your ruling. We know an order is `prepared`; we do not know when it left `accepted`. Synthesising that is inventing history. |

### 3.1 ⚠ The consequence you need to approve: the read path must COALESCE

With NULL snapshots, G9 and E3 would render a **blank title and price** for all 11 existing orders — a visible regression, since the live join renders them today.

**Proposed app-side fix (not SQL):** `seller-order-detail.ts` and `order-detail.ts` select both and fall back:

```ts
// Frozen snapshot wins; the live join is a fallback for the 11 orders that predate it.
// Those orders keep the old drift behaviour -- unavoidable, we never captured the value.
const title = row.item_title      ?? product?.title      ?? service?.title      ?? ''
const price = row.unit_price_tnd  ?? product?.price_tnd  ?? service?.starting_price_tnd ?? null
```

This is the honest shape: new orders are frozen, old orders degrade to exactly what they do now, and nothing is invented. The fallback is self-retiring — once the 11 pre-migration orders are archived it can be deleted.

### 3.2 Verification after apply

```sql
-- Expect: 11 rows, all four new columns NULL, zero events.
select count(*)                                as total_orders,
       count(unit_price_tnd)                   as with_price,
       count(item_title)                       as with_title,
       count(carrier)                          as with_carrier,
       count(tracking_number)                  as with_tracking,
       (select count(*) from public.order_events) as events
from public.orders;

-- Expect: 4 BEFORE UPDATE (unchanged) + 1 BEFORE INSERT + 1 AFTER INSERT OR UPDATE.
select trigger_name, action_timing, event_manipulation
from information_schema.triggers
where event_object_schema='public' and event_object_table='orders'
order by action_timing, trigger_name;

-- Section 2.1's whole security argument rests on the effective grants, so CHECK them
-- rather than trusting the REVOKE. Expect exactly one row: authenticated / SELECT.
-- Any INSERT/UPDATE/DELETE row here, or any `anon`/`PUBLIC` row, means the timeline is
-- forgeable and the migration must not be called done.
select grantee, privilege_type
from information_schema.role_table_grants
where table_schema='public' and table_name='order_events'
order by grantee, privilege_type;
```

### 3.3 RLS smoke checks (required before the PR is called done)

Per the standing rule that no policy change ships untested. As a **buyer** on someone else's order:

1. `update orders set tracking_number='X' where id=<own order>` → must **fail** 42501 (buyer is not seller).
2. `update orders set unit_price_tnd=1 where id=<own order>` → must **fail** 42501 (frozen).
3. `insert into orders (…, unit_price_tnd, item_title) values (…, 1, 'forged')` → must **succeed but store the derived values**, not `1`/`'forged'`. This is the hole-1 regression test and the most important of the five.
4. `select * from order_events where order_id=<own order>` → must **return rows**.
5. `select * from order_events where order_id=<a third party's order>` → must **return zero rows**.
6. `insert into order_events (…)` as authenticated → must **fail** (privilege revoked).
7. As **seller**, `update orders set tracking_number='X'` on a `cancelled` order → must **fail** 42501 (terminal-state guard).
8. As **seller**, same on a `dispatched` order → must **succeed** (the guard must not over-block the real flow).

**And the one that guards against self-inflicted breakage — run it first.** `set_order_snapshot` *raises* when the target listing is missing, so a bad fixture would turn "order creation" into "order creation is down":

9. Create one **product** order and one **service** order through the real server actions (`submitProductRequest` / `submitServiceRequest`), end to end. Both must succeed, and both must land with **non-null** `item_title` and `unit_price_tnd`, plus exactly one `'created'` event each.

Test 9 is the smoke test for the whole PR: it proves the trigger fires on the sanctioned path, not just that it blocks the forged one.

Vitest coverage: **(2), (3), (6), (7) and (9)** are must-test per the testing discipline — security-sensitive and business-rule logic. (3) especially: it is the only test that proves the freeze is worth anything. (9) is the one that catches a trigger that blocks everything.

---

## 4. Which surfaces this actually unblocks

Revised from the discovery report now that `delivery_fee` is out:

| Surface | Status after this PR |
|---|---|
| **G4 Bénéfice net** (`tableau-de-bord-vendeur/page.tsx:126-142`) | ✅ **UNBLOCKED** — net = `unit_price_tnd × quantity` summed over delivered orders. Per your ruling the agency's fee is not seller revenue, so it correctly plays no part. Needs `seller-dashboard.ts` aggregate + replacing `seller.dashboard.tile.profit_soon` in **both** `fr.ts` and `ar.ts`. ⚠ Will read 0 TND for now — every delivered order predates the snapshot. Consider gating the tile on "has any order with a non-null snapshot" rather than printing a confident 0. |
| **G9 panel-suivi** (`[id]/page.tsx:36-47`) | ✅ **UNBLOCKED** — carrier + tracking. Needs a new seller action in `actions.ts`. |
| **G9 panel-historique** | ✅ **UNBLOCKED** — `order_events`, plus the already-shipped cancellation entry. Empty for the 11 old orders; the existing "one real entry beats a panel of nothing" exception still carries them. |
| **G9 Livraison row** | ❌ still absent — `delivery_fee` deferred. Comment at `:158-159` stays, updated to cite this PR. |
| **G9 Total row** | ❌ still absent. `unit_price` now exists, but a COD total without the fee is still a wrong number. |
| **G8 waitTime** (`_components/OrderActionRow.tsx`) | ✅ **UNBLOCKED** — lateral join, not N+1: `left join lateral (select max(created_at) … where e.order_id=o.id and e.to_status=o.status) on true`. Null for old orders. |
| **G8 multi-select + delivery documents** | ❌ still deferred with `delivery_fee` + slip ref. |

---

## 5. Logged, not done

- **OPEN DESIGN — per-governorate delivery rate table.** The deferred `delivery_fee` question. Tunisian COD fees typically vary by destination; the governorate is already captured (folded into `delivery_address`). Decide the rate-table shape *before* adding any scalar fee column, or we migrate twice.
- **`db/migrations/` mirror is one behind live.** `20260727101731_add_service_listings_delivery_mode` is applied in production but has no file in the repo. Not this PR's job, but it means the mirror is not currently a faithful record.
- **Product deletion is still blocked.** `orders_product_id_fkey` SET NULL would violate the `order_target_matches_type` CHECK, so deleting a product that has orders fails outright — G7's 🔴 delete flow. Once `item_title`/`unit_price_tnd` land, relaxing that CHECK becomes *safe* (the order no longer needs the listing to render), but it is a separate change. One PR, one focus.
- **Three buyer-side transitions still `.update()` from the browser** (`ReceiptConfirmButton.tsx`, `CancelOrderModal.tsx`). Already logged; this PR hardens the DB against them rather than migrating them.

---

## 6. Approval checklist

Please confirm, or correct, each:

1. ☐ Column name **`item_title`** (§0.1)
2. ☐ **`unit_price_tnd` on service orders too**, semantics = "listed starting price at request time" — my reversal (§0.2)
3. ☐ **Print RPC deferred** to the documents PR; `'print'` stays in the CHECK vocabulary (§0.3)
4. ☐ Migration 1 as written (§1)
5. ☐ Migration 2 as written (§2)
6. ☐ **No backfill**, and the **COALESCE fallback** in the read path (§3, §3.1)
7. ☐ **Carrier/tracking blocked on terminal orders** (`received`/`cancelled`) — added in §1.3 after review. Say so if you want post-terminal correction allowed instead.

**Awaiting founder approval before proceeding.** On approval I apply via `apply_migration` (two files), mirror both into `db/migrations/`, then run §3.2 and §3.3.
