-- Aggregate cancellation record per buyer. Foundation for the post-launch buyer rating system.
-- security_invoker = true: view runs in the caller's context, inheriting orders RLS.
-- A buyer sees their own row; a seller sees buyers they've dealt with via orders;
-- admin via service role sees all. The rating-system consumer is post-launch — today
-- the view exists so data accumulates as cancellations happen.
create view public.buyer_cancellation_history
with (security_invoker = true)
as
select
  buyer_id,
  count(*)                                                                         as total_orders,
  count(*) filter (where status = 'cancelled')                                     as cancellations_total,
  count(*) filter (where status = 'cancelled' and cancellation_reason is not null) as cancellations_after_pivot,
  max(cancelled_at) filter (where status = 'cancelled')                            as last_cancelled_at
from public.orders
group by buyer_id;

-- Lock down explicit access. Authenticated users only — anon has no business reading this.
revoke all on public.buyer_cancellation_history from public;
grant select on public.buyer_cancellation_history to authenticated;

comment on view public.buyer_cancellation_history is
  'Aggregate cancellation record per buyer, one row per buyer who has placed at least one order. Foundation for the post-launch buyer rating system. cancellations_after_pivot is the metric that counts against the buyer (post-dispatch product cancellations or post-accept service cancellations — both require cancellation_reason per the role-gating trigger). Inherits orders RLS via security_invoker=true.';
