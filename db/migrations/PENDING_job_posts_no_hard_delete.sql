-- Job posts are never hard-deleted by a client: every delete goes through status 'deleted'.
-- Founder decision B (2026-10-27) on decision 11 of migration 76's review (docs/follow-ups.md « Consumer
-- hard-DELETE of an answered post »). Standards-reference Section 3 A01 / A04.
--
-- Live before this migration: authenticated holds table-level DELETE on job_posts and the policy
-- "Consumer deletes own post" is `consumer_id = auth.uid()` (PUBLIC). job_responses.job_post_id and
-- job_post_skills.job_post_id are ON DELETE CASCADE, so one REST DELETE on an answered post erased every
-- freelancer's proposal (and its skills) -- bypassing migration 76's soft-delete rules entirely (deleted is
-- terminal; content frozen once answered). The app never hard-deletes: deleteMissionAction sets
-- status = 'deleted'. No function deletes job_posts.
--
-- After: no client can DELETE a job post (42501 "permission denied for table job_posts" -- the privilege is
-- checked before RLS, so the refusal is explicit, not a silent 0-row result). Soft delete is unchanged.
-- Unchanged on purpose: the cascade path. Account deletion (auth.users -> profiles -> job_posts ->
-- job_responses / job_post_skills) runs as the FK's referential actions, which do not check the caller's
-- table privileges or RLS, and the service role keeps DELETE for admin data fixes and test fixtures.
-- anon holds no DELETE on job_posts already (migration 68). Rows touched: 0.

drop policy "Consumer deletes own post" on public.job_posts;

revoke delete on public.job_posts from authenticated;

-- ─── ROLLBACK (do not run as part of this migration) ───────────────────────────────────────────
-- Per README "Rollback paths": apply as a NEW dated forward migration, never by deleting this file.
--
-- grant delete on public.job_posts to authenticated;
-- create policy "Consumer deletes own post" on public.job_posts for delete
--   using (consumer_id = auth.uid());
