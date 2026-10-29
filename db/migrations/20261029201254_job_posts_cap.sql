-- job_posts: at most 5 OPEN posts per consumer at once, and at most 10 posts created per consumer per rolling 24 h.
-- Architect brief (2026-10-29) step 3, from the pre-launch security audit pass 1 finding 3
-- (docs/audits/prelaunch-security-audit-2026-10-29.md: « no per-user cap on job posts »). Same pattern as
-- migration 99 and 20261029201248_orders_rate_limit.sql (migration 100). Standards-reference Section 3 A06:2025.
--
-- Column check (verified live 2026-10-29):
--   * INSERT is column-granted (migration 67, M-A): budget_max, budget_min, category_id, city, consumer_id, deadline,
--     description, is_remote, status, title -- created_at is NOT client-writable (default now()), so the 24 h
--     window cannot be steered. status is, but enforce_job_post_writes refuses any INSERT that is not 'open'.
--   * UPDATE is column-granted too (no consumer_id, no created_at); status may move filled -> open (« rouvrir »,
--     mes-annonces/[id]/actions.ts reopenMissionAction) within 30 days. A reopen ADDS an open post, so the open cap
--     also runs on that transition. Nothing else can make a post open again (enforce_job_post_writes).
--   * trg_limit_job_posts sorts after trg_enforce_job_post_writes / trg_enforce_service_category_kind (BEFORE ROW
--     triggers fire in name order): an invalid status or transition is refused with its own error first.
--
-- Live before this migration (verified 2026-10-29): 8 posts (open 7, filled 1); the most open posts any consumer
-- has is 3, the most any consumer created in any 24 h is 3 -- nothing below rejects an existing pattern, and no row
-- is rewritten.
--
-- « Open » = status 'open' AND created_at within the 30-day life of a post (the expiry every other job rule uses:
-- check_job_response_limits, enforce_job_post_writes, JOB_POST_EXPIRY_DAYS). Decision A: a MODERATED open post
-- (admin_hidden_at set) still counts -- moderation signals abuse, and the owner can still soft-delete it
-- (status -> 'deleted' stays allowed on job_posts; no moderated-row-no-delete trigger on this table) to free the slot.
--
-- After: enforce_job_post_cap (BEFORE INSERT OR UPDATE OF status, FOR EACH ROW), for a JWT caller acting as the
-- post's consumer:
--   1. INSERT, or UPDATE moving a post to 'open' from another status: 5 open posts already -> 23514,
--      hint 'job_post_cap_open'.
--   2. INSERT only: 10 posts created by this consumer in the last 24 h, every status (deleted included) -> 23514,
--      hint 'job_post_cap_daily'.
--   Service role (auth.uid() is null) bypasses. A row whose consumer_id is not the caller is left to RLS
--   (« Consumer creates own post », WITH CHECK consumer_id = auth.uid()) without being counted. A per-consumer
--   advisory xact lock serialises count + write. The app maps both hints (FR + AR) in mes-annonces.

create or replace function public.enforce_job_post_cap()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_open   integer;
  v_recent integer;
begin
  -- Service role, SQL editor, seeds, the expiry job.
  if (select auth.uid()) is null then
    return new;
  end if;

  -- Only a write that makes a post open is capped (an edit, a close, a delete never is).
  if new.status is distinct from 'open'
     or (tg_op = 'UPDATE' and old.status is not distinct from 'open') then
    return new;
  end if;

  -- Acting in someone else's name: RLS refuses it (42501). Counting the claimed consumer would leak their volume.
  if new.consumer_id is distinct from (select auth.uid()) then
    return new;
  end if;

  perform pg_advisory_xact_lock(hashtextextended('job_posts.cap:' || new.consumer_id::text, 0));

  select count(*) into v_open
    from public.job_posts
   where consumer_id = new.consumer_id
     and status = 'open'
     and created_at >= now() - interval '30 days'
     and id is distinct from new.id;

  if v_open >= 5 then
    raise exception 'Vous avez déjà 5 annonces ouvertes. Clôturez-en une avant d''en ouvrir une autre.'
      using errcode = '23514', hint = 'job_post_cap_open';
  end if;

  if tg_op = 'INSERT' then
    select count(*) into v_recent
      from public.job_posts
     where consumer_id = new.consumer_id
       and created_at > now() - interval '24 hours';

    if v_recent >= 10 then
      raise exception 'Vous avez atteint la limite de 10 annonces par 24 heures. Réessayez plus tard.'
        using errcode = '23514', hint = 'job_post_cap_daily';
    end if;
  end if;

  return new;
end;
$$;

-- Trigger function: no client EXECUTE (not checked when a trigger fires).
revoke execute on function public.enforce_job_post_cap() from public, anon, authenticated;

create trigger trg_limit_job_posts
  before insert or update of status on public.job_posts
  for each row execute function public.enforce_job_post_cap();

-- ─── ROLLBACK (do not run as part of this migration) ───────────────────────────────────────────
-- Per README "Rollback paths": apply as a NEW dated forward migration, never by deleting this file.
--
-- drop trigger if exists trg_limit_job_posts on public.job_posts;
-- drop function if exists public.enforce_job_post_cap();
