-- Applied 2026-11-16 as 20261116201553 (README #136). Written by db-guardian: bell notifications v1 — the order notifications.
-- Founder decisions: the scope (2026-11-15: v1 = new orders + order status changes) and the actor rule (2026-11-16).
-- Plan: docs/follow-ups/bell-notifications-plan.md (branch docs/bell-notifications-plan).
-- Reviewed and applied by the architect after the founder's OK (PR #393).
--
-- THE RULE (founder, 2026-11-16)
--   Every order event notifies the OTHER party, never the person who made it:
--     - the buyer places an order                          -> the seller gets « nouvelle commande »;
--     - the buyer cancels, or confirms receipt             -> the seller is notified; the buyer gets nothing;
--     - the seller accepts / prepares / ships / … / cancels -> the buyer is notified; the seller gets nothing.
--   Enforced in the database: the trigger compares auth.uid() with the order's buyer_id and seller_id and writes one row
--   for the other party only. The CHECK notifications_never_self makes a row whose recipient is its own actor impossible.
--   The bell never fails an order write (architect, 2026-11-16): the no-actor / not-a-party / self branches skip, and
--   the INSERT sits in its own block whose handler turns any unexpected error (FK, CHECK, anything) into a WARNING and
--   no row, so the buyer's order or the status change always commits.
--
-- OPEN QUESTION 1 — DECIDED (founder, 2026-11-16): an order event with no signed-in party writes no row.
--   - Status changes: none can happen today. check_order_status_transition (BEFORE UPDATE, enabled) raises unless
--     auth.uid() is the order's buyer or seller. A NULL caller (service role, SQL editor, a cron job) and an admin who is
--     not a party are both refused (« Vous n'êtes pas autorisé à modifier cette commande. »). There is no expiry job
--     (the only cron job is purge-unconfirmed-signups) and no admin status path. A future expiry job or admin cancel
--     must change that trigger first, and that PR answers who is told.
--   - Inserts: a service-role insert (seeds, live-test fixtures) has no auth.uid(). No app path inserts that way: both
--     order forms insert with the buyer's own session (src/app/demander/[id]/actions.ts).
--   - Admin writes that are not status changes never reach the trigger: admin_void_refusal (refusal_voided_at) and
--     the account-deletion scrub of delivery fields (admin_process_deletion_request).
--
-- DISCOVERY (read-only on production, 2026-11-16)
--   - No notifications table or function exists. notification_preferences holds e-mail preferences only (0 rows): not
--     touched, and it does not gate the bell.
--   - orders: 16 rows, 2 buyers, 2 sellers. Nothing is backfilled: the bell starts empty at the apply.
--   - The transitions (check_order_status_transition):
--       product  pending -> accepted -> prepared -> dispatched -> in_delivery -> arrived (seller), arrived -> received (buyer);
--       service  pending -> accepted -> arrived (seller), arrived -> received (buyer);
--       cancelled by either side (a buyer cancels product orders only: enforce_buyer_cancel_product_only).
--       A refusal = a seller cancel carrying refusal_reason. Terminal: received, cancelled.
--   - Inserts: RLS « Buyer creates own order » (buyer_id = auth.uid()). enforce_order_insert_integrity forces pending,
--     derives seller_id from the item and refuses a self-order (buyer = seller). buyer_id / seller_id never change after
--     insert (enforce_order_identity_lock).
--   - AFTER triggers on orders today: trg_emit_order_event (order_events). Not modified: the new triggers are separate.
--   - Grants: since migration 107 a new table gets anon + authenticated SELECT; revoked below, then SELECT re-granted to
--     authenticated only. Clients get no INSERT, UPDATE or DELETE (so no db/client-write-allowlist.json entry): rows are
--     written by the trigger, read_at only by mark_my_notifications_read. postgres-created functions get no PUBLIC
--     EXECUTE (migration 68): the RPC is granted to authenticated explicitly; the trigger function needs none.
--   - Realtime publication supabase_realtime: empty. Not changed (DECISION 3). pg_cron 1.6.4 is installed (DECISION 2).
--   - Account deletion (admin_process_deletion_request) deletes the person's favorites and notification_preferences but
--     would keep their bell rows (DECISION 1). It refuses while an order is still open.
--
-- FOUNDER DECISIONS (2026-11-16)
--   1. Account deletion also deletes the person's notifications: a separate small DB PR before launch
--      (admin_process_deletion_request), not in this file.
--   2. No retention in v1. Later: a pg_cron job deleting read rows older than 90 days.
--   3. No Realtime in v1: the badge count refreshes on page load.
--   4. (UI-1) A row is read when it is opened, plus « Tout marquer comme lu » (mark_my_notifications_read).

-- ─── 1. The table ───────────────────────────────────────────────────────────────────────────────────

create table public.notifications (
  id           uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  actor_id     uuid not null references public.profiles (id) on delete cascade,
  order_id     uuid not null references public.orders (id) on delete cascade,
  kind         text not null,
  from_status  text,
  to_status    text not null,
  created_at   timestamptz not null default now(),
  read_at      timestamptz,
  constraint notifications_kind_check
    check (kind in ('order_created', 'order_status_changed')),
  constraint notifications_kind_shape
    check ((kind = 'order_created' and from_status is null)
        or (kind = 'order_status_changed' and from_status is not null and from_status <> to_status)),
  constraint notifications_never_self
    check (recipient_id <> actor_id)
);

alter table public.notifications enable row level security;

create index notifications_recipient_created_idx on public.notifications (recipient_id, created_at desc);
create index notifications_recipient_unread_idx on public.notifications (recipient_id) where read_at is null;
create index notifications_actor_id_idx on public.notifications (actor_id);
create index notifications_order_id_idx on public.notifications (order_id);

create policy "Recipients read their notifications" on public.notifications
  for select
  to authenticated
  using (recipient_id = (select auth.uid()));

revoke all on table public.notifications from public, anon, authenticated;
grant select on table public.notifications to authenticated;

comment on table public.notifications is
  'In-platform bell, v1: order events only. One row per event, for the party who did NOT make it (founder rule 2026-11-16). Written by notify_order_counterparty only; read by the recipient; read_at set by mark_my_notifications_read. Stores keys, never text: the UI renders kind + statuses in the reader''s language.';
comment on column public.notifications.actor_id is
  'The signed-in party whose action made the event (auth.uid() at the time). Never the recipient (notifications_never_self).';
comment on column public.notifications.kind is
  'order_created (the buyer placed the order; to_status = pending) or order_status_changed (from_status -> to_status).';

-- ─── 2. The writer: one row, for the other party ────────────────────────────────────────────────────

create or replace function public.notify_order_counterparty()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor     uuid := (select auth.uid());
  v_recipient uuid;
  v_kind      text;
  v_from      text;
begin
  -- A status change only: a carrier / tracking edit, a refusal void or a deletion scrub is not an event.
  if tg_op = 'UPDATE' then
    if new.status is not distinct from old.status then
      return null;
    end if;
    v_kind := 'order_status_changed';
    v_from := old.status;
  else
    v_kind := 'order_created';
    v_from := null;
  end if;

  -- Open question 1, decided (founder 2026-11-16): no signed-in actor (service role, seeds, fixtures) -> no row.
  if v_actor is null then
    return null;
  end if;

  -- The founder's rule: the OTHER party, never the actor. Same resolution as check_order_status_transition.
  if v_actor = new.buyer_id then
    v_recipient := new.seller_id;
  elsif v_actor = new.seller_id then
    v_recipient := new.buyer_id;
  else
    -- Signed in but not a party (an admin on someone else's order): unreachable today; no row (open question 1).
    return null;
  end if;

  -- A self-order is refused at insert. Skip rather than let notifications_never_self fail the order write.
  if v_recipient is null or v_recipient = v_actor then
    return null;
  end if;

  -- The bell never fails the order write: any unexpected error (FK, CHECK, anything) becomes a WARNING and no row.
  begin
    insert into public.notifications (recipient_id, actor_id, order_id, kind, from_status, to_status)
    values (v_recipient, v_actor, new.id, v_kind, v_from, new.status);
  exception when others then
    raise warning 'bell: no notification for order %: % (%)', new.id, sqlerrm, sqlstate;
  end;

  return null;  -- AFTER trigger: the return value is ignored
end;
$$;

create trigger trg_notify_order_created
  after insert on public.orders
  for each row
  execute function public.notify_order_counterparty();

create trigger trg_notify_order_status_changed
  after update on public.orders
  for each row
  when (old.status is distinct from new.status)
  execute function public.notify_order_counterparty();

revoke all on function public.notify_order_counterparty() from public, anon, authenticated;

comment on function public.notify_order_counterparty() is
  'AFTER INSERT / status-change trigger on orders: writes one notifications row for the party who did not act (auth.uid() compared with buyer_id / seller_id). No row when no party is signed in (founder 2026-11-16). Never fails the order write: an insert error becomes a WARNING.';

-- ─── 3. Marking as read ─────────────────────────────────────────────────────────────────────────────

-- p_ids NULL = every unread row of the caller (« Tout marquer comme lu »); otherwise those ids (the first 200).
-- Only the caller's own rows. read_at is the database clock, set once, never moved or cleared.
create or replace function public.mark_my_notifications_read(p_ids uuid[] default null)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_n   integer;
begin
  if v_uid is null then
    raise exception 'Connectez-vous pour voir vos notifications.' using errcode = '42501';
  end if;

  update public.notifications n
     set read_at = now()
   where n.recipient_id = v_uid
     and n.read_at is null
     and (p_ids is null or n.id = any (p_ids[1:200]));

  get diagnostics v_n = row_count;
  return v_n;
end;
$$;

revoke all on function public.mark_my_notifications_read(uuid[]) from public, anon;
grant execute on function public.mark_my_notifications_read(uuid[]) to authenticated;

comment on function public.mark_my_notifications_read(uuid[]) is
  'Bell: marks the caller''s own unread notifications as read (all of them when p_ids is null). Returns the number marked.';

-- ─── POST-APPLY CHECKS (read-only) ──────────────────────────────────────────────────────────────────
-- select relrowsecurity from pg_class where oid = 'public.notifications'::regclass;                    -- true
-- select grantee, privilege_type from information_schema.role_table_grants
--  where table_schema = 'public' and table_name = 'notifications' and grantee in ('anon', 'authenticated');
--                                                                                      -- authenticated SELECT only
-- select tgname, tgenabled from pg_trigger
--  where tgrelid = 'public.orders'::regclass and tgname like 'trg_notify_order_%';      -- 2 rows, both O
-- select has_function_privilege('anon', 'public.mark_my_notifications_read(uuid[])', 'execute'),          -- false
--        has_function_privilege('authenticated', 'public.mark_my_notifications_read(uuid[])', 'execute'), -- true
--        has_function_privilege('authenticated', 'public.notify_order_counterparty()', 'execute');        -- false
-- select grantee, privilege_type from information_schema.role_table_grants
--  where table_schema = 'public' and table_name = 'notifications'
--    and grantee not in ('postgres', 'service_role', 'authenticated');                 -- 0 rows
-- select count(*) from public.notifications;     -- 0 right after the apply (no backfill; live suites add rows later)
--
-- ─── ROLLED-BACK CHECK (optional, after the apply) ──────────────────────────────────────────────────
-- One statement. The final RAISE rolls back everything, including the order change and its order_events row.
-- It exercises the NULL-actor refusal and the buyer -> seller direction only; the seller -> buyer direction, the
-- order_created row and the non-status edits are proven by the DB-1 live suite (plan §5).
-- If the chosen order's buyer is suspended, the DO fails with that message (still rolled back): pick another order.
-- Expected: ERROR  BELL CHECK: null_actor_refused=t seller_rows=1 buyer_rows=0 order_status_changed pending>cancelled
-- do $$
-- declare
--   v_order        public.orders%rowtype;
--   v_null_refused boolean := false;
--   v_seller       integer;
--   v_buyer        integer;
--   v_n            public.notifications%rowtype;
-- begin
--   select * into v_order from public.orders
--    where status = 'pending' and order_type = 'product' order by created_at limit 1;
--   if not found then
--     raise exception 'BELL CHECK: no pending product order to try';
--   end if;
--   -- No signed-in party: the transition trigger refuses, so open question 1 stays theoretical for status changes.
--   perform set_config('request.jwt.claims', '{}', true);
--   begin
--     update public.orders set status = 'accepted' where id = v_order.id;
--   exception when others then
--     v_null_refused := sqlerrm like 'Vous n''êtes pas autorisé%';
--   end;
--   -- The buyer cancels: the seller gets one row, the buyer none.
--   perform set_config('request.jwt.claims',
--     json_build_object('sub', v_order.buyer_id, 'role', 'authenticated')::text, true);
--   update public.orders set status = 'cancelled', cancelled_by = 'buyer' where id = v_order.id;
--   select count(*) into v_seller from public.notifications
--    where order_id = v_order.id and kind = 'order_status_changed' and recipient_id = v_order.seller_id;
--   select count(*) into v_buyer from public.notifications
--    where order_id = v_order.id and kind = 'order_status_changed' and recipient_id = v_order.buyer_id;
--   select * into v_n from public.notifications
--    where order_id = v_order.id and kind = 'order_status_changed' order by created_at desc limit 1;
--   raise exception 'BELL CHECK: null_actor_refused=% seller_rows=% buyer_rows=% % %>%',
--     v_null_refused, v_seller, v_buyer, v_n.kind, v_n.from_status, v_n.to_status;
-- end $$;
--
-- ─── ROLLBACK (no pre-existing row changes; deletes every bell row) ─────────────────────────────────
-- begin;
-- drop trigger trg_notify_order_status_changed on public.orders;
-- drop trigger trg_notify_order_created on public.orders;
-- drop function public.notify_order_counterparty();
-- drop function public.mark_my_notifications_read(uuid[]);
-- drop table public.notifications;
-- commit;
-- Then regenerate src/lib/supabase/database.types.ts and record the rollback as its own dated migration.
