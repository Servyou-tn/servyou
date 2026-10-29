-- reports: one open report per reporter per target, at most 10 reports per reporter per 24 h, and the client
-- can no longer write the columns those two rules read.
-- Founder brief (2026-10-29), from docs/follow-ups/signaler-product-service-b3.md item 1 (MEDIUM: « reports has no
-- dedupe and no rate limit »). Standards-reference Section 3 A04 (insecure design: no anti-automation on a
-- user-facing write) and A01.
--
-- Live before this migration (verified 2026-10-29): reports(id, reporter_id, target_type, target_id, reason,
-- description, status default 'open', admin_note, created_at default now(), updated_at default now()); CHECKs on
-- reason / status / target_type + reports_terminal_requires_admin_note; indexes pkey, reports_reporter_idx,
-- reports_status_idx -- no unique index beyond the pkey; triggers reports_set_updated_at (BEFORE UPDATE) and
-- trg_enforce_active_user (statement); RLS « Reporter creates own report » (WITH CHECK reporter_id = auth.uid()),
-- « Reporter reads own, admin reads all », « Admin updates reports »; grants anon SELECT, authenticated
-- SELECT / INSERT / UPDATE at TABLE level. 1 row (resolved), 0 (reporter, target_type, target_id) groups with more
-- than one open / under_review row, max 1 report per reporter in any 24 h: nothing below rejects an existing row.
--
-- The hole: one account can file unlimited reports against one target, and unlimited reports overall. And because
-- authenticated holds table-level INSERT, a client could also sidestep any dedupe / rate rule keyed on status or
-- created_at by sending them itself (status 'dismissed' + an admin_note falls outside an « open » index; a
-- backdated created_at falls outside a 24 h window).
--
-- After:
--   1. Decision 1 -- INSERT is column-granted: authenticated may write reporter_id, target_type, target_id, reason,
--      description, nothing else. id / status / admin_note / created_at / updated_at come from their defaults.
--      A client that names another column is refused 42501 « permission denied for table reports ». The three
--      report actions send exactly those five columns. reports joins the column-granted list (orders, job_posts,
--      data_exports, ...): never re-grant table-level INSERT on it.
--   2. Partial unique index reports_one_open_per_reporter_target on (reporter_id, target_type, target_id) WHERE
--      status IN ('open', 'under_review'): a second live report by the same reporter on the same target fails
--      23505. Once an admin resolves or dismisses it, the reporter can report the target again. The app maps
--      23505 naming this index to « Vous avez déjà signalé ce contenu ».
--   3. enforce_report_rate_limit (BEFORE INSERT, FOR EACH ROW): a reporter who already filed 10 reports in the last
--      24 h is refused 23514, hint 'rate_limited' (the codebase's cap convention: job_full, cap_active). Every
--      status counts (decision 2: it caps filing, not the open queue), and an admin is capped like anyone else
--      (decision 2: no is_admin() bypass -- an admin moderates, they do not need to file). Service role / SQL
--      editor (auth.uid() is null) bypass, as every guard trigger does. A per-reporter advisory xact lock
--      serialises the count + insert (check_job_response_limits' pattern), so parallel inserts cannot all read 9.
--      A BEFORE trigger runs before the unique index is checked: an 11th report that is ALSO a duplicate answers
--      rate_limited, not 23505.
--   No existing row is rewritten.

-- ─── 1. INSERT columns ──────────────────────────────────────────────────────────────────────────────
-- A table-level REVOKE also revokes the column privileges it implied; the GRANT then re-adds exactly five.
revoke insert on public.reports from authenticated;
grant insert (reporter_id, target_type, target_id, reason, description) on public.reports to authenticated;

-- ─── 2. one live report per reporter per target ─────────────────────────────────────────────────────
create unique index reports_one_open_per_reporter_target
  on public.reports (reporter_id, target_type, target_id)
  where status in ('open', 'under_review');

-- ─── 3. 10 reports per reporter per rolling 24 h ────────────────────────────────────────────────────
create or replace function public.enforce_report_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_recent integer;
begin
  -- Service role, SQL editor, seeds.
  if (select auth.uid()) is null then
    return new;
  end if;

  perform pg_advisory_xact_lock(hashtextextended('reports.rate:' || new.reporter_id::text, 0));

  select count(*) into v_recent
    from public.reports
   where reporter_id = new.reporter_id
     and created_at > now() - interval '24 hours';

  if v_recent >= 10 then
    raise exception 'Vous avez atteint la limite de 10 signalements par 24 heures. Réessayez plus tard.'
      using errcode = '23514', hint = 'rate_limited';
  end if;

  return new;
end;
$$;

-- Trigger function: no client EXECUTE (not checked when a trigger fires). Default privileges are closed since
-- migration 68; the revoke is explicit anyway.
revoke execute on function public.enforce_report_rate_limit() from public, anon, authenticated;

create trigger trg_enforce_report_rate_limit
  before insert on public.reports
  for each row execute function public.enforce_report_rate_limit();

-- ─── ROLLBACK (do not run as part of this migration) ───────────────────────────────────────────
-- Per README "Rollback paths": apply as a NEW dated forward migration, never by deleting this file.
--
-- drop trigger if exists trg_enforce_report_rate_limit on public.reports;
-- drop function if exists public.enforce_report_rate_limit();
-- drop index if exists public.reports_one_open_per_reporter_target;
-- revoke insert on public.reports from authenticated;
-- grant insert on public.reports to authenticated;
