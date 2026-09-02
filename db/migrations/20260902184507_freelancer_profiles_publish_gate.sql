-- Freelancer publish gate. freelancer_profiles and its five child tables
-- (freelancer_skills, freelancer_tools, freelancer_education,
-- freelancer_certifications, freelancer_languages) are currently
-- SELECT `using (true)` -- world-readable to anon the instant H2 step 1
-- inserts a row, with no publish flag to gate on. is_published becomes that
-- gate. It is derived, never user-set: a freelancer is published exactly
-- when they have >= 1 active service_listings row, kept in sync by a
-- trigger on service_listings so the backfill and the ongoing rule read
-- from the same function and can never diverge.
--
-- freelancer_links and freelancer_portfolio_items do not exist yet (H3's
-- migration) and are out of scope here.

-- 1. Column. Defaults false so any future insert path starts unpublished
--    until the trigger (fired by its own service_listings insert) or the
--    backfill below proves otherwise.
alter table public.freelancer_profiles
  add column is_published boolean not null default false;

comment on column public.freelancer_profiles.is_published is
  'Derived, not user-set. True iff this freelancer has >= 1 service_listings row with status=''active''. Maintained by sync_freelancer_is_published() on service_listings; never written directly by app code.';

-- 2. Single source of truth for "does this freelancer have >= 1 active
--    listing". Used by both the trigger (below) and the one-time backfill,
--    so the two rules cannot drift apart. security definer + owner-bypassed
--    RLS so it sees the true state of service_listings regardless of the
--    caller's own read access.
create or replace function public.freelancer_has_active_listing(p_freelancer_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.service_listings sl
    where sl.freelancer_profile_id = p_freelancer_profile_id
      and sl.status = 'active'
  );
$$;

revoke all on function public.freelancer_has_active_listing(uuid) from public;
grant execute on function public.freelancer_has_active_listing(uuid) to authenticated;

-- 3. Trigger function. Recomputes is_published for every freelancer_profiles
--    row a service_listings insert/update/delete could have affected.
--
--    - INSERT: recompute NEW's owner.
--    - DELETE: recompute OLD's owner. Covers the direct case (freelancer
--      hides their last listing by deleting it) and the cascade case
--      (freelancer_profiles row itself deleted, ON DELETE CASCADE fires this
--      per cascaded row) -- in the cascade case the parent freelancer_profiles
--      row is already gone by the time this fires, so the UPDATE below
--      matches zero rows and is a silent no-op, not an error.
--    - UPDATE: recompute NEW's owner; if freelancer_profile_id itself
--      changed, ALSO recompute OLD's owner. App-layer RLS makes an owner
--      change impossible today (freelancer_profiles.profile_id is UNIQUE, so
--      one freelancer_profiles row per user, and the "Owner updates own
--      services" policy's with-check requires the row identified by the NEW
--      freelancer_profile_id to also belong to auth.uid() -- the only value
--      that can satisfy both is the row it already had). But nothing at the
--      schema level ties old to new (no trigger, no check constraint), so a
--      service-role or future write path is not blocked from doing it --
--      confirmed by reading service_listings' actual RLS policies and the
--      freelancer_profiles_profile_id_key unique constraint, not assumed.
--      The trigger does not assume single-owner.
--
--    Fires only on UPDATE OF (status, freelancer_profile_id) -- an owner
--    editing a listing's title/price/tags does not touch is_published and
--    must not bump freelancer_profiles.updated_at (handle_updated_at() fires
--    on any UPDATE to that table) on every unrelated edit.
create or replace function public.sync_freelancer_is_published()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  affected uuid[];
begin
  if tg_op = 'DELETE' then
    affected := array[old.freelancer_profile_id];
  elsif tg_op = 'INSERT' then
    affected := array[new.freelancer_profile_id];
  else
    if new.freelancer_profile_id is distinct from old.freelancer_profile_id then
      affected := array[old.freelancer_profile_id, new.freelancer_profile_id];
    else
      affected := array[new.freelancer_profile_id];
    end if;
  end if;

  update public.freelancer_profiles fp
  set is_published = public.freelancer_has_active_listing(fp.id)
  where fp.id = any(affected)
    and fp.is_published is distinct from public.freelancer_has_active_listing(fp.id);

  return null;
end;
$$;

create trigger trg_sync_freelancer_is_published
  after insert or delete or update of status, freelancer_profile_id
  on public.service_listings
  for each row
  execute function public.sync_freelancer_is_published();

comment on function public.sync_freelancer_is_published() is
  'AFTER INSERT/UPDATE/DELETE trigger function on service_listings. Recomputes freelancer_profiles.is_published for every freelancer_profile_id the change could have affected (both old and new on a reassignment). See db/migrations for the full reasoning.';

-- 4. Backfill -- the trigger's own rule (same function), applied once to
--    every existing row, so backfill and ongoing rule cannot diverge. As of
--    this migration: 10 of 11 freelancer_profiles rows have >= 1 active
--    service_listings row and become published; 1 has none (never finished
--    onboarding, nothing live to protect) and stays unpublished.
update public.freelancer_profiles fp
set is_published = public.freelancer_has_active_listing(fp.id)
where fp.is_published is distinct from public.freelancer_has_active_listing(fp.id);

-- 5. Replace all six `using (true)` SELECT policies (exact existing names)
--    with the publish gate: is_published OR the caller is the owner OR the
--    caller is an admin. Admin is required, not optional -- the report-
--    review UI at /admin/signalements/[id] and the admin dashboard's
--    freelancer count already depend on reading freelancer_profiles
--    regardless of publish state; confirmed by reading both call sites
--    before writing this, not assumed. The five children branch the FK
--    column per table -- freelancer_profile_id on skills/languages,
--    freelancer_id on tools/education/certifications -- confirmed from
--    information_schema, not templated from one name.

drop policy "Freelancer profiles viewable by everyone" on public.freelancer_profiles;
create policy "Freelancer profiles viewable by everyone" on public.freelancer_profiles
  for select
  using (is_published = true or profile_id = auth.uid() or public.is_admin());

drop policy "Skills viewable by everyone" on public.freelancer_skills;
create policy "Skills viewable by everyone" on public.freelancer_skills
  for select
  using (
    exists (
      select 1 from public.freelancer_profiles fp
      where fp.id = freelancer_skills.freelancer_profile_id
        and (fp.is_published = true or fp.profile_id = auth.uid() or public.is_admin())
    )
  );

drop policy "Languages viewable by everyone" on public.freelancer_languages;
create policy "Languages viewable by everyone" on public.freelancer_languages
  for select
  using (
    exists (
      select 1 from public.freelancer_profiles fp
      where fp.id = freelancer_languages.freelancer_profile_id
        and (fp.is_published = true or fp.profile_id = auth.uid() or public.is_admin())
    )
  );

drop policy "Anyone can view freelancer tools" on public.freelancer_tools;
create policy "Anyone can view freelancer tools" on public.freelancer_tools
  for select
  using (
    exists (
      select 1 from public.freelancer_profiles fp
      where fp.id = freelancer_tools.freelancer_id
        and (fp.is_published = true or fp.profile_id = auth.uid() or public.is_admin())
    )
  );

drop policy "Anyone can view freelancer education" on public.freelancer_education;
create policy "Anyone can view freelancer education" on public.freelancer_education
  for select
  using (
    exists (
      select 1 from public.freelancer_profiles fp
      where fp.id = freelancer_education.freelancer_id
        and (fp.is_published = true or fp.profile_id = auth.uid() or public.is_admin())
    )
  );

drop policy "Anyone can view freelancer certifications" on public.freelancer_certifications;
create policy "Anyone can view freelancer certifications" on public.freelancer_certifications
  for select
  using (
    exists (
      select 1 from public.freelancer_profiles fp
      where fp.id = freelancer_certifications.freelancer_id
        and (fp.is_published = true or fp.profile_id = auth.uid() or public.is_admin())
    )
  );
