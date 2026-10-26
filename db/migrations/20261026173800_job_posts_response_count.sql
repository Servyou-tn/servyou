-- Missions M-A -- job_posts.response_count (gap G3) and the job_posts write lock (gap G9). Source:
-- docs/design/h9-h13-measurements.md section 6.4 (G3, G9) and section 9 (M-A), on feat/h9-missions
-- (c7f54c1); decisions D1-D2. Unblocks H9 PR-1 (board + detail, read side).
--
-- Live before this migration:
--   * H9 (competition pill, « n / 10 », the « moins de concurrence » sort), H10/H12 (« n / 10 réponses ») and
--     H13 (« N autres freelances ») need a post's response count. job_responses RLS lets a freelancer read only
--     their own rows, so the count is unreadable to them; and PostgREST cannot ORDER job_posts by an
--     aggregate of job_responses, so a view / RPC could not sort or paginate the board in SQL.
--   * anon and authenticated hold table-level INSERT and UPDATE on job_posts: every column is client-
--     writable, created_at included. The owner policies check consumer_id only, and none of the four
--     job_posts triggers guards created_at. A consumer can PATCH (or INSERT) created_at forward: the post
--     escapes check_job_response_limits' 30-day expiry, re-earns « Nouveau » and tops « Plus récentes ».
--
-- After it:
--   * job_posts.response_count integer NOT NULL DEFAULT 0, CHECK (>= 0), backfilled from job_responses.
--   * sync_job_post_response_count() maintains it, one row per response: AFTER INSERT +1, AFTER DELETE -1,
--     AFTER UPDATE OF job_post_id -1 on the old post and +1 on the new one (no client holds UPDATE on
--     job_responses today; this keeps a service-role fix or a later grant from drifting the count).
--     It is +/-1 in one UPDATE, never a recount: under READ COMMITTED a concurrent response's UPDATE waits on
--     the row lock and re-applies "+ 1" to the committed value, where a recount subquery keeps its old
--     snapshot and loses one. SECURITY DEFINER (owner postgres) because the writer is the freelancer and the
--     row is the consumer's: RLS hides it from them, and they hold no UPDATE on the column.
--   * The write lock is the orders pattern (column grants, as for orders.cancelled_at): table-level INSERT
--     and UPDATE are revoked from anon and authenticated, and authenticated gets back exactly the columns
--     the app writes -- createAnnonce's INSERT (10 columns) and the consumer's content / status UPDATE
--     (9 columns; today only status is written). Not client-writable on either path: id, created_at,
--     updated_at, admin_hidden_at, admin_hidden_reason, response_count, and consumer_id on UPDATE (RLS's
--     WITH CHECK already pinned it to the caller). Naming one fails the whole statement, before RLS and
--     before any trigger, with 42501 "permission denied for table job_posts". Admins included (their JWT is
--     authenticated); moderation writes go through admin_hide_content / admin_unhide_content, SECURITY
--     DEFINER owned by postgres, unaffected -- as are the service role, migrations and fixtures. anon keeps
--     no INSERT / UPDATE on job_posts (RLS already refused every anon write; anon DELETE is left to the
--     security PR-2 grant sweep). The grants hold only while nothing re-grants table-level INSERT / UPDATE
--     on job_posts: the PR-2 sweep must not.
--
-- Firing order of the counter's UPDATE on job_posts (it runs under the responder's JWT):
--   BEFORE statement: trg_enforce_active_user -- the freelancer is active (job_responses' own
--                     trg_enforce_active_user has just let the insert / delete through); no bypass needed.
--   BEFORE row:       job_posts_set_updated_at (updated_at = now() -- see below)
--                     -> trg_enforce_admin_marker_lock_job_posts (admin_hidden_* unchanged: passes).
--   trg_enforce_service_category_kind is UPDATE OF category_id only: not fired.
-- On job_responses: BEFORE INSERT trg_check_job_responder_capability -> trg_check_job_response_limits;
-- AFTER INSERT / DELETE / UPDATE OF job_post_id trg_sync_job_post_response_count (new).
-- Cascades: a hard-deleted post takes its responses with it, and their -1 finds the post already gone
-- (0 rows); a deleted freelancer account decrements the posts it answered (no JWT: active check bypassed).
--
-- updated_at: every response (and the backfill) bumps the post's updated_at through
-- job_posts_set_updated_at. Nothing reads job_posts.updated_at today (annonce-detail.ts maps it, no
-- screen renders it); the row did change. Flagged as a decision.
--
-- Rows rewritten: the backfill sets response_count on the 3 posts that have responses (1 each, 2026-10-26),
-- which also bumps their updated_at. No other existing row changes. None of the existing functions,
-- triggers or policies is modified.

alter table public.job_posts
  add column response_count integer not null default 0,
  add constraint job_posts_response_count_nonnegative check (response_count >= 0);

create or replace function public.sync_job_post_response_count()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
begin
  if tg_op = 'UPDATE' and new.job_post_id is not distinct from old.job_post_id then
    return null;
  end if;
  if tg_op in ('DELETE', 'UPDATE') then
    update public.job_posts set response_count = response_count - 1 where id = old.job_post_id;
  end if;
  if tg_op in ('INSERT', 'UPDATE') then
    update public.job_posts set response_count = response_count + 1 where id = new.job_post_id;
  end if;
  return null;
end;
$function$;

revoke execute on function public.sync_job_post_response_count() from public, anon, authenticated;

create trigger trg_sync_job_post_response_count
  after insert or delete or update of job_post_id on public.job_responses
  for each row execute function public.sync_job_post_response_count();

-- Backfill (the trigger now exists, and the ALTER above holds job_posts' ACCESS EXCLUSIVE lock until commit,
-- so no response can land between the count and the trigger).
update public.job_posts jp
   set response_count = s.n
  from (select job_post_id, count(*)::integer as n from public.job_responses group by job_post_id) s
 where s.job_post_id = jp.id;

-- The board: status = 'open' first, then « moins de concurrence ».
create index job_posts_status_response_count_idx on public.job_posts (status, response_count);

-- Revoking the table-level privilege also revokes every column-level one, so the grants below are the
-- complete client write surface afterwards.
revoke insert, update on public.job_posts from anon, authenticated;
grant insert (consumer_id, title, description, category_id, city, is_remote, budget_min, budget_max, deadline, status)
  on public.job_posts to authenticated;
grant update (title, description, category_id, city, is_remote, budget_min, budget_max, deadline, status)
  on public.job_posts to authenticated;

-- Post-apply verification (expected results in the README entry):
--   select grantee, privilege_type, count(*), string_agg(column_name, ', ' order by column_name)
--     from information_schema.column_privileges
--    where table_schema = 'public' and table_name = 'job_posts'
--      and grantee in ('anon', 'authenticated') and privilege_type in ('INSERT', 'UPDATE')
--    group by 1, 2;
--   -- authenticated INSERT 10, authenticated UPDATE 9, no anon row.
--   select p.id, p.response_count, (select count(*) from public.job_responses r where r.job_post_id = p.id)
--     from public.job_posts p
--    where p.response_count <> (select count(*) from public.job_responses r where r.job_post_id = p.id);
--   -- 0 rows.
--
-- Rollback (restores the exact prior state, anon's table-level INSERT / UPDATE included):
--   drop trigger trg_sync_job_post_response_count on public.job_responses;
--   drop function public.sync_job_post_response_count();
--   drop index public.job_posts_status_response_count_idx;
--   revoke insert, update on public.job_posts from authenticated;
--   grant insert, update on public.job_posts to anon, authenticated;
--   alter table public.job_posts drop column response_count;
