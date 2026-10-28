-- check_job_response_limits: a response to a suspended poster's post does not count toward the 5-active cap.
-- Founder ruling 5c (2026-10-28) on the gap logged by batch 2 (docs/follow-ups/security-followups-batch-2.md
-- « LOW — suspended posters still use up cap slots »). Standards-reference Section 3 A04.
--
-- Live before this migration (verified 2026-10-28, after migration 20261028201745): a new response to a
-- suspended poster's post is refused (job_unavailable), but responses the freelancer gave BEFORE the suspension
-- still count as « active » (post open, unmoderated, < 30 days), so a poster's suspension can lock freelancers out
-- of answering anyone else. 0 suspended accounts live; no row is rewritten.
--
-- After: the active count also requires the post's consumer not to be suspended -- the same treatment the count
-- already gives a moderated post (admin_hidden_at is null). When the poster is unsuspended, those responses count
-- again (computed at insert time; nothing is stored).
-- Re-created from its live definition by a guarded DO block (migration 76's 9a pattern): the anchor -- the end of
-- the cap query plus the cap test -- must occur exactly once; every other byte stays identical.
-- Note: the app's own « active proposals » counters (H11) do not read suspension; they may show one more active
-- proposal than the database counts while a poster is suspended (logged, cosmetic).

do $do$
declare
  v_def    text := pg_get_functiondef('public.check_job_response_limits()'::regprocedure);
  v_anchor text := E'     and jp.created_at >= (now() - interval ''30 days'');\n\n  if v_active >= 5 then';
  v_new    text := E'     and jp.created_at >= (now() - interval ''30 days'')\n'
               || E'     -- Ruling 5c (2026-10-28): a suspended poster''s post no longer holds a cap slot.\n'
               || E'     and not exists (select 1 from public.profiles cp\n'
               || E'                      where cp.id = jp.consumer_id and cp.suspended_at is not null);\n\n'
               || E'  if v_active >= 5 then';
begin
  if (length(v_def) - length(replace(v_def, v_anchor, ''))) / length(v_anchor) <> 1 then
    raise exception 'cap anchor not found exactly once -- live definition changed, aborting';
  end if;
  execute replace(v_def, v_anchor, v_new);
end
$do$;

-- CREATE OR REPLACE (inside pg_get_functiondef's text) keeps the owner and ACL (no client EXECUTE).

-- ─── ROLLBACK (do not run as part of this migration) ───────────────────────────────────────────
-- Per README "Rollback paths": apply as a NEW dated forward migration, never by deleting this file.
--
-- do $do$
-- declare
--   v_def text := pg_get_functiondef('public.check_job_response_limits()'::regprocedure);
--   v_new text := E'     and jp.created_at >= (now() - interval ''30 days'')\n'
--              || E'     -- Ruling 5c (2026-10-28): a suspended poster''s post no longer holds a cap slot.\n'
--              || E'     and not exists (select 1 from public.profiles cp\n'
--              || E'                      where cp.id = jp.consumer_id and cp.suspended_at is not null);\n\n'
--              || E'  if v_active >= 5 then';
-- begin
--   if position(v_new in v_def) = 0 then
--     raise exception 'block not found -- aborting rollback';
--   end if;
--   execute replace(v_def, v_new,
--     E'     and jp.created_at >= (now() - interval ''30 days'');\n\n  if v_active >= 5 then');
-- end
-- $do$;
