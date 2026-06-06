
-- FAVORITES: a user saves products or services. Private to each user.
create table public.favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  item_type text not null check (item_type in ('product','service')),
  product_id uuid references public.products(id) on delete cascade,
  service_listing_id uuid references public.service_listings(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint favorite_target_matches_type check (
    (item_type = 'product' and product_id is not null and service_listing_id is null)
    or
    (item_type = 'service' and service_listing_id is not null and product_id is null)
  ),
  -- a user can't favorite the same item twice
  unique (user_id, product_id),
  unique (user_id, service_listing_id)
);
create index favorites_user_idx on public.favorites(user_id);

-- REPORTS: real case-handling. Reporter files; admin reviews; outcome shown to reporter.
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  target_type text not null check (target_type in ('shop','product','freelancer_profile','service','job_post','user')),
  target_id uuid not null,
  reason text not null check (reason in ('fake_scam','offensive','wrong_category','other')),
  description text,
  status text not null default 'open' check (status in ('open','under_review','resolved')),
  admin_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index reports_reporter_idx on public.reports(reporter_id);
create index reports_status_idx on public.reports(status);
create trigger reports_set_updated_at before update on public.reports
  for each row execute function public.handle_updated_at();

-- ===== Row Level Security =====
alter table public.favorites enable row level security;
alter table public.reports enable row level security;

-- Favorites: fully private — only the owner, ever.
create policy "Users read own favorites" on public.favorites for select
  using (user_id = auth.uid());
create policy "Users insert own favorites" on public.favorites for insert
  with check (user_id = auth.uid());
create policy "Users delete own favorites" on public.favorites for delete
  using (user_id = auth.uid());

-- Reports: reporter creates and reads own; admins read all and update (resolve).
create policy "Reporter creates own report" on public.reports for insert
  with check (reporter_id = auth.uid());
create policy "Reporter reads own, admin reads all" on public.reports for select
  using (reporter_id = auth.uid() or public.is_admin());
create policy "Admin updates reports" on public.reports for update
  using (public.is_admin()) with check (public.is_admin());
