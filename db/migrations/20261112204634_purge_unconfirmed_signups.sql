-- Audit 2026-11-11 H1, fix (1): a daily database job deletes sign-ups not confirmed within 24 hours.
--
-- The exploit: someone signs up first with another person's email. Supabase keeps that first password, and when the
-- real owner later confirms the address, they confirm an account whose password the attacker knows. Deleting
-- unconfirmed sign-ups after 24 hours shrinks that window from forever to one day.
--
-- Live today (read-only discovery, 2026-11-12):
--   * pg_cron is available, NOT installed. Installed: plpgsql, pg_stat_statements, uuid-ossp, pgcrypto,
--     supabase_vault, unaccent.
--   * 7 unconfirmed users, all older than 24 h, all demo freelancers (demo.*@servyou.invalid) with a published
--     freelancer profile. The rule below deletes 0 of them (dry-run at the end of this file).
--   * 0 anonymous, 0 SSO, 0 soft-deleted, 0 phone-only-confirmed users.
--   * Every FK into auth.users / public.profiles, and one hop further (auth.sessions → refresh_tokens / mfa_amr_claims,
--     mfa_factors → challenges / recovery sets): CASCADE or SET NULL, EXCEPT three that would make the whole DELETE
--     fail: admin_audit_log.admin_id → profiles (RESTRICT), data_exports.processed_by and
--     deletion_requests.processed_by → auth.users (NO ACTION). The function excludes those users, so one such row can
--     never abort the nightly run.
--   * Delete guards on the cascade path pass a session-less caller: trg_enforce_active_user is statement-level and
--     returns early when auth.uid() is null; trg_enforce_moderated_row_no_delete returns OLD when auth.uid() is null.
--   * postgres has DELETE on auth.users (owner supabase_auth_admin). No storage FK points at auth.users.
--
-- The rule — delete an auth.users row when ALL hold:
--   * email_confirmed_at IS NULL and created_at < now() - 24 h. created_at, NOT confirmation_sent_at: a « resend the
--     confirmation e-mail » refreshes confirmation_sent_at, so an attacker could resend for the victim's address and
--     keep the squatted account alive forever. Do not « improve » this to confirmation_sent_at.
--   * not anonymous, no phone_confirmed_at, no invited_at, not SSO (confirmed another way or created by staff —
--     latent today: 0 such rows, but they must not be deleted the day phone auth or invites are switched on);
--   * the user owns NO content (the brief: no shops.owner_id, no freelancer_profiles.profile_id — this protects the 7
--     demo accounts), and, wider than the brief (decision 1), nothing whose cascade would delete OTHER people's data
--     or that blocks the delete: no order as buyer or seller (completed transactions are preserved), no job post (its
--     cascade deletes other freelancers' proposals), no proposal, no report, not an admin, and not referenced by the
--     three blocking columns above. An unconfirmed user cannot sign in, so none of these exist for a real squatter;
--     they guard seeded and admin-made data.
-- What does cascade for a deleted user: profiles, favorites, notification_preferences, uploaded_objects (rows only:
-- storage bytes are untouched, and an unconfirmed user has no session to upload with),
-- password_change_attempts, their own data_exports / deletion_requests, and the auth.* rows (identities, sessions,
-- one-time tokens, MFA). contact_messages.user_id is set to null (the message stays for the admin).
--
-- Grants: the function is EXECUTE for nobody but its owner (cron runs it as postgres). No table grant changes;
-- client-write allow-list untouched.

-- Supabase's documented install (docs: guides/cron/install). The extension lives in pg_catalog; its tables in `cron`.
-- Migration 68's global PUBLIC-EXECUTE revoke means clients get nothing on cron.* (checked after the apply).
create extension if not exists pg_cron with schema pg_catalog;

grant usage on schema cron to postgres;
grant all privileges on all tables in schema cron to postgres;

create or replace function public.purge_unconfirmed_signups()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_deleted integer := 0;
begin
  -- One row at a time, each in its own sub-transaction: a row that a future FK or trigger refuses is kept and logged
  -- (a WARNING in the Postgres logs, by id only), and never aborts the purge of every other squatted account.
  -- At most 5000 per night, so a sign-up flood drains over several runs instead of one long lock.
  for v_id in
    select u.id
      from auth.users u
     where u.email_confirmed_at is null
       and u.created_at < now() - interval '24 hours'
       and not u.is_anonymous
       -- Confirmed another way, or created by staff: not a squatted e-mail sign-up.
       and u.phone_confirmed_at is null
       and u.invited_at is null
       and not u.is_sso_user
       -- Owns content (the brief's rule; protects the demo freelancers).
       and not exists (select 1 from public.shops s where s.owner_id = u.id)
       and not exists (select 1 from public.freelancer_profiles f where f.profile_id = u.id)
       -- A cascade would delete other people's data (decision 1).
       and not exists (select 1 from public.orders o where o.buyer_id = u.id or o.seller_id = u.id)
       and not exists (select 1 from public.job_posts j where j.consumer_id = u.id)
       and not exists (select 1 from public.job_responses r where r.freelancer_id = u.id)
       and not exists (select 1 from public.reports rp where rp.reporter_id = u.id)
       -- Would block the delete (RESTRICT / NO ACTION) or is staff.
       and not exists (select 1 from public.profiles p where p.id = u.id and p.is_admin)
       and not exists (select 1 from public.admin_audit_log a where a.admin_id = u.id)
       and not exists (select 1 from public.data_exports de where de.processed_by = u.id)
       and not exists (select 1 from public.deletion_requests dr where dr.processed_by = u.id)
     order by u.created_at
     limit 5000
  loop
    begin
      -- Re-checked at delete time: a confirmation that landed since the SELECT keeps the account.
      delete from auth.users u where u.id = v_id and u.email_confirmed_at is null;
      if found then
        v_deleted := v_deleted + 1;
      end if;
    exception when others then
      raise warning 'purge_unconfirmed_signups: kept user % (% %)', v_id, sqlstate, sqlerrm;
    end;
  end loop;
  return v_deleted;
end;
$$;

comment on function public.purge_unconfirmed_signups() is
  'Audit H1 (1): deletes auth.users rows unconfirmed for 24 h (by created_at, never confirmation_sent_at) that own no content and whose cascade touches no one else''s data. Returns the number deleted. Run daily by pg_cron job purge-unconfirmed-signups; EXECUTE for its owner only.';

-- New functions get no client EXECUTE since migration 68; revoked explicitly anyway (the brief), and from
-- service_role too (decision 2): cron runs it as the owner, so nothing else needs it and it is not an /rpc endpoint.
revoke execute on function public.purge_unconfirmed_signups() from public, anon, authenticated, service_role;

-- Once a day at 03:17 UTC (04:17 in Tunis), a quiet hour. cron.schedule with a job name upserts, and the function is
-- create or replace, so re-running this file does not add a second job.
select cron.schedule('purge-unconfirmed-signups', '17 3 * * *', $$select public.purge_unconfirmed_signups()$$);

-- Dry run (read-only) — the rows the job would delete today. Expected: 0 (the 7 demo freelancers own a profile).
--   select u.id, u.email, u.created_at
--     from auth.users u
--    where u.email_confirmed_at is null
--      and u.created_at < now() - interval '24 hours'
--      and not u.is_anonymous
--      and u.phone_confirmed_at is null
--      and u.invited_at is null
--      and not u.is_sso_user
--      and not exists (select 1 from public.shops s where s.owner_id = u.id)
--      and not exists (select 1 from public.freelancer_profiles f where f.profile_id = u.id)
--      and not exists (select 1 from public.orders o where o.buyer_id = u.id or o.seller_id = u.id)
--      and not exists (select 1 from public.job_posts j where j.consumer_id = u.id)
--      and not exists (select 1 from public.job_responses r where r.freelancer_id = u.id)
--      and not exists (select 1 from public.reports rp where rp.reporter_id = u.id)
--      and not exists (select 1 from public.profiles p where p.id = u.id and p.is_admin)
--      and not exists (select 1 from public.admin_audit_log a where a.admin_id = u.id)
--      and not exists (select 1 from public.data_exports de where de.processed_by = u.id)
--      and not exists (select 1 from public.deletion_requests dr where dr.processed_by = u.id);
--   → 0 rows on 2026-11-12.
--
-- Post-apply verification (read-only, except 1 which is rolled back):
--   1. begin; select public.purge_unconfirmed_signups(); rollback;                                  → 0
--   2. select jobname, schedule, command, active, username from cron.job
--       where jobname = 'purge-unconfirmed-signups';     → 1 row: '17 3 * * *', active true, username postgres
--   3. select proacl from pg_proc where oid = 'public.purge_unconfirmed_signups()'::regprocedure;
--      → only the owner (postgres); no =X/ (PUBLIC), anon, authenticated or service_role entry.
--      select prosecdef, proconfig from pg_proc where oid = 'public.purge_unconfirmed_signups()'::regprocedure;
--      → true, {search_path=""}
--   4. select has_schema_privilege('anon', 'cron', 'USAGE'), has_schema_privilege('authenticated', 'cron', 'USAGE');
--      → false, false
--   5. After the next 03:17 UTC: select status, return_message, start_time from cron.job_run_details
--       where jobid = (select jobid from cron.job where jobname = 'purge-unconfirmed-signups')
--       order by start_time desc limit 1;                → succeeded
--
-- Rollback:
--   select cron.unschedule('purge-unconfirmed-signups');
--   drop function public.purge_unconfirmed_signups();
--   (pg_cron stays installed: dropping the extension deletes every cron job, including any added later.)
