
-- =====================================================
-- Servyou: profiles table
-- The foundation of user identity for all roles
-- (consumer, shop_owner, freelancer)
-- =====================================================

-- Create the profiles table
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null unique,
  role text not null check (role in ('consumer', 'shop_owner', 'freelancer')),
  city text,
  language text not null default 'fr',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Helpful index for filtering by role (common query)
create index profiles_role_idx on public.profiles (role);

-- Helpful index for filtering by city (common query)
create index profiles_city_idx on public.profiles (city);

-- Auto-update the updated_at column on every row update
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row
execute function public.handle_updated_at();

-- =====================================================
-- Row Level Security
-- =====================================================
alter table public.profiles enable row level security;

-- Anyone (even logged out) can read basic profile info
-- This is needed so a consumer can see "Sold by Ahmed's Shop" on a product
create policy "Profiles are viewable by everyone"
on public.profiles
for select
using (true);

-- A user can only insert their own profile (id must match their auth user id)
create policy "Users can insert their own profile"
on public.profiles
for insert
with check (auth.uid() = id);

-- A user can only update their own profile
create policy "Users can update their own profile"
on public.profiles
for update
using (auth.uid() = id)
with check (auth.uid() = id);

-- A user can only delete their own profile
create policy "Users can delete their own profile"
on public.profiles
for delete
using (auth.uid() = id);

-- Comment the table for future clarity
comment on table public.profiles is 'User accounts for Servyou: consumers, shop owners, and freelancers. Linked to Supabase Auth via id.';
