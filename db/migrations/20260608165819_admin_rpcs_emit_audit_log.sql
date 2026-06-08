-- Update the four admin SECURITY DEFINER RPCs (admin_hide_content,
-- admin_unhide_content, admin_suspend_user, admin_unsuspend_user) to call
-- log_admin_action() after their successful mutation. Logging at the DB
-- level for these centralizes the audit trail in the same transaction as
-- the mutation — if the log insert fails, the whole operation rolls back.
--
-- Report and dispute actions (claim/resolve/dismiss) are app-level UPDATEs
-- against the reports / disputes tables; their audit logging happens in
-- the server action code after the UPDATE succeeds. See actions.ts in
-- /admin/signalements and /admin/litiges in PR-T's app-side commit.

create or replace function public.admin_hide_content(target_type text, target_id uuid, reason text)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_log_action text;
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

  -- Audit log the moderation action. Same transaction; failure rolls back the hide.
  v_log_action := 'hide_content_' || target_type;
  perform public.log_admin_action(
    p_action       => v_log_action,
    p_target_type  => target_type,
    p_target_id    => target_id,
    p_before_state => jsonb_build_object('admin_hidden_at', null),
    p_after_state  => jsonb_build_object('admin_hidden_at', now(), 'admin_hidden_reason', btrim(reason)),
    p_note         => btrim(reason)
  );
end;
$function$;

create or replace function public.admin_unhide_content(target_type text, target_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_log_action text;
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

  -- Audit log the unmoderation. Same transaction.
  v_log_action := 'unhide_content_' || target_type;
  perform public.log_admin_action(
    p_action       => v_log_action,
    p_target_type  => target_type,
    p_target_id    => target_id,
    p_before_state => jsonb_build_object('admin_hidden_at', 'set'),
    p_after_state  => jsonb_build_object('admin_hidden_at', null),
    p_note         => null
  );
end;
$function$;

create or replace function public.admin_suspend_user(target_user_id uuid, reason text)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
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

  -- Audit log the suspension. Same transaction.
  perform public.log_admin_action(
    p_action       => 'suspend_user',
    p_target_type  => 'user',
    p_target_id    => target_user_id,
    p_before_state => jsonb_build_object('suspended_at', null),
    p_after_state  => jsonb_build_object('suspended_at', now(), 'suspended_reason', btrim(reason)),
    p_note         => btrim(reason)
  );
end;
$function$;

create or replace function public.admin_unsuspend_user(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
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

  -- Audit log the unsuspension.
  perform public.log_admin_action(
    p_action       => 'unsuspend_user',
    p_target_type  => 'user',
    p_target_id    => target_user_id,
    p_before_state => jsonb_build_object('suspended_at', 'set'),
    p_after_state  => jsonb_build_object('suspended_at', null),
    p_note         => null
  );
end;
$function$;
