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

-- 1. The frozen pair. Nullable because 14 existing orders predate capture and there is
--    no honest value to invent for them -- no backfill is run.
alter table public.orders add column unit_price_tnd numeric(10,2);
alter table public.orders add column item_title     text;

comment on column public.orders.unit_price_tnd is
  'Unit price in TND frozen at order creation. Derived server-side by set_order_snapshot(); never accepted from the client. On a service order this records the LISTED STARTING PRICE at request time, not an agreed fee -- service pricing is negotiated off-platform at MVP. NULL on the 14 orders that predate this column.';

comment on column public.orders.item_title is
  'Title of the ordered product or service, frozen at creation. Survives listing deletion (both target FKs are ON DELETE SET NULL). NULL on orders predating this column.';

-- 2. The two shipment columns. Deliberately NOT frozen: tracking is entered after
--    dispatch, and both are legitimately corrected (wrong carrier picked, typo in a
--    12-digit code). Seller-write is enforced in enforce_order_identity_lock below,
--    NOT by column privileges -- buyer and seller are both the `authenticated` role,
--    so a column-level GRANT cannot distinguish them.
--
--    NOTE: these columns also require an explicit UPDATE grant, added in
--    20260729111938_orders_grant_update_on_shipment_columns -- `orders` uses a
--    column-level allow-list (see migration 20260609190755), so a new column is not
--    writable by anyone in `authenticated` until named.
alter table public.orders add column carrier         text;
alter table public.orders add column tracking_number text;

comment on column public.orders.carrier is
  'Per-shipment carrier for THIS order. Distinct from shops.preferred_carriers, which is a shop-level default -- a shop may ship one order by Aramex and the next by First Delivery.';

-- 3. Derive the frozen columns server-side and OVERWRITE anything the client submitted.
--
-- This is load-bearing, not defensive. The orders INSERT policy is
-- `WITH CHECK (buyer_id = auth.uid())` -- column-blind -- and enforce_order_identity_lock
-- is BEFORE UPDATE only, so it never runs on INSERT. Without this trigger a buyer could
-- insert unit_price_tnd = 1 straight from the browser client and the identity lock would
-- then protect that forged value forever. Freezing an unvalidated number is worse than
-- not freezing it.
--
-- Proven at apply time: an INSERT submitted as the buyer role with unit_price_tnd = 0
-- and item_title = 'FORGED TITLE' stored 1249.99 / 'iphone 13 pro'.
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

-- 4. Extend the identity lock: the two frozen columns, plus a SEPARATE seller-only
--    clause for carrier/tracking (not frozen -- entered after dispatch).
--
-- Only enforce_order_identity_lock is touched. The other three BEFORE UPDATE triggers
-- are left exactly as they are. CREATE OR REPLACE rebinds the existing trigger in
-- place -- no DROP, so there is no window where the lock is absent.
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
     or new.unit_price_tnd is distinct from old.unit_price_tnd
     or new.item_title is distinct from old.item_title then
    raise exception 'Order identity columns cannot be modified' using errcode = '42501';
  end if;

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
