-- Missions M-C -- the H12 proposal fields (gap G4), moderated posts in the response trigger (G5), typed
-- trigger failures (G7), and the two response-cap races logged by M-A. Source:
-- docs/design/h9-h13-measurements.md section 6.4 (G4, G5, G7), section 9 (M-C) and D-H12-5 / D-H13-3, on
-- feat/h9-missions (c7f54c1); docs/follow-ups.md "concurrent responses can overshoot the 10-per-post cap".
-- Unblocks H12 (PR-2) and the H11 « MA PROPOSITION » column (PR-3).
--
-- Live on 2026-10-26 (after migrations 67 and 68):
--   * job_responses = id, job_post_id, freelancer_id, proposal_message (NULLable, no length rule),
--     created_at; UNIQUE (job_post_id, freelancer_id). 3 rows, messages 3-12 characters. authenticated
--     holds INSERT / DELETE / SELECT (no UPDATE), anon SELECT. No app code writes it yet (H12 unbuilt).
--   * check_job_response_limits (BEFORE INSERT, SECURITY DEFINER, search_path public) raises untyped
--     P0001 prose: "n'est plus ouverte" for filled AND deleted posts alike; it ignores admin_hidden_at, so a
--     moderated open post can be answered over REST and still counts toward the 5-active cap while RLS
--     hides it; it counts rows without locking the post, so concurrent responses can pass 10 (and one
--     freelancer's concurrent responses can pass 5).
--   * enforce_job_responder_capability (BEFORE INSERT) already uses 42501 and FOR SHARE on the profile.
--
-- After it:
--   * job_responses gains proposed_price_tnd numeric(10,2) (0 <= x < 1 000 000), proposed_timeframe
--     (1-60 characters after trim), portfolio_links jsonb NOT NULL DEFAULT '[]' (an array of at most 3
--     {url, label?} objects: http(s) only, url <= 500, label <= 60, no other key, no duplicate url -- the
--     post owner renders them as links). proposal_message must be 20-1000 characters after trim (decision
--     MC-1): NOT VALID, so the 3 legacy rows (3-12 characters) are not rewritten -- but NOT VALID still
--     checks every later write of them: any UPDATE of a legacy row, even by the service role on another
--     column, fails 23514 until its message is fixed (no client holds UPDATE on job_responses).
--   * job_response_skills (id, job_response_id -> job_responses ON DELETE CASCADE, skill, created_at),
--     mirroring job_post_skills: 1-60 characters, unique per response case-insensitively, at most 8 per
--     response. RLS in this migration: the responder inserts / deletes on their own response; a row is
--     readable exactly when its response is (job_responses' policy: responder + post owner). Grants are
--     explicit (default privileges are closed since migration 68): authenticated SELECT / INSERT / DELETE,
--     nothing for anon. trg_enforce_active_user like every other client-writable table.
--   * check_job_response_limits, same French messages, now typed: each refusal carries a stable HINT code
--     (job_not_found, job_unavailable, job_filled, job_deleted, job_closed, job_expired, own_post, duplicate,
--     job_full, cap_active) and an SQLSTATE (23503 / 23514 / 42501 / 23505). A moderated post is refused
--     (job_unavailable, with the "closed" message: it never describes moderation to the freelancer) and no
--     longer counts toward the 5-active cap. The post row is locked FOR UPDATE first, so concurrent
--     responses to one post queue and the 10-cap reads the committed response_count; then a per-freelancer
--     transaction advisory lock, so one freelancer's concurrent responses queue for the 5-cap. Every caller
--     takes the post lock before the freelancer lock: no lock cycle (enforce_job_responder_capability's
--     FOR SHARE on the profile does not conflict with either).
--   * enforce_job_responder_capability: same body and messages, plus HINT codes (not_self, not_freelancer,
--     under_18, suspended, no_freelancer_profile, profile_hidden).
--   Codes are what H12's action maps (D-H13-3: failures rendered in place); French text stays for logs.
--
-- Not changed: no existing row is rewritten; job_responses grants and policies are untouched (no client
-- UPDATE, so the new columns are insert-only). Firing order on job_responses INSERT: trg_enforce_active_user
-- (statement) -> trg_check_job_responder_capability -> trg_check_job_response_limits ->
-- trg_enforce_job_response_fields (new) -> row written (CHECKs) -> trg_sync_job_post_response_count.

-- ── G4: the proposal fields ─────────────────────────────────────────────────────────────────────────────
alter table public.job_responses
  add column proposed_price_tnd numeric(10,2),
  add column proposed_timeframe text,
  add column portfolio_links jsonb not null default '[]'::jsonb,
  add constraint job_responses_proposed_price_range
    check (proposed_price_tnd is null or (proposed_price_tnd >= 0 and proposed_price_tnd < 1000000)),
  add constraint job_responses_proposed_timeframe_length
    check (proposed_timeframe is null or char_length(btrim(proposed_timeframe)) between 1 and 60),
  add constraint job_responses_portfolio_links_shape
    check (case when jsonb_typeof(portfolio_links) = 'array' then jsonb_array_length(portfolio_links) <= 3 else false end);

alter table public.job_responses
  add constraint job_responses_proposal_message_length
    check (proposal_message is not null and char_length(btrim(proposal_message)) between 20 and 1000) not valid;

-- Per-link rules a CHECK cannot express without a function the writer would need EXECUTE on.
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
  -- Not an array (or NULL): leave it to job_responses_portfolio_links_shape / NOT NULL, which name it.
  if new.portfolio_links is null or jsonb_typeof(new.portfolio_links) <> 'array' then
    return new;
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

revoke execute on function public.enforce_job_response_fields() from public, anon, authenticated;

create trigger trg_enforce_job_response_fields
  before insert or update of portfolio_links on public.job_responses
  for each row execute function public.enforce_job_response_fields();

-- ── G4: job_response_skills ─────────────────────────────────────────────────────────────────────────────
create table public.job_response_skills (
  id uuid primary key default gen_random_uuid(),
  job_response_id uuid not null references public.job_responses (id) on delete cascade,
  skill text not null,
  created_at timestamptz not null default now(),
  constraint job_response_skills_skill_length check (char_length(btrim(skill)) between 1 and 60)
);

create unique index job_response_skills_unique_skill on public.job_response_skills (job_response_id, lower(btrim(skill)));

alter table public.job_response_skills enable row level security;

create policy "Responder adds skills to own response" on public.job_response_skills
  for insert to authenticated
  with check (exists (select 1 from public.job_responses jr
                       where jr.id = job_response_skills.job_response_id and jr.freelancer_id = (select auth.uid())));

create policy "Responder removes skills from own response" on public.job_response_skills
  for delete to authenticated
  using (exists (select 1 from public.job_responses jr
                  where jr.id = job_response_skills.job_response_id and jr.freelancer_id = (select auth.uid())));

-- Readable exactly when the response is: job_responses' own policy (responder + post owner) applies inside.
create policy "Response skills readable with their response" on public.job_response_skills
  for select to authenticated
  using (exists (select 1 from public.job_responses jr where jr.id = job_response_skills.job_response_id));

-- Explicit, since migration 68 closed the defaults: no anon access, no UPDATE (no policy for it).
revoke all on public.job_response_skills from anon, authenticated;
grant select, insert, delete on public.job_response_skills to authenticated;

create trigger trg_enforce_active_user
  before insert or update or delete on public.job_response_skills
  for each statement execute function public.enforce_active_user();

-- At most 8 skills per response. The response row is locked first, so concurrent inserts queue; rows
-- inserted earlier in the same statement are visible to this BEFORE ROW trigger.
create or replace function public.enforce_job_response_skills_limit()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_count integer;
begin
  perform 1 from public.job_responses where id = new.job_response_id for update;
  select count(*) into v_count from public.job_response_skills where job_response_id = new.job_response_id;
  if v_count >= 8 then
    raise exception 'Une proposition compte au plus 8 compétences.'
      using errcode = '23514', hint = 'too_many_skills';
  end if;
  return new;
end;
$function$;

revoke execute on function public.enforce_job_response_skills_limit() from public, anon, authenticated;

create trigger trg_enforce_job_response_skills_limit
  before insert on public.job_response_skills
  for each row execute function public.enforce_job_response_skills_limit();

-- ── G5 + G7 + the cap races: check_job_response_limits ─────────────────────────────────────────────────
create or replace function public.check_job_response_limits()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_post   public.job_posts%rowtype;
  v_active integer;
begin
  -- Concurrent responses to this post queue here; after the wait the row read is the committed one.
  select * into v_post from public.job_posts where id = new.job_post_id for update;

  if not found then
    raise exception 'Annonce introuvable.'
      using errcode = '23503', hint = 'job_not_found';
  end if;

  if v_post.admin_hidden_at is not null then
    raise exception 'Cette annonce n''est plus ouverte.'
      using errcode = '23514', hint = 'job_unavailable';
  end if;

  if v_post.status <> 'open' then
    raise exception 'Cette annonce n''est plus ouverte.'
      using errcode = '23514',
            hint = case v_post.status when 'filled' then 'job_filled' when 'deleted' then 'job_deleted'
                                      when 'expired' then 'job_expired' else 'job_closed' end;
  end if;

  if v_post.created_at < (now() - interval '30 days') then
    raise exception 'Cette annonce a expiré.'
      using errcode = '23514', hint = 'job_expired';
  end if;

  if new.freelancer_id = v_post.consumer_id then
    raise exception 'Vous ne pouvez pas répondre à votre propre annonce.'
      using errcode = '42501', hint = 'own_post';
  end if;

  -- Friendly error before the UNIQUE constraint fires.
  if exists (select 1 from public.job_responses
              where job_post_id = new.job_post_id and freelancer_id = new.freelancer_id) then
    raise exception 'Vous avez déjà répondu à cette annonce.'
      using errcode = '23505', hint = 'duplicate';
  end if;

  -- response_count is kept by trg_sync_job_post_response_count (migration 67) and read under the lock.
  if v_post.response_count >= 10 then
    raise exception 'Cette annonce a atteint le nombre maximum de réponses (10).'
      using errcode = '23514', hint = 'job_full';
  end if;

  -- One freelancer's concurrent responses (to different posts) queue here. Always taken after the post
  -- lock, so no two callers can wait on each other in opposite order.
  perform pg_advisory_xact_lock(hashtextextended('job_responses.active:' || new.freelancer_id::text, 0));

  -- Active = open, not moderated, not past the 30-day expiry -- what the freelancer can still see.
  select count(*) into v_active
    from public.job_responses jr
    join public.job_posts jp on jp.id = jr.job_post_id
   where jr.freelancer_id = new.freelancer_id
     and jp.status = 'open'
     and jp.admin_hidden_at is null
     and jp.created_at >= (now() - interval '30 days');

  if v_active >= 5 then
    raise exception 'Vous avez atteint le nombre maximum de réponses actives (5).'
      using errcode = '23514', hint = 'cap_active';
  end if;

  return new;
end;
$function$;

-- ── G7: enforce_job_responder_capability -- same body and messages, plus HINT codes ────────────────────
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
      using errcode = '42501', hint = 'not_self';
  end if;

  -- FOR SHARE serializes this check against a concurrent seller_type UPDATE on the same profile.
  select p.seller_type, p.date_of_birth, p.suspended_at
    into v_type, v_dob, v_suspended
    from public.profiles p
   where p.id = new.freelancer_id
     for share;

  if v_type is distinct from 'freelancer' then
    raise exception 'Seul un compte freelance peut répondre à une annonce.'
      using errcode = '42501', hint = 'not_freelancer';
  end if;

  if v_dob is null or v_dob > (current_date - interval '18 years') then
    raise exception 'Il faut avoir 18 ans pour répondre à une annonce.'
      using errcode = '42501', hint = 'under_18';
  end if;

  if v_suspended is not null then
    raise exception 'Un compte suspendu ne peut pas répondre à une annonce.'
      using errcode = '42501', hint = 'suspended';
  end if;

  select f.admin_hidden_at
    into v_hidden
    from public.freelancer_profiles f
   where f.profile_id = new.freelancer_id;

  if not found then
    raise exception 'Un profil freelance est requis pour répondre à une annonce.'
      using errcode = '42501', hint = 'no_freelancer_profile';
  end if;

  if v_hidden is not null then
    raise exception 'Un profil freelance masqué par la modération ne peut pas répondre à une annonce.'
      using errcode = '42501', hint = 'profile_hidden';
  end if;

  return new;
end;
$function$;

-- Post-apply verification:
--   1. \d job_responses: 3 new columns, 4 new CHECKs (the message one NOT VALID), trigger
--      trg_enforce_job_response_fields; select count(*) from job_responses where not (proposal_message is
--      not null and char_length(btrim(proposal_message)) between 20 and 1000) = 3 (legacy, untouched).
--   2. job_response_skills: relrowsecurity = true, 3 policies (all TO authenticated), grants authenticated
--      = SELECT, INSERT, DELETE only, anon none; triggers trg_enforce_active_user + the skills limit.
--   3. has_function_privilege('anon' | 'authenticated', <each new or replaced function>, 'EXECUTE') = false.
--   4. As a freelancer JWT in a rolled-back transaction: a response to a filled post fails with
--      hint job_filled; a 19-character message fails job_responses_proposal_message_length; a link
--      "javascript:alert(1)" fails hint invalid_links.
--
-- Rollback:
--   drop table public.job_response_skills;
--   drop function public.enforce_job_response_skills_limit();
--   drop trigger trg_enforce_job_response_fields on public.job_responses;
--   drop function public.enforce_job_response_fields();
--   alter table public.job_responses
--     drop constraint job_responses_proposal_message_length,
--     drop column portfolio_links, drop column proposed_timeframe, drop column proposed_price_tnd;
--   -- enforce_job_responder_capability: re-run its CREATE OR REPLACE above with every ", hint = '…'" removed
--   -- (the body is otherwise identical to the live one of 2026-10-26).
--   -- check_job_response_limits: the live body of 2026-10-26, verbatim:
--   create or replace function public.check_job_response_limits() returns trigger language plpgsql
--     security definer set search_path to 'public' as $function$
--   DECLARE
--     v_post         job_posts%ROWTYPE;
--     v_response_cnt integer;
--     v_active_cnt   integer;
--   BEGIN
--     SELECT * INTO v_post FROM job_posts WHERE id = NEW.job_post_id;
--     IF NOT FOUND THEN RAISE EXCEPTION 'Annonce introuvable.'; END IF;
--     IF v_post.status != 'open' THEN RAISE EXCEPTION 'Cette annonce n''est plus ouverte.'; END IF;
--     IF v_post.created_at < (now() - interval '30 days') THEN RAISE EXCEPTION 'Cette annonce a expiré.'; END IF;
--     IF NEW.freelancer_id = v_post.consumer_id THEN
--       RAISE EXCEPTION 'Vous ne pouvez pas répondre à votre propre annonce.'; END IF;
--     IF EXISTS (SELECT 1 FROM job_responses WHERE job_post_id = NEW.job_post_id AND freelancer_id = NEW.freelancer_id) THEN
--       RAISE EXCEPTION 'Vous avez déjà répondu à cette annonce.'; END IF;
--     SELECT count(*) INTO v_response_cnt FROM job_responses WHERE job_post_id = NEW.job_post_id;
--     IF v_response_cnt >= 10 THEN
--       RAISE EXCEPTION 'Cette annonce a atteint le nombre maximum de réponses (10).'; END IF;
--     SELECT count(*) INTO v_active_cnt FROM job_responses jr JOIN job_posts jp ON jp.id = jr.job_post_id
--      WHERE jr.freelancer_id = NEW.freelancer_id AND jp.status = 'open' AND jp.created_at >= (now() - interval '30 days');
--     IF v_active_cnt >= 5 THEN
--       RAISE EXCEPTION 'Vous avez atteint le nombre maximum de réponses actives (5).'; END IF;
--     RETURN NEW;
--   END;
--   $function$;
