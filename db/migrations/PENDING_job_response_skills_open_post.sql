-- job_response_skills: writable only while the post is open (and only by the responder, checked first).
-- Follow-ups: « LOW — a responder can still add / remove job_response_skills after the post closes »
-- (docs/follow-ups/live-suite-teardown-guard.md, migration 76) and « LOW — the 8-skill limit is checked
-- before RLS on job_response_skills » (docs/follow-ups/missions-m-c-proposal-fields-typed-response-errors.md).
-- Standards-reference Section 3 A01 / A04.
--
-- Live before this migration (verified 2026-10-28):
--   * « Responder adds skills to own response » (INSERT) and « Responder removes skills from own response »
--     (DELETE) check only jr.freelancer_id = auth.uid(). Nothing reads the post, so a freelancer reshapes
--     the proposal on a filled / deleted / expired / moderated post -- the same window migration 76 closed
--     for job_responses DELETE (« Freelancer withdraws own response while the post is open »).
--   * enforce_job_response_skills_limit (BEFORE INSERT, SECURITY DEFINER) runs before RLS's WITH CHECK, so a
--     non-responder who holds a response id learns « 8 compétences » instead of the RLS refusal.
--   * 1 job_response_skills row, 4 job_responses, 0 closed posts with a response. No row is rewritten.
--
-- The window is the withdrawal policy's exact predicate: status = 'open', admin_hidden_at is null,
-- created_at within 30 days (a stored-'open' post past 30 days is expired to the app; 5 live).
-- JWT callers only, admins included (decision 7 of migration 76); no-JWT callers (service role,
-- fixtures, migrations, FK cascades from account deletion) bypass.
-- Trigger name sorts BEFORE trg_enforce_job_response_skills_limit, so ownership is checked before the count.
-- A DELETE cascaded from a withdrawn response finds no parent response and passes (same shape as
-- enforce_job_post_skills_lock). A non-owner's DELETE never reaches the trigger: RLS USING filters it.

create or replace function public.enforce_job_response_skills_window()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_response_id uuid := case when tg_op = 'DELETE' then old.job_response_id else new.job_response_id end;
  v_freelancer  uuid;
  v_post        uuid;
begin
  if (select auth.uid()) is null then
    return case when tg_op = 'DELETE' then old else new end;
  end if;

  select jr.freelancer_id, jr.job_post_id
    into v_freelancer, v_post
    from public.job_responses jr
   where jr.id = v_response_id;
  if not found then
    -- INSERT: the FK raises 23503 next. DELETE: cascade from a response that is already gone.
    return case when tg_op = 'DELETE' then old else new end;
  end if;

  if v_freelancer is distinct from (select auth.uid()) then
    raise exception 'Vous ne pouvez modifier que vos propres propositions.'
      using errcode = '42501', hint = 'not_self';
  end if;

  if not exists (
    select 1 from public.job_posts jp
     where jp.id = v_post
       and jp.status = 'open'
       and jp.admin_hidden_at is null
       and jp.created_at >= now() - interval '30 days'
  ) then
    raise exception 'Cette annonce n''est plus ouverte : votre proposition ne peut plus être modifiée.'
      using errcode = '42501', hint = 'proposal_locked';
  end if;

  return case when tg_op = 'DELETE' then old else new end;
end;
$function$;

-- P2-1: a trigger function needs no client EXECUTE (trigger firing does not check it).
revoke execute on function public.enforce_job_response_skills_window() from public, anon, authenticated;

create trigger trg_check_job_response_skills_window
  before insert or delete on public.job_response_skills
  for each row execute function public.enforce_job_response_skills_window();

comment on function public.enforce_job_response_skills_window() is
  'JWT callers: own response first (not_self), then the post must be open, unmoderated and within 30 days (proposal_locked) -- the withdrawal window of migration 76. Fires before trg_enforce_job_response_skills_limit.';

-- ─── ROLLBACK (do not run as part of this migration) ───────────────────────────────────────────
-- Per README "Rollback paths": apply as a NEW dated forward migration, never by deleting this file.
--
-- drop trigger if exists trg_check_job_response_skills_window on public.job_response_skills;
-- drop function if exists public.enforce_job_response_skills_window();
