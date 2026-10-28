-- enforce_job_post_skills_lock: read response_count under a row lock.
-- Follow-up: « LOW (Sonnet review of #76) — the skills lock can race a response »
-- (docs/follow-ups/live-suite-teardown-guard.md). Standards-reference Section 3 A04.
--
-- Live before this migration (verified 2026-10-28): the function reads job_posts.response_count with a
-- plain SELECT. check_job_response_limits locks the post FOR UPDATE and the AFTER ROW counter bumps
-- response_count, but until that transaction commits a concurrent skill insert / delete by the poster sees
-- the old 0 and passes -- the post's skills change after a freelancer has answered.
--
-- After: FOR SHARE waits for an in-flight response's transaction (it holds FOR UPDATE on the post) and then
-- reads the committed count. The skill FK check already takes FOR KEY SHARE on the same row, so no new
-- lock ordering is introduced: both paths lock the post first. Body = live definition (2026-10-28) with
-- only « for share » added.
-- Not provable deterministically through PostgREST (each request is its own transaction, so a test cannot
-- hold a response uncommitted); verified by reading the definition after apply.

create or replace function public.enforce_job_post_skills_lock()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_post_id uuid := case when tg_op = 'DELETE' then old.job_post_id else new.job_post_id end;
  v_count   integer;
begin
  if (select auth.uid()) is null then
    return case when tg_op = 'DELETE' then old else new end;
  end if;
  select jp.response_count into v_count from public.job_posts jp where jp.id = v_post_id for share;
  if found and v_count > 0 then
    raise exception 'Cette annonce a déjà reçu des propositions : son contenu ne peut plus être modifié.'
      using errcode = '42501', hint = 'content_locked';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$function$;

-- CREATE OR REPLACE keeps the owner and ACL (no client EXECUTE, migration 76).

-- ─── ROLLBACK (do not run as part of this migration) ───────────────────────────────────────────
-- Per README "Rollback paths": apply as a NEW dated forward migration, never by deleting this file.
-- Re-create the function with the body above minus « for share » (migration 20261027203831's body).
