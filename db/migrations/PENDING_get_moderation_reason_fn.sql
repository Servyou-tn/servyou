-- get_moderation_reason(): the moderator's note, for the row's owner or an admin only.
-- Founder ruling 9 (2026-10-28), step 1 of 2 on « admin_hidden_reason readable by owner + admin only »
-- (docs/follow-ups/live-suite-teardown-guard.md, Sonnet review of #75). Step 2, the column revoke, is
-- PENDING_moderation_reason_column_revoke.sql. Standards-reference Section 3 A01.
--
-- Purely additive and safe to apply at any time. Apply it BEFORE (or with) the app PR that calls it
-- (fix/security-followups-batch-2: admin/signalements/[id]/page.tsx), so the admin page reads the note through
-- the function from its first deploy; then regenerate database.types.ts and drop that page's rpc cast.
--
-- get_moderation_reason(target_type text, target_id uuid) returns admin_hidden_reason when the caller is an admin
-- or the row's owner (shop owner_id; product -> its shop's owner; freelancer profile_id; service listing -> its
-- freelancer profile's profile_id; job post consumer_id), else NULL. target_type uses admin_hide_content's names
-- ('shop', 'product', 'freelancer_profile', 'service', 'job_post'); anything else returns NULL. NULL for an
-- outsider, never an error: it must not confirm that a row is moderated. SECURITY DEFINER, search_path '',
-- STABLE; EXECUTE for authenticated only (an RPC the app calls; anon never needs it).

create or replace function public.get_moderation_reason(target_type text, target_id uuid)
returns text
language plpgsql
stable
security definer
set search_path to ''
as $function$
declare
  v_caller uuid := (select auth.uid());
  v_owner  uuid;
  v_reason text;
begin
  if v_caller is null then
    return null;
  end if;

  if target_type = 'shop' then
    select s.owner_id, s.admin_hidden_reason into v_owner, v_reason
      from public.shops s where s.id = target_id;
  elsif target_type = 'product' then
    select s.owner_id, p.admin_hidden_reason into v_owner, v_reason
      from public.products p join public.shops s on s.id = p.shop_id where p.id = target_id;
  elsif target_type = 'freelancer_profile' then
    select fp.profile_id, fp.admin_hidden_reason into v_owner, v_reason
      from public.freelancer_profiles fp where fp.id = target_id;
  elsif target_type = 'service' then
    select fp.profile_id, sl.admin_hidden_reason into v_owner, v_reason
      from public.service_listings sl join public.freelancer_profiles fp on fp.id = sl.freelancer_profile_id
     where sl.id = target_id;
  elsif target_type = 'job_post' then
    select jp.consumer_id, jp.admin_hidden_reason into v_owner, v_reason
      from public.job_posts jp where jp.id = target_id;
  else
    return null;
  end if;

  if v_owner = v_caller or public.is_admin() then
    return v_reason;
  end if;
  return null;
end;
$function$;

revoke execute on function public.get_moderation_reason(text, uuid) from public, anon;
grant execute on function public.get_moderation_reason(text, uuid) to authenticated;

comment on function public.get_moderation_reason(text, uuid) is
  'The moderator''s note on a shop / product / freelancer_profile / service / job_post, for its owner or an admin; NULL for anyone else. The column itself loses its client SELECT grant in the follow-up migration (founder ruling 9, 2026-10-28).';

-- ─── ROLLBACK (do not run as part of this migration) ───────────────────────────────────────────
-- Per README "Rollback paths": apply as a NEW dated forward migration, never by deleting this file.
-- Only after rolling back the column revoke (the admin page reads the note through this function).
--
-- drop function if exists public.get_moderation_reason(text, uuid);
