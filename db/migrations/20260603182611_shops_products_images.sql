
-- SHOPS: one row per shop, owned by a profile (seller_type shop_owner).
create table public.shops (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  description text,
  city text,
  logo_url text,
  banner_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index shops_owner_idx on public.shops(owner_id);
create trigger shops_set_updated_at before update on public.shops
  for each row execute function public.handle_updated_at();

-- PRODUCTS: one row per product, linked to a shop and a category.
-- Dropshipping-friendly: tracks_stock false = always available (no count).
create table public.products (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  category_id uuid references public.categories(id) on delete set null,
  title text not null,
  description text,
  price_tnd numeric(10,2) not null check (price_tnd >= 0),
  status text not null default 'active' check (status in ('active','hidden','sold_out')),
  tracks_stock boolean not null default true,
  stock_count integer check (stock_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index products_shop_idx on public.products(shop_id);
create index products_category_idx on public.products(category_id);
create trigger products_set_updated_at before update on public.products
  for each row execute function public.handle_updated_at();

-- PRODUCT IMAGES: many images per product.
create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  image_url text not null,
  display_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index product_images_product_idx on public.product_images(product_id);

-- ===== Row Level Security =====
alter table public.shops enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;

-- Shops: anyone reads; only the owner manages their own shop.
create policy "Shops viewable by everyone" on public.shops for select using (true);
create policy "Owner inserts own shop" on public.shops for insert
  with check (owner_id = auth.uid());
create policy "Owner updates own shop" on public.shops for update
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "Owner deletes own shop" on public.shops for delete
  using (owner_id = auth.uid());

-- Products: anyone reads; only the owner of the parent shop manages them.
create policy "Products viewable by everyone" on public.products for select using (true);
create policy "Shop owner inserts products" on public.products for insert
  with check (exists (select 1 from public.shops s where s.id = shop_id and s.owner_id = auth.uid()));
create policy "Shop owner updates products" on public.products for update
  using (exists (select 1 from public.shops s where s.id = shop_id and s.owner_id = auth.uid()))
  with check (exists (select 1 from public.shops s where s.id = shop_id and s.owner_id = auth.uid()));
create policy "Shop owner deletes products" on public.products for delete
  using (exists (select 1 from public.shops s where s.id = shop_id and s.owner_id = auth.uid()));

-- Product images: anyone reads; managed by the owner of the parent product's shop.
create policy "Product images viewable by everyone" on public.product_images for select using (true);
create policy "Shop owner inserts product images" on public.product_images for insert
  with check (exists (
    select 1 from public.products p join public.shops s on s.id = p.shop_id
    where p.id = product_id and s.owner_id = auth.uid()));
create policy "Shop owner deletes product images" on public.product_images for delete
  using (exists (
    select 1 from public.products p join public.shops s on s.id = p.shop_id
    where p.id = product_id and s.owner_id = auth.uid()));
