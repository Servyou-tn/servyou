-- Pre-launch security batch, PR-3 item E1 -- the database owns orders.received_at, and the cancel
-- metadata is written once. Architect decisions 12-13 (2026-10-25), prioritised ahead of PR-2 so H8 PR-2
-- (#191, which stops the two browser writes of received_at) can merge. Discovery:
-- docs/design/prelaunch-security-batch-discovery.md section 6. Follow-ups: "received_at is stamped in app
-- code only" and "MEDIUM -- orders UPDATE: lifecycle columns stay writable after the fact".
--
-- Live before this migration:
--   * received_at was written only by the browser (ReceiptConfirmButton, OrdersList: new Date() on the
--     arrived -> received update). No trigger, default or constraint touched it, so a row inserted at
--     'received' (seeds) has none, and authenticated holds UPDATE on the column with nothing guarding it:
--     either party could backdate it at any time. It is shown as "Reçue le", used as dispute evidence
--     ("Confirmé reçu le") and counted by admin/statistiques.
--   * cancelled_by / cancellation_reason are column-granted to authenticated. check_order_status_transition
--     validates them only on the transition into 'cancelled' and lets every status-free edit "sail through",
--     and enforce_order_identity_lock does not cover them: a buyer could flip cancelled_by 'buyer' -> 'seller'
--     on a cancelled order (cleaning buyer_cancellation_history), or rewrite either party's reason.
--
-- After it, for callers with a JWT (buyer, seller, and admins too -- see below):
--   * received_at = now() on the transition into 'received' (UPDATE) and on an INSERT at 'received'; on
--     every other write it keeps its OLD value (UPDATE) or stays NULL (INSERT). A client-supplied value is
--     DISCARDED, not refused: until H8 PR-2 ships, the browser still sends one on the receipt update.
--   * cancelled_by / cancellation_reason may change only inside the cancel transition (old status not
--     'cancelled', new status 'cancelled'); any other change is refused (42501). The transition itself is
--     still validated by check_order_status_transition (role match, reason after the pivot).
-- Callers WITHOUT a JWT (service role, SQL editor, migrations, live-test fixtures): no discard and no lock,
-- so a data fix or a seed can set explicit values -- but an order entering 'received' with no timestamp is
-- still stamped now() (coalesce), so no new terminal order is left without one.
--
-- Admin behaviour (proposal, flagged in the review): an admin JWT is treated like any other client here,
-- unlike most guard triggers in this codebase. Both columns are the evidence an admin adjudicates in a
-- dispute, and no admin screen writes them (the only order writers are the seller actions and the
-- buyer's client components). In practice an admin JWT rarely reaches this trigger at all: orders has no
-- admin UPDATE policy, so an admin can only UPDATE an order they are party to, and the one other path is
-- an INSERT as buyer (migration 54 exempts admins from its tier 2 -- here such a row still gets now()).
-- Corrections go through the service role, which this trigger leaves alone.
--
-- Firing order (same-timing row triggers fire alphabetically; the statement-level trg_enforce_active_user
-- fires before all of them):
--   BEFORE UPDATE: enforce_order_identity_lock_trigger -> orders_set_updated_at
--                  -> trg_check_order_status_transition -> trg_enforce_order_lifecycle_columns (new)
--                  -> trg_set_cancelled_at_on_transition
--   BEFORE INSERT: trg_enforce_order_insert_integrity -> trg_enforce_order_lifecycle_columns (new)
--                  -> trg_set_order_snapshot
--   AFTER  INSERT/UPDATE: trg_emit_order_event (sees the final row)
-- So the transition is validated before this trigger runs; migration 54 has already refused a JWT
-- non-admin INSERT that is not 'pending' with every lifecycle column NULL; and set_cancelled_at_on_transition
-- stays the sole writer of cancelled_at (authenticated holds no UPDATE on it). None of the existing
-- functions is modified.
--
-- No existing row is rewritten: the one 'received' order with a NULL received_at (33b822ec, seeded) stays
-- NULL -- no backfill (decision 14). E2 (revoke UPDATE (received_at) from authenticated) ships later, once
-- H8 PR-2 has removed the browser writes.

create or replace function public.enforce_order_lifecycle_columns()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
declare
  -- No JWT: service role, SQL editor, migrations, fixtures. They keep explicit values.
  v_system boolean := (select auth.uid()) is null;
begin
  if tg_op = 'INSERT' then
    if new.status = 'received' then
      new.received_at := case when v_system then coalesce(new.received_at, now()) else now() end;
    elsif not v_system then
      new.received_at := null;
    end if;
    return new;
  end if;

  -- received_at: the database's clock on the transition into 'received', otherwise unchanged.
  if new.status = 'received' and old.status is distinct from 'received' then
    new.received_at := case when v_system then coalesce(new.received_at, now()) else now() end;
  elsif not v_system then
    new.received_at := old.received_at;
  end if;

  -- cancelled_by / cancellation_reason: written inside the cancel transition, then frozen.
  if not v_system
     and not (new.status = 'cancelled' and old.status is distinct from 'cancelled')
     and (new.cancelled_by is distinct from old.cancelled_by
          or new.cancellation_reason is distinct from old.cancellation_reason) then
    raise exception 'Les informations d''annulation ne peuvent pas être modifiées.'
      using errcode = '42501';
  end if;

  return new;
end;
$function$;

comment on function public.enforce_order_lifecycle_columns() is
  'BEFORE INSERT OR UPDATE on orders. With a JWT (admins included): received_at = now() on the transition into received and on an INSERT at received, otherwise OLD (UPDATE) / NULL (INSERT) -- a client value is discarded; cancelled_by / cancellation_reason may change only in the transition into cancelled, else 42501. Without a JWT (service role, migrations, fixtures): explicit values kept, received_at still stamped now() when entering received with none. SECURITY DEFINER, search_path empty, EXECUTE revoked from public/anon/authenticated. Pre-launch security batch PR-3 E1, decisions 12-13, 2026-10-25.';

-- A trigger function: never callable over RPC, and EXECUTE is not checked when a trigger fires
-- (precedent: enforce_service_publish_requirements, migration 64). Close the default grants.
revoke execute on function public.enforce_order_lifecycle_columns() from public, anon, authenticated;

create trigger trg_enforce_order_lifecycle_columns
  before insert or update on public.orders
  for each row execute function public.enforce_order_lifecycle_columns();

-- ─── ROLLBACK (do not run as part of this migration) ───────────────────────────────────────────
-- Per README "Rollback paths": apply as a NEW dated forward migration, never by deleting this file.
-- Restores the pre-migration behaviour exactly (no existing function or grant was changed). Before
-- rolling back while H8 PR-2 is live, note that the browser no longer stamps received_at: receipts
-- would land with a NULL timestamp again.
--
-- drop trigger if exists trg_enforce_order_lifecycle_columns on public.orders;
-- drop function if exists public.enforce_order_lifecycle_columns();
