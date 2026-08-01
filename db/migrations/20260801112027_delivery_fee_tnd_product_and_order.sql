-- delivery_fee_tnd — per-product carrier fee, frozen onto the order at insert.
--
-- Model (founder ruling 2026-08-01): the buyer pays product price + delivery fee at the door.
-- The CARRIER collects the whole amount, keeps the fee, and deposits the product price into the
-- seller's account on the carrier's own platform. Servyou never touches money. The fee is a
-- DISPLAY and INSTRUCTION field, never a calculation input.
--
-- The fee lives PER PRODUCT, not per shop: the seller declares it and can change it. 7 TND is
-- the default because ~90% of Tunisian deliveries are 7. A shops.default_delivery_fee_tnd
-- pre-fill column was considered and deliberately deferred — G3 and G6 do not exist as routes,
-- so it would be dead schema with no writer and no reader. It rides with the G6 PR.
--
-- Safe to add unvalidated-free on both tables (state verified immediately before apply):
--   · products — 9 rows, all take the DEFAULT 7, so every row satisfies >= 0.
--   · orders   — 14 rows (4 product, 10 service), all NULL in the new column, so both branches
--                of the CHECK pass and full-table validation needs no rewrite.
--
-- NOT backfilled onto history: the 4 pre-existing product orders cannot be honestly assigned a
-- fee that was never charged. They keep NULL, exactly as they keep NULL in unit_price_tnd.

-- 1. products.delivery_fee_tnd — the real value, declared per product.
alter table public.products
  add column delivery_fee_tnd numeric(10,2) not null default 7;

-- >= 0 rather than > 0: free delivery is a legitimate 0, not an absence.
alter table public.products
  add constraint products_delivery_fee_tnd_check
  check (delivery_fee_tnd >= 0);

comment on column public.products.delivery_fee_tnd is
$c$Carrier delivery fee in TND, declared per product by the seller, shown to the buyer, and
printed on the bon de livraison. NOT NULL DEFAULT 7 (~90% of Tunisian deliveries are 7 TND);
0 means free delivery. DISPLAY AND INSTRUCTION ONLY — never a calculation input. Servyou
never touches this money.

DEPENDS ON shops.delivery_setup. This column assumes delivery_setup = 'third_party', the
only MVP mode (~97% of Tunisian e-commerce): the carrier collects product price + fee at the
door, KEEPS THE FEE, and deposits the product price into the seller's account on the carrier's
own platform. The fee is therefore NOT seller revenue — see netProfitOf() in
src/lib/marche/seller-dashboard.ts, which computes net as unit_price_tnd * quantity and
excludes this column deliberately.

When 'self_delivery' arrives (Phase 2) the SELLER collects and keeps the fee, which REOPENS
G4's Benefice net. 'buyer_pickup' has no parcel, so no fee applies at all. Phase 2 changes
the fee's MEANING per shop, not this column's shape. If you are setting delivery_setup in G3,
read this first.$c$;

-- 2. orders.delivery_fee_tnd — frozen snapshot. Nullable: pre-existing orders cannot be
--    honestly backfilled, same reasoning as unit_price_tnd.
alter table public.orders
  add column delivery_fee_tnd numeric(10,2);

-- Sibling to orders_shipment_requires_product, same shape. Written as a NEW constraint rather
-- than an extension of that one: extending would mean DROP + ADD on a constraint this PR has
-- no business touching. A service has no parcel, so it can carry no carrier fee.
alter table public.orders
  add constraint orders_delivery_fee_requires_product
  check (order_type = 'product' or delivery_fee_tnd is null);

comment on column public.orders.delivery_fee_tnd is
$c$Frozen copy of products.delivery_fee_tnd taken at INSERT by set_order_snapshot (product
branch only; NULL for services, enforced by orders_delivery_fee_requires_product).

NULLABLE on purpose. The 4 product orders predating this column cannot be honestly
backfilled — identical reasoning to unit_price_tnd. Consumers must gate on NOT NULL rather
than let a missing value sum into a confident 0; see the null-gate note at
src/lib/marche/seller-dashboard.ts:53.

Listed in enforce_order_identity_lock's frozen set: after the seller changes their rate, a
historical order must still show what was actually charged. That lock returns early for
service_role writes and for is_admin(), so the value is immutable on the client path, not
absolutely.

Same shops.delivery_setup dependency as products.delivery_fee_tnd — read that column's
comment. Under 'third_party' (MVP) this is the carrier's money passing through the order
record, not seller revenue.$c$;

-- 3. Freeze the fee at insert. Product branch only; a service has no parcel.
--    Assignment stays UNCONDITIONAL, so a client that posts delivery_fee_tnd on a service
--    order has it overwritten to NULL rather than rejected — the CHECK is never reached
--    with a bad value.
create or replace function public.set_order_snapshot()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_title text;
  v_price numeric(10,2);
  v_fee   numeric(10,2);
begin
  if new.order_type = 'product' then
    select p.title, p.price_tnd, p.delivery_fee_tnd
      into v_title, v_price, v_fee
      from public.products p
     where p.id = new.product_id;
  elsif new.order_type = 'service' then
    select s.title, s.starting_price_tnd
      into v_title, v_price
      from public.service_listings s
     where s.id = new.service_listing_id;
    -- v_fee stays NULL: a service has no parcel, so there is no carrier fee to freeze.
    -- orders_delivery_fee_requires_product enforces the same rule at the table level.
  end if;

  -- The FK would reject a bogus target anyway, but raising here makes the invariant
  -- explicit: every row created from now on HAS a title and a price.
  if v_title is null then
    raise exception 'Impossible de créer la commande : article introuvable.'
      using errcode = '23503';
  end if;

  -- Unconditional assignment. Any client-supplied value is discarded here.
  new.item_title       := v_title;
  new.unit_price_tnd   := v_price;
  new.delivery_fee_tnd := v_fee;

  return new;
end;
$function$;

-- 4. A historical order must show what was actually charged after the seller changes
--    their rate. Only the delivery_fee_tnd line is new; every other line is byte-identical
--    to the previous definition.
create or replace function public.enforce_order_identity_lock()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
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
     or new.delivery_fee_tnd is distinct from old.delivery_fee_tnd
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
$function$;
