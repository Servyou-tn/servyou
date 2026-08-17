-- G5 "Mes produits" reads `orders(count)` per product row (received-count for Vendus, unfiltered
-- count for delete-eligibility — docs/design/g5-discovery.md §8.3). `orders.product_id` has no
-- index today (orders_buyer_idx / orders_seller_idx / orders_status_idx exist, orders.sql:27-29 —
-- this one doesn't), so every row on every G5 page load did a sequential scan over the whole
-- orders table. Purely additive, zero data risk, zero RLS change.
create index orders_product_idx on public.orders(product_id);
