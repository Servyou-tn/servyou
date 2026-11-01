-- get_contact_phone: a DELETED mission post no longer reveals its responders' numbers (architect + founder decision
-- 2026-11-01 on migration 113's open question): once the client deletes the post, nothing links them any more. A post
-- that is only closed ('filled') or 'expired' keeps the client → freelancer reveal. Also records the two rulings in the
-- function's own COMMENT (« document both in the function comment »).
--
-- job_posts.status ∈ ('open', 'filled', 'expired', 'deleted') — 'deleted' is the soft delete (mes-annonces).
-- Only change from migration 113: the mission branch gains `and jp.status <> 'deleted'`. Same signature, so
-- CREATE OR REPLACE keeps the grants (postgres, anon, authenticated, service_role — PUBLIC revoked by migration 114).

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

  -- Mission owner → a freelancer who sent a proposal, while the post is not deleted (closed / expired still reveal).
  -- (Freelancer → client: never through a mission.)
  if exists (
    select 1
      from public.job_responses jr
      join public.job_posts jp on jp.id = jr.job_post_id
     where jp.consumer_id = v_caller
       and jr.freelancer_id = target
       and jp.admin_hidden_at is null
       and jp.status <> 'deleted'
  ) then
    select p.phone into v_phone from public.profiles p where p.id = target;
    return v_phone;
  end if;

  return null;
end;
$$;

comment on function public.get_contact_phone(uuid) is
  'The other party''s phone, or NULL. Rule (2026-11-01): whoever reaches out shares their number; the other side''s is '
  'revealed when they accept. ORDERS — per PAIR of accounts, not per order: the seller sees the buyer from « pending » '
  'on (not if cancelled while pending); the buyer sees the seller once ANY order between them is past « pending » '
  '(accepted onward, or cancelled after an acceptance — read from order_events), on every order with them. MISSIONS — '
  'the post owner sees each freelancer who sent a proposal, unless the post is deleted (closed / expired still reveal); '
  'a freelancer never sees the owner through a mission. Either party suspended → NULL. Anonymous → NULL; self → own.';

-- Post-apply verification:
--   1. select obj_description('public.get_contact_phone(uuid)'::regprocedure, 'pg_proc');  → the comment above
--   2. EXECUTE grants unchanged: postgres, anon, authenticated, service_role (no PUBLIC).
--   3. phone-reveal-{buyer,seller,mission}-live.test.ts: all pass, incl. « deleted post → NULL » and « closed post →
--      still visible ».
--
-- Rollback: re-apply migration 113's body (20261101181237_phone_reveal_rule.sql) and `comment on function
-- public.get_contact_phone(uuid) is null;`.
