
-- FREELANCER PROFILES: professional layer on top of the central profile.
create table public.freelancer_profiles (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles(id) on delete cascade,
  headline text,
  bio text,
  city text,
  portfolio_link text,
  years_experience integer check (years_experience >= 0),
  languages text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index freelancer_profiles_profile_idx on public.freelancer_profiles(profile_id);
create trigger freelancer_profiles_set_updated_at before update on public.freelancer_profiles
  for each row execute function public.handle_updated_at();

-- FREELANCER SKILLS: tags, kept separate for clean skill-based search.
create table public.freelancer_skills (
  id uuid primary key default gen_random_uuid(),
  freelancer_profile_id uuid not null references public.freelancer_profiles(id) on delete cascade,
  skill text not null,
  created_at timestamptz not null default now()
);
create index freelancer_skills_profile_idx on public.freelancer_skills(freelancer_profile_id);

-- SERVICE LISTINGS: one row per service offered.
create table public.service_listings (
  id uuid primary key default gen_random_uuid(),
  freelancer_profile_id uuid not null references public.freelancer_profiles(id) on delete cascade,
  category_id uuid references public.categories(id) on delete set null,
  title text not null,
  description text,
  starting_price_tnd numeric(10,2) not null check (starting_price_tnd >= 0),
  delivery_time text,
  status text not null default 'active' check (status in ('active','hidden')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index service_listings_freelancer_idx on public.service_listings(freelancer_profile_id);
create index service_listings_category_idx on public.service_listings(category_id);
create trigger service_listings_set_updated_at before update on public.service_listings
  for each row execute function public.handle_updated_at();

-- SERVICE MEDIA: work samples (image now, video-ready later).
create table public.service_media (
  id uuid primary key default gen_random_uuid(),
  service_listing_id uuid not null references public.service_listings(id) on delete cascade,
  media_url text not null,
  media_type text not null default 'image' check (media_type in ('image','video')),
  display_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index service_media_service_idx on public.service_media(service_listing_id);

-- ===== Row Level Security =====
alter table public.freelancer_profiles enable row level security;
alter table public.freelancer_skills enable row level security;
alter table public.service_listings enable row level security;
alter table public.service_media enable row level security;

-- Freelancer profiles: anyone reads; only the owner manages their own.
create policy "Freelancer profiles viewable by everyone" on public.freelancer_profiles for select using (true);
create policy "Owner inserts own freelancer profile" on public.freelancer_profiles for insert
  with check (profile_id = auth.uid());
create policy "Owner updates own freelancer profile" on public.freelancer_profiles for update
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());
create policy "Owner deletes own freelancer profile" on public.freelancer_profiles for delete
  using (profile_id = auth.uid());

-- Skills: anyone reads; managed by the owning freelancer.
create policy "Skills viewable by everyone" on public.freelancer_skills for select using (true);
create policy "Owner inserts own skills" on public.freelancer_skills for insert
  with check (exists (select 1 from public.freelancer_profiles fp where fp.id = freelancer_profile_id and fp.profile_id = auth.uid()));
create policy "Owner deletes own skills" on public.freelancer_skills for delete
  using (exists (select 1 from public.freelancer_profiles fp where fp.id = freelancer_profile_id and fp.profile_id = auth.uid()));

-- Service listings: anyone reads; managed by the owning freelancer.
create policy "Services viewable by everyone" on public.service_listings for select using (true);
create policy "Owner inserts own services" on public.service_listings for insert
  with check (exists (select 1 from public.freelancer_profiles fp where fp.id = freelancer_profile_id and fp.profile_id = auth.uid()));
create policy "Owner updates own services" on public.service_listings for update
  using (exists (select 1 from public.freelancer_profiles fp where fp.id = freelancer_profile_id and fp.profile_id = auth.uid()))
  with check (exists (select 1 from public.freelancer_profiles fp where fp.id = freelancer_profile_id and fp.profile_id = auth.uid()));
create policy "Owner deletes own services" on public.service_listings for delete
  using (exists (select 1 from public.freelancer_profiles fp where fp.id = freelancer_profile_id and fp.profile_id = auth.uid()));

-- Service media: anyone reads; managed by the owning freelancer.
create policy "Service media viewable by everyone" on public.service_media for select using (true);
create policy "Owner inserts own service media" on public.service_media for insert
  with check (exists (
    select 1 from public.service_listings sl join public.freelancer_profiles fp on fp.id = sl.freelancer_profile_id
    where sl.id = service_listing_id and fp.profile_id = auth.uid()));
create policy "Owner deletes own service media" on public.service_media for delete
  using (exists (
    select 1 from public.service_listings sl join public.freelancer_profiles fp on fp.id = sl.freelancer_profile_id
    where sl.id = service_listing_id and fp.profile_id = auth.uid()));
