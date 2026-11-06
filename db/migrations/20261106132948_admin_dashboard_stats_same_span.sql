-- « previous » now covers the same elapsed span one period back: [v_prev, v_now - p_days), so deltas compare like with like.
create or replace function public.admin_dashboard_stats(p_days integer default 7)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_tz   constant text := 'Africa/Tunis';
  v_now  timestamptz := now();
  v_from timestamptz;
  v_prev timestamptz;
  v_prev_to timestamptz;
  v_week timestamp;
begin
  if not public.is_admin() then
    raise exception 'Accès réservé aux administrateurs.' using errcode = '42501';
  end if;
  if p_days is null or p_days not in (7, 30, 90) then
    raise exception 'Période inconnue (7, 30 ou 90 jours).' using errcode = '23514';
  end if;
  v_from := (date_trunc('day', v_now at time zone v_tz) - make_interval(days => p_days - 1)) at time zone v_tz;
  v_prev := v_from - make_interval(days => p_days);
  v_prev_to := v_now - make_interval(days => p_days);
  v_week := date_trunc('week', v_now at time zone v_tz);
  return jsonb_build_object(
    'generated_at', v_now,
    'period', jsonb_build_object('days', p_days, 'from', v_from, 'to', v_now, 'previous_from', v_prev, 'previous_to', v_prev_to),
    'current',  private.admin_period_kpis(v_from, v_now),
    'previous', private.admin_period_kpis(v_prev, v_prev_to),
    'snapshot', jsonb_build_object(
      'active_sellers', (select count(*) from private.admin_active_sellers()),
      'sellers_without_orders', (
        select count(*) from (
          select s.owner_id as seller_id, s.created_at from public.shops s where s.admin_hidden_at is null
          union all
          select fp.profile_id, fp.created_at from public.freelancer_profiles fp where fp.admin_hidden_at is null
        ) x
        join public.profiles p on p.id = x.seller_id and p.suspended_at is null
        where x.created_at < v_now - interval '14 days'
          and not exists (select 1 from public.orders o where o.seller_id = x.seller_id)),
      'loyal_buyers', (
        select count(*) from (
          select o.buyer_id from public.orders o where o.status = 'received' group by o.buyer_id having count(*) >= 2
        ) l)
    ),
    'weekly', (
      select jsonb_agg(jsonb_build_object(
               'week_start', to_char(w.wk, 'YYYY-MM-DD'),
               'iso_week', extract(week from w.wk)::integer,
               'created',  (select count(*) from public.orders o
                             where (o.created_at at time zone v_tz) >= w.wk and (o.created_at at time zone v_tz) < w.wk + interval '1 week'),
               'received', (select count(*) from public.orders o
                             where (o.received_at at time zone v_tz) >= w.wk and (o.received_at at time zone v_tz) < w.wk + interval '1 week'))
             order by w.wk)
        from generate_series(v_week - interval '7 weeks', v_week, interval '1 week') as w(wk)
    ),
    'funnel', (
      select jsonb_build_object(
               'created',          count(*),
               'reached_accepted', count(*) filter (where greatest(coalesce(f.rnk, -1), coalesce(f.ev_rnk, -1)) >= 1),
               'reached_arrived',  count(*) filter (where greatest(coalesce(f.rnk, -1), coalesce(f.ev_rnk, -1)) >= 5),
               'received',         count(*) filter (where f.status = 'received'),
               'still_pending',    count(*) filter (where f.status = 'pending'),
               'cancelled',        count(*) filter (where f.status = 'cancelled'))
        from (
          select o.status, private.order_status_rank(o.status) as rnk,
                 (select max(private.order_status_rank(e.to_status)) from public.order_events e where e.order_id = o.id) as ev_rnk
            from public.orders o
           where o.created_at >= v_from and o.created_at < v_now
        ) f
    ),
    'by_category', (
      select coalesce(jsonb_agg(jsonb_build_object(
               'category_id', c.id, 'name_fr', c.name_fr, 'name_ar', c.name_ar, 'kind', c.kind,
               'listings', t.listings, 'orders', t.orders, 'job_posts', t.job_posts)
             order by t.listings + t.orders + t.job_posts desc, c.name_fr), '[]'::jsonb)
        from (
          select x.top_id, sum(x.listings)::integer as listings, sum(x.orders)::integer as orders, sum(x.job_posts)::integer as job_posts
            from (
              select coalesce(cat.parent_id, cat.id) as top_id, 1 as listings, 0 as orders, 0 as job_posts
                from public.products pr
                join public.shops s on s.id = pr.shop_id and s.admin_hidden_at is null
                join public.categories cat on cat.id = pr.category_id
               where pr.status = 'active' and pr.admin_hidden_at is null
              union all
              select coalesce(cat.parent_id, cat.id), 1, 0, 0
                from public.service_listings sl
                join public.freelancer_profiles fp on fp.id = sl.freelancer_profile_id and fp.admin_hidden_at is null
                join public.categories cat on cat.id = sl.category_id
               where sl.status = 'active' and sl.admin_hidden_at is null
              union all
              select coalesce(cat.parent_id, cat.id), 0, 1, 0
                from public.orders o
                left join public.products pr on pr.id = o.product_id
                left join public.service_listings sl on sl.id = o.service_listing_id
                join public.categories cat on cat.id = coalesce(pr.category_id, sl.category_id)
               where o.created_at >= v_from and o.created_at < v_now
              union all
              select coalesce(cat.parent_id, cat.id), 0, 0, 1
                from public.job_posts jp
                join public.categories cat on cat.id = jp.category_id
               where jp.created_at >= v_from and jp.created_at < v_now
            ) x
           group by x.top_id
        ) t
        join public.categories c on c.id = t.top_id
    ),
    'by_city', (
      select coalesce(jsonb_agg(jsonb_build_object('city', y.city, 'sellers', y.sellers, 'buyers', y.buyers, 'orders', y.orders)
             order by y.sellers + y.orders desc, y.city), '[]'::jsonb)
        from (
          select z.city, sum(z.sellers)::integer as sellers, sum(z.buyers)::integer as buyers, sum(z.orders)::integer as orders
            from (
              select p.city, 1 as sellers, 0 as buyers, 0 as orders
                from private.admin_active_sellers() a join public.profiles p on p.id = a.seller_id
               where p.city is not null
              union all
              select p.city, 0, count(distinct o.buyer_id)::integer, count(*)::integer
                from public.orders o join public.profiles p on p.id = o.buyer_id
               where o.created_at >= v_from and o.created_at < v_now and p.city is not null
               group by p.city
            ) z
           group by z.city
        ) y
    ),
    'queue', jsonb_build_object(
      'reports_open',            (select count(*) from public.reports r where r.status in ('open', 'under_review')),
      'reports_fake_scam_open',  (select count(*) from public.reports r where r.status in ('open', 'under_review') and r.reason = 'fake_scam'),
      'reports_oldest_at',       (select min(r.created_at) from public.reports r where r.status in ('open', 'under_review')),
      'disputes_open',           (select count(*) from public.disputes d where d.status in ('open', 'under_review')),
      'disputes_oldest_at',      (select min(d.created_at) from public.disputes d where d.status in ('open', 'under_review')),
      'orders_blocked',          (select count(*) from private.admin_orders(null, null, null, null) ao where ao.is_blocked),
      'deletion_requests_pending', (select count(*) from public.deletion_requests dr where dr.status = 'pending'),
      'deletion_requests_oldest_at', (select min(dr.requested_at) from public.deletion_requests dr where dr.status = 'pending'),
      'data_exports_pending',    (select count(*) from public.data_exports de where de.status = 'pending'),
      'contact_messages_new',    (select count(*) from public.contact_messages m where m.status = 'new'),
      'contact_messages_oldest_at', (select min(m.created_at) from public.contact_messages m where m.status = 'new')
    )
  );
end;
$$;
revoke all on function public.admin_dashboard_stats(integer) from public, anon;
grant execute on function public.admin_dashboard_stats(integer) to authenticated;