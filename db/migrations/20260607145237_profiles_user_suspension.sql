-- Suspension columns on profiles. NULL = active; NOT NULL = suspended.
alter table public.profiles
  add column suspended_at      timestamptz null,
  add column suspended_reason  text        null;

-- A suspended profile must carry a non-empty reason that the user sees at signin.
alter table public.profiles
  add constraint profiles_suspension_requires_reason
  check (suspended_at is null or suspended_reason is not null);

-- Admin can read all profiles for moderation. Pre-existing owner-only SELECT remains in effect.
create policy "Admin reads all profiles" on public.profiles
  for select to authenticated
  using (public.is_admin());

-- Admin suspend function: SECURITY DEFINER bypasses owner-only profile RLS for the controlled UPDATE.
create or replace function public.admin_suspend_user(target_user_id uuid, reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Forbidden: admin access required';
  end if;
  if target_user_id = auth.uid() then
    raise exception 'Admins cannot suspend themselves';
  end if;
  if reason is null or btrim(reason) = '' then
    raise exception 'A suspension reason is required';
  end if;
  update public.profiles
    set suspended_at = now(),
        suspended_reason = btrim(reason)
    where id = target_user_id
      and suspended_at is null;
  if not found then
    raise exception 'User not found or already suspended';
  end if;
end;
$$;

revoke all on function public.admin_suspend_user(uuid, text) from public;
grant execute on function public.admin_suspend_user(uuid, text) to authenticated;

-- Admin unsuspend function.
create or replace function public.admin_unsuspend_user(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Forbidden: admin access required';
  end if;
  update public.profiles
    set suspended_at = null,
        suspended_reason = null
    where id = target_user_id
      and suspended_at is not null;
  if not found then
    raise exception 'User not found or not currently suspended';
  end if;
end;
$$;

revoke all on function public.admin_unsuspend_user(uuid) from public;
grant execute on function public.admin_unsuspend_user(uuid) to authenticated;

comment on column public.profiles.suspended_at is
  'Timestamp set when an admin suspends the user via admin_suspend_user(). NULL = active account. NOT NULL = suspended (blocks platform use at the application layer via the auth/layout check).';
comment on column public.profiles.suspended_reason is
  'Required reason string set when an admin suspends the user. Shown to the user at signin and visible in the admin user detail page.';
comment on function public.admin_suspend_user(uuid, text) is
  'Admin-gated suspension. Sets suspended_at = now() and trimmed suspended_reason on the target user. Errors if caller is not admin, reason is empty, target is the caller (no self-suspend), or target is already suspended. SECURITY DEFINER bypasses owner-only profile RLS.';
comment on function public.admin_unsuspend_user(uuid) is
  'Admin-gated unsuspension. Clears suspended_at and suspended_reason. Errors if caller is not admin or target is not currently suspended.';
