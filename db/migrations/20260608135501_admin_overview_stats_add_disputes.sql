-- Extend admin_overview_stats() with pending_disputes count so the admin
-- overview page surfaces dispute volume alongside pending_reports. Same
-- pattern as the existing report count, scoped to open + under_review.
--
-- CREATE OR REPLACE can't change a function's RETURNS TABLE shape; the
-- function must be dropped and recreated. Atomic within this migration.

drop function if exists public.admin_overview_stats();

create or replace function public.admin_overview_stats()
returns table(
  total_users bigint,
  total_shops bigint,
  total_freelancers bigint,
  total_products bigint,
  total_services bigint,
  total_job_posts bigint,
  completed_orders bigint,
  pending_reports bigint,
  pending_disputes bigint
)
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  -- Admin-only gate. is_admin() reads auth.uid() internally and returns false for anon.
  if not public.is_admin() then
    raise exception 'Forbidden: admin access required';
  end if;

  return query
  select
    (select count(*) from public.profiles),
    (select count(*) from public.shops),
    (select count(*) from public.freelancer_profiles),
    (select count(*) from public.products),
    (select count(*) from public.service_listings),
    (select count(*) from public.job_posts),
    (select count(*) from public.orders   where status = 'received'),
    (select count(*) from public.reports  where status in ('open', 'under_review')),
    (select count(*) from public.disputes where status in ('open', 'under_review'));
end;
$function$;

comment on function public.admin_overview_stats() is
  'Single-row stats for the admin overview page. Admin-only (is_admin() gate, raises Forbidden for non-admin). Counts reflect live state at call time. pending_reports and pending_disputes both filter to open + under_review (i.e. items needing admin action).';
