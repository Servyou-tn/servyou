-- Closes the PR-N moderation gap on job_posts. Existing SELECT policy is
-- ((status = 'open') OR (consumer_id = auth.uid())), which means admin (acting on a
-- report whose target is a non-open job post) can't read the row to drive the
-- moderation UI. Adds an admin-only SELECT policy OR'd on top of the existing one;
-- non-admin behavior unchanged (Postgres OR's multiple permissive SELECT policies).
-- Same pattern as PR-L's "Admin reads all orders" policy on orders.
create policy "Admin reads all job_posts"
on public.job_posts
for select
to authenticated
using (public.is_admin());

comment on policy "Admin reads all job_posts" on public.job_posts is
  'Permissive admin SELECT layered on top of the existing (status=''open'' OR consumer_id=auth.uid()) policy. Lets the admin read job posts in any status to drive the report-detail moderation UI. INSERT/UPDATE on job_posts stay gated by their own policies.';
