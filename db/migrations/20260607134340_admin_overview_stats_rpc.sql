create or replace function public.admin_overview_stats()
returns table (
  total_users        bigint,
  total_shops        bigint,
  total_freelancers  bigint,
  total_products     bigint,
  total_services     bigint,
  total_job_posts    bigint,
  completed_orders   bigint,
  pending_reports    bigint
)
language plpgsql
security definer
set search_path = public
as $$
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
    (select count(*) from public.orders  where status = 'received'),
    (select count(*) from public.reports where status in ('open','under_review'));
end;
$$;

-- Lock down execution at the role layer too (defense in depth on top of is_admin gate)
revoke all on function public.admin_overview_stats() from public;
grant execute on function public.admin_overview_stats() to authenticated;

comment on function public.admin_overview_stats() is
  'Returns aggregate platform counts for the admin overview dashboard. SECURITY DEFINER + is_admin() gate at entry so client-side count(*) RLS gaps cannot leak under-counts. Only callable by admins; non-admins receive RAISE EXCEPTION.';
