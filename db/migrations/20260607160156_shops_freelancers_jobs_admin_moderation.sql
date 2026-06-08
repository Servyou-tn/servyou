-- Admin moderation columns on the remaining three content tables.
-- Unlike products/service_listings, these tables don't have a status='hidden' seller-side feature,
-- so admin moderation is encoded entirely via admin_hidden_at NOT NULL (no status flip).
alter table public.shops
  add column admin_hidden_at      timestamptz null,
  add column admin_hidden_reason  text        null;

alter table public.freelancer_profiles
  add column admin_hidden_at      timestamptz null,
  add column admin_hidden_reason  text        null;

alter table public.job_posts
  add column admin_hidden_at      timestamptz null,
  add column admin_hidden_reason  text        null;

-- CHECK: a moderated row carries a non-empty reason.
alter table public.shops
  add constraint shops_admin_moderation_requires_reason
  check (admin_hidden_at is null or admin_hidden_reason is not null);

alter table public.freelancer_profiles
  add constraint freelancer_profiles_admin_moderation_requires_reason
  check (admin_hidden_at is null or admin_hidden_reason is not null);

alter table public.job_posts
  add constraint job_posts_admin_moderation_requires_reason
  check (admin_hidden_at is null or admin_hidden_reason is not null);

-- Marker-only lock trigger function. Simpler than enforce_admin_moderation_lock
-- because there is no status column to protect on these tables.
create or replace function public.enforce_admin_marker_lock()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    if (old.admin_hidden_at is distinct from new.admin_hidden_at) then
      raise exception 'Only admins can set or clear admin_hidden_at';
    end if;
    if (old.admin_hidden_reason is distinct from new.admin_hidden_reason) then
      raise exception 'Only admins can set or clear admin_hidden_reason';
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_enforce_admin_marker_lock_shops
before update on public.shops
for each row execute function public.enforce_admin_marker_lock();

create trigger trg_enforce_admin_marker_lock_freelancer_profiles
before update on public.freelancer_profiles
for each row execute function public.enforce_admin_marker_lock();

create trigger trg_enforce_admin_marker_lock_job_posts
before update on public.job_posts
for each row execute function public.enforce_admin_marker_lock();

-- Extend admin_hide_content with 'shop', 'freelancer_profile', 'job_post' branches.
-- The new branches DO NOT touch status — moderation is encoded purely via admin_hidden_at.
create or replace function public.admin_hide_content(target_type text, target_id uuid, reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Forbidden: admin access required';
  end if;
  if reason is null or btrim(reason) = '' then
    raise exception 'A moderation reason is required';
  end if;

  if target_type = 'product' then
    update public.products
      set status = 'hidden',
          admin_hidden_at = now(),
          admin_hidden_reason = btrim(reason)
      where id = target_id and admin_hidden_at is null;
    if not found then raise exception 'Product not found or already moderated'; end if;

  elsif target_type = 'service' then
    update public.service_listings
      set status = 'hidden',
          admin_hidden_at = now(),
          admin_hidden_reason = btrim(reason)
      where id = target_id and admin_hidden_at is null;
    if not found then raise exception 'Service not found or already moderated'; end if;

  elsif target_type = 'shop' then
    update public.shops
      set admin_hidden_at = now(),
          admin_hidden_reason = btrim(reason)
      where id = target_id and admin_hidden_at is null;
    if not found then raise exception 'Shop not found or already moderated'; end if;

  elsif target_type = 'freelancer_profile' then
    update public.freelancer_profiles
      set admin_hidden_at = now(),
          admin_hidden_reason = btrim(reason)
      where id = target_id and admin_hidden_at is null;
    if not found then raise exception 'Freelancer profile not found or already moderated'; end if;

  elsif target_type = 'job_post' then
    update public.job_posts
      set admin_hidden_at = now(),
          admin_hidden_reason = btrim(reason)
      where id = target_id and admin_hidden_at is null;
    if not found then raise exception 'Job post not found or already moderated'; end if;

  else
    raise exception 'Unsupported target_type for moderation: %', target_type;
  end if;
end;
$$;

create or replace function public.admin_unhide_content(target_type text, target_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Forbidden: admin access required';
  end if;

  if target_type = 'product' then
    update public.products
      set status = 'active',
          admin_hidden_at = null,
          admin_hidden_reason = null
      where id = target_id and admin_hidden_at is not null;
    if not found then raise exception 'Product not found or not currently moderated'; end if;

  elsif target_type = 'service' then
    update public.service_listings
      set status = 'active',
          admin_hidden_at = null,
          admin_hidden_reason = null
      where id = target_id and admin_hidden_at is not null;
    if not found then raise exception 'Service not found or not currently moderated'; end if;

  elsif target_type = 'shop' then
    update public.shops
      set admin_hidden_at = null,
          admin_hidden_reason = null
      where id = target_id and admin_hidden_at is not null;
    if not found then raise exception 'Shop not found or not currently moderated'; end if;

  elsif target_type = 'freelancer_profile' then
    update public.freelancer_profiles
      set admin_hidden_at = null,
          admin_hidden_reason = null
      where id = target_id and admin_hidden_at is not null;
    if not found then raise exception 'Freelancer profile not found or not currently moderated'; end if;

  elsif target_type = 'job_post' then
    update public.job_posts
      set admin_hidden_at = null,
          admin_hidden_reason = null
      where id = target_id and admin_hidden_at is not null;
    if not found then raise exception 'Job post not found or not currently moderated'; end if;

  else
    raise exception 'Unsupported target_type for moderation: %', target_type;
  end if;
end;
$$;

comment on function public.enforce_admin_marker_lock() is
  'BEFORE UPDATE trigger function on shops, freelancer_profiles, and job_posts. Prevents non-admins from setting/clearing admin_hidden_at or admin_hidden_reason. Simpler than enforce_admin_moderation_lock (used by products/service_listings) because these tables do not have a status column to also protect.';
comment on column public.shops.admin_hidden_at is
  'Set by admin_hide_content() when admin moderates this shop. NULL = visible. NOT NULL = admin moderated; public surfaces must filter admin_hidden_at IS NULL.';
comment on column public.freelancer_profiles.admin_hidden_at is
  'Set by admin_hide_content() when admin moderates this freelancer profile. NULL = visible. NOT NULL = admin moderated; public surfaces must filter admin_hidden_at IS NULL.';
comment on column public.job_posts.admin_hidden_at is
  'Set by admin_hide_content() when admin moderates this job post. NULL = visible (subject to status). NOT NULL = admin moderated; public surfaces must filter admin_hidden_at IS NULL in addition to status.';
