-- Missions M-B -- a freelancer can read the posts they answered after those posts close (gap G2). Source:
-- docs/design/h9-h13-measurements.md section 6.4 (G2), section 9 (M-B) and decision D3, on feat/h9-missions
-- (c7f54c1); P2-2 (2026-10-26): a policy helper is granted explicitly and its policy is scoped to
-- authenticated. Unblocks H11's « Fermées » tab and two stat tiles, H13's refresh after a post closes, and
-- the dashboard's « Activité récente » rows that render with a null title today.
--
-- Live on 2026-10-26 (after migrations 67-69):
--   * job_posts SELECT = "Open posts or own posts readable" (PUBLIC: open and not moderated, or own) +
--     "Admin reads all job_posts" (authenticated). A freelancer's response to a post that is then filled or
--     expires keeps pointing at a post they can no longer read; job_post_skills follows job_posts (EXISTS).
--   * job_responses SELECT = responder, or the post owner via EXISTS on job_posts -- so a job_posts policy
--     that selected job_responses directly would recurse (42P17). Hence a SECURITY DEFINER helper, which
--     reads job_responses as its owner, without RLS.
--   * 8 posts (7 open, 1 filled); 0 posts would become newly visible today (no closed post has a response).
--
-- After it, a signed-in freelancer also reads every post they answered while it is not deleted and not
-- moderated -- open, filled or expired -- and its skills with it (job_post_skills' policy delegates to
-- job_posts). Nothing changes for anon (the policy is TO authenticated, so anon never evaluates the helper
-- and needs no EXECUTE), for owners or for admins. No write path changes.
--
-- has_responded(uuid) answers only about the caller's own responses ((select auth.uid())), so exposing it
-- as an RPC to authenticated reveals nothing the caller cannot already read from job_responses. EXECUTE is
-- explicit (migration 68 closed the defaults): authenticated only -- the policy is evaluated with the
-- caller's EXECUTE, so without the grant every authenticated read of job_posts would fail.
-- Cost: one unique-index probe on job_responses (job_post_id, freelancer_id) per post row an authenticated
-- reader scans; the open branch of the existing policy still answers the board's rows on its own.

create or replace function public.has_responded(p_job_post_id uuid)
returns boolean
language sql
stable
security definer
set search_path to ''
as $function$
  select exists (
    select 1
      from public.job_responses jr
     where jr.job_post_id = p_job_post_id
       and jr.freelancer_id = (select auth.uid())
  );
$function$;

revoke execute on function public.has_responded(uuid) from public, anon, authenticated;
grant execute on function public.has_responded(uuid) to authenticated;

create policy "Responders read the posts they answered" on public.job_posts
  for select to authenticated
  using (status <> 'deleted' and admin_hidden_at is null and public.has_responded(id));

-- Post-apply verification:
--   1. select proname, has_function_privilege('anon', oid, 'EXECUTE'), has_function_privilege('authenticated', oid, 'EXECUTE')
--        from pg_proc where proname = 'has_responded';                                  -- f / t
--   2. the new policy: cmd r, roles {authenticated}; advisors 0028 unchanged (3), 0029 = 11 (has_responded
--      is a SECURITY DEFINER function authenticated may execute, by design).
--   3. in a rolled-back transaction as a freelancer JWT that answered an open post: update the post to
--      'filled' (service role), then `select id from job_posts where id = …` returns it, and so does its
--      job_post_skills; as another freelancer, and as anon, 0 rows; no 42P17 on job_responses reads by the
--      post owner or the responder.
--
-- Rollback:
--   drop policy "Responders read the posts they answered" on public.job_posts;
--   drop function public.has_responded(uuid);
