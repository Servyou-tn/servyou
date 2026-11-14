-- PENDING (db-guardian, 2026-11-14): the COD no-show rule (refused deliveries). Migration number: the architect's.
-- Founder decision 2026-11-13, answers 2026-11-14: docs/follow-ups/cod-no-show-plan.md (PR #375), « Founder decisions ».
-- Written for review, NOT applied. The architect reviews it, applies it after the founder's OK, and gives the version.
--
-- THE RULE
--   A refusal = a seller cancellation of a PRODUCT order coming from dispatched / in_delivery / arrived, with a
--   refusal_reason (refused_parcel / not_collected / unreachable). Its date is cancelled_at (stamped by the DB).
--   Counted: not voided, after the buyer's last block lift, and once per (seller, buyer, Africa/Tunis day).
--   R90(t) = counted refusals in the 90 days up to t.
--     tier 1: R90(now) >= 2, or a block is active -> at most 1 open product order (pending .. arrived), and the seller
--             sees a yes/no warning on that buyer's open orders;
--     tier 2: a refusal r with R90(r) >= 3 blocks new product orders until r + 30 days (anchored at r, so a 4th
--             refusal restarts the 30 days, and after the block tier 1 holds until refusals age out).
--   Only new orders are gated. A lift is a clean slate (refusals before it count for neither tier). Service requests
--   are never capped or blocked. A buyer contests through a dispute (reason refusal_contested) within 14 days of the
--   refusal; an admin voids it explicitly (admin_void_refusal), logged.
--
-- DISCOVERY (read-only on production, 2026-11-14)
--   - orders: 16 rows, 2 buyers, 0 seller cancellations after dispatch, 0 disputes. No refusal column or status
--     exists. Nothing to backfill; past cancellations are not converted.
--   - authenticated holds table-level INSERT and SELECT on orders, and UPDATE on status, cancelled_by,
--     cancellation_reason, carrier, tracking_number. So the 2 new columns are client-insertable (refused below on
--     insert) and readable by both parties (no admin identity stored on orders: the journal holds it).
--   - BEFORE UPDATE triggers fire by name: check_order_status_transition (validates the cancel itself: role match,
--     reason required after dispatch, terminal lock) runs before trg_enforce_refusal_marker, which runs before
--     trg_set_cancelled_at_on_transition (stamps cancelled_at); CHECK constraints are checked after all of them.
--   - BEFORE INSERT: trg_limit_orders (enforce_order_rate_limit) takes pg_advisory_xact_lock on
--     'orders.rate:<buyer>'. trg_limit_orders_cod sorts right after it and takes the same key (re-entrant), FIRST,
--     before reading anything, so two concurrent inserts can't both see 0 open orders.
--   - orders has no admin UPDATE policy and check_order_status_transition has no admin branch. postgres owns orders and
--     has BYPASSRLS, RLS is not forced: admin_void_refusal (SECURITY DEFINER) is the one path that writes
--     refusal_voided_at, and it never touches the status.
--   - Account deletion (admin_process_deletion_request) counts every order not received / cancelled as open: a refusal
--     is 'cancelled', so it never blocks a deletion. get_contact_phone keeps the reveal of an order cancelled after
--     acceptance. KPIs, tabs and the timeline (emit_order_event writes cancellation_reason as the note) are unchanged.
--   - disputes: one active dispute per order (disputes_one_active_per_order). See DECISION 2 below.
--   - New tables get anon + authenticated SELECT by default (migration 107): revoked below. postgres-created functions
--     get no PUBLIC EXECUTE (migration 68): the RPCs below are granted to authenticated explicitly.
--
-- DECISIONS FOR THE ARCHITECT
--   1. refusal_reason is written by the seller's own cancelling UPDATE (column grant + db/client-write-allowlist.json
--      entry), like the rest of the cancel; no seller RPC.
--   2. The one-active-dispute index is split so a buyer's contest can sit beside a seller's dispute on the same order:
--      otherwise a seller who opens payment_refused first blocks the contest until it closes, and the 14 days run out.
--      To keep one active dispute per order instead, drop that block (section 6) and accept the gap.
--   3. admin_lift_cod_block refuses a buyer who is not blocked (tier 1 alone is answered by voiding a refusal).

-- ─── 1. orders: the refusal marker ────────────────────────────────────────────────────────────────

alter table public.orders
  add column refusal_reason text,
  add column refusal_voided_at timestamptz;

alter table public.orders
  add constraint orders_refusal_reason_check
    check (refusal_reason is null or refusal_reason in ('refused_parcel', 'not_collected', 'unreachable')),
  add constraint orders_refusal_is_seller_cancel
    check (refusal_reason is null
           or (status = 'cancelled' and cancelled_by = 'seller' and order_type = 'product' and cancelled_at is not null)),
  add constraint orders_refusal_void_needs_refusal
    check (refusal_voided_at is null or refusal_reason is not null);

comment on column public.orders.refusal_reason is
  'COD no-show rule: set by the seller in the update that cancels a product order from dispatched / in_delivery / arrived (refused_parcel, not_collected, unreachable). Never changed afterwards. Counted per private.buyer_cod_standing.';
comment on column public.orders.refusal_voided_at is
  'Set by admin_void_refusal only (a contested refusal the admin upheld for the buyer): the refusal stops counting. Who voided it is in admin_audit_log.';

create index orders_refusals_by_buyer_idx on public.orders (buyer_id, cancelled_at) where refusal_reason is not null;

grant update (refusal_reason) on public.orders to authenticated;

create or replace function public.enforce_refusal_marker()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_caller uuid := (select auth.uid());
begin
  -- Seeds, fixtures and the service role: the CHECK constraints above still apply to them.
  if v_caller is null then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.refusal_reason is not null or new.refusal_voided_at is not null then
      raise exception 'Une commande est toujours créée en attente.' using errcode = '42501';
    end if;
    return new;
  end if;

  -- The void: admin_void_refusal only (no grant on the column, no admin UPDATE policy), and never undone.
  if new.refusal_voided_at is distinct from old.refusal_voided_at
     and (old.refusal_voided_at is not null or not (select public.is_admin())) then
    raise exception 'Seul un administrateur peut annuler un refus de livraison.' using errcode = '42501';
  end if;

  if new.refusal_reason is distinct from old.refusal_reason then
    if old.refusal_reason is not null then
      raise exception 'Le refus de livraison ne peut plus être modifié.' using errcode = '42501';
    end if;
    if v_caller is distinct from old.seller_id then
      raise exception 'Seul le vendeur peut indiquer un refus de livraison.' using errcode = '42501';
    end if;
    if old.order_type is distinct from 'product' then
      raise exception 'Un refus de livraison ne concerne qu''une commande de produit.'
        using errcode = '23514', hint = 'refusal_not_product';
    end if;
    if not (old.status in ('dispatched', 'in_delivery', 'arrived') and new.status = 'cancelled') then
      raise exception 'Une commande ne peut être marquée refusée à la livraison qu''une fois expédiée, au moment de son annulation.'
        using errcode = '23514', hint = 'refusal_status';
    end if;
  end if;

  return new;
end;
$$;

create trigger trg_enforce_refusal_marker
  before insert or update on public.orders
  for each row execute function public.enforce_refusal_marker();

revoke all on function public.enforce_refusal_marker() from public, anon, authenticated;

-- ─── 2. Block lifts (the state the rule reads; the journal records who and why) ──────────────────

create table public.cod_block_lifts (
  id         uuid primary key default gen_random_uuid(),
  buyer_id   uuid not null references public.profiles (id) on delete cascade,
  lifted_by  uuid references public.profiles (id) on delete set null,
  lifted_at  timestamptz not null default now(),
  note       text not null constraint cod_block_lifts_note_check check (char_length(btrim(note)) between 1 and 500)
);

alter table public.cod_block_lifts enable row level security;

create index cod_block_lifts_buyer_idx on public.cod_block_lifts (buyer_id, lifted_at desc);
create index cod_block_lifts_lifted_by_idx on public.cod_block_lifts (lifted_by);

create policy "Admins read COD block lifts" on public.cod_block_lifts
  for select to authenticated using ((select public.is_admin()));

-- Written only by admin_lift_cod_block (SECURITY DEFINER). No client write grant, no anon read.
revoke all on table public.cod_block_lifts from public, anon, authenticated;
grant select on table public.cod_block_lifts to authenticated;

comment on table public.cod_block_lifts is
  'COD no-show rule: one row per admin lift of a buyer''s block. Refusals before the latest lift no longer count (clean slate). Written by admin_lift_cod_block only.';

-- ─── 3. The standing (private: not exposed by PostgREST, no grants; called by the definer functions below) ──

create or replace function private.buyer_cod_standing(p_buyer uuid)
returns table (refusals_90d integer, open_order_cap boolean, blocked_until timestamptz, last_lift_at timestamptz)
language sql
stable
set search_path = ''
as $$
  with lift as (
    select max(l.lifted_at) as at from public.cod_block_lifts l where l.buyer_id = p_buyer
  ),
  -- One counted refusal per seller per Africa/Tunis day; its time is that day's first refusal.
  refusal as (
    select min(o.cancelled_at) as at
      from public.orders o
      cross join lift
     where o.buyer_id = p_buyer
       and o.order_type = 'product'
       and o.status = 'cancelled'
       and o.cancelled_by = 'seller'
       and o.refusal_reason is not null
       and o.refusal_voided_at is null
       and (lift.at is null or o.cancelled_at > lift.at)
     group by o.seller_id, (o.cancelled_at at time zone 'Africa/Tunis')::date
  ),
  -- R90 at each refusal, that refusal included.
  windowed as (
    select r.at, count(*) over (order by r.at range between interval '90 days' preceding and current row) as n90
      from refusal r
  ),
  -- The same inclusive 90 days as the window frame above.
  recent as (
    select count(*)::integer as n from refusal r where r.at >= now() - interval '90 days'
  ),
  block as (
    select max(w.at) + interval '30 days' as until from windowed w where w.n90 >= 3
  )
  -- The cap (and the seller's warning) also holds for the whole of an active block: the block's 3 refusals can lie up
  -- to 90 days before the one that reached 3, so fewer than 2 may still be inside the last 90 days.
  select recent.n,
         recent.n >= 2 or coalesce(block.until > now(), false),
         case when block.until > now() then block.until end,
         lift.at
    from recent, block, lift;
$$;

revoke all on function private.buyer_cod_standing(uuid) from public, anon, authenticated;

comment on function private.buyer_cod_standing(uuid) is
  'COD no-show rule, computed live (nothing stored): counted refusals in the last 90 days, the 1-open-order cap (>= 2, or while blocked), the end of an active 30-day block (anchored at the refusal that reached 3), and the last lift.';

-- ─── 4. Enforcement on order insert ────────────────────────────────────────────────────────────────

create or replace function public.enforce_cod_no_show_rule()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_standing record;
  v_open     integer;
begin
  if (select auth.uid()) is null then
    return new;
  end if;
  if new.buyer_id is distinct from (select auth.uid()) then
    return new;
  end if;
  if new.order_type is distinct from 'product' then
    return new;
  end if;

  -- FIRST, before any read: enforce_order_rate_limit's own key (already held by trg_limit_orders; re-entrant). The
  -- reads below are separate statements, so under READ COMMITTED they see a concurrent insert that committed while
  -- this one waited.
  perform pg_advisory_xact_lock(hashtextextended('orders.rate:' || new.buyer_id::text, 0));

  select * into v_standing from private.buyer_cod_standing(new.buyer_id);

  if v_standing.blocked_until is not null then
    raise exception 'Les commandes avec paiement à la livraison sont suspendues pour votre compte jusqu''au %, après 3 livraisons refusées en 90 jours.',
      to_char(v_standing.blocked_until at time zone 'Africa/Tunis', 'DD/MM/YYYY')
      using errcode = '23514', hint = 'cod_blocked';
  end if;

  if v_standing.open_order_cap then
    select count(*) into v_open
      from public.orders o
     where o.buyer_id = new.buyer_id
       and o.order_type = 'product'
       and o.status in ('pending', 'accepted', 'prepared', 'dispatched', 'in_delivery', 'arrived');
    if v_open >= 1 then
      raise exception 'Vous avez déjà une commande en cours. Après plusieurs livraisons refusées, une seule commande à la fois est possible.'
        using errcode = '23514', hint = 'cod_open_order_cap';
    end if;
  end if;

  return new;
end;
$$;

create trigger trg_limit_orders_cod
  before insert on public.orders
  for each row execute function public.enforce_cod_no_show_rule();

revoke all on function public.enforce_cod_no_show_rule() from public, anon, authenticated;

-- ─── 5. Contest: a dispute with reason refusal_contested, buyer only, within 14 days ──────────────

alter table public.disputes drop constraint disputes_reason_check;
alter table public.disputes add constraint disputes_reason_check
  check (reason in ('not_delivered', 'wrong_item', 'damaged', 'payment_refused', 'buyer_unreachable', 'other',
                    'refusal_contested'));

create or replace function public.enforce_refusal_contest()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reason    text;
  v_voided_at timestamptz;
  v_refused   timestamptz;
begin
  if new.reason is distinct from 'refusal_contested' then
    return new;
  end if;
  if (select auth.uid()) is null then
    return new;
  end if;
  if new.created_by_role is distinct from 'buyer' then
    raise exception 'Seul l''acheteur peut contester un refus de livraison.'
      using errcode = '23514', hint = 'contest_buyer_only';
  end if;

  -- This trigger runs before the disputes RLS check, as definer: read only the caller's OWN order, so the hints below
  -- never tell anyone else whether some order carries a refusal.
  select o.refusal_reason, o.refusal_voided_at, o.cancelled_at
    into v_reason, v_voided_at, v_refused
    from public.orders o
   where o.id = new.order_id
     and o.buyer_id = (select auth.uid());
  if not found then
    raise exception 'Vous n''êtes pas autorisé à contester cette commande.' using errcode = '42501';
  end if;

  if v_reason is null or v_voided_at is not null then
    raise exception 'Cette commande n''a pas de refus de livraison à contester.'
      using errcode = '23514', hint = 'contest_not_refusal';
  end if;
  if now() > v_refused + interval '14 days' then
    raise exception 'Le délai de 14 jours pour contester ce refus de livraison est dépassé.'
      using errcode = '23514', hint = 'contest_window_closed';
  end if;

  return new;
end;
$$;

create trigger trg_enforce_refusal_contest
  before insert on public.disputes
  for each row execute function public.enforce_refusal_contest();

revoke all on function public.enforce_refusal_contest() from public, anon, authenticated;

-- ─── 6. DECISION 2: a contest can sit beside another active dispute on the same order ─────────────
-- 0 disputes live: the swap is instant. One active contest per order, one active other dispute per order.

drop index public.disputes_one_active_per_order;
create unique index disputes_one_active_per_order on public.disputes (order_id)
  where status in ('open', 'under_review') and reason <> 'refusal_contested';
create unique index disputes_one_active_contest_per_order on public.disputes (order_id)
  where status in ('open', 'under_review') and reason = 'refusal_contested';

-- ─── 7. RPCs ────────────────────────────────────────────────────────────────────────────────────────

-- The buyer's own standing: the order form's banner and the date in the block message. Never the count.
create or replace function public.get_my_cod_standing()
returns table (open_order_cap boolean, blocked_until timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select s.open_order_cap, s.blocked_until
    from private.buyer_cod_standing((select auth.uid())) s
   where (select auth.uid()) is not null;
$$;

-- The seller's warning: of the caller's own OPEN product orders among p_order_ids (first 200), those whose buyer
-- currently has 2+ counted refusals. Ids only: no count, no dates, no other seller.
create or replace function public.seller_buyer_cod_warnings(p_order_ids uuid[])
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select o.id
    from public.orders o
   where (select auth.uid()) is not null
     and o.seller_id = (select auth.uid())
     and o.id = any (p_order_ids[1:200])
     and o.order_type = 'product'
     and o.status in ('pending', 'accepted', 'prepared', 'dispatched', 'in_delivery', 'arrived')
     and (select s.open_order_cap from private.buyer_cod_standing(o.buyer_id) s);
$$;

create or replace function public.admin_get_cod_standing(p_buyer uuid)
returns table (refusals_90d integer, open_order_cap boolean, blocked_until timestamptz, last_lift_at timestamptz)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Accès réservé aux administrateurs.' using errcode = '42501';
  end if;
  return query select * from private.buyer_cod_standing(p_buyer);
end;
$$;

create or replace function public.admin_lift_cod_block(p_buyer uuid, p_note text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_note   text := nullif(btrim(coalesce(p_note, '')), '');
  v_before record;
begin
  if not public.is_admin() then
    raise exception 'Accès réservé aux administrateurs.' using errcode = '42501';
  end if;
  if v_note is null then
    raise exception 'Indiquez le motif de la levée du blocage.' using errcode = '23514', hint = 'note_required';
  end if;
  if char_length(v_note) > 500 then
    raise exception 'La note est trop longue (500 caractères maximum).' using errcode = '23514', hint = 'note_too_long';
  end if;

  -- The buyer's order lock: a lift and that buyer's order insert never interleave.
  perform pg_advisory_xact_lock(hashtextextended('orders.rate:' || p_buyer::text, 0));

  select * into v_before from private.buyer_cod_standing(p_buyer);
  if v_before.blocked_until is null then
    raise exception 'Ce compte n''est pas bloqué.' using errcode = '23514', hint = 'cod_not_blocked';
  end if;

  insert into public.cod_block_lifts (buyer_id, lifted_by, note) values (p_buyer, (select auth.uid()), v_note);

  perform public.log_admin_action(
    p_action       => 'lift_cod_block',
    p_target_type  => 'user',
    p_target_id    => p_buyer,
    p_before_state => jsonb_build_object('blocked_until', v_before.blocked_until, 'refusals_90d', v_before.refusals_90d),
    p_after_state  => jsonb_build_object('blocked_until', null, 'refusals_90d', 0),
    p_note         => v_note
  );
end;
$$;

create or replace function public.admin_void_refusal(p_order uuid, p_note text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_note      text := nullif(btrim(coalesce(p_note, '')), '');
  v_buyer     uuid;
  v_reason    text;
  v_voided_at timestamptz;
begin
  if not public.is_admin() then
    raise exception 'Accès réservé aux administrateurs.' using errcode = '42501';
  end if;
  if v_note is null then
    raise exception 'Indiquez le motif de l''annulation du refus.' using errcode = '23514', hint = 'note_required';
  end if;
  if char_length(v_note) > 500 then
    raise exception 'La note est trop longue (500 caractères maximum).' using errcode = '23514', hint = 'note_too_long';
  end if;

  select o.buyer_id, o.refusal_reason, o.refusal_voided_at
    into v_buyer, v_reason, v_voided_at
    from public.orders o
   where o.id = p_order
     for update;
  if not found or v_reason is null then
    raise exception 'Cette commande n''a pas de refus de livraison.' using errcode = '23514', hint = 'not_a_refusal';
  end if;
  if v_voided_at is not null then
    raise exception 'Ce refus de livraison est déjà annulé.' using errcode = '23514', hint = 'refusal_already_voided';
  end if;

  -- Never the status: the order stays « Annulée ». The marker guard lets an admin set this column once.
  update public.orders set refusal_voided_at = now() where id = p_order;

  perform public.log_admin_action(
    p_action       => 'void_refusal',
    p_target_type  => 'order',
    p_target_id    => p_order,
    p_before_state => jsonb_build_object('buyer_id', v_buyer, 'refusal_reason', v_reason, 'refusal_voided_at', null),
    p_after_state  => jsonb_build_object('refusal_voided_at', now()),
    p_note         => v_note
  );
end;
$$;

revoke all on function public.get_my_cod_standing() from public, anon;
revoke all on function public.seller_buyer_cod_warnings(uuid[]) from public, anon;
revoke all on function public.admin_get_cod_standing(uuid) from public, anon;
revoke all on function public.admin_lift_cod_block(uuid, text) from public, anon;
revoke all on function public.admin_void_refusal(uuid, text) from public, anon;
grant execute on function public.get_my_cod_standing() to authenticated;
grant execute on function public.seller_buyer_cod_warnings(uuid[]) to authenticated;
grant execute on function public.admin_get_cod_standing(uuid) to authenticated;
grant execute on function public.admin_lift_cod_block(uuid, text) to authenticated;
grant execute on function public.admin_void_refusal(uuid, text) to authenticated;

-- ─── ROLLBACK (run as one transaction; no pre-existing row changes) ─────────────────────────────────
-- drop trigger trg_limit_orders_cod on public.orders;
-- drop trigger trg_enforce_refusal_marker on public.orders;
-- drop trigger trg_enforce_refusal_contest on public.disputes;
-- drop function public.enforce_cod_no_show_rule();
-- drop function public.enforce_refusal_marker();
-- drop function public.enforce_refusal_contest();
-- drop function public.get_my_cod_standing();
-- drop function public.seller_buyer_cod_warnings(uuid[]);
-- drop function public.admin_get_cod_standing(uuid);
-- drop function public.admin_lift_cod_block(uuid, text);
-- drop function public.admin_void_refusal(uuid, text);
-- drop function private.buyer_cod_standing(uuid);
-- drop table public.cod_block_lifts;
-- revoke update (refusal_reason) on public.orders from authenticated;
-- alter table public.orders drop constraint orders_refusal_reason_check, drop constraint orders_refusal_is_seller_cancel,
--   drop constraint orders_refusal_void_needs_refusal, drop column refusal_reason, drop column refusal_voided_at;
-- update public.disputes set reason = 'other', description = coalesce(description, 'Refus de livraison contesté')
--  where reason = 'refusal_contested';
-- drop index public.disputes_one_active_contest_per_order;
-- drop index public.disputes_one_active_per_order;
-- create unique index disputes_one_active_per_order on public.disputes (order_id) where status in ('open', 'under_review');
-- alter table public.disputes drop constraint disputes_reason_check;
-- alter table public.disputes add constraint disputes_reason_check
--   check (reason in ('not_delivered', 'wrong_item', 'damaged', 'payment_refused', 'buyer_unreachable', 'other'));
-- (Rolling back the split index fails if two active disputes now share an order: close one first.)
