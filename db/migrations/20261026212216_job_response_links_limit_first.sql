-- M-C hardening -- check the portfolio-links shape before the per-link loop and before the post lock.
-- docs/follow-ups.md « LOW→MEDIUM — the per-link loop runs before the 3-link CHECK, under the post lock »
-- (Sonnet review of PR #204; architect: its own migration, 2026-10-26).
--
-- Live since migration 69 (20261026195409):
--   * BEFORE INSERT triggers on job_responses fire alphabetically: trg_check_job_responder_capability ->
--     trg_check_job_response_limits (locks the post FOR UPDATE, then a per-freelancer advisory lock) ->
--     trg_enforce_job_response_fields (the per-link loop). The `<= 3` rule lives only in the CHECK
--     job_responses_portfolio_links_shape, which runs after every BEFORE trigger.
--   * So a freelancer can send thousands of distinct valid links: the loop is O(n²) (text[] append + = any)
--     and runs while that post's row lock is held, until statement_timeout -- other responders and the owner's
--     updates stall, and the attempt is repeatable (the statement rolls back).
--
-- After it:
--   * The trigger is renamed trg_check_job_response_fields, so it sorts between
--     trg_check_job_responder_capability and trg_check_job_response_limits: link validation runs BEFORE any
--     lock is taken.
--   * The function refuses a non-array or an array of more than 3 up front, with exactly the error the CHECK
--     raises (23514, same message naming job_responses_portfolio_links_shape), so H12's mapping and the M-C
--     suite are unaffected; the loop then sees at most 3 elements. Everything else is unchanged; the CHECK
--     stays as the backstop for the service role and any later write path.
--   Firing order on INSERT after it: trg_enforce_active_user (statement) -> trg_check_job_responder_capability
--   -> trg_check_job_response_fields -> trg_check_job_response_limits -> row (CHECKs) ->
--   trg_sync_job_post_response_count.

create or replace function public.enforce_job_response_fields()
returns trigger
language plpgsql
set search_path to ''
as $function$
declare
  v_link jsonb;
  v_url  text;
  v_bad  boolean;
  v_seen text[] := '{}';
begin
  -- NULL: the NOT NULL constraint names it.
  if new.portfolio_links is null then
    return new;
  end if;
  -- The shape first, in O(1), with the CHECK's own error -- never loop over an oversized array.
  if jsonb_typeof(new.portfolio_links) <> 'array' or jsonb_array_length(new.portfolio_links) > 3 then
    raise exception 'new row for relation "job_responses" violates check constraint "job_responses_portfolio_links_shape"'
      using errcode = '23514', constraint = 'job_responses_portfolio_links_shape';
  end if;
  for v_link in select value from jsonb_array_elements(new.portfolio_links) loop
    -- Sequential, not one OR chain: SQL does not promise short-circuit evaluation, and
    -- jsonb_object_keys() raises on a non-object.
    v_bad := jsonb_typeof(v_link) is distinct from 'object';
    if not v_bad then
      v_url := v_link ->> 'url';
      v_bad := exists (select 1 from jsonb_object_keys(v_link) k where k not in ('url', 'label'))
            or jsonb_typeof(v_link -> 'url') is distinct from 'string';
    end if;
    if not v_bad then
      v_bad := v_url !~* '^https?://[^[:space:]]+$'
            or char_length(v_url) > 500
            or coalesce(jsonb_typeof(v_link -> 'label'), 'null') not in ('string', 'null')
            or char_length(coalesce(v_link ->> 'label', '')) > 60
            or lower(v_url) = any (v_seen);
    end if;
    if v_bad then
      raise exception 'Les liens de réalisations sont invalides.'
        using errcode = '23514', hint = 'invalid_links';
    end if;
    v_seen := v_seen || lower(v_url);
  end loop;
  return new;
end;
$function$;

alter trigger trg_enforce_job_response_fields on public.job_responses rename to trg_check_job_response_fields;

-- Post-apply verification:
--   1. select tgname from pg_trigger where tgrelid = 'public.job_responses'::regclass and not tgisinternal
--      order by tgname;  -- trg_check_job_responder_capability, trg_check_job_response_fields,
--                        -- trg_check_job_response_limits, trg_enforce_active_user, trg_sync_job_post_response_count
--   2. as a freelancer JWT (rolled back): 4 links -> 23514 naming job_responses_portfolio_links_shape;
--      5 000 distinct links -> the same error, immediately; a javascript: link -> hint invalid_links.
--   3. src/__tests__/job-responses-proposal-fields.test.ts stays green (it pins the constraint name).
--
-- Rollback:
--   alter trigger trg_check_job_response_fields on public.job_responses rename to trg_enforce_job_response_fields;
--   -- and re-run migration 69's CREATE OR REPLACE of enforce_job_response_fields (without the shape guard).
