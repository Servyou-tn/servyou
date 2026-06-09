DROP VIEW public.buyer_cancellation_history;
CREATE VIEW public.buyer_cancellation_history WITH (security_invoker = true) AS
  SELECT buyer_id,
         count(*) AS total_orders,
         count(*) FILTER (WHERE status='cancelled') AS cancellations_total,
         count(*) FILTER (WHERE status='cancelled' AND cancelled_by='buyer') AS cancellations_by_buyer,
         count(*) FILTER (WHERE status='cancelled' AND cancelled_by='buyer' AND cancellation_reason IS NOT NULL) AS cancellations_by_buyer_after_pivot,
         max(cancelled_at) FILTER (WHERE status='cancelled' AND cancelled_by='buyer') AS last_buyer_cancelled_at
  FROM public.orders
  GROUP BY buyer_id;

COMMENT ON VIEW public.buyer_cancellation_history IS
  'Per-buyer cancellation aggregation. cancellations_by_buyer_after_pivot is the serial-refuser metric — cancellations the buyer initiated where a reason was required (i.e., post-pivot in the order lifecycle). NOTE: this view uses cancellation_reason IS NOT NULL as a proxy for "post-pivot" because the schema does not store status-at-cancellation. Per-transition timestamps are deferred post-launch; when they ship, this metric should be tightened to filter on actual status-at-cancellation. security_invoker=true means rows respect underlying orders RLS: buyers see own global stats, admins see global, sellers see their own-relationship slice only. Global seller-facing reputation is deferred to the post-launch buyer-rating system.';

REVOKE SELECT ON public.buyer_cancellation_history FROM anon;
-- authenticated retains SELECT; orders RLS handles row visibility per persona.
-- (defense-in-depth: anon row visibility is already zero via orders RLS,
--  but explicit REVOKE removes the grant entirely.)