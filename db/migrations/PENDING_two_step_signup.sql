-- PENDING (db-guardian, 2026-11-15): the two-step sign-up, DB-1 of DB-1 -> UI-1 -> DB-2 (pre-launch audit H1, part 2).
-- Founder decisions of 2026-11-15: docs/follow-ups/two-step-signup-plan.md, « Founder decisions » (PR #381).
-- Written for review, NOT applied. The architect reviews it, applies it, and gives the version.
--
-- WHAT IT DOES (nothing changes for users yet)
--   - profiles: completed_at, terms_accepted_at, terms_version; date_of_birth becomes nullable; a CHECK ties the birth
--     date and the terms to completed_at. The 14 existing profiles are backfilled as complete, terms accepted at their
--     sign-up date under « avant 2026-11 » (decision 3).
--   - handle_new_user creates every profile, even without a birth date. TRANSITIONAL: a sign-up that carries the full
--     profile (today's form, the fixtures, the seeds) is complete at creation, as today. DB-2 narrows that to accounts
--     already e-mail-confirmed at insert and adds the write gate for incomplete accounts; H1 closes with DB-2.
--   - private.account_password_set + trigger on auth.users: when the account's password was last set.
--   - complete_my_account(): step 2 (« Finalisez votre compte »). It refuses unless the session came from an e-mailed
--     link or code (amr otp), no other session of the account is alive, a password was set during that session, and
--     the person is 16+ (decision 4). Then it completes the profile and records the terms.
--
-- SPIKE (live on production Auth, 2026-11-15, src/__tests__/two-step-signup-auth-live.test.ts, green), with Confirm
-- email, CAPTCHA, Secure password change and Require current password all ON (decision 9). Links minted by the admin
-- API and redeemed with verifyOtp, as the e-mailed link is; no mail sent (Brevo comes on domain day):
--   - amr is `otp` for every e-mail path: the new-account link, the sign-in link, the e-mail code, the reset link.
--     A password sign-in records `password` (auth.mfa_amr_claims: otp 88, password 3);
--   - a SQUATTED account (created through /signup with someone else's password, unconfirmed), once its owner redeems
--     the confirmation link, takes the owner's new password with NO current password: no lockout;
--   - a new account's link is a `signup` link (« Confirm signup » template), an existing account's a `magiclink` link;
--     verifyOtp type 'email' redeems both; a passwordless account sets its first password from its link session.
--   Not run: a first password set more than 24 hours after the link session began (« Secure password change »). It
--   needs a production write to auth.sessions.created_at; its effect is UI only (UI-1 maps GoTrue's reauthentication
--   error to « Recevoir un nouveau lien »). docs/follow-ups/two-step-signup-db.md, item 1.
--
-- DISCOVERY (read-only on production, 2026-11-15)
--   - on_auth_user_created (AFTER INSERT on auth.users) -> handle_new_user (SECURITY DEFINER, search_path public) casts
--     raw_user_meta_data ->> 'date_of_birth' into the NOT NULL profiles.date_of_birth: a sign-up without one fails and
--     rolls back the Auth insert. No CHECK on the birth date; 16+ is browser-only (src/lib/signup-validation.ts).
--   - 14 profiles, all with a birth date, a city and a name; none under 16. 64 fixture files create users with
--     email_confirm: true and the full metadata; seeds likewise.
--   - Readers of date_of_birth: enforce_seller_type_age_gate and enforce_job_responder_capability refuse a null one
--     (null-safe). admin_process_deletion_request's tombstone sets city = null and date_of_birth = 1900-01-01: hence
--     the CHECK covers the birth date and the terms only, never the city (the client can also edit city / full_name
--     through its column grant). No view reads date_of_birth.
--   - profiles: SELECT table-level (own row + admin policies); UPDATE column-granted (avatar_url, city, full_name,
--     language, phone, seller_type), so the 3 new columns get no client write. enforce_profile_admin_marker_lock
--     guards is_admin / suspended_* only, so the definer RPC may write the birth date.
--   - postgres: TRIGGER, INSERT, UPDATE, DELETE, REFERENCES on auth.users; DELETE on auth.sessions. Deleting a session
--     cascades to auth.refresh_tokens and auth.mfa_amr_claims. supabase_auth_admin has no USAGE on schema private, so
--     the password trigger function is SECURITY DEFINER (as sync_profile_email is). private holds no table yet and has
--     no default privileges; anon / authenticated have USAGE on it (private.is_account_active).
--   - auth.sessions.created_at has no database default: GoTrue writes it from its own clock. The trigger uses the
--     database's, hence the RPC's one-minute tolerance (decision 3 below).
--
-- DECISIONS FOR THE ARCHITECT
--   1. The terms version: private.current_terms_version() = 'cgu-2026-06-17+confidentialite-2026-11-14', the dates the
--      two pages show (legal.updatedDate, legal.privacy.updatedDate). The RPC refuses any other value (terms_outdated),
--      so what is stored is what the page showed; a migration bumps it when either document changes.
--   2. An account complete at creation (transitional sign-ups, fixtures, seeds) records terms_version « avant 2026-11 »
--      (the sign-up notice, decision 3). DB-2 revisits the label for service-role creations.
--   3. « A password set during this session » = account_password_set.set_at >= the session's created_at minus five
--      seconds (GoTrue's clock vs the database's). The trigger cannot see which session changed the password, so the
--      RPC also refuses while any other session of the account is alive (other_sessions; review M1): the page ends
--      them, sets the password, then completes. A password set at insert writes no row at all.
--   4. The city at completion: not blank, at most 100 characters; not checked against the 24 governorates (« Mon
--      compte » does not either). A list check would be its own change.
--   5. The backfill moves the 14 profiles' updated_at to the apply time (profiles_set_updated_at).
--   6. Google, later: the RPC accepts amr `otp` only. The Google PR adds `oauth` and the « password optional with a
--      Google identity » branch, with its own tests.
--
-- DEPENDENCIES
--   - « Confirm email » ON (DB-2's narrowed rule relies on it: a public sign-up is never confirmed at insert).
--   - amr `otp` = « proved control of the inbox » only while phone / SMS sign-in stays OFF.
--   - « Secure email change » ON (to confirm, review M2): otherwise a squatter's password session could move the
--     account to the squatter's own address before completion, and an e-mail-change link also yields an otp session.
--   - Anonymous sign-ins OFF (review L5): handle_new_user no longer fails without a birth date, so every auth.users
--     insert now gets a profile; profiles.email stays NOT NULL, so an e-mail-less user still fails.
--   - The new foreign key into auth.users is ON DELETE CASCADE, so purge_unconfirmed_signups' exclusions need no change.
--
-- AFTER THE APPLY (db-guardian, then commit 3)
--   - Catalog: the 3 columns, the 2 CHECKs, date_of_birth nullable, the trigger on auth.users, EXECUTE on
--     complete_my_account for authenticated only, none on the trigger functions or private.current_terms_version.
--   - Counts: 14 profiles, 14 complete, terms_version « avant 2026-11 » on 14, 0 incomplete.
--   - The ROLLED-BACK CHECK at the end of this file (a password session is refused: a live test cannot sign in with a
--     password while CAPTCHA is ON).
--   - Live, one at a time: two-step-signup-db-live (3 verifications), two-step-signup-auth-live (5),
--     admin-requests-live (the deletion tombstone under the new CHECK, 2), client-write-grants-live (no change, 1).
--   - Then: rename to the recorded version, README entry, regenerate the types (expect a zero diff), data-model.md.

-- ─── 1. profiles: the completion state ───────────────────────────────────────────────────────────────

alter table public.profiles
  add column completed_at      timestamptz,
  add column terms_accepted_at timestamptz,
  add column terms_version     text;

alter table public.profiles alter column date_of_birth drop not null;

-- Every existing profile is complete; its terms count as accepted at sign-up (founder decision 3).
update public.profiles
   set completed_at = created_at,
       terms_accepted_at = created_at,
       terms_version = 'avant 2026-11'
 where completed_at is null;

alter table public.profiles
  add constraint profiles_completion_requires_birth_date_and_terms
    check (completed_at is null
           or (date_of_birth is not null and terms_accepted_at is not null and terms_version is not null)),
  add constraint profiles_terms_version_check
    check (terms_version is null or char_length(terms_version) between 1 and 100);

comment on column public.profiles.completed_at is
  'Two-step sign-up: set when the account is complete (step 2, complete_my_account; or at creation for a sign-up that carries the full profile). Null = the e-mail link was used but « Finalisez votre compte » is not done.';
comment on column public.profiles.terms_accepted_at is
  'When the terms and the privacy policy were accepted (step 2), or the sign-up date for accounts created before the checkbox.';
comment on column public.profiles.terms_version is
  'The terms version accepted: private.current_terms_version() at step 2, « avant 2026-11 » for accounts created before the checkbox.';

-- ─── 2. The terms version the completion step accepts ──────────────────────────────────────────────

create or replace function private.current_terms_version()
returns text
language sql
immutable
set search_path = ''
as $$
  select 'cgu-2026-06-17+confidentialite-2026-11-14'::text;
$$;

revoke all on function private.current_terms_version() from public, anon, authenticated;

comment on function private.current_terms_version() is
  'The terms + privacy policy version shown at step 2 (their « Mise à jour » dates). Bump it with a migration when either document changes; complete_my_account refuses any other value.';

-- ─── 3. When the password was last set (a password set at insert writes nothing) ──────────────────

create table private.account_password_set (
  user_id uuid primary key references auth.users (id) on delete cascade,
  set_at  timestamptz not null
);

alter table private.account_password_set enable row level security;
revoke all on table private.account_password_set from public, anon, authenticated;

comment on table private.account_password_set is
  'Two-step sign-up: when each account last changed its password (trigger on auth.users). complete_my_account requires a change during the completing session, so a password chosen by whoever created the account never counts.';

create or replace function public.track_password_set()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into private.account_password_set (user_id, set_at)
  values (new.id, now())
  on conflict (user_id) do update set set_at = excluded.set_at;
  return null;
end;
$$;

revoke all on function public.track_password_set() from public, anon, authenticated;

-- No column list on purpose: the WHEN clause sees the real change whatever columns GoTrue's UPDATE names.
create trigger on_auth_user_password_set
  after update on auth.users
  for each row
  when (new.encrypted_password is distinct from old.encrypted_password and coalesce(new.encrypted_password, '') <> '')
  execute function public.track_password_set();

-- ─── 4. handle_new_user: every profile is created, complete only with the full profile ────────────

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_meta     jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_dob      date  := nullif(btrim(coalesce(v_meta ->> 'date_of_birth', '')), '')::date;
  v_complete boolean;
begin
  -- TRANSITIONAL (DB-1): a sign-up that carries the full profile is complete at creation, as today's form is. DB-2 adds
  -- « and new.email_confirmed_at is not null » (the service role's fixtures and seeds only) and the 16+ rule here too
  -- (review L6; three suites' 15-year-old « minor » fixtures move to 17 then, still under 18).
  v_complete := v_dob is not null
                and nullif(btrim(coalesce(v_meta ->> 'city', '')), '') is not null
                and btrim(coalesce(v_meta ->> 'full_name', '')) <> '';

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
    case when v_complete then 'avant 2026-11' end
  );
  return new;
end;
$$;

-- ─── 5. Step 2: complete_my_account ────────────────────────────────────────────────────────────────

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

  update public.profiles
     set full_name = v_name,
         date_of_birth = p_date_of_birth,
         city = v_city,
         completed_at = now(),
         terms_accepted_at = now(),
         terms_version = p_terms_version
   where id = v_uid;

  -- Belt and braces: a session opened since the check above ends too (refresh tokens and amr claims cascade). An access
  -- token already issued stays valid until it expires (one hour): DB-2 checks the JWT's session_id on every write.
  delete from auth.sessions s where s.user_id = v_uid and s.id <> v_session;
end;
$$;

revoke all on function public.complete_my_account(text, date, text, text) from public, anon;
grant execute on function public.complete_my_account(text, date, text, text) to authenticated;

comment on function public.complete_my_account(text, date, text, text) is
  'Two-step sign-up, step 2 (« Finalisez votre compte »): from a session opened by an e-mailed link or code, with no other session alive, after a password was set in it, 16+. Completes the profile and records the terms.';

-- ─── ROLLED-BACK CHECK (after the apply; run as one block, nothing persists) ───────────────────────
-- A password session cannot complete an account. A live test cannot create one (CAPTCHA guards the password grant),
-- so this simulates its claims. It checks the HINT, not only the SQLSTATE: « permission denied » is 42501 too.
--
-- Any FAIL raises (the whole block errors); success ends on a visible row « PASS ».
--
-- begin;
-- insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at)
-- values ('7f000000-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated',
--         'authenticated', 'tsdb-rollback@rls-smoke.servyou.invalid', '{"full_name":"Rollback Check"}', now(), now());
-- do $$
-- begin
--   if not exists (select 1 from public.profiles
--                   where id = '7f000000-0000-4000-8000-000000000001' and completed_at is null and date_of_birth is null) then
--     raise exception 'FAIL: a sign-up without a birth date did not create an incomplete profile';
--   end if;
-- end $$;
-- select set_config('request.jwt.claims',
--   '{"sub":"7f000000-0000-4000-8000-000000000001","role":"authenticated","session_id":"7f000000-0000-4000-8000-000000000002","amr":[{"method":"password","timestamp":1}]}',
--   true);
-- set local role authenticated;
-- do $$
-- declare v_hint text;
-- begin
--   perform public.complete_my_account('Rollback Check', date '1990-01-01', 'Tunis', 'cgu-2026-06-17+confidentialite-2026-11-14');
--   raise exception 'FAIL: a password session completed the account';
-- exception when sqlstate '42501' then
--   get stacked diagnostics v_hint = pg_exception_hint;
--   if v_hint is distinct from 'email_link_required' then raise exception 'FAIL: wrong refusal (hint %)', v_hint; end if;
-- end $$;
-- select 'PASS: an incomplete profile is created, and a password session is refused (email_link_required)' as result;
-- rollback;

-- ─── ROLLBACK (one transaction) ─────────────────────────────────────────────────────────────────────
-- drop trigger on_auth_user_password_set on auth.users;
-- drop function public.track_password_set();
-- drop table private.account_password_set;
-- drop function public.complete_my_account(text, date, text, text);
-- drop function private.current_terms_version();
-- create or replace function public.handle_new_user()
--  returns trigger language plpgsql security definer set search_path to 'public'
-- as $function$
-- begin
--   insert into public.profiles (id, full_name, email, date_of_birth, city, language)
--   values (
--     new.id,
--     coalesce(new.raw_user_meta_data ->> 'full_name', ''),
--     new.email,
--     (new.raw_user_meta_data ->> 'date_of_birth')::date,
--     new.raw_user_meta_data ->> 'city',
--     coalesce(new.raw_user_meta_data ->> 'language', 'fr')
--   );
--   return new;
-- end;
-- $function$;
-- alter table public.profiles drop constraint profiles_completion_requires_birth_date_and_terms,
--   drop constraint profiles_terms_version_check;
-- (date_of_birth back to NOT NULL fails while a profile has none: complete or delete those accounts first)
-- alter table public.profiles alter column date_of_birth set not null;
-- alter table public.profiles drop column completed_at, drop column terms_accepted_at, drop column terms_version;
