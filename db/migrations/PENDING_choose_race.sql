-- PENDING — written by db-guardian 2026-11-06, NOT applied. Follow-up #6 of docs/follow-ups/journey-gates.md:
-- a proposal withdrawn while its owner chooses it must never leave a filled post with nobody chosen.
--
-- The race, two ways (READ COMMITTED):
--   a. the withdraw (DELETE) commits between choose_job_response's read of the proposal and its UPDATE: the UPDATE
--      skips the deleted row, no row becomes 'chosen', yet the post becomes 'filled'.
--   b. the withdraw waits on the row choose_job_response is updating, then runs after it commits: PostgreSQL re-checks
--      the DELETE's own row, but the policy's « post is open » subquery keeps its old snapshot, so the DELETE can
--      remove the row that was just chosen.
-- The fix, three parts (all in one transaction):
--   1. choose_job_response locks the proposal row (FOR UPDATE) when it reads it: a withdraw that holds the row first
--      makes it « introuvable » (P0002), one that comes second waits.
--   2. After its UPDATE it checks that exactly one proposal on the post is 'chosen' and that it is this one, else it
--      raises P0002 not_found (the whole call rolls back: the post stays open).
--   3. D1: a client can withdraw only a 'pending' proposal (enforce_job_response_withdraw). That closes case b — the
--      waiting DELETE sees the row's new 'chosen' / 'not_chosen' status and is refused. It never blocks a real
--      withdraw: on an open post every proposal is 'pending' (choose fills the post; a manual close marks them
--      not_chosen; a reopen puts them back to pending).
-- No grant changes: choose_job_response keeps its ACL (CREATE OR REPLACE), EXECUTE for authenticated only.

-- 1 + 2. The live body of 2026-11-06 (migration 20261106153901), changed only where marked « race ».
create or replace function public.choose_job_response(p_response_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_uid        uuid := auth.uid();
  v_post_id    uuid;
  v_freelancer uuid;
  v_post       public.job_posts%rowtype;
  v_chosen     integer;
  v_mine       boolean;
begin
  if v_uid is null then
    raise exception 'Connectez-vous pour choisir une proposition.' using errcode = '42501', hint = 'not_signed_in';
  end if;
  if not public.is_active_user() then
    raise exception 'Ce compte est suspendu.' using errcode = '42501', hint = 'suspended';
  end if;
  select jr.job_post_id into v_post_id from public.job_responses jr where jr.id = p_response_id;
  if v_post_id is not null then
    select * into v_post from public.job_posts jp where jp.id = v_post_id for update;
  end if;
  if v_post_id is null or v_post.id is null or v_post.consumer_id is distinct from v_uid then
    raise exception 'Proposition introuvable.' using errcode = 'P0002', hint = 'not_found';
  end if;
  -- race: lock the proposal too (after the post, the order check_job_response_limits uses). A concurrent withdraw
  -- that got the row first leaves nothing to lock here.
  select jr.freelancer_id into v_freelancer from public.job_responses jr
   where jr.id = p_response_id and jr.job_post_id = v_post_id
     for update;
  if v_freelancer is null then
    raise exception 'Proposition introuvable.' using errcode = 'P0002', hint = 'not_found';
  end if;
  if v_post.admin_hidden_at is not null or v_post.status <> 'open' then
    raise exception 'Cette annonce n''est plus ouverte.'
      using errcode = '23514',
            hint = case when v_post.admin_hidden_at is not null then 'job_unavailable'
                        when v_post.status = 'filled' then 'job_filled'
                        when v_post.status = 'deleted' then 'job_deleted'
                        when v_post.status = 'expired' then 'job_expired'
                        else 'job_unavailable' end;
  end if;
  if v_post.created_at < now() - interval '30 days' then
    raise exception 'Cette annonce a expiré.' using errcode = '23514', hint = 'job_expired';
  end if;
  if exists (select 1 from public.profiles p where p.id = v_freelancer and p.suspended_at is not null)
     or exists (select 1 from public.freelancer_profiles f where f.profile_id = v_freelancer and f.admin_hidden_at is not null) then
    raise exception 'Ce freelance n''est plus disponible.' using errcode = '23514', hint = 'freelancer_unavailable';
  end if;
  update public.job_responses set status = case when id = p_response_id then 'chosen' else 'not_chosen' end
   where job_post_id = v_post_id;
  -- race: exactly one chosen proposal on the post, and it is this one — else nothing happened (P0002, rolled back).
  select count(*) filter (where jr.status = 'chosen'),
         coalesce(bool_or(jr.id = p_response_id and jr.status = 'chosen'), false)
    into v_chosen, v_mine
    from public.job_responses jr
   where jr.job_post_id = v_post_id;
  if v_chosen <> 1 or not v_mine then
    raise exception 'Proposition introuvable.' using errcode = 'P0002', hint = 'not_found';
  end if;
  update public.job_posts set status = 'filled' where id = v_post_id;
  return v_post_id;
end;
$$;

-- 3. D1: a client withdraws only a pending proposal. A client statement runs as anon / authenticated; SECURITY DEFINER
--    code (admin_process_deletion_request's erasure of a freelancer's proposals) and the service role run as other
--    roles and pass, as do the cascades of an account deletion.
create or replace function public.enforce_job_response_withdraw()
returns trigger language plpgsql set search_path = '' as $$
begin
  if current_user not in ('anon', 'authenticated') then
    return old;
  end if;
  if old.status is distinct from 'pending' then
    raise exception 'Cette proposition a déjà reçu une réponse : elle ne peut plus être retirée.'
      using errcode = '42501', hint = 'response_decided';
  end if;
  return old;
end;
$$;

create trigger trg_enforce_job_response_withdraw
  before delete on public.job_responses
  for each row execute function public.enforce_job_response_withdraw();

revoke all on function public.enforce_job_response_withdraw() from public, anon, authenticated;

-- ─── Rolled-back test (for the architect: paste after the body above, in the same transaction) ──────────────────
-- Live 2026-11-06: the 4 proposals all belong to one freelancer; 1 sits on the only open post within 30 days that has
-- a proposal (P); 1 open post within 30 days has none (Q). Ids are kept in transaction-local settings (t.*).
--
-- select set_config('t.p', (select jp.id::text from public.job_posts jp
--   where jp.status = 'open' and jp.admin_hidden_at is null and jp.created_at >= now() - interval '30 days'
--     and exists (select 1 from public.job_responses r where r.job_post_id = jp.id) order by jp.created_at desc limit 1), true);
-- select set_config('t.owner', (select consumer_id::text from public.job_posts where id = current_setting('t.p')::uuid), true);
-- select set_config('t.r1', (select id::text from public.job_responses where job_post_id = current_setting('t.p')::uuid limit 1), true);
-- select set_config('t.f1', (select freelancer_id::text from public.job_responses where id = current_setting('t.r1')::uuid), true);
-- select set_config('t.q', (select jp.id::text from public.job_posts jp
--   where jp.status = 'open' and jp.admin_hidden_at is null and jp.created_at >= now() - interval '30 days'
--     and jp.id <> current_setting('t.p')::uuid order by jp.created_at desc limit 1), true);
-- -- r2: another proposal of the same freelancer, moved onto Q (pending, on an open post: withdrawable).
-- select set_config('t.r2', (select id::text from public.job_responses
--   where freelancer_id = current_setting('t.f1')::uuid and id <> current_setting('t.r1')::uuid limit 1), true);
-- update public.job_responses set job_post_id = current_setting('t.q')::uuid where id = current_setting('t.r2')::uuid;
-- do $$ begin
--   if nullif(current_setting('t.p', true), '') is null or nullif(current_setting('t.q', true), '') is null
--      or nullif(current_setting('t.r2', true), '') is null then
--     raise exception 'FAIL fixtures (%, %, %)', current_setting('t.p', true), current_setting('t.q', true), current_setting('t.r2', true);
--   end if;
-- end $$;
--
-- -- T1 · the owner still chooses: r1 chosen, the post filled, the post id returned.
-- select set_config('request.jwt.claims', json_build_object('sub', current_setting('t.owner'), 'role', 'authenticated')::text, true);
-- set local role authenticated;
-- do $$ declare v uuid; begin
--   v := public.choose_job_response(current_setting('t.r1')::uuid);
--   if v <> current_setting('t.p')::uuid then raise exception 'FAIL T1 returned %', v; end if;
--   if (select status from public.job_responses where id = current_setting('t.r1')::uuid) <> 'chosen' then raise exception 'FAIL T1 status'; end if;
--   if (select status from public.job_posts where id = current_setting('t.p')::uuid) <> 'filled' then raise exception 'FAIL T1 post'; end if;
-- end $$;
-- reset role;
--
-- -- T2 · case b, simulated: the post looks open again to the withdraw (postgres reopens it with the sync trigger off,
-- --      inside this transaction), so the DELETE policy passes — and the guard refuses the chosen row.
-- select set_config('request.jwt.claims', '', true);
-- alter table public.job_posts disable trigger trg_sync_job_responses_on_post_status;
-- update public.job_posts set status = 'open' where id = current_setting('t.p')::uuid;
-- alter table public.job_posts enable trigger trg_sync_job_responses_on_post_status;
-- select set_config('request.jwt.claims', json_build_object('sub', current_setting('t.f1'), 'role', 'authenticated')::text, true);
-- set local role authenticated;
-- do $$ declare v_state text; v_hint text; begin
--   begin
--     delete from public.job_responses where id = current_setting('t.r1')::uuid;
--     raise exception 'FAIL T2: the chosen proposal was withdrawn';
--   exception when others then
--     get stacked diagnostics v_state = returned_sqlstate, v_hint = pg_exception_hint;
--     if sqlerrm like 'FAIL%' then raise; end if;
--     if v_state <> '42501' or v_hint <> 'response_decided' then raise exception 'FAIL T2: % % %', v_state, v_hint, sqlerrm; end if;
--   end;
--   if not exists (select 1 from public.job_responses where id = current_setting('t.r1')::uuid) then raise exception 'FAIL T2 row gone'; end if;
-- end $$;
--
-- -- T3 · a pending proposal on an open post is still withdrawn normally (same session).
-- do $$ declare n integer; begin
--   delete from public.job_responses where id = current_setting('t.r2')::uuid;
--   get diagnostics n = row_count;
--   if n <> 1 then raise exception 'FAIL T3 withdrew % rows', n; end if;
-- end $$;
-- reset role;
--
-- -- T4 · grants: choose_job_response unchanged, the new guard not executable by clients.
-- do $$ begin
--   if has_function_privilege('anon', 'public.choose_job_response(uuid)', 'execute') then raise exception 'FAIL T4 anon'; end if;
--   if not has_function_privilege('authenticated', 'public.choose_job_response(uuid)', 'execute') then raise exception 'FAIL T4 authenticated'; end if;
--   if has_function_privilege('authenticated', 'public.enforce_job_response_withdraw()', 'execute') then raise exception 'FAIL T4 guard'; end if;
-- end $$;
--
-- do $$ begin raise exception 'ALL PASSED — rolled back'; end $$;
--
-- Not testable in one transaction: the two-session interleavings themselves (case a / b with real concurrency).
-- T2 reproduces case b's end state (a DELETE whose policy passes on a decided row); case a is covered by the FOR
-- UPDATE (a withdrawn row cannot be locked → P0002) and by the post-UPDATE check.

-- ─── Rollback ────────────────────────────────────────────────────────────────────────────────────────────────────
--   drop trigger trg_enforce_job_response_withdraw on public.job_responses;
--   drop function public.enforce_job_response_withdraw();
--   -- choose_job_response: re-run its body from 20261106153901_journey_gates.sql (no FOR UPDATE, no count check).
