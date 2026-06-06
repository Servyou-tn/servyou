
-- ORDERS: unified table for product requests and service requests.
-- Exactly one of product_id / service_listing_id is filled, matching order_type.
-- Product orders carry COD delivery details (sensitive — strict RLS below).
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references public.profiles(id) on delete cascade,
  seller_id uuid not null references public.profiles(id) on delete cascade,
  order_type text not null check (order_type in ('product','service')),
  product_id uuid references public.products(id) on delete set null,
  service_listing_id uuid references public.service_listings(id) on delete set null,
  delivery_name text,
  delivery_address text,
  delivery_phone text,
  buyer_note text,
  quantity integer not null default 1 check (quantity >= 1),
  status text not null default 'pending' check (status in ('pending','completed','cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- enforce exactly-one target matching the order type
  constraint order_target_matches_type check (
    (order_type = 'product' and product_id is not null and service_listing_id is null)
    or
    (order_type = 'service' and service_listing_id is not null and product_id is null)
  )
);
create index orders_buyer_idx on public.orders(buyer_id);
create index orders_seller_idx on public.orders(seller_id);
create index orders_status_idx on public.orders(status);
create trigger orders_set_updated_at before update on public.orders
  for each row execute function public.handle_updated_at();

alter table public.orders enable row level security;

-- Only the buyer and the seller of an order can read it (delivery data is private).
create policy "Buyer and seller read their orders" on public.orders for select
  using (buyer_id = auth.uid() or seller_id = auth.uid());

-- The buyer creates their own order.
create policy "Buyer creates own order" on public.orders for insert
  with check (buyer_id = auth.uid());

-- Buyer can update their own order (e.g. cancel a pending one); seller can update status.
create policy "Buyer or seller updates order" on public.orders for update
  using (buyer_id = auth.uid() or seller_id = auth.uid())
  with check (buyer_id = auth.uid() or seller_id = auth.uid());
