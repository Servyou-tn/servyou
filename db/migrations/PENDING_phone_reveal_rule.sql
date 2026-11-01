-- Phone reveal rule (pre-beta review F4; founder + architect decision 2026-11-01): whoever reaches out shares their
-- number; the other side's number is revealed when they accept. Enforced in get_contact_phone — the ONLY function
-- that returns a phone (live check 2026-11-01: no other function body reads `phone`; public_profiles has no phone
-- column; orders.delivery_phone stays readable by the order's two parties, as decided).
--
-- ORDERS (caller ↔ target linked by an order in either direction):
--   * seller → buyer's phone: from « pending » on; hidden if the order was cancelled while still pending;
--   * buyer → seller's phone: hidden while « pending »; visible from « accepted » on (accepted, prepared, dispatched,
--     in_delivery, arrived, received), and kept after a cancellation that happened AFTER acceptance.
--   « After acceptance » is read from public.order_events (written only by trg_emit_order_event; no client write
--   privilege): an event into 'accepted', or a status change into 'cancelled' whose from_status was not 'pending'. Events exist since
--   2026-08-10: the 14 older orders have none — their 2 cancelled ones show no acceptance, so they count as cancelled
--   while pending (hidden for both sides). (The decision text lists « refused »: orders has no such status; a seller's
--   refusal is a cancellation of a pending order, so it is hidden.)
-- MISSIONS (job_responses):
--   * client (the post's consumer) → each freelancer who sent a proposal: visible (moderated post excluded, as before);
--   * freelancer → client: never through the mission path (removed). An order between them follows the order rule.
-- UNCHANGED: anonymous → NULL; your own phone; either party suspended → NULL on every branch (ruling 6 — the « keep
-- contact on existing orders during a suspension » change is the separate Nov 6–10 build).
--
-- Same signature, return type and volatility, so CREATE OR REPLACE keeps the function's grants (anon / authenticated
-- EXECUTE, unchanged). search_path moves from 'public' to '' with every name qualified (review F11 hygiene).
--
-- Live on 2026-11-01: orders pending 5, accepted 2, prepared 1, arrived 2, received 4, cancelled 2 (both pre-events).
-- Effect: buyers of the 5 pending orders no longer get the seller's number; freelancers no longer get a client's
-- number from a proposal; sellers keep the buyer's number on pending orders.

create or replace function public.get_contact_phone(target uuid)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_caller uuid := auth.uid();
  v_phone  text;
begin
  if v_caller is null then
    return null;
  end if;

  if v_caller = target then
    select p.phone into v_phone from public.profiles p where p.id = target;
    return v_phone;
  end if;

  -- Either party suspended: no unlock, whatever links them (ruling 6, checked at call time).
  if exists (
    select 1 from public.profiles p where p.id in (v_caller, target) and p.suspended_at is not null
  ) then
    return null;
  end if;

  if exists (
    select 1
      from public.orders o
     where (
             -- Seller → buyer: from « pending » on, unless cancelled while pending.
             (o.seller_id = v_caller and o.buyer_id = target)
             -- Buyer → seller: only once the seller has accepted.
          or (o.buyer_id = v_caller and o.seller_id = target and o.status <> 'pending')
           )
       and (
             o.status <> 'cancelled'
             -- A cancelled order keeps the reveal only if it had been accepted first.
          or exists (
               select 1
                 from public.order_events e
                where e.order_id = o.id
                  and (
                        e.to_status = 'accepted'
                        -- A real cancellation out of an accepted-or-later status. Not a 'created' event (from_status
                        -- null): an order inserted directly as cancelled (service role only) was never accepted.
                     or (e.event_type = 'status_change' and e.to_status = 'cancelled' and e.from_status <> 'pending')
                      )
             )
           )
  ) then
    select p.phone into v_phone from public.profiles p where p.id = target;
    return v_phone;
  end if;

  -- Mission owner → a freelancer who sent a proposal. (Freelancer → client: never through a mission.)
  if exists (
    select 1
      from public.job_responses jr
      join public.job_posts jp on jp.id = jr.job_post_id
     where jp.consumer_id = v_caller
       and jr.freelancer_id = target
       and jp.admin_hidden_at is null
  ) then
    select p.phone into v_phone from public.profiles p where p.id = target;
    return v_phone;
  end if;

  return null;
end;
$$;

-- Post-apply verification:
--   1. select proconfig from pg_proc where oid = 'public.get_contact_phone(uuid)'::regprocedure;  → {search_path=""}
--   2. EXECUTE grants unchanged (anon, authenticated, service_role).
--   3. src/__tests__/phone-reveal-live.test.ts (live, 1 sign-in per side as needed): every row of the rule — both
--      sides × each status × cancelled before / after acceptance × missions × suspension × anonymous / self.
--
-- Rollback: re-apply the previous body from migration 88 (20261028201733_get_contact_phone_state_gate.sql).
