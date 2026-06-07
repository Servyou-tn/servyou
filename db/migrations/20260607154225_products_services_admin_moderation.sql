-- Admin moderation columns: layered on top of the existing status='hidden' seller-side feature.
-- Distinguishes "seller hid their own product" (status='hidden', admin_hidden_at NULL)
-- from "admin moderated" (status='hidden', admin_hidden_at NOT NULL).
alter table public.products
  add column admin_hidden_at      timestamptz null,
  add column admin_hidden_reason  text        null;

alter table public.service_listings
  add column admin_hidden_at      timestamptz null,
  add column admin_hidden_reason  text        null;

-- A moderated row must carry a non-empty reason (visible to admins on the report detail page).
alter table public.products
  add constraint products_admin_moderation_requires_reason
  check (admin_hidden_at is null or admin_hidden_reason is not null);

alter table public.service_listings
  add constraint service_listings_admin_moderation_requires_reason
  check (admin_hidden_at is null or admin_hidden_reason is not null);

-- Shared trigger function: prevents non-admins from setting/clearing the admin marker
-- and prevents owners from unhiding (status hidden -> any other) content that admin has moderated.
create or replace function public.enforce_admin_moderation_lock()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Only admins can change admin_hidden_at or admin_hidden_reason.
  if not public.is_admin() then
    if (old.admin_hidden_at is distinct from new.admin_hidden_at) then
      raise exception 'Only admins can set or clear admin_hidden_at';
    end if;
    if (old.admin_hidden_reason is distinct from new.admin_hidden_reason) then
      raise exception 'Only admins can set or clear admin_hidden_reason';
    end if;
  end if;

  -- Owners cannot unhide content that admin has moderated.
  -- They must contact support (admin clears the marker via admin_unhide_content).
  if old.admin_hidden_at is not null
     and old.status = 'hidden'
     and new.status <> 'hidden'
     and not public.is_admin() then
    raise exception 'Cannot change status of admin-moderated content; contact support';
  end if;

  return new;
end;
$$;

create trigger trg_enforce_admin_moderation_lock_products
before update on public.products
for each row execute function public.enforce_admin_moderation_lock();

create trigger trg_enforce_admin_moderation_lock_service_listings
before update on public.service_listings
for each row execute function public.enforce_admin_moderation_lock();

-- Admin hide function: sets status='hidden' + admin metadata. SECURITY DEFINER bypasses
-- owner-only UPDATE RLS, but the trigger above still fires and validates the admin path.
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
    if not found then
      raise exception 'Product not found or already moderated';
    end if;
  elsif target_type = 'service' then
    update public.service_listings
      set status = 'hidden',
          admin_hidden_at = now(),
          admin_hidden_reason = btrim(reason)
      where id = target_id and admin_hidden_at is null;
    if not found then
      raise exception 'Service not found or already moderated';
    end if;
  else
    raise exception 'Unsupported target_type for moderation: %', target_type;
  end if;
end;
$$;

revoke all on function public.admin_hide_content(text, uuid, text) from public;
grant execute on function public.admin_hide_content(text, uuid, text) to authenticated;

-- Admin unhide function: clears the moderation marker and restores status='active'.
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
    if not found then
      raise exception 'Product not found or not currently moderated';
    end if;
  elsif target_type = 'service' then
    update public.service_listings
      set status = 'active',
          admin_hidden_at = null,
          admin_hidden_reason = null
      where id = target_id and admin_hidden_at is not null;
    if not found then
      raise exception 'Service not found or not currently moderated';
    end if;
  else
    raise exception 'Unsupported target_type for moderation: %', target_type;
  end if;
end;
$$;

revoke all on function public.admin_unhide_content(text, uuid) from public;
grant execute on function public.admin_unhide_content(text, uuid) to authenticated;

comment on column public.products.admin_hidden_at is
  'Set by admin_hide_content() when admin moderates this product. NULL = not admin-moderated (seller may still have hidden it themselves via status). NOT NULL = admin moderated; only admin can unhide via admin_unhide_content().';
comment on column public.service_listings.admin_hidden_at is
  'Set by admin_hide_content() when admin moderates this service. NULL = not admin-moderated (seller may still have hidden it themselves via status). NOT NULL = admin moderated; only admin can unhide via admin_unhide_content().';
comment on function public.enforce_admin_moderation_lock() is
  'BEFORE UPDATE trigger function on products and service_listings. Prevents non-admins from setting/clearing admin_hidden_at or admin_hidden_reason, and prevents owners from changing status away from hidden when admin has moderated. SECURITY DEFINER required so is_admin() resolves correctly inside the trigger.';
comment on function public.admin_hide_content(text, uuid, text) is
  'Admin-gated content hide. Sets status=hidden + admin_hidden_at=now() + trimmed reason on the target product or service. Errors if caller is not admin, reason is empty, target_type is unsupported, target is missing, or target is already moderated. SECURITY DEFINER.';
comment on function public.admin_unhide_content(text, uuid) is
  'Admin-gated content unhide. Clears admin_hidden_at/reason and restores status=active. Errors if caller is not admin, target is missing, or target is not currently moderated. SECURITY DEFINER.';
