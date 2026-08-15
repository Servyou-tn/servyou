create table public.freelancer_languages (
  id uuid primary key default gen_random_uuid(),
  freelancer_profile_id uuid not null references public.freelancer_profiles(id) on delete cascade,
  language text not null check (language in ('fr','ar','en','it','de','es','autre')),
  proficiency text not null check (proficiency in ('natif','courant','intermediaire','notions')),
  created_at timestamptz not null default now(),
  unique (freelancer_profile_id, language)
);
create index freelancer_languages_profile_idx on public.freelancer_languages(freelancer_profile_id);

alter table public.freelancer_languages enable row level security;

create policy "Languages viewable by everyone"
  on public.freelancer_languages for select using (true);

create policy "Owner manages own languages"
  on public.freelancer_languages for all
  using (exists (
    select 1 from public.freelancer_profiles fp
    where fp.id = freelancer_profile_id and fp.profile_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.freelancer_profiles fp
    where fp.id = freelancer_profile_id and fp.profile_id = auth.uid()
  ));
