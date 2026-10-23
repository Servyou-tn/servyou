-- fix(security): only an adult, active freelancer can respond to a job post; a freelancer cannot
-- switch away while holding responses. Until now the only INSERT gate on job_responses was the RLS
-- policy "Freelancer creates own response", `with check (freelancer_id = auth.uid())`.
-- freelancer_id references profiles, not freelancer_profiles, and check_job_response_limits()
-- (BEFORE INSERT) checks open / expiry / self-response / duplicate / the 10-per-post and 5-active
-- caps but never who is responding. No app code inserts responses, so the policy was the whole
-- gate: any signed-in account -- a consumer, a self-declared minor, a shop owner -- could POST
-- /rest/v1/job_responses on an open post and then call get_contact_phone(poster), which returns the
-- poster's phone whenever a response links the two. Closes docs/follow-ups.md "Security audit --
-- open findings (2026-10-23)", HIGH "job_responses INSERT bypasses the 18+ and
-- freelancer-capability rules (and unlocks phones)", including its switch-path corollary.
--
-- Part 1 -- job_responses (BEFORE INSERT). A sibling of check_job_response_limits(), which is
-- untouched. Same-timing row triggers fire in name order: trg_check_job_responder_capability sorts
-- before trg_check_job_response_limits ('d' < 's'), so a non-freelancer is refused for who they are
-- before the caps run their counts or the post's state is described to them. For signed-in
-- non-admin callers the responding account (NEW.freelancer_id) must:
--   * be the caller (42501). The RLS WITH CHECK says the same, but it runs AFTER every BEFORE
--     trigger: without this first check a caller could POST another account's id and read that
--     account's private state out of the messages below (suspended, under 18, unpublished or
--     moderated profile) -- and out of check_job_response_limits' "déjà répondu" and 5-active
--     messages, whether it responded to a given post. One generic message, raised before any
--     lookup or lock on the other account;
--   * hold seller_type = 'freelancer' (42501);
--   * be 18 or older -- the same expression as enforce_seller_type_age_gate. Redundant for client
--     paths (seller_type only becomes non-null through that age-gated UPDATE and date_of_birth is
--     not client-UPDATEable) but not for a seller_type set by an admin or the service role, which
--     bypass the age gate (42501);
--   * not be suspended -- profiles.suspended_at NULL (42501). The first DB-level read of
--     suspended_at on a write path; the wider gap stays logged (suspension HIGH);
--   * own a freelancer_profiles row (42501) that is not admin-moderated (42501). Caveat: the
--     moderation check holds only until the profile is re-created -- a moderated freelancer with
--     no orders can DELETE their own profile ("Owner deletes own freelancer profile" checks only
--     ownership) and INSERT a fresh one with admin_hidden_at NULL (enforce_admin_marker_lock is
--     BEFORE UPDATE only). Moderation evasion across the whole freelancer surface; logged in
--     docs/follow-ups.md, not fixed here (decision D4).
-- The account's profiles row is read FOR SHARE: the FK check on freelancer_id only takes KEY SHARE,
-- which does not conflict with a seller_type UPDATE, so this lock is what serializes the check
-- against Part 2 -- a concurrent switch waits for this insert to commit and then sees the response,
-- and an insert behind an uncommitted switch waits and re-reads the new seller_type.
-- freelancer_profiles is not locked: a concurrent profile delete lands in the same end state either
-- way (the response stays, the account is still seller_type 'freelancer', Part 2 holds).
-- The account is read from NEW (migration 55's pattern), which the first check pins to auth.uid()
-- for every non-admin caller -- so the rule holds even if the INSERT policy is ever widened.
-- INSERT only: job_responses has no UPDATE policy, so no client can move a response to another
-- account or post; Part 3 also takes the unused UPDATE grant away.
--
-- Part 2 -- profiles (BEFORE UPDATE OF seller_type): enforce_seller_capability_switch() from
-- migration 55, extended. A response is freelancer-capability content: it is what unlocks
-- get_contact_phone in both directions. Migration 55 counts only shops and freelancer profiles, so
-- a freelancer with no orders could delete their profile, switch to 'shop_owner' (or NULL), open a
-- shop and keep every response and its phone unlock. The function body below is migration 55's,
-- verbatim, plus one conjunct after the existing check: when seller_type actually changes to
-- anything but 'freelancer', the account must hold no job_responses row at all (42501, its own
-- message, so the migration-55 message stays pinned). ANY response, not only those on open posts:
-- get_contact_phone ignores the post's status and expiry. The account can withdraw its responses
-- ("Freelancer deletes own response") and then switch. No app path moves seller_type away from a
-- non-null value, so no UX changes. A seller_type-NULL account holding responses (only reachable
-- through the service role) can still move to 'freelancer'.
--
-- Part 3 -- grants (decision D3, approved). anon held INSERT on job_responses;
-- RLS stops the row, but only after the BEFORE triggers, and anon skips Part 1 (auth.uid() NULL),
-- so it still reaches check_job_response_limits and can read "déjà répondu" for any (post,
-- account) pair. Revoking INSERT fails anon at the privilege check, before any trigger. UPDATE is
-- granted to anon and authenticated but no UPDATE policy exists and no code updates a response;
-- revoking it makes "INSERT only" hold at the grant level, so a future UPDATE policy cannot move a
-- response past Part 1 and the caps without a deliberate re-grant. The service role keeps every
-- privilege. anon keeps SELECT / DELETE and authenticated SELECT / INSERT / DELETE, both plus the
-- Supabase defaults REFERENCES / TRIGGER / TRUNCATE (TRUNCATE skips RLS but PostgREST never issues
-- it -- the table-wide TRUNCATE sweep is logged in docs/follow-ups.md).
--
-- Bypass: auth.uid() NULL and is_admin(), like every other guard trigger. Load-bearing: three
-- live-DB suites insert responses through the service role for accounts that hold no seller_type
-- and no freelancer profile -- job-limits, profiles-rls and progressive-phone.integration.
-- anon also has auth.uid() NULL but can never insert: Part 3 takes its INSERT grant, and without
-- Part 3 the RLS WITH CHECK freelancer_id = auth.uid() fails for it (freelancer_id is NOT NULL).
--
-- Supabase advisors (2026-10-23, before apply): job_responses.freelancer_id is already indexed
-- (job_responses_freelancer_idx), so Part 2's EXISTS and get_contact_phone's lookup need no new
-- index. Both functions keep Supabase's default EXECUTE grants to anon / authenticated, so the new
-- one joins every other SECURITY DEFINER function in public under lints 0028/0029 (harmless for a
-- trigger function -- "trigger functions can only be called as triggers"); revoking them all,
-- default privileges included, is one hygiene PR (docs/follow-ups.md). The three job_responses
-- policies keep auth.uid() unwrapped and no TO clause (lint auth_rls_initplan) -- untouched here,
-- extend-don't-replace. 0 anonymous users exist; one would be refused by Part 1 anyway
-- (seller_type NULL).
--
-- New writes only; no existing row is rewritten. Discovery (2026-10-23): 3 responses, all from
-- accounts with seller_type 'freelancer', adult, not suspended, not admin, owning a published,
-- unmoderated freelancer profile and no shop -- every one would pass Part 1 today. No account
-- holding a response has a seller_type other than 'freelancer', so Part 2 blocks nobody now. Of
-- the 11 seller_type 'freelancer' accounts, 0 are under 18, suspended or moderated; 1 owns no
-- freelancer profile (and no response) and would be refused, as intended.

-- ─── Part 1 ─────────────────────────────────────────────────────────────────────────────────────
create or replace function public.enforce_job_responder_capability()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_type      text;
  v_dob       date;
  v_suspended timestamptz;
  v_hidden    timestamptz;
begin
  if auth.uid() is null then
    return new;
  end if;
  if public.is_admin() then
    return new;
  end if;

  -- Before any lookup: the messages below must never describe another account.
  if new.freelancer_id is distinct from auth.uid() then
    raise exception 'Vous ne pouvez répondre à une annonce qu''en votre propre nom.'
      using errcode = '42501';
  end if;

  -- FOR SHARE serializes this check against a concurrent seller_type UPDATE on the same profile.
  select p.seller_type, p.date_of_birth, p.suspended_at
    into v_type, v_dob, v_suspended
    from public.profiles p
   where p.id = new.freelancer_id
     for share;

  if v_type is distinct from 'freelancer' then
    raise exception 'Seul un compte freelance peut répondre à une annonce.'
      using errcode = '42501';
  end if;

  if v_dob is null or v_dob > (current_date - interval '18 years') then
    raise exception 'Il faut avoir 18 ans pour répondre à une annonce.'
      using errcode = '42501';
  end if;

  if v_suspended is not null then
    raise exception 'Un compte suspendu ne peut pas répondre à une annonce.'
      using errcode = '42501';
  end if;

  select f.admin_hidden_at
    into v_hidden
    from public.freelancer_profiles f
   where f.profile_id = new.freelancer_id;

  if not found then
    raise exception 'Un profil freelance est requis pour répondre à une annonce.'
      using errcode = '42501';
  end if;

  if v_hidden is not null then
    raise exception 'Un profil freelance masqué par la modération ne peut pas répondre à une annonce.'
      using errcode = '42501';
  end if;

  return new;
end;
$function$;

comment on function public.enforce_job_responder_capability() is
  'BEFORE INSERT on job_responses (trg_check_job_responder_capability, fires before trg_check_job_response_limits by name). Signed-in non-admin callers only: the responding account (NEW.freelancer_id) must be the caller (checked first, so no message describes another account), hold seller_type = freelancer, be 18+ (same expression as enforce_seller_type_age_gate), not be suspended, and own a freelancer_profiles row that is not admin-moderated -- all 42501. Its profiles row is read FOR SHARE to serialize against a seller_type switch. auth.uid() NULL (service role, seeds) and is_admin() bypass, matching the other guard triggers. 2026-10-23. SECURITY DEFINER.';

create trigger trg_check_job_responder_capability
  before insert on public.job_responses
  for each row execute function public.enforce_job_responder_capability();

-- ─── Part 2 ─────────────────────────────────────────────────────────────────────────────────────
create or replace function public.enforce_seller_capability_switch()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if auth.uid() is null then
    return new;
  end if;
  if public.is_admin() then
    return new;
  end if;
  if new.seller_type is not distinct from old.seller_type then
    return new;
  end if;

  if (new.seller_type is distinct from 'shop_owner'
        and exists (select 1 from public.shops s where s.owner_id = new.id))
     or (new.seller_type is distinct from 'freelancer'
        and exists (select 1 from public.freelancer_profiles f where f.profile_id = new.id)) then
    raise exception 'Le type de vendeur ne peut pas changer tant que le compte possède une boutique ou un profil freelance.'
      using errcode = '42501';
  end if;

  -- Job responses are freelancer content: each one unlocks get_contact_phone with the poster.
  if new.seller_type is distinct from 'freelancer'
     and exists (select 1 from public.job_responses jr where jr.freelancer_id = new.id) then
    raise exception 'Le type de vendeur ne peut pas changer tant que le compte a des réponses à des annonces.'
      using errcode = '42501';
  end if;

  return new;
end;
$function$;

comment on function public.enforce_seller_capability_switch() is
  'BEFORE UPDATE OF seller_type on profiles (fires before enforce_seller_type_age_gate_trigger by name). Signed-in non-admin callers only, and only when seller_type actually changes: the new value must match every capability row the account owns -- no shop unless shop_owner, no freelancer profile and no job_responses row unless freelancer (42501; responses raise their own message). Pairs with enforce_seller_capability() on shops / freelancer_profiles and enforce_job_responder_capability() on job_responses. auth.uid() NULL and is_admin() bypass. 2026-10-23 (job_responses conjunct added by job_responses_responder_integrity). SECURITY DEFINER.';

-- ─── Part 3 (decision D3) ───────────────────────────────────────────────────────────────────────
revoke insert, update on public.job_responses from anon;
revoke update on public.job_responses from authenticated;

-- ─── ROLLBACK (do not run as part of this migration) ───────────────────────────────────────────
-- Per README "Rollback paths": apply as a NEW dated forward migration, never by deleting this file.
-- Re-opens the hole: any signed-in account can again respond to a job post and read the poster's
-- phone. Only ever ship it together with a replacement guard. No data to undo -- nothing is rewritten.
--
-- drop trigger if exists trg_check_job_responder_capability on public.job_responses;
-- drop function if exists public.enforce_job_responder_capability();
-- Part 2: re-run migration 55's (20261023182532_seller_capability_integrity) create or replace
-- function public.enforce_seller_capability_switch() and its comment on function, verbatim.
-- Part 3: grant insert, update on public.job_responses to anon;
--         grant update on public.job_responses to authenticated;
