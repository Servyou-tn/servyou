-- check_job_response_limits: no new response to a suspended account's post.
-- Founder ruling 7 (responses half, 2026-10-28) on « MEDIUM — active users can still transact with a suspended
-- account » (docs/follow-ups/suspension-enforcement.md): an active freelancer can still answer a suspended
-- consumer's open post, which also unlocked the poster's phone (that unlock is withdrawn by
-- PENDING_get_contact_phone_state_gate.sql). Standards-reference Section 3 A01.
--
-- Live before this migration (verified 2026-10-28): check_job_response_limits reads the post's status,
-- moderation, age, owner, duplicates and caps, never the poster's suspended_at; no SELECT policy reads it either
-- (0 policies). 0 suspended accounts; 4 responses; no row is rewritten.
--
-- After: a JWT caller's response to a post whose poster is suspended is refused with the same error as a
-- moderated post (23514 « Cette annonce n'est plus ouverte. », hint job_unavailable) -- it never tells the
-- freelancer the poster is suspended, and H12 already maps the hint. No-JWT callers (service role, fixtures)
-- are unchanged. Inserted right after the moderation check, i.e. under the post's FOR UPDATE lock, before any
-- other rule.
-- Re-created from its live definition by a guarded DO block (migration 76's 9a pattern): the anchor must occur
-- exactly once, every other byte stays identical.

do $do$
declare
  v_def    text := pg_get_functiondef('public.check_job_response_limits()'::regprocedure);
  v_anchor text := E'  if v_post.status <> ''open'' then\n';
  v_block  text := E'  -- Ruling 7 (2026-10-28): no new response to a suspended poster. Same error as a moderated post.\n'
                || E'  if (select auth.uid()) is not null\n'
                || E'     and exists (select 1 from public.profiles pp\n'
                || E'                  where pp.id = v_post.consumer_id and pp.suspended_at is not null) then\n'
                || E'    raise exception ''Cette annonce n''''est plus ouverte.''\n'
                || E'      using errcode = ''23514'', hint = ''job_unavailable'';\n'
                || E'  end if;\n\n';
begin
  if (length(v_def) - length(replace(v_def, v_anchor, ''))) / length(v_anchor) <> 1
     or position('pp.suspended_at' in v_def) > 0 then
    raise exception 'anchor not found exactly once (or already applied) -- live definition changed, aborting';
  end if;
  execute replace(v_def, v_anchor, v_block || v_anchor);
end
$do$;

-- CREATE OR REPLACE (inside pg_get_functiondef's text) keeps the owner and ACL (no client EXECUTE).

-- ─── ROLLBACK (do not run as part of this migration) ───────────────────────────────────────────
-- Per README "Rollback paths": apply as a NEW dated forward migration, never by deleting this file.
--
-- do $do$
-- declare
--   v_def   text := pg_get_functiondef('public.check_job_response_limits()'::regprocedure);
--   v_block text := E'  -- Ruling 7 (2026-10-28): no new response to a suspended poster. Same error as a moderated post.\n'
--                || E'  if (select auth.uid()) is not null\n'
--                || E'     and exists (select 1 from public.profiles pp\n'
--                || E'                  where pp.id = v_post.consumer_id and pp.suspended_at is not null) then\n'
--                || E'    raise exception ''Cette annonce n''''est plus ouverte.''\n'
--                || E'      using errcode = ''23514'', hint = ''job_unavailable'';\n'
--                || E'  end if;\n\n';
-- begin
--   if position(v_block in v_def) = 0 then
--     raise exception 'block not found -- aborting rollback';
--   end if;
--   execute replace(v_def, v_block, '');
-- end
-- $do$;
