-- APPLIED 2026-11-19 by the architect, recorded as 20261119230204 two_step_signup_db2 (from #404 head 30634da).
-- Written by db-guardian, 2026-11-19: the two-step sign-up, DB-2 of DB-1 -> UI-1 -> DB-2. It closes pre-launch audit H1.
-- Plan and founder decisions of 2026-11-15: docs/follow-ups/two-step-signup-plan.md (#381), « DB-2 (db-guardian) »,
-- and the DB-2 item of docs/follow-ups/two-step-signup-db.md (§3).
-- Applied after the founder's phone test passed and the founder said yes. The apply checks, the recorded statement and
-- the live results are in db/migrations/README.md, entry 138. Only these header lines changed after the apply.
--
-- WHAT IT DOES
--   1. The write gate (trg_enforce_active_user, the same 28 tables). A signed-in caller's write is refused when:
--        - the account is suspended: the message is unchanged, « Ce compte est suspendu. », no hint (the app maps that
--          exact pair: src/lib/marche/proposal-errors.ts);
--        - the JWT's session_id no longer exists in auth.sessions: hint session_ended (review M4 of DB-1: EVERY write,
--          not only an incomplete account's). A token issued to a session that has since been signed out or deleted can
--          no longer write;
--        - the account is incomplete (profiles.completed_at null): hint account_incomplete. That covers deletion_requests
--          and data_exports too (decision 5). The only exception is complete_my_account's own UPDATE of profiles.
--      data_exports, deletion_requests and disputes were gated on UPDATE / DELETE only: suspension decisions D3 and D4
--      (2026-10-24) let a SUSPENDED user still file them. Their trigger now also fires on INSERT. On an INSERT into
--      those three, only the suspension refusal is waived (D3 / D4 kept); an ended session or an incomplete account is
--      still refused (DB-2 review H1).
--   2. The end of the transitional rule. A profile is complete at creation ONLY for an account the service role creates
--      ALREADY CONFIRMED, with the full profile and 16+ (review L6): the fixtures and seeds. Everything else starts
--      incomplete, including a direct /signup call that carries the full metadata. That closes the H1 attack.
--   3. A 7-day purge of confirmed-but-incomplete accounts, with the 24-hour purge's exclusions copied verbatim
--      (decision 5). It is its own function and cron job.
--   4. D2 (founder decision, see below): accounts created the OLD way after UI-1 went live become incomplete. 0 rows
--      today.
--
-- DISCOVERY (read-only on production, 2026-11-19)
--   - GoTrue is v2.198.0 (GET /auth/v1/health). Its adminUserCreate (internal/api/admin.go) INSERTs the user with
--     email_confirmed_at NULL. With email_confirm: true it then confirms it with user.Confirm(tx), an UPDATE of
--     email_confirmed_at, in the SAME transaction. An AFTER INSERT trigger therefore never sees a confirmed admin
--     fixture, so the plan's « confirmed at insert » test cannot be written in handle_new_user alone.
--     The fix:
--       - handle_new_user marks a full-profile creation with a transaction-local setting holding that user's id;
--       - a new AFTER UPDATE trigger completes the profile when email_confirmed_at goes from null to set while that
--         marker is present.
--     A public sign-up is confirmed by a later request (the link), in another transaction, so it never carries the
--     marker. An admin updateUserById({ email_confirm }) on an existing account runs in its own transaction: no marker
--     either.
--   - DB-1's transitional rule is live as written in 20261115222457: a sign-up with the full metadata is complete at
--     creation, confirmed or not. So today a direct /signup call with a password and the full metadata creates a
--     COMPLETE account. If the owner then clicks the confirmation link, the squatter's password opens a usable
--     account. That is H1, still open.
--   - What still creates accounts the old way: only a direct GoTrue /signup call (« Allow new users to sign up » is ON,
--     needed by signInWithOtp). The app's form no longer calls signUp since UI-1 (#399, live 2026-11-19 21:49 UTC).
--   - Accounts (14): all complete under « avant 2026-11 »; the newest was created 2026-07-27. None was created since
--     DB-1's apply or since UI-1 went live, and 0 are incomplete.
--     7 are unconfirmed but complete: the seeded demo freelancers, with no password, never signed in, owning public
--     content, kept by the 24-hour purge, and removed by the pre-launch wipe (#297). Nothing here touches them. With no
--     password and their inboxes not ours, the H1 path does not apply to them.
--   - enforce_active_user is SECURITY INVOKER: it runs as the caller, which cannot read auth.sessions. Hence a SECURITY
--     DEFINER helper, private.write_refusal(boolean). It describes only the caller; its one argument is the D3 / D4
--     waiver. EXECUTE for authenticated. The gate keeps its « auth.uid() is null » early return before the call, so anon
--     never reaches it.
--   - is_active_user() (« not suspended ») keeps its meaning. choose_job_response and the storage policies use it.
--   - trg_enforce_active_user fires on INSERT / UPDATE / DELETE on 25 tables. On data_exports, deletion_requests and
--     disputes it fires on UPDATE / DELETE only (20261024191215_suspension_enforcement.sql, D3 and D4). Clients INSERT
--     into all three directly (column grants), and no SECURITY DEFINER function does.
--   - No function in public or private calls set_config today, so the two transaction-local markers below
--     (servyou.full_profile_created, servyou.completing_account) are set only here. PostgREST exposes no set_config
--     to clients.
--   - auth.sessions: 104 rows for 5 users. The lookup is by its primary key plus user_id, once per write STATEMENT
--     (the gate is statement-level).
--   - The 3 live suites with a 15-year-old « minor » fixture move it to 17, still under 18, in this PR
--     (job-responses-integrity, prelaunch-acl-hardening, seller-capability-integrity). Every other fixture is
--     1990-born and created through admin createUser with email_confirm: true, so it stays complete at creation.
--   - UI-1's step 2 (src/app/finaliser-mon-compte/actions.ts) writes no table before complete_my_account. It uses
--     signOut({ scope: 'others' }) and updateUser({ password }), both GoTrue, then the RPC.
--
-- DECISIONS FOR THE ARCHITECT / FOUNDER
--   D1. The label for accounts complete at creation (DB-1 follow-up §3: « revisit the avant 2026-11 label »). Those
--       are service-role creations only (fixtures, seeds): nobody ticked a box. Working value: 'cree-par-le-service'.
--       The existing 14 keep « avant 2026-11 ».
--   D2. Rewriting existing rows (statement 6). Profiles that are complete under « avant 2026-11 », created after UI-1
--       went live (2026-11-19 21:49 UTC), and NOT confirmed in their creation transaction (still unconfirmed, or
--       confirmed more than 5 s after creation) can only come from a direct /signup call, which is the attack.
--       - Statement 6 turns them incomplete and clears their terms. Their owner then finishes through step 2.
--       - 0 rows today. Re-run the count in « BEFORE THE APPLY » first.
--       - If the founder declines, drop statement 6.
--   D3. A token without a session_id claim is refused (session_ended). Every token GoTrue issues carries one: DB-1's
--       complete_my_account already requires it, and DB-1's suite passed. A SQL-editor check with hand-made claims
--       must therefore name a real auth.sessions row. The rolled-back check below does.
--   D4. The 7 days count from auth.users.created_at, the same clock as the 24-hour purge (#361). The cron runs at
--       03:27 UTC, 10 minutes after purge-unconfirmed-signups.
--
-- DEPENDENCIES
--   - « Confirm email » ON. If it were OFF, GoTrue would confirm a public /signup in its own creation transaction, the
--     marker would match, and a squatter's full-metadata sign-up would be complete again: H1 would reopen.
--   - The three settings DB-1 relies on stay as they are: « Secure email change » ON, anonymous sign-ins OFF, phone
--     sign-in OFF.
--
-- AT APPLY TIME
--   - A person in the middle of the NEW sign-up (link opened, step 2 not done) is incomplete already.
--     - Their writes are refused until step 2. The middleware already sends their pages there, and UI-1's step 2
--       writes nothing before the RPC.
--     - The RPC still passes. Its UPDATE carries the completing_account marker, and its session is live.
--   - A person whose sign-up started the OLD way before UI-1: none exist (0 unconfirmed accounts besides the 7 demo
--     freelancers).
--   - Everyone signed in: their sessions are live rows, so nothing changes. A token whose session was signed out
--     elsewhere stops writing; it already could not refresh.
--   - The language toggle (LanguageToggle, useLangSwitch) writes profiles.language for any signed-in user.
--     - For an incomplete user on /finaliser-mon-compte, that write is now refused.
--     - The interface still switches through the cookie, and the error is only logged (follow-up).
--
-- BEFORE THE APPLY (architect, read-only)
--   select count(*) filter (where p.completed_at is null) as incomplete,
--          count(*) filter (where u.email_confirmed_at is null and p.completed_at is not null) as unconfirmed_complete,
--          count(*) filter (where p.terms_version = 'avant 2026-11' and u.created_at >= timestamptz '2026-11-19 21:49:00+00'
--                             and (u.email_confirmed_at is null or u.email_confirmed_at > u.created_at + interval '5 seconds')) as d2_rows,
--          count(*) filter (where u.created_at >= timestamptz '2026-11-19 21:49:00+00') as since_ui1
--     from auth.users u join public.profiles p on p.id = u.id;
--   Expected on 2026-11-19: 0, 7, 0, 0. The founder's phone test adds since_ui1 rows that are incomplete or complete
--   under the current terms version, never d2_rows.
--
-- AFTER THE APPLY (db-guardian, then commit 3)
--   - FIRST, as a canary: two-step-signup-db2-live, whose « service role creates confirmed » case must pass. GoTrue
--     v2.198.0's adminUserCreate runs the INSERT and user.Confirm(tx) inside one db.Transaction (internal/api/admin.go,
--     read at that tag). If that case fails, every service-role fixture starts incomplete. In that case, roll back at
--     once, before any other suite runs.
--   - Catalog:
--     - enforce_active_user calls private.write_refusal(boolean);
--     - EXECUTE on write_refusal for authenticated (and owner) only;
--     - trg_enforce_active_user on data_exports, deletion_requests and disputes: BEFORE INSERT OR UPDATE OR DELETE;
--     - the trigger on_auth_user_confirmed_at_creation exists;
--     - no client EXECUTE on complete_profile_confirmed_at_creation or purge_incomplete_accounts;
--     - the cron job purge-incomplete-accounts exists.
--   - Run the ROLLED-BACK CHECK at the end of this file; it ends on « PASS ».
--   - Live, one at a time, with 6-minute gaps between batches:
--     - two-step-signup-db2-live (new, 3 sign-ins);
--     - two-step-signup-db-live (3, LEGACY now incomplete);
--     - two-step-signup-auth-live;
--     - suspension-enforcement (the suspended refusal unchanged);
--     - the 3 suites whose minor moved to 17;
--     - client-write-grants-live (no change).
--   - Then:
--     - rename to the recorded version, and the README entry;
--     - regenerate the types: expect a zero diff (no public table or function signature changes);
--     - data-model.md.

-- ─── 1. Why a write is refused (the gate's helper) ─────────────────────────────────────────────────

-- p_suspension_waived: true only for an INSERT into data_exports, deletion_requests or disputes (suspension D3 / D4).
-- VOLATILE, so it reads auth.sessions as of the call, not as of an earlier snapshot in the statement.
create or replace function private.write_refusal(p_suspension_waived boolean default false)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid         uuid := (select auth.uid());
  v_claim       text := (select auth.jwt()) ->> 'session_id';
  v_has_profile boolean;
  v_suspended   timestamptz;
  v_completed   timestamptz;
begin
  if v_uid is null then
    return null;
  end if;

  select true, p.suspended_at, p.completed_at
    into v_has_profile, v_suspended, v_completed
    from public.profiles p
   where p.id = v_uid;

  -- 1. Suspension first, so a suspended account keeps its exact refusal (except where D3 / D4 let it file a request).
  if v_suspended is not null and not coalesce(p_suspension_waived, false) then
    return 'suspended';
  end if;

  -- 2. The token's session must still exist (DB-1 review M4). A token without a session_id is refused too (D3). Two
  --    steps, so the cast below never sees a malformed claim (OR does not guarantee its evaluation order).
  if v_claim is null
     or v_claim !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return 'session_ended';
  end if;
  if not exists (select 1 from auth.sessions s where s.id = v_claim::uuid and s.user_id = v_uid) then
    return 'session_ended';
  end if;

  -- 3. An incomplete account (the e-mail link was used, « Finalisez votre compte » is not done). No profile at all is
  --    left as before (is_active_user answers true then); handle_new_user creates one for every account.
  if v_has_profile and v_completed is null then
    return 'account_incomplete';
  end if;

  return null;
end;
$$;

revoke all on function private.write_refusal(boolean) from public, anon, service_role;
grant execute on function private.write_refusal(boolean) to authenticated;

comment on function private.write_refusal(boolean) is
  'Two-step sign-up DB-2: why the caller may not write: suspended (waived for the D3 / D4 inserts), session_ended (the JWT''s session_id is gone from auth.sessions) or account_incomplete; null = allowed. Called by enforce_active_user (SECURITY INVOKER), hence EXECUTE for authenticated. It only ever describes the caller.';

-- ─── 2. The gate (trg_enforce_active_user, 28 tables, statement level; the triggers are unchanged) ───

create or replace function public.enforce_active_user()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_refusal text;
begin
  -- Service role, SQL editor, auth-service cascades. Before the helper call: anon has no EXECUTE.
  if (select auth.uid()) is null then
    return null;
  end if;

  -- Suspension D3 / D4 (2026-10-24): a suspended user may still file an export, a deletion request or a dispute.
  v_refusal := private.write_refusal(
    tg_op = 'INSERT' and tg_table_schema = 'public'
    and tg_table_name in ('data_exports', 'deletion_requests', 'disputes'));
  if v_refusal is null then
    return null;
  end if;

  if v_refusal = 'suspended' then
    -- Unchanged: the app maps this exact message with no hint (src/lib/marche/proposal-errors.ts).
    raise exception 'Ce compte est suspendu.'
      using errcode = '42501';
  end if;

  if v_refusal = 'session_ended' then
    raise exception 'Votre session a pris fin. Reconnectez-vous.'
      using errcode = '42501', hint = 'session_ended';
  end if;

  -- account_incomplete. The one exception: complete_my_account's own UPDATE of profiles, which sets the marker to the
  -- caller's id just before it and clears it just after.
  if tg_table_schema = 'public' and tg_table_name = 'profiles'
     and current_setting('servyou.completing_account', true) = (select auth.uid())::text then
    return null;
  end if;

  raise exception 'Finalisez votre compte pour continuer.'
    using errcode = '42501', hint = 'account_incomplete';
end;
$$;

-- The three tables gated on UPDATE / DELETE only (suspension D3 / D4) now gate INSERT too. The suspension waiver above
-- keeps D3 / D4; an ended session or an incomplete account can no longer file one (decision 5; DB-2 review H1).
drop trigger trg_enforce_active_user on public.data_exports;
create trigger trg_enforce_active_user before insert or update or delete on public.data_exports
  for each statement execute function public.enforce_active_user();
drop trigger trg_enforce_active_user on public.deletion_requests;
create trigger trg_enforce_active_user before insert or update or delete on public.deletion_requests
  for each statement execute function public.enforce_active_user();
drop trigger trg_enforce_active_user on public.disputes;
create trigger trg_enforce_active_user before insert or update or delete on public.disputes
  for each statement execute function public.enforce_active_user();

-- ─── 3. Profile creation: complete only when the service role creates the account confirmed ─────────

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_meta     jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_dob      date  := nullif(btrim(coalesce(v_meta ->> 'date_of_birth', '')), '')::date;
  v_today    date  := (now() at time zone 'Africa/Tunis')::date;
  v_full     boolean;
  v_complete boolean;
begin
  -- The full profile, 16 or older (review L6), the same floor as complete_my_account.
  v_full := v_dob is not null
            and v_dob >= date '1900-01-01'
            and v_dob <= (v_today - interval '16 years')::date
            and nullif(btrim(coalesce(v_meta ->> 'city', '')), '') is not null
            and btrim(coalesce(v_meta ->> 'full_name', '')) <> '';

  -- GoTrue inserts every user unconfirmed (v2.198.0, adminUserCreate) and confirms an admin creation with an UPDATE in
  -- the same transaction. So: complete now only if already confirmed (kept for a future GoTrue). Otherwise mark this
  -- transaction, and on_auth_user_confirmed_at_creation completes the profile if the confirmation comes in it.
  v_complete := v_full and new.email_confirmed_at is not null;

  insert into public.profiles (id, full_name, email, date_of_birth, city, language, completed_at, terms_accepted_at, terms_version)
  values (
    new.id,
    coalesce(v_meta ->> 'full_name', ''),
    new.email,
    v_dob,
    v_meta ->> 'city',
    coalesce(v_meta ->> 'language', 'fr'),
    case when v_complete then now() end,
    case when v_complete then now() end,
    case when v_complete then 'cree-par-le-service' end  -- D1
  );

  if v_full and not v_complete then
    perform set_config('servyou.full_profile_created', new.id::text, true);
  end if;
  return new;
end;
$$;

create or replace function public.complete_profile_confirmed_at_creation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Only in the transaction that created this very account with the full profile (handle_new_user's marker). A
  -- confirmation link opened later is another transaction, so the account stays incomplete until step 2.
  if current_setting('servyou.full_profile_created', true) is distinct from new.id::text then
    return null;
  end if;

  update public.profiles
     set completed_at = now(),
         terms_accepted_at = now(),
         terms_version = 'cree-par-le-service'  -- D1
   where id = new.id
     and completed_at is null
     and date_of_birth is not null;

  perform set_config('servyou.full_profile_created', '', true);
  return null;
end;
$$;

revoke all on function public.complete_profile_confirmed_at_creation() from public, anon, authenticated, service_role;

comment on function public.complete_profile_confirmed_at_creation() is
  'Two-step sign-up DB-2: completes a profile when its account is confirmed in the same transaction that created it with the full profile (the service role''s createUser with email_confirm: true). A public sign-up is confirmed by a later request and stays incomplete. SECURITY DEFINER in public: supabase_auth_admin fires it and has no USAGE on private.';

-- Same shape as on_auth_user_password_set: no column list, the WHEN clause sees the real change.
create trigger on_auth_user_confirmed_at_creation
  after update on auth.users
  for each row
  when (old.email_confirmed_at is null and new.email_confirmed_at is not null)
  execute function public.complete_profile_confirmed_at_creation();

-- ─── 4. complete_my_account: unchanged except the marker around its UPDATE ────────────────────────

create or replace function public.complete_my_account(
  p_full_name     text,
  p_date_of_birth date,
  p_city          text,
  p_terms_version text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid           uuid  := (select auth.uid());
  v_claims        jsonb := coalesce((select auth.jwt()), '{}'::jsonb);
  v_session       uuid;
  v_session_start timestamptz;
  v_completed_at  timestamptz;
  v_name          text  := btrim(coalesce(p_full_name, ''));
  v_city          text  := btrim(coalesce(p_city, ''));
  v_today         date  := (now() at time zone 'Africa/Tunis')::date;
begin
  if v_uid is null then
    raise exception 'Connectez-vous pour finaliser votre compte.' using errcode = '42501';
  end if;

  select p.completed_at into v_completed_at from public.profiles p where p.id = v_uid for update;
  if not found then
    raise exception 'Ce compte ne peut pas être finalisé.' using errcode = '42501';
  end if;
  if v_completed_at is not null then
    raise exception 'Votre compte est déjà finalisé.' using errcode = '23514', hint = 'already_complete';
  end if;

  -- The session must come from an e-mailed link or code: amr `otp` for all four e-mail paths, `password` for a password
  -- sign-in (two-step-signup-auth-live.test.ts). A password sign-in never completes an account.
  if not exists (
    select 1 from jsonb_array_elements(coalesce(v_claims -> 'amr', '[]'::jsonb)) e where e ->> 'method' = 'otp'
  ) then
    raise exception 'Pour finaliser votre compte, ouvrez le lien reçu par e-mail.'
      using errcode = '42501', hint = 'email_link_required';
  end if;

  v_session := nullif(v_claims ->> 'session_id', '')::uuid;
  select s.created_at into v_session_start from auth.sessions s where s.id = v_session and s.user_id = v_uid;
  if not found or v_session_start is null then
    raise exception 'Votre session a expiré. Ouvrez le lien reçu par e-mail.'
      using errcode = '42501', hint = 'session_unknown';
  end if;

  -- No other session may be alive: a squatter's password session could otherwise have changed the password, and the
  -- password check below cannot tell who did (review M1). The page ends them first (signOut({ scope: 'others' })), then
  -- sets the password, then calls this. From then on « Require current password » needs the owner's new password.
  if exists (select 1 from auth.sessions s where s.user_id = v_uid and s.id <> v_session) then
    raise exception 'D''autres sessions sont ouvertes sur ce compte : elles doivent être fermées pour le finaliser.'
      using errcode = '23514', hint = 'other_sessions';
  end if;

  -- A password set during THIS session (decision 3: five seconds for the two clocks). A password chosen when the account
  -- was created (a squatter's, through /signup) is never recorded, so it can never be the one an account completes with.
  if not exists (
    select 1 from private.account_password_set a
     where a.user_id = v_uid and a.set_at >= v_session_start - interval '5 seconds'
  ) then
    raise exception 'Choisissez votre mot de passe pour finaliser votre compte.'
      using errcode = '23514', hint = 'password_required';
  end if;

  if char_length(v_name) < 2 or char_length(v_name) > 100 then
    raise exception 'Indiquez votre nom (2 à 100 caractères).' using errcode = '23514', hint = 'name_invalid';
  end if;
  if v_city = '' or char_length(v_city) > 100 then
    raise exception 'Indiquez votre ville.' using errcode = '23514', hint = 'city_required';
  end if;
  if p_date_of_birth is null or p_date_of_birth < date '1900-01-01' or p_date_of_birth > v_today then
    raise exception 'Indiquez une date de naissance valide.' using errcode = '23514', hint = 'birth_date_invalid';
  end if;
  if p_date_of_birth > (v_today - interval '16 years')::date then
    raise exception 'Il faut avoir au moins 16 ans pour créer un compte.' using errcode = '23514', hint = 'too_young';
  end if;
  if p_terms_version is null then
    raise exception 'Acceptez les conditions d''utilisation et la politique de confidentialité.'
      using errcode = '23514', hint = 'terms_required';
  end if;
  if p_terms_version is distinct from private.current_terms_version() then
    raise exception 'Les conditions ont changé : rechargez la page pour les relire.'
      using errcode = '23514', hint = 'terms_outdated';
  end if;

  -- DB-2: the write gate refuses an incomplete account's writes, except this one UPDATE (the marker names the caller,
  -- is transaction-local, and is cleared right after).
  perform set_config('servyou.completing_account', v_uid::text, true);
  update public.profiles
     set full_name = v_name,
         date_of_birth = p_date_of_birth,
         city = v_city,
         completed_at = now(),
         terms_accepted_at = now(),
         terms_version = p_terms_version
   where id = v_uid;
  perform set_config('servyou.completing_account', '', true);

  -- Belt and braces: a session opened since the check above ends too (refresh tokens and amr claims cascade). An access
  -- token already issued stays a valid JWT until it expires, but the write gate refuses it once its session is gone.
  delete from auth.sessions s where s.user_id = v_uid and s.id <> v_session;
end;
$$;

revoke all on function public.complete_my_account(text, date, text, text) from public, anon;
grant execute on function public.complete_my_account(text, date, text, text) to authenticated;

-- ─── 5. The 7-day purge of confirmed-but-incomplete accounts (decision 5) ─────────────────────────

create or replace function private.purge_incomplete_accounts()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id      uuid;
  v_deleted integer := 0;
begin
  for v_id in
    select u.id
      from auth.users u
      join public.profiles p on p.id = u.id
     where p.completed_at is null
       and u.email_confirmed_at is not null
       and u.created_at < now() - interval '7 days'
       -- The exclusions of purge_unconfirmed_signups, verbatim.
       and not u.is_anonymous
       and u.phone_confirmed_at is null
       and u.invited_at is null
       and not u.is_sso_user
       and not exists (select 1 from public.shops s where s.owner_id = u.id)
       and not exists (select 1 from public.freelancer_profiles f where f.profile_id = u.id)
       and not exists (select 1 from public.orders o where o.buyer_id = u.id or o.seller_id = u.id)
       and not exists (select 1 from public.job_posts j where j.consumer_id = u.id)
       and not exists (select 1 from public.job_responses r where r.freelancer_id = u.id)
       and not exists (select 1 from public.reports rp where rp.reporter_id = u.id)
       and not exists (select 1 from public.profiles pa where pa.id = u.id and pa.is_admin)
       and not exists (select 1 from public.admin_audit_log a where a.admin_id = u.id)
       and not exists (select 1 from public.data_exports de where de.processed_by = u.id)
       and not exists (select 1 from public.deletion_requests dr where dr.processed_by = u.id)
     order by u.created_at
     limit 5000
  loop
    begin
      -- Re-checked at delete time: an account completed since the scan is kept.
      delete from auth.users u
       where u.id = v_id
         and u.email_confirmed_at is not null
         and exists (select 1 from public.profiles p where p.id = u.id and p.completed_at is null);
      if found then
        v_deleted := v_deleted + 1;
      end if;
    exception when others then
      raise warning 'purge_incomplete_accounts: kept user % (% %)', v_id, sqlstate, sqlerrm;
    end;
  end loop;
  return v_deleted;
end;
$$;

-- Like purge_unconfirmed_signups (ACL {postgres=X}): only the cron job, as postgres, runs it.
revoke all on function private.purge_incomplete_accounts() from public, anon, authenticated, service_role;

comment on function private.purge_incomplete_accounts() is
  'Two-step sign-up DB-2 (decision 5): deletes accounts that confirmed their e-mail but never finished « Finalisez votre compte », 7 days after auth.users.created_at, with purge_unconfirmed_signups'' exclusions. Profiles, sessions and password rows cascade.';

-- 03:27 UTC (04:27 in Tunis), 10 minutes after purge-unconfirmed-signups. A job name upserts: re-running adds no job.
select cron.schedule('purge-incomplete-accounts', '27 3 * * *', $$select private.purge_incomplete_accounts()$$);

-- ─── 6. D2 (founder decision): accounts created the OLD way after UI-1 went live ──────────────────
-- Complete under « avant 2026-11 », created after 2026-11-19 21:49 UTC, and not confirmed in their creation transaction.
-- Only a direct /signup call can produce one. They become incomplete with no recorded terms, and their owner finishes
-- through step 2. Expected: 0 rows. Drop this statement if the founder declines D2.

update public.profiles p
   set completed_at = null,
       terms_accepted_at = null,
       terms_version = null
  from auth.users u
 where u.id = p.id
   and p.terms_version = 'avant 2026-11'
   and u.created_at >= timestamptz '2026-11-19 21:49:00+00'
   and (u.email_confirmed_at is null or u.email_confirmed_at > u.created_at + interval '5 seconds');

-- ─── ROLLED-BACK CHECK (after the apply; run as one block, nothing persists) ───────────────────────
-- Any FAIL raises and the whole block errors. Success ends on a row « PASS ». Hints are checked, not only SQLSTATEs:
-- « permission denied » is 42501 too.
--
-- begin;
-- -- Creation rules. Users are inserted the way GoTrue does: unconfirmed, then (admin) confirmed by an UPDATE.
-- insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at) values
--   ('7f000000-0000-4000-8000-0000000000a1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
--    'tsdb2-signup@rls-smoke.servyou.invalid', '{"full_name":"Db2 Signup","date_of_birth":"1990-01-01","city":"Tunis"}', now(), now());
-- -- A later request confirms it (the owner's link): a new transaction, simulated by clearing the marker.
-- select set_config('servyou.full_profile_created', '', true);
-- update auth.users set email_confirmed_at = now() where id = '7f000000-0000-4000-8000-0000000000a1';
-- insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at) values
--   ('7f000000-0000-4000-8000-0000000000a2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
--    'tsdb2-admin@rls-smoke.servyou.invalid', '{"full_name":"Db2 Admin Made","date_of_birth":"1990-01-01","city":"Tunis"}', now(), now());
-- update auth.users set email_confirmed_at = now() where id = '7f000000-0000-4000-8000-0000000000a2';
-- insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at) values
--   ('7f000000-0000-4000-8000-0000000000a3', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
--    'tsdb2-young@rls-smoke.servyou.invalid',
--    jsonb_build_object('full_name', 'Db2 Young', 'city', 'Tunis', 'date_of_birth', ((now() at time zone 'Africa/Tunis')::date - interval '15 years')::date),
--    now(), now());
-- update auth.users set email_confirmed_at = now() where id = '7f000000-0000-4000-8000-0000000000a3';
-- insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at) values
--   ('7f000000-0000-4000-8000-0000000000a4', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
--    'tsdb2-suspended@rls-smoke.servyou.invalid', '{"full_name":"Db2 Suspended","date_of_birth":"1990-01-01","city":"Tunis"}', now(), now());
-- update auth.users set email_confirmed_at = now() where id = '7f000000-0000-4000-8000-0000000000a4';
-- update public.profiles set suspended_at = now(), suspended_reason = 'tsdb2 check' where id = '7f000000-0000-4000-8000-0000000000a4';
-- do $$
-- begin
--   if (select completed_at from public.profiles where id = '7f000000-0000-4000-8000-0000000000a1') is not null then
--     raise exception 'FAIL: a full-metadata sign-up confirmed by a later link is complete (H1)';
--   end if;
--   if (select terms_version from public.profiles where id = '7f000000-0000-4000-8000-0000000000a2') is distinct from 'cree-par-le-service' then
--     raise exception 'FAIL: an account created confirmed with the full profile is not complete';
--   end if;
--   if (select completed_at from public.profiles where id = '7f000000-0000-4000-8000-0000000000a3') is not null then
--     raise exception 'FAIL: an account under 16 is complete at creation';
--   end if;
-- end $$;
-- -- The gate. a1 is incomplete with a live session; a2 is complete and also an admin, with a live session and an ended
-- -- one (a session id that does not exist).
-- update public.profiles set is_admin = true where id = '7f000000-0000-4000-8000-0000000000a2';
-- insert into auth.sessions (id, user_id, created_at, updated_at) values
--   ('7f000000-0000-4000-8000-0000000000b1', '7f000000-0000-4000-8000-0000000000a1', now(), now()),
--   ('7f000000-0000-4000-8000-0000000000b2', '7f000000-0000-4000-8000-0000000000a2', now(), now()),
--   ('7f000000-0000-4000-8000-0000000000b4', '7f000000-0000-4000-8000-0000000000a4', now(), now());
-- set local role authenticated;
-- select set_config('request.jwt.claims', '{"sub":"7f000000-0000-4000-8000-0000000000a1","role":"authenticated","session_id":"7f000000-0000-4000-8000-0000000000b1","amr":[{"method":"otp","timestamp":1}]}', true);
-- do $$
-- declare v_hint text;
-- begin
--   update public.profiles set language = 'ar' where id = '7f000000-0000-4000-8000-0000000000a1';
--   raise exception 'FAIL: an incomplete account wrote';
-- exception when sqlstate '42501' then
--   get stacked diagnostics v_hint = pg_exception_hint;
--   if v_hint is distinct from 'account_incomplete' then raise exception 'FAIL: incomplete refused with hint %', v_hint; end if;
-- end $$;
-- do $$
-- declare v_hint text;
-- begin
--   -- INSERT into data_exports is gated now (review H1): an incomplete account cannot file an export.
--   insert into public.data_exports (user_id) values ('7f000000-0000-4000-8000-0000000000a1');
--   raise exception 'FAIL: an incomplete account filed an export';
-- exception when sqlstate '42501' then
--   get stacked diagnostics v_hint = pg_exception_hint;
--   if v_hint is distinct from 'account_incomplete' then raise exception 'FAIL: incomplete export refused with hint %', v_hint; end if;
-- end $$;
-- select set_config('request.jwt.claims', '{"sub":"7f000000-0000-4000-8000-0000000000a4","role":"authenticated","session_id":"7f000000-0000-4000-8000-0000000000b4","amr":[{"method":"otp","timestamp":1}]}', true);
-- do $$
-- declare v_hint text; v_msg text;
-- begin
--   update public.profiles set language = 'ar' where id = '7f000000-0000-4000-8000-0000000000a4';
--   raise exception 'FAIL: a suspended account wrote';
-- exception when sqlstate '42501' then
--   get stacked diagnostics v_hint = pg_exception_hint, v_msg = message_text;
--   if v_msg is distinct from 'Ce compte est suspendu.' or nullif(v_hint, '') is not null then
--     raise exception 'FAIL: the suspended refusal changed (% / %)', v_msg, v_hint;
--   end if;
-- end $$;
-- insert into public.data_exports (user_id) values ('7f000000-0000-4000-8000-0000000000a4');  -- D3 kept: passes
-- select set_config('request.jwt.claims', '{"sub":"7f000000-0000-4000-8000-0000000000a2","role":"authenticated","session_id":"7f000000-0000-4000-8000-0000000000b9","amr":[{"method":"otp","timestamp":1}]}', true);
-- do $$
-- declare v_hint text;
-- begin
--   -- Through a SECURITY DEFINER RPC that writes a gated table (admin_audit_log): the gate still fires.
--   perform public.log_admin_action('tsdb2_check', 'user', '7f000000-0000-4000-8000-0000000000a2'::uuid);
--   raise exception 'FAIL: an ended session wrote through an RPC';
-- exception when sqlstate '42501' then
--   get stacked diagnostics v_hint = pg_exception_hint;
--   if v_hint is distinct from 'session_ended' then raise exception 'FAIL: ended session refused with hint %', v_hint; end if;
-- end $$;
-- select set_config('request.jwt.claims', '{"sub":"7f000000-0000-4000-8000-0000000000a2","role":"authenticated","amr":[{"method":"otp","timestamp":1}]}', true);
-- do $$
-- declare v_hint text;
-- begin
--   update public.profiles set language = 'ar' where id = '7f000000-0000-4000-8000-0000000000a2';
--   raise exception 'FAIL: a token without session_id wrote';
-- exception when sqlstate '42501' then
--   get stacked diagnostics v_hint = pg_exception_hint;
--   if v_hint is distinct from 'session_ended' then raise exception 'FAIL: no session_id refused with hint %', v_hint; end if;
-- end $$;
-- select set_config('request.jwt.claims', '{"sub":"7f000000-0000-4000-8000-0000000000a2","role":"authenticated","session_id":"7f000000-0000-4000-8000-0000000000b2","amr":[{"method":"otp","timestamp":1}]}', true);
-- update public.profiles set language = 'ar' where id = '7f000000-0000-4000-8000-0000000000a2';  -- live session: passes
-- reset role;
-- select set_config('request.jwt.claims', '', true);  -- back to « no signed-in caller » for the setup below
-- -- The 7-day purge: c1 eligible, c2 too recent, c3 owns a job post, c4 complete. Only c1 may go.
-- insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, email_confirmed_at, created_at, updated_at) values
--   ('7f000000-0000-4000-8000-0000000000c1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'tsdb2-c1@rls-smoke.servyou.invalid', '{"full_name":"C1"}', now() - interval '8 days', now() - interval '8 days', now()),
--   ('7f000000-0000-4000-8000-0000000000c2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'tsdb2-c2@rls-smoke.servyou.invalid', '{"full_name":"C2"}', now() - interval '6 days', now() - interval '6 days', now()),
--   ('7f000000-0000-4000-8000-0000000000c3', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'tsdb2-c3@rls-smoke.servyou.invalid', '{"full_name":"C3"}', now() - interval '8 days', now() - interval '8 days', now()),
--   ('7f000000-0000-4000-8000-0000000000c4', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'tsdb2-c4@rls-smoke.servyou.invalid', '{"full_name":"C4"}', now() - interval '8 days', now() - interval '8 days', now());
-- insert into public.job_posts (consumer_id, title, description) values ('7f000000-0000-4000-8000-0000000000c3', 'Tsdb2 purge check', 'Owned content keeps the account.');
-- update public.profiles set date_of_birth = date '1990-01-01', city = 'Tunis', completed_at = now(), terms_accepted_at = now(), terms_version = 'cree-par-le-service'
--  where id = '7f000000-0000-4000-8000-0000000000c4';
-- select private.purge_incomplete_accounts();
-- do $$
-- begin
--   if exists (select 1 from auth.users where id = '7f000000-0000-4000-8000-0000000000c1') then raise exception 'FAIL: the eligible account was kept'; end if;
--   if (select count(*) from auth.users where id in ('7f000000-0000-4000-8000-0000000000c2', '7f000000-0000-4000-8000-0000000000c3', '7f000000-0000-4000-8000-0000000000c4')) <> 3 then
--     raise exception 'FAIL: the purge deleted an account it must keep';
--   end if;
-- end $$;
-- select 'PASS: creation rules, the gate (incomplete incl. an export insert, ended session, no session_id, through an RPC, suspended unchanged and D3 kept), the 7-day purge' as result;
-- rollback;

-- ─── ROLLBACK (one transaction) ─────────────────────────────────────────────────────────────────────
-- complete_my_account keeps its two set_config lines: without the gate they change nothing. Statement 6 (D2) is not
-- undone. An account it made incomplete finishes through step 2, or stays incomplete with no purge.
--
-- select cron.unschedule('purge-incomplete-accounts');
-- drop function private.purge_incomplete_accounts();
-- drop trigger on_auth_user_confirmed_at_creation on auth.users;
-- drop function public.complete_profile_confirmed_at_creation();
-- create or replace function public.enforce_active_user()
--  returns trigger language plpgsql set search_path to ''
-- as $function$
-- begin
--   -- Service role, SQL editor, auth-service cascades. Before the helper call: anon has no EXECUTE.
--   if (select auth.uid()) is null then
--     return null;
--   end if;
--   if not public.is_active_user() then
--     raise exception 'Ce compte est suspendu.'
--       using errcode = '42501';
--   end if;
--   return null;
-- end;
-- $function$;
-- drop function private.write_refusal(boolean);
-- drop trigger trg_enforce_active_user on public.data_exports;
-- create trigger trg_enforce_active_user before update or delete on public.data_exports
--   for each statement execute function public.enforce_active_user();
-- drop trigger trg_enforce_active_user on public.deletion_requests;
-- create trigger trg_enforce_active_user before update or delete on public.deletion_requests
--   for each statement execute function public.enforce_active_user();
-- drop trigger trg_enforce_active_user on public.disputes;
-- create trigger trg_enforce_active_user before update or delete on public.disputes
--   for each statement execute function public.enforce_active_user();
-- create or replace function public.handle_new_user()
--  returns trigger language plpgsql security definer set search_path to ''
-- as $function$
-- declare
--   v_meta     jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
--   v_dob      date  := nullif(btrim(coalesce(v_meta ->> 'date_of_birth', '')), '')::date;
--   v_complete boolean;
-- begin
--   v_complete := v_dob is not null
--                 and nullif(btrim(coalesce(v_meta ->> 'city', '')), '') is not null
--                 and btrim(coalesce(v_meta ->> 'full_name', '')) <> '';
--   insert into public.profiles (id, full_name, email, date_of_birth, city, language, completed_at, terms_accepted_at, terms_version)
--   values (new.id, coalesce(v_meta ->> 'full_name', ''), new.email, v_dob, v_meta ->> 'city', coalesce(v_meta ->> 'language', 'fr'),
--           case when v_complete then now() end, case when v_complete then now() end, case when v_complete then 'avant 2026-11' end);
--   return new;
-- end;
-- $function$;
