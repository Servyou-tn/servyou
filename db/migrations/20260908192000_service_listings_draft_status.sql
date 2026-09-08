-- H6 (the service-creation wizard) will insert service_listings rows with status='draft' so an
-- in-progress service survives leaving the wizard instead of publishing early or being lost. This
-- widens the status domain ahead of H6 shipping, because H5 (Mes services) and admin moderation
-- both need to handle 'draft' correctly the moment it becomes reachable -- not discovered after the
-- fact. Without the accompanying admin_hide_content guard below, a freelancer's unpublished draft
-- would become admin-hidden-and-moderated the first time a report (mistakenly, or via a future bug)
-- targeted one: same coercion class as validateServiceInput defaulting an unrecognized status to
-- 'active' -- a function with no awareness of the new status defaults to the one that publishes.

alter table public.service_listings
  drop constraint if exists service_listings_status_check;

alter table public.service_listings
  add constraint service_listings_status_check
  check (status in ('active', 'hidden', 'draft'));

comment on constraint service_listings_status_check on public.service_listings is
  'active = live and buyer-visible. hidden = paused, by the owner or by admin moderation -- admin_hidden_at distinguishes which. draft = created but never published by the owner, never buyer-visible; set only by H6 (the service-creation wizard) on an in-progress listing.';

-- admin_hide_content: add the draft guard to the service branch only (products has no 'draft'
-- status to guard against -- its CHECK is still ('active','hidden','sold_out')). Reachability is low
-- today (a draft is never publicly visible, so no report can target one), but the function is
-- SECURITY DEFINER, so the guard belongs at the same layer as the rest of its validation, not left
-- for the app layer to maybe remember. Reuses the exact same "not found or already moderated"
-- exception text the pre-existing already-moderated case raises, so the caller-facing error stays
-- uninformative about which guard tripped and actions.ts's translateModerationError() keeps mapping
-- it to admin.moderation.error_already_moderated unchanged -- no app-code or i18n change needed for
-- this half. admin_unhide_content is intentionally NOT touched here -- see the PR description.
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
      where id = target_id and admin_hidden_at is null and status <> 'draft';
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

comment on function public.admin_hide_content(text, uuid, text) is
  'Admin-gated content hide. Sets status=hidden + admin_hidden_at=now() + trimmed reason on the target product or service (admin_hidden_at only, no status column, for shop/freelancer_profile/job_post). The service branch also excludes status=''draft'': a draft has never been published by its owner, so admin moderation must not be the thing that first changes its status. Errors (uniformly "not found or already moderated") if caller is not admin, reason is empty, target_type is unsupported, target is missing, is already moderated, or (service only) is a draft. SECURITY DEFINER.';
