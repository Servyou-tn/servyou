-- carrier / tracking_number are parcel facts. A service order has no parcel and no
-- carrier, so a tracking number on one is meaningless data that a later report would
-- happily aggregate. Constrain both to product orders.
--
-- Safe to add unvalidated-free: all 14 existing orders carry NULL in both columns
-- (verified immediately before apply), so every existing row satisfies the CHECK and
-- Postgres's full-table validation passes without a rewrite.
--
-- Written as "not a product => both null" rather than "product => not null": product
-- orders legitimately have no carrier until dispatch, so NULL must stay valid on both
-- sides. This constrains WHERE the columns may be populated, not WHEN.
alter table public.orders
  add constraint orders_shipment_requires_product
  check (
    order_type = 'product'
    or (carrier is null and tracking_number is null)
  );

comment on constraint orders_shipment_requires_product on public.orders is
  'carrier/tracking_number are product-order facts only. A service has no parcel, so populating them on a service order is meaningless data rather than a harmless null.';
