-- Append-only timeline of what happened to an order. Feeds G9's panel-historique
-- (504:27042) and G8's per-state waitTime.
--
-- NOT modelled on admin_audit_log's before_state/after_state jsonb: a timeline needs
-- from -> to status, not whole-row diffs.
create table public.order_events (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references public.orders(id) on delete cascade,
  event_type  text not null check (event_type in ('created','status_change','print')),
  from_status text,
  to_status   text,
  -- ON DELETE SET NULL, not the NO ACTION default: deletion_requests/data_exports mean
  -- account deletion is a real path, and NO ACTION here would block it. Events survive a
  -- deleted actor with actor_role intact -- which is what an audit trail should do.
  actor_id    uuid references public.profiles(id) on delete set null,
  actor_role  text check (actor_role in ('buyer','seller','admin','system')),
  note        text,
  created_at  timestamptz not null default now()
);

comment on table public.order_events is
  'Append-only order timeline. Written ONLY by emit_order_event() (SECURITY DEFINER trigger). No INSERT/UPDATE/DELETE policy exists and those privileges are revoked from authenticated -- a client-forgeable timeline is worse than no timeline.';

-- One index serves both consumers. Events per order are bounded by the lifecycle
-- (max ~8: created + 6 product transitions + a terminal), so the waitTime filter on
-- to_status runs over a handful of rows already located by order_id. A second index on
-- (order_id, to_status, created_at) would be premature at this cardinality.
create index order_events_order_id_created_at_idx
  on public.order_events (order_id, created_at desc);

alter table public.order_events enable row level security;

-- Read: both parties to the order, plus admin. Mirrors the shipped disputes SELECT
-- policy almost exactly -- an established pattern on this database, not a new one.
create policy "Order events visible to parties and admin"
  on public.order_events for select
  to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.orders o
      where o.id = order_events.order_id
        and (o.buyer_id = auth.uid() or o.seller_id = auth.uid())
    )
  );

-- NO insert/update/delete policy, deliberately. Rows arrive only via the SECURITY
-- DEFINER trigger (owned by postgres, so it bypasses RLS).
--
-- NOTE: this enumerated revoke proved INSUFFICIENT -- it left TRUNCATE (a write that
-- bypasses RLS) granted by Supabase's schema-level default privileges. Corrected in
-- 20260729111728_order_events_revoke_residual_privileges.
revoke insert, update, delete on public.order_events from authenticated;
revoke all on public.order_events from anon;
revoke all on public.order_events from public;
grant select on public.order_events to authenticated;

-- AFTER INSERT OR UPDATE, its own trigger. The existing four are untouched.
--
-- WHY NOT REUSE THEM -- two independent reasons:
--   1. All four are BEFORE UPDATE. Nothing can emit 'created', which is the first entry
--      the historique needs.
--   2. BEFORE triggers fire in alphabetical name order, putting
--      trg_set_cancelled_at_on_transition LAST. An emitter bolted into any earlier one
--      would log a null cancelled_at on exactly the event that matters most.
-- Beyond ordering, a BEFORE trigger writing audit rows is wrong in principle: it fires
-- before the row is durable, so a later constraint failure would leave an event for a
-- transition that never happened.
create or replace function public.emit_order_event()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_actor uuid := auth.uid();
  v_role  text;
begin
  -- Resolve the actor against THIS order. Seeds and service-role writes have no
  -- auth.uid() and land as 'system' rather than being mislabelled.
  -- Order matters: party-hood is checked BEFORE is_admin(), so an admin who is also the
  -- buyer records as 'buyer' (what they did), while an admin acting on someone else's
  -- order records as 'admin' (also what they did). 'system' is the genuine fallback.
  if v_actor is null then
    v_role := 'system';
  elsif v_actor = new.buyer_id then
    v_role := 'buyer';
  elsif v_actor = new.seller_id then
    v_role := 'seller';
  elsif public.is_admin() then
    v_role := 'admin';
  else
    v_role := 'system';
  end if;

  if tg_op = 'INSERT' then
    insert into public.order_events
      (order_id, event_type, from_status, to_status, actor_id, actor_role)
    values
      (new.id, 'created', null, new.status, v_actor, v_role);
    return null;
  end if;

  -- UPDATE: only a status change is an event. Edits to carrier/tracking are not
  -- timeline entries -- they are corrections to a field, and logging every
  -- correction would bury the lifecycle in noise.
  if new.status is distinct from old.status then
    insert into public.order_events
      (order_id, event_type, from_status, to_status, actor_id, actor_role, note)
    values
      (new.id, 'status_change', old.status, new.status, v_actor, v_role,
       case when new.status = 'cancelled' then new.cancellation_reason else null end);
  end if;

  return null;  -- return value is ignored for AFTER triggers
end;
$$;

create trigger trg_emit_order_event
  after insert or update on public.orders
  for each row execute function public.emit_order_event();
