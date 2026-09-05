-- H3 (freelancer profile edit) migration -- three items only, per founder ruling.
--
-- freelancer_links and freelancer_portfolio_items were explicitly anticipated and deferred by
-- 20260902184507_freelancer_profiles_publish_gate.sql's own header comment ("freelancer_links and
-- freelancer_portfolio_items do not exist yet (H3's migration) and are out of scope here") -- this
-- is that migration.

-- 1. freelancer_links -- "Liens externes", cap 3 (app-enforced, no DB constraint -- matches
--    product_images' own lack of a display_order cap constraint). Two free-text columns per row;
--    no type/platform selector exists in the measured Figma (413:15941 / 404:12327).
create table public.freelancer_links (
  id uuid primary key default gen_random_uuid(),
  freelancer_profile_id uuid not null references public.freelancer_profiles(id) on delete cascade,
  label text not null,
  url text not null,
  display_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index freelancer_links_freelancer_profile_idx on public.freelancer_links(freelancer_profile_id);

comment on table public.freelancer_links is
  'Freelancer''s external profile links (GitHub, LinkedIn, personal site -- "Liens externes", H3 acc:Confiance & liens). Repeater capped at 3 in the app layer, not here. label/url are both free text: the measured frame (413:15941) has no type selector and never named these two inputs (unedited component placeholders) -- labels are founder-ruled, not measured; see the H3 PR description.';

-- 2. freelancer_portfolio_items -- cap 6 (app-enforced). THREE text fields per row plus a
--    thumbnail, not two: the measured row (413:15949, full depth) is [Input title-shaped]
--    [Input url-shaped][Textarea description] -- same unnamed-label caveat as freelancer_links.
create table public.freelancer_portfolio_items (
  id uuid primary key default gen_random_uuid(),
  freelancer_profile_id uuid not null references public.freelancer_profiles(id) on delete cascade,
  image_url text not null,
  title text,
  url text,
  description text,
  display_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index freelancer_portfolio_items_freelancer_profile_idx on public.freelancer_portfolio_items(freelancer_profile_id);

comment on table public.freelancer_portfolio_items is
  'Freelancer portfolio showcase items ("Portfolio", H3 acc:Portfolio, cap 6 app-enforced). image_url is NOT NULL -- a row can only be inserted after its image clears the provenance gate (trg_enforce_portfolio_image_provenance). title/url/description are nullable: the measured Figma frame carries an asterisk node on all three but renders no visible caption for any of them (unresolved as of the H3 discovery pass) -- required-ness is deliberately not baked in here; Zod at the app layer is the place to tighten this once labels and required-ness are actually ruled.';

-- Provenance gate, same shape as enforce_product_image_provenance() (20260903143928) -- reuses the
-- EXISTING uploaded_objects table, new bucket ('portfolio-media', confirmed public/2MiB/image-webp,
-- zero writers today). Ownership here is direct (freelancer_profile_id -> freelancer_profiles.profile_id =
-- auth.uid()), not the shop/product indirection product_images needs, because a portfolio item
-- belongs to the freelancer directly.
create or replace function public.enforce_portfolio_image_provenance()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_path   text;
  v_owner  uuid;
begin
  v_path := split_part(substring(new.image_url from '/object/public/portfolio-media/(.*)$'), '?', 1);

  if v_path is null or v_path = '' then
    raise exception 'portfolio-media provenance check failed: % is not a recognized portfolio-media object url', new.image_url;
  end if;

  select fp.profile_id into v_owner
  from public.freelancer_profiles fp
  where fp.id = new.freelancer_profile_id;

  if v_owner is null then
    raise exception 'portfolio-media provenance check failed: freelancer_profile % has no resolvable owner', new.freelancer_profile_id;
  end if;

  if not exists (
    select 1 from public.uploaded_objects uo
    where uo.bucket = 'portfolio-media'
      and uo.path = v_path
      and uo.owner_id = v_owner
  ) then
    raise exception 'portfolio-media provenance check failed: % has no validated upload record for owner %', v_path, v_owner;
  end if;

  return new;
end;
$$;

comment on function public.enforce_portfolio_image_provenance() is
  'BEFORE INSERT trigger function on freelancer_portfolio_items. Requires a matching (bucket=portfolio-media, path, owner_id) row in uploaded_objects, where owner_id is freelancer_profiles.profile_id for the item''s own freelancer_profile_id. Same shape as enforce_product_image_provenance() (20260903143928), simplified: no shop/product indirection, the owner is direct.';

create trigger trg_enforce_portfolio_image_provenance
before insert on public.freelancer_portfolio_items
for each row execute function public.enforce_portfolio_image_provenance();

-- 3. freelancer_profiles.workplace_location -- "Lieu de travail" (H3 acc:Contexte). NOT
--    current_workplace: that column's own comment documents employment status ("Junior dev @
--    TechCo", "Independant a plein temps") -- a different thing from a work location/mode.
--    Nullable, optional (no asterisk in the measured frame).
alter table public.freelancer_profiles
  add column workplace_location text;

comment on column public.freelancer_profiles.workplace_location is
  'Free-form work location/mode ("Lieu de travail", H3 acc:Contexte) -- e.g. a city, "a domicile", "sur site". Distinct from current_workplace, which documents employment status, not location. Optional: the measured Figma frame (404:12214) carries no asterisk on this field.';

-- RLS -- same shape PR #164 established for every freelancer_* child table (read directly from
-- pg_policies on freelancer_education/freelancer_certifications, not assumed): public SELECT
-- gates on the PARENT's is_published, plus owner, plus is_admin(). Never USING(true).

alter table public.freelancer_links enable row level security;
alter table public.freelancer_portfolio_items enable row level security;

create policy "Links viewable by everyone" on public.freelancer_links
  for select
  using (
    exists (
      select 1 from public.freelancer_profiles fp
      where fp.id = freelancer_links.freelancer_profile_id
        and (fp.is_published = true or fp.profile_id = auth.uid() or public.is_admin())
    )
  );

create policy "Freelancer manages own links -- insert" on public.freelancer_links
  for insert
  with check (
    exists (
      select 1 from public.freelancer_profiles fp
      where fp.id = freelancer_links.freelancer_profile_id and fp.profile_id = auth.uid()
    )
  );

create policy "Freelancer manages own links -- update" on public.freelancer_links
  for update
  using (
    exists (
      select 1 from public.freelancer_profiles fp
      where fp.id = freelancer_links.freelancer_profile_id and fp.profile_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.freelancer_profiles fp
      where fp.id = freelancer_links.freelancer_profile_id and fp.profile_id = auth.uid()
    )
  );

create policy "Freelancer manages own links -- delete" on public.freelancer_links
  for delete
  using (
    exists (
      select 1 from public.freelancer_profiles fp
      where fp.id = freelancer_links.freelancer_profile_id and fp.profile_id = auth.uid()
    )
  );

create policy "Portfolio items viewable by everyone" on public.freelancer_portfolio_items
  for select
  using (
    exists (
      select 1 from public.freelancer_profiles fp
      where fp.id = freelancer_portfolio_items.freelancer_profile_id
        and (fp.is_published = true or fp.profile_id = auth.uid() or public.is_admin())
    )
  );

create policy "Freelancer manages own portfolio items -- insert" on public.freelancer_portfolio_items
  for insert
  with check (
    exists (
      select 1 from public.freelancer_profiles fp
      where fp.id = freelancer_portfolio_items.freelancer_profile_id and fp.profile_id = auth.uid()
    )
  );

create policy "Freelancer manages own portfolio items -- update" on public.freelancer_portfolio_items
  for update
  using (
    exists (
      select 1 from public.freelancer_profiles fp
      where fp.id = freelancer_portfolio_items.freelancer_profile_id and fp.profile_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.freelancer_profiles fp
      where fp.id = freelancer_portfolio_items.freelancer_profile_id and fp.profile_id = auth.uid()
    )
  );

create policy "Freelancer manages own portfolio items -- delete" on public.freelancer_portfolio_items
  for delete
  using (
    exists (
      select 1 from public.freelancer_profiles fp
      where fp.id = freelancer_portfolio_items.freelancer_profile_id and fp.profile_id = auth.uid()
    )
  );
