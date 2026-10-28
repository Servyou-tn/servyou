# Missions M-C — proposal fields, typed response errors (`feat/missions-m-c`, 2026-10-26)

## LOW — three legacy responses are below the 20-character floor

- The 3 pre-M-C `job_responses` rows (3–12 characters) were kept (the CHECK is NOT VALID), so any later
  write of one fails 23514 even from the service role. **Fix if one ever needs editing:** lengthen its
  message in the same UPDATE, or delete it (they are test-era rows).

## ✅ RESOLVED (migration 72 `20261026212216`, 2026-10-26) — the per-link loop runs before the 3-link CHECK, under the post lock

- Fixed: the trigger is renamed `trg_check_job_response_fields` (fires before the limits lock) and refuses a
  non-array or more than 3 links up front with the CHECK's own error. Original entry:

- `enforce_job_response_fields` fires after `check_job_response_limits` (alphabetical), i.e. while the post
  row is locked FOR UPDATE and the freelancer's advisory lock is held, and the `<= 3` rule lives only in the
  CHECK, which runs after BEFORE triggers. A freelancer can send thousands of distinct valid links: the loop is
  O(n²) (`text[]` append + `= any`) and holds that post's lock until `statement_timeout`, stalling other
  responders and the owner's updates; repeatable (the statement rolls back). **Fix (one line, forward
  migration):** `if jsonb_array_length(new.portfolio_links) > 3 then return new; end if;` right after the
  array guard, so the CHECK names the failure without the loop.

## LOW — `job_unavailable` tells a moderated post apart

- The message is the shared « n'est plus ouverte », but the HINT is distinct from `job_filled` /
  `job_deleted`, so a freelancer holding a post's UUID can tell it was moderated. **Fix if wanted:** emit
  `job_closed` for the moderated case too (H12 maps both to the same copy anyway).

## LOW — a multi-row service-role INSERT can pass the 10-cap

- The cap now reads `response_count`, which the AFTER ROW counter bumps, so one multi-row INSERT of different
  freelancers into the same post sees the pre-statement count. Clients cannot do this (`freelancer_id =
  auth.uid()` per row); only the service role can.

## LOW — the 8-skill limit is checked before RLS on `job_response_skills`

- ✅ **CLOSED by migration 79** `20261028194710_job_response_skills_open_post`: ownership is checked first (`not_self`).

- `enforce_job_response_skills_limit` (BEFORE INSERT, SECURITY DEFINER) runs before the RLS WITH CHECK, so a
  non-responder who knows a response id sees `too_many_skills` instead of the RLS refusal once that response
  has 8 skills — learning only that count. Response ids are visible only to the responder and the post owner.
  **Fix if wanted:** check `freelancer_id = auth.uid()` first inside the trigger.
