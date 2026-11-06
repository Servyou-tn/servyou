# Journey gates G1 · G2 · G10 — discovery + plan (`feat/journey-gates-db`, 2026-11-06)

Role: db-guardian. Migration: `db/migrations/20261106153901_journey_gates.sql` (README #125).
- **Applied by the architect on 2026-11-06,** after the rolled-back script below passed (ALL PASSED). He changed one
  fixture: all 4 live proposals belong to one freelancer, so `r2` was re-assigned to a second eligible freelancer
  inside the transaction.
- **Founder rulings:**
  - D1: the trigger is OK.
  - D6: orders may sit pending (test data, wiped before launch; new freelancers give a phone at sign-up), so no extra
    migration.
  - D7: the client's phone stays hidden from the chosen freelancer.
- **Live proof:** `src/__tests__/journey-gates-live.test.ts`.

Founder decisions G1, G2 and G10 of `docs/discovery/journeys-2026-11-07.md`. All reads below are live, read-only
SELECTs on `xggomcitqrkaylqezjjz` (2026-11-06), taken before the apply.

## What is live today

| Thing | State |
|---|---|
| `job_responses` | 4 rows, one per post. 1 is on an open post within 30 days. The other 3 are on posts **stored `open` but older than 30 days**. No status column. |
| `job_responses` grants | authenticated: SELECT, INSERT, DELETE (all **table-level**); anon: SELECT. No UPDATE grant, no UPDATE policy. |
| `job_responses` policies | INSERT « freelancer_id = auth.uid() »; SELECT « own, or the post owner »; DELETE « own, while the post is open, not hidden, within 30 days ». |
| `job_responses_proposal_message_length` | A CHECK added **NOT VALID** (migration 20261026195409). **3 of the 4 rows break it** (messages of 3, 7 and 12 characters). A NOT VALID CHECK is still enforced on every UPDATE of the row. |
| `job_posts` | 8 rows: open 2 within 30 days, open 5 **older than 30 days**, filled 1 (no proposals). `expired` is in the CHECK but nothing writes it. There is no `pg_cron`. `enforce_job_post_writes` refuses any open → expired by a signed-in caller. |
| `job_posts` SELECT | « Open posts or own posts readable » (open + not hidden + active poster, or own); « Responders read the posts they answered »; « Admin reads all ». The board query already filters `created_at >= now() − 30 days` (`lib/marche/missions-query.ts`); the mission page computes « expirée ». |
| `check_order_status_transition` | SECURITY DEFINER, `search_path 'public'`. Seller-only chain: product pending → accepted → prepared → dispatched → in_delivery → arrived; service pending → accepted → arrived. It has no phone check. |
| Phones | 9 of 10 freelancers have no phone, and they own **12 active services**. All shop owners have one. No pending or in-progress order has a phone-less seller today. `enforce_seller_phone_not_cleared` already raises `hint = 'seller_phone_required'`. |
| App error mapping | `lib/orders/order-write-error.ts` `advanceErrorKey` maps only P0001 « stale transition » prefixes, so anything else shows the generic error. `lib/marche/proposal-errors.ts` maps a proposal error by hint, then by the constraint name found in the message. |

## The plan (the PENDING file, one transaction, no client write grant added)

### G1 — a proposal gets an outcome

1. **The message rule moves from the NOT VALID CHECK to a trigger** `enforce_job_response_message` (D1).
   - It fires BEFORE INSERT and on UPDATE OF `proposal_message`.
   - It raises the exact text, errcode and constraint name the CHECK raised, so `proposal-errors.ts` and the live
     tests still match.
   - Then the CHECK is dropped.
   - Without this, every status write on the 3 legacy rows fails: choosing a sibling, and the owner's « marquer
     pourvue » or « supprimer » on their posts.
2. **The column:** `job_responses.status text not null default 'pending'`, with a CHECK on pending / chosen /
   not_chosen. A partial unique index allows **one `chosen` per post**.
3. **Backfill by the post's stored status** (D3): `not_chosen` where the post is not `open`. Live: **0 rows**.
4. **No client writes the status:** `enforce_job_response_status`, BEFORE INSERT and UPDATE OF status.
   - For a client statement (`current_user` anon / authenticated), an insert must be `pending` (42501
     `invalid_status`). That closes the table-level INSERT grant.
   - A status change is refused. That is defence in depth: there is no UPDATE grant today.
   - The definer RPC and the definer sync trigger run as their owner, so they pass.
5. **Coherence when the post changes by hand** (D2): `sync_job_responses_on_post_status`, AFTER UPDATE OF status on
   `job_posts`, SECURITY DEFINER.
   - open → filled / expired / deleted: every `pending` becomes `not_chosen`; a `chosen` one stays.
   - filled → open: refused (23514 `job_response_chosen`) once a proposal is chosen; otherwise `not_chosen` goes back
     to `pending`.
6. **`choose_job_response(p_response_id uuid) returns uuid`** (the post id). SECURITY DEFINER, `search_path ''`,
   EXECUTE for authenticated only.
   - Refusals:

     | Case | Code | Hint |
     |---|---|---|
     | signed out | 42501 | `not_signed_in` |
     | suspended caller | 42501 | `suspended` |
     | unknown proposal, or not the caller's post | P0002 | `not_found` (one error for both, so ids can't be probed) |
     | post not open | 23514 | `job_filled` / `job_deleted` / `job_expired` / `job_unavailable` (hidden) |
     | post older than 30 days | 23514 | `job_expired` |
     | the freelancer is suspended or moderated (D4) | 23514 | `freelancer_unavailable` |

   - The post row is locked FOR UPDATE first, the order `check_job_response_limits` uses, so a concurrent proposal or
     a second choose waits, then sees the post filled. The proposal is re-read under the lock.
   - Then, in one statement, that proposal becomes `chosen` and every other one on the post `not_chosen`. Then the post
     becomes `filled`; that update runs the post's own triggers as the owner (`enforce_job_post_writes`,
     `enforce_active_user`, the sync).
7. **Reads unchanged:** a freelancer reads his own proposal's status, and the owner every status on the post, through
   the existing SELECT policy. SELECT is table-level, so the new column is included.

### G2 — no acceptance without a phone

- `check_order_status_transition` is re-created from its **live body**, with one block added after the
  « seller only » check: pending → accepted needs `profiles.phone` non-blank for the seller.
- The refusal: 23514, `hint = 'seller_phone_required'` (the hint `enforce_seller_phone_not_cleared` already uses),
  message « Ajoutez votre numéro de téléphone dans « Mon compte » avant d'accepter : l'acheteur doit pouvoir vous
  joindre. »
- It covers product and service orders. SECURITY DEFINER and `search_path 'public'` are kept; the new read is fully
  qualified.

### G10 — expired missions stop showing as open: a read-side filter, not a status flip (D5)

`ALTER POLICY "Open posts or own posts readable"` adds `created_at >= now() − 30 days` to the public branch only. The
owner, responder and admin policies are untouched. `job_post_skills` follows: its policy is an EXISTS on `job_posts`.

**Why not a status flip:**
- **Nothing could call it safely today.**
  - There is no `pg_cron`.
  - `enforce_job_post_writes` refuses open → expired for every signed-in caller.
  - An app-called flip would be a new definer function, writing on a GET, racing between visitors, and still wrong
    between two calls.
- **The filter is exact at every read.** It needs no caller and no schedule, and it cannot silently stop.
- **It matches what the app already does:** the board filters on `created_at`, and the mission page computes
  « expirée ».

**What changes for users:**
- A freelancer who never answered gets the clean `notFound()` on an expired `/missions/[id]`, instead of the
  « expirée » page.
- The owner and the responders still see it, with « expirée » computed.
- `admin_overview_stats` counts every post, not by status, so it is unaffected.

**What stays:** the stored status still reads `open` for the 5 old posts, so any future count on `status` must use the
date too. A stored `expired` can come later with a scheduled job, if wanted.

## Decisions for the founder (the file implements the recommended option)

- **D1** Replace the NOT VALID message CHECK with an equivalent trigger (insert + message edits only).
  - Alternative: rewrite the 3 legacy messages. That edits user content and needs the founder's OK.
- **D2** A post closed or deleted by hand marks its pending proposals `not_chosen`. Reopening is refused once a
  freelancer is chosen; without a choice it puts them back to `pending`.
  - Alternative: leave `pending` on a manual close and allow a reopen that resets everything.
- **D3** Backfill by stored status (0 rows live). Proposals on posts past 30 days stay `pending`; the UI shows them as
  expired (derived, like G10).
- **D4** `choose_job_response` refuses a suspended or moderated freelancer.
- **D5** G10 as a read-side filter (above).
- **D6 (G2 side effect, not implemented)** 9 phone-less freelancers own 12 active services.
  - After G2, an order on one of them stays `pending` until the freelancer adds a phone or cancels. A buyer cannot
    cancel a service order.
  - Recommendation, in a later migration: also refuse a new order at insert for a phone-less seller
    (`enforce_order_insert_integrity`), or contact the 9 first.
- **D7 (not implemented)** The chosen freelancer still never sees the client's phone (the `get_contact_phone` ruling:
  never freelancer → client through a mission). With `chosen` it could open for that one freelancer. Say if wanted.

## After the apply (done on this branch, 2026-11-06)

1. **Recorded:** `20261106153901_journey_gates.sql`, byte-identical to `schema_migrations` (md5 `75c9566d…`). The
   architect reformatted it (comments removed, some lines joined); the code is identical to the PENDING file. README
   #125. Types regenerated: `job_responses.status`, and `choose_job_response: { Args: { p_response_id: string };
   Returns: string }`.
2. **Live suite `src/__tests__/journey-gates-live.test.ts`:** 4 sign-ins (post owner, 2 freelancers, a phone-less shop
   owner). It covers the script's cases through the real API, including PostgREST's error shape (code + hint), with a
   never-touched fresh post as the G10 positive control.
3. **Seller fixtures given a phone** in the 5 live suites where a seller accepts from its own session:
   `orders-lifecycle-columns`, `order-cancel-buyer-service`, `orders-jobposts-caps`, `suspension-enforcement`,
   `security-followups-batch`.
   - `job-posts-write-guards` needed nothing: its only accept is an admin's, refused earlier as « not your order ».
   - No suite reads a backdated post as neither owner nor responder, so G10 broke nothing.
   - `job_posts` has no NOT VALID constraint, so the D1 trap existed only on `job_responses`.
4. **Regression runs** (the PR body has the results):
   - `job-responses-proposal-fields`, `job-posts-write-guards`, `job-limits`, `job-posts-responder-read`,
     `job-responses-integrity`;
   - `admin-requests-live`, because the sync trigger runs inside `admin_process_deletion_request`.
5. **App (not in this PR):** `docs/follow-ups/journey-gates.md`.

## Rolled-back test script (for the architect: paste after the migration body, in the same transaction)

Every block raises `FAIL …` on a wrong result and prints `ok …` otherwise. Fixtures are picked live and moved only
inside the transaction, so the final `rollback` leaves production untouched. Ids are kept in transaction-local
settings (`t.*`) so the impersonated role can read them.

```sql
-- (begin; + the PENDING migration body above this line)

-- Fixtures, as postgres (every guard bypasses a call with no auth.uid()).
select set_config('t.post', (select jp.id::text from public.job_posts jp
  where jp.status = 'open' and jp.admin_hidden_at is null and jp.created_at >= now() - interval '30 days'
    and exists (select 1 from public.job_responses r where r.job_post_id = jp.id)
  order by jp.created_at desc limit 1), true);
select set_config('t.owner', (select consumer_id::text from public.job_posts where id = current_setting('t.post')::uuid), true);
select set_config('t.r1', (select id::text from public.job_responses where job_post_id = current_setting('t.post')::uuid order by created_at limit 1), true);
select set_config('t.f1', (select freelancer_id::text from public.job_responses where id = current_setting('t.r1')::uuid), true);
-- r2: a LEGACY proposal (message < 20 characters) moved onto the post — the D1 case.
select set_config('t.r2', (select r.id::text from public.job_responses r
  where r.job_post_id <> current_setting('t.post')::uuid and char_length(btrim(r.proposal_message)) < 20
    and r.freelancer_id <> current_setting('t.owner')::uuid
    and exists (select 1 from public.profiles p where p.id = r.freelancer_id and p.suspended_at is null)
    and not exists (select 1 from public.job_responses x where x.job_post_id = current_setting('t.post')::uuid and x.freelancer_id = r.freelancer_id)
  limit 1), true);
update public.job_responses set job_post_id = current_setting('t.post')::uuid where id = current_setting('t.r2')::uuid;
select set_config('t.f2', (select freelancer_id::text from public.job_responses where id = current_setting('t.r2')::uuid), true);
-- f3: an eligible freelancer who has not answered the post (inserts a proposal below).
select set_config('t.f3', (select p.id::text from public.profiles p join public.freelancer_profiles f on f.profile_id = p.id
  where p.seller_type = 'freelancer' and p.suspended_at is null and f.admin_hidden_at is null and not p.is_admin
    and p.date_of_birth <= current_date - interval '18 years' and p.id <> current_setting('t.owner')::uuid
    and not exists (select 1 from public.job_responses x where x.job_post_id = current_setting('t.post')::uuid and x.freelancer_id = p.id)
  limit 1), true);
select set_config('t.stranger', (select p.id::text from public.profiles p
  where p.suspended_at is null and not p.is_admin
    and p.id not in (current_setting('t.owner')::uuid, current_setting('t.f1')::uuid, current_setting('t.f2')::uuid, current_setting('t.f3')::uuid)
    and not exists (select 1 from public.job_posts jp where jp.consumer_id = p.id)
    and not exists (select 1 from public.job_responses jr where jr.freelancer_id = p.id)
  limit 1), true);
-- Q: a second open post within 30 days, given another legacy proposal (r3), for the manual close / reopen / delete path.
select set_config('t.q', (select jp.id::text from public.job_posts jp
  where jp.status = 'open' and jp.admin_hidden_at is null and jp.created_at >= now() - interval '30 days'
    and jp.id <> current_setting('t.post')::uuid order by jp.created_at desc limit 1), true);
select set_config('t.qowner', (select consumer_id::text from public.job_posts where id = current_setting('t.q')::uuid), true);
select set_config('t.r3', (select r.id::text from public.job_responses r
  where r.job_post_id not in (current_setting('t.post')::uuid, current_setting('t.q')::uuid)
    and r.freelancer_id <> current_setting('t.qowner')::uuid limit 1), true);
update public.job_responses set job_post_id = current_setting('t.q')::uuid where id = current_setting('t.r3')::uuid;
do $$ begin
  if nullif(current_setting('t.post', true), '') is null or nullif(current_setting('t.r2', true), '') is null
     or nullif(current_setting('t.f3', true), '') is null or nullif(current_setting('t.stranger', true), '') is null
     or nullif(current_setting('t.q', true), '') is null or nullif(current_setting('t.r3', true), '') is null then
    raise exception 'FAIL fixtures: a fixture could not be picked (%, %, %, %, %, %)', current_setting('t.post', true),
      current_setting('t.r2', true), current_setting('t.f3', true), current_setting('t.stranger', true),
      current_setting('t.q', true), current_setting('t.r3', true);
  end if;
  if (select count(*) from public.job_responses where status <> 'pending') <> 0 then raise exception 'FAIL backfill'; end if;
  raise notice 'ok fixtures + backfill (all pending)';
end $$;

-- T12 · G10 (first, while both open posts within 30 days are still open): a stranger and anon see no open post older
--       than 30 days, anon still sees the recent ones, and an old post's owner still sees his.
select set_config('t.xowner', (select consumer_id::text from public.job_posts
  where status = 'open' and admin_hidden_at is null and created_at < now() - interval '30 days' limit 1), true);
select set_config('request.jwt.claims', json_build_object('sub', current_setting('t.stranger'), 'role', 'authenticated')::text, true);
set local role authenticated;
do $$ begin
  if (select count(*) from public.job_posts where created_at < now() - interval '30 days') <> 0 then raise exception 'FAIL T12 stranger'; end if;
  raise notice 'ok T12 stranger';
end $$;
reset role;
select set_config('request.jwt.claims', '', true);
set local role anon;
do $$ begin
  if (select count(*) from public.job_posts where status = 'open' and created_at < now() - interval '30 days') <> 0 then raise exception 'FAIL T12 anon'; end if;
  if (select count(*) from public.job_posts where status = 'open' and created_at >= now() - interval '30 days') = 0 then raise exception 'FAIL T12 anon sees nothing'; end if;
  raise notice 'ok T12 anon';
end $$;
reset role;
select set_config('request.jwt.claims', json_build_object('sub', current_setting('t.xowner'), 'role', 'authenticated')::text, true);
set local role authenticated;
do $$ begin
  if (select count(*) from public.job_posts where consumer_id = current_setting('t.xowner')::uuid and created_at < now() - interval '30 days') = 0
    then raise exception 'FAIL T12 owner'; end if;
  raise notice 'ok T12 owner';
end $$;
reset role;

-- T1 · f3 cannot insert a proposal as chosen; T2 · a normal insert is pending.
select set_config('request.jwt.claims', json_build_object('sub', current_setting('t.f3'), 'role', 'authenticated')::text, true);
set local role authenticated;
do $$ declare v_state text; v_hint text; begin
  begin
    insert into public.job_responses (job_post_id, freelancer_id, proposal_message, status)
    values (current_setting('t.post')::uuid, current_setting('t.f3')::uuid, 'Une proposition de test assez longue.', 'chosen');
    raise exception 'FAIL T1: insert as chosen accepted';
  exception when others then
    get stacked diagnostics v_state = returned_sqlstate, v_hint = pg_exception_hint;
    if sqlerrm like 'FAIL%' then raise; end if;
    if v_state <> '42501' or v_hint <> 'invalid_status' then raise exception 'FAIL T1: % % %', v_state, v_hint, sqlerrm; end if;
  end;
  insert into public.job_responses (job_post_id, freelancer_id, proposal_message)
  values (current_setting('t.post')::uuid, current_setting('t.f3')::uuid, 'Une proposition de test assez longue.');
  if (select status from public.job_responses where job_post_id = current_setting('t.post')::uuid and freelancer_id = current_setting('t.f3')::uuid) <> 'pending'
    then raise exception 'FAIL T2'; end if;
  -- T1b · the message rule still holds on insert (now a trigger, same name in the message)
  begin
    update public.job_responses set proposal_message = 'trop court' where freelancer_id = current_setting('t.f3')::uuid and job_post_id = current_setting('t.post')::uuid;
    -- no UPDATE grant: a privilege error is expected first
    raise exception 'FAIL T1b: update accepted';
  exception when others then
    if sqlerrm like 'FAIL%' then raise; end if;
    get stacked diagnostics v_state = returned_sqlstate;
    if v_state <> '42501' then raise exception 'FAIL T1b: % %', v_state, sqlerrm; end if;
  end;
  raise notice 'ok T1 T1b T2';
end $$;
reset role;

-- T3 · nobody else chooses: a stranger and a freelancer get P0002 not_found; anon has no EXECUTE.
select set_config('request.jwt.claims', json_build_object('sub', current_setting('t.stranger'), 'role', 'authenticated')::text, true);
set local role authenticated;
do $$ declare v_state text; v_hint text; begin
  begin perform public.choose_job_response(current_setting('t.r1')::uuid); raise exception 'FAIL T3 stranger';
  exception when others then
    get stacked diagnostics v_state = returned_sqlstate, v_hint = pg_exception_hint;
    if sqlerrm like 'FAIL%' then raise; end if;
    if v_state <> 'P0002' or v_hint <> 'not_found' then raise exception 'FAIL T3 stranger: % % %', v_state, v_hint, sqlerrm; end if;
  end;
  if exists (select 1 from public.job_responses where id = current_setting('t.r1')::uuid) then raise exception 'FAIL T3 stranger reads a proposal'; end if;
  raise notice 'ok T3 stranger';
end $$;
reset role;
select set_config('request.jwt.claims', json_build_object('sub', current_setting('t.f1'), 'role', 'authenticated')::text, true);
set local role authenticated;
do $$ declare v_state text; begin
  begin perform public.choose_job_response(current_setting('t.r1')::uuid); raise exception 'FAIL T3 freelancer';
  exception when others then
    get stacked diagnostics v_state = returned_sqlstate;
    if sqlerrm like 'FAIL%' then raise; end if;
    if v_state <> 'P0002' then raise exception 'FAIL T3 freelancer: % %', v_state, sqlerrm; end if;
  end;
  raise notice 'ok T3 freelancer';
end $$;
reset role;
do $$ begin
  if has_function_privilege('anon', 'public.choose_job_response(uuid)', 'execute') then raise exception 'FAIL T3 anon EXECUTE'; end if;
  if not has_function_privilege('authenticated', 'public.choose_job_response(uuid)', 'execute') then raise exception 'FAIL T3 authenticated EXECUTE'; end if;
  if has_function_privilege('authenticated', 'public.sync_job_responses_on_post_status()', 'execute') then raise exception 'FAIL T3 sync EXECUTE'; end if;
  raise notice 'ok T3 grants';
end $$;

-- T4 · the owner chooses r1: r1 chosen, r2 (legacy short message) and f3's not_chosen, the post filled.
--      T5 · a second choose is refused (job_filled); T6 · reopening is refused (job_response_chosen);
--      T7 · a direct status update is refused by privilege.
select set_config('request.jwt.claims', json_build_object('sub', current_setting('t.owner'), 'role', 'authenticated')::text, true);
set local role authenticated;
do $$ declare v_state text; v_hint text; v_post uuid; begin
  v_post := public.choose_job_response(current_setting('t.r1')::uuid);
  if v_post <> current_setting('t.post')::uuid then raise exception 'FAIL T4 returned %', v_post; end if;
  if (select status from public.job_responses where id = current_setting('t.r1')::uuid) <> 'chosen' then raise exception 'FAIL T4 r1'; end if;
  if (select count(*) from public.job_responses where job_post_id = v_post and status = 'not_chosen') <> 2 then raise exception 'FAIL T4 others'; end if;
  if (select status from public.job_posts where id = v_post) <> 'filled' then raise exception 'FAIL T4 post'; end if;
  begin perform public.choose_job_response(current_setting('t.r2')::uuid); raise exception 'FAIL T5 accepted';
  exception when others then
    get stacked diagnostics v_state = returned_sqlstate, v_hint = pg_exception_hint;
    if sqlerrm like 'FAIL%' then raise; end if;
    if v_state <> '23514' or v_hint <> 'job_filled' then raise exception 'FAIL T5: % % %', v_state, v_hint, sqlerrm; end if;
  end;
  begin update public.job_posts set status = 'open' where id = v_post; raise exception 'FAIL T6 reopen accepted';
  exception when others then
    get stacked diagnostics v_state = returned_sqlstate, v_hint = pg_exception_hint;
    if sqlerrm like 'FAIL%' then raise; end if;
    if v_state <> '23514' or v_hint <> 'job_response_chosen' then raise exception 'FAIL T6: % % %', v_state, v_hint, sqlerrm; end if;
  end;
  begin update public.job_responses set status = 'chosen' where id = current_setting('t.r2')::uuid; raise exception 'FAIL T7 accepted';
  exception when others then
    if sqlerrm like 'FAIL%' then raise; end if;
    get stacked diagnostics v_state = returned_sqlstate;
    if v_state <> '42501' then raise exception 'FAIL T7: % %', v_state, sqlerrm; end if;
  end;
  raise notice 'ok T4 T5 T6 T7';
end $$;
reset role;

-- T8 · the chosen freelancer reads « chosen »; T9 · f2 cannot withdraw any more (the post is filled: 0 rows).
select set_config('request.jwt.claims', json_build_object('sub', current_setting('t.f1'), 'role', 'authenticated')::text, true);
set local role authenticated;
do $$ begin
  if (select status from public.job_responses where id = current_setting('t.r1')::uuid) is distinct from 'chosen' then raise exception 'FAIL T8'; end if;
  raise notice 'ok T8';
end $$;
reset role;
select set_config('request.jwt.claims', json_build_object('sub', current_setting('t.f2'), 'role', 'authenticated')::text, true);
set local role authenticated;
do $$ declare n integer; begin
  delete from public.job_responses where id = current_setting('t.r2')::uuid;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL T9 withdrew %', n; end if;
  if (select status from public.job_responses where id = current_setting('t.r2')::uuid) is distinct from 'not_chosen' then raise exception 'FAIL T9 status'; end if;
  raise notice 'ok T9';
end $$;
reset role;

-- T10 · manual close / reopen / delete by Q's owner (the B server actions' path): r3 not_chosen → pending → not_chosen.
select set_config('request.jwt.claims', json_build_object('sub', current_setting('t.qowner'), 'role', 'authenticated')::text, true);
set local role authenticated;
do $$ begin
  update public.job_posts set status = 'filled' where id = current_setting('t.q')::uuid;
  if (select status from public.job_responses where id = current_setting('t.r3')::uuid) <> 'not_chosen' then raise exception 'FAIL T10 close'; end if;
  update public.job_posts set status = 'open' where id = current_setting('t.q')::uuid;
  if (select status from public.job_responses where id = current_setting('t.r3')::uuid) <> 'pending' then raise exception 'FAIL T10 reopen'; end if;
  update public.job_posts set status = 'deleted' where id = current_setting('t.q')::uuid;
  if (select status from public.job_responses where id = current_setting('t.r3')::uuid) <> 'not_chosen' then raise exception 'FAIL T10 delete'; end if;
  raise notice 'ok T10';
end $$;
reset role;

-- T11 · G2: a seller without a phone cannot accept; with the phone back, the same accept passes.
-- Clear the claims first: the profiles guards bypass only a call with no auth.uid().
select set_config('request.jwt.claims', '', true);
select set_config('t.order', (select o.id::text from public.orders o join public.profiles s on s.id = o.seller_id
  where o.status = 'pending' and nullif(btrim(s.phone), '') is not null and s.suspended_at is null limit 1), true);
select set_config('t.seller', (select seller_id::text from public.orders where id = current_setting('t.order')::uuid), true);
select set_config('t.phone', (select phone from public.profiles where id = current_setting('t.seller')::uuid), true);
update public.profiles set phone = null where id = current_setting('t.seller')::uuid;
select set_config('request.jwt.claims', json_build_object('sub', current_setting('t.seller'), 'role', 'authenticated')::text, true);
set local role authenticated;
do $$ declare v_state text; v_hint text; begin
  begin update public.orders set status = 'accepted' where id = current_setting('t.order')::uuid; raise exception 'FAIL T11 accepted without phone';
  exception when others then
    get stacked diagnostics v_state = returned_sqlstate, v_hint = pg_exception_hint;
    if sqlerrm like 'FAIL%' then raise; end if;
    if v_state <> '23514' or v_hint <> 'seller_phone_required' then raise exception 'FAIL T11: % % %', v_state, v_hint, sqlerrm; end if;
  end;
  raise notice 'ok T11 refused';
end $$;
reset role;
select set_config('request.jwt.claims', '', true);
update public.profiles set phone = current_setting('t.phone') where id = current_setting('t.seller')::uuid;
select set_config('request.jwt.claims', json_build_object('sub', current_setting('t.seller'), 'role', 'authenticated')::text, true);
set local role authenticated;
do $$ begin
  update public.orders set status = 'accepted' where id = current_setting('t.order')::uuid;
  if (select status from public.orders where id = current_setting('t.order')::uuid) <> 'accepted' then raise exception 'FAIL T11 with phone'; end if;
  raise notice 'ok T11 with phone';
end $$;
reset role;

-- The end: a visible pass signal, which also forces the rollback even if the tool would commit.
do $$ begin raise exception 'ALL PASSED — rolled back'; end $$;
```

Notes on the script:
- **It has never run:** this brief allowed no DDL, not even rolled back, so the architect's run is the first.
  - The run ends with the error `ALL PASSED — rolled back`: that is the success signal.
  - A `FAIL fixtures …` means a fixture could not be picked from live data, not a defect in the migration.
  - Any other `FAIL Tn` is a real failure.
- T1b expects the **privilege** error (no UPDATE grant), not the message rule. The message rule on insert is covered
  by the existing live suite `job-responses-proposal-fields`, which the post-apply run repeats.
- T12 runs first: its « anon still sees recent posts » check needs an open post within 30 days. Live, there are
  exactly 2, and T4 / T10 then close both (inside the transaction).
- Every postgres-side write clears `request.jwt.claims` first. The guards on `profiles` / `job_posts` bypass only a
  call with no `auth.uid()`.
- If a fixture cannot be picked, the fixtures block fails first and names the empty one.
- D1 is proven twice:
  - in T4, `r2` (a legacy message of under 20 characters) becomes `not_chosen`;
  - in T10, `r3` (legacy too) goes through close, reopen and delete.
