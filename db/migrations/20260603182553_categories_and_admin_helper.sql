
-- Helper: is the current user an admin? (security definer avoids RLS recursion)
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and is_admin = true
  );
$$;

-- CATEGORIES: unified taxonomy for products, services, and job posts.
-- Bilingual (French + Arabic), nestable via parent_id, admin-controlled.
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name_fr text not null,
  name_ar text not null,
  slug text not null unique,
  parent_id uuid references public.categories(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index categories_parent_idx on public.categories(parent_id);

create trigger categories_set_updated_at
before update on public.categories
for each row execute function public.handle_updated_at();

alter table public.categories enable row level security;

-- Anyone can read categories (everyone browses by category).
create policy "Categories are viewable by everyone"
on public.categories for select using (true);

-- Only admins create, edit, or delete categories.
create policy "Only admins manage categories"
on public.categories for all
using (public.is_admin())
with check (public.is_admin());
