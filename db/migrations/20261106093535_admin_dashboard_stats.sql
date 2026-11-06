-- Admin dashboard read side for Figma J1, J8, J9, J11 (db-guardian, reviewed + applied by architect 2026-11-06).
create or replace function private.order_status_rank(p_status text)
returns integer language sql immutable set search_path = '' as $$
  select case p_status
    when 'pending' then 0 when 'accepted' then 1 when 'prepared' then 2 when 'dispatched' then 3
    when 'in_delivery' then 4 when 'arrived' then 5 when 'received' then 6
  end
$$;

create or replace function private.admin_active_sellers()
returns table (seller_id uuid) language sql stable set search_path = '' as $$
  select s.owner_id
    from public.shops s
    join public.profiles p on p.id = s.owner_id
   where s.admin_hidden_at is null and p.suspended_at is null
     and exists (select 1 from public.products pr
                  where pr.shop_id = s.id and pr.status = 'active' and pr.admin_hidden_at is null)
  union
  select fp.profile_id
    from public.freelancer_profiles fp
    join public.profiles p on p.id = fp.profile_id
   where fp.admin_hidden_at is null and p.suspended_at is null
     and exists (select 1 from public.service_listings sl
                  where sl.freelancer_profile_id = fp.id and sl.status = 'active' and sl.admin_hidden_at is null)
$$;

create or replace function private.admin_period_kpis(p_from timestamptz, p_to timestamptz)
returns jsonb language sql stable set search_path = '' as $$
  with created as (
    select o.id, o.buyer_id, o.status, o.created_at
      from public.orders o
     where o.created_at >= p_from and o.created_at < p_to
  ), accepted as (
    select extract(epoch from (min(e.created_at) - c.created_at)) / 60.0 as minutes
      from created c
      join public.order_events e on e.order_id = c.id and e.to_status = 'accepted'
     group by c.id, c.created_at
  ), posts as (
    select jp.id, jp.created_at, jp.response_count
      from public.job_posts jp
     where jp.created_at >= p_from and jp.created_at < p_to
  ), first_proposal as (
    select extract(epoch from (min(r.created_at) - p.created_at)) / 60.0 as minutes
      from posts p
      join public.job_responses r on r.job_post_id = p.id
     group by p.id, p.created_at
  )
  select jsonb_build_object(
    'orders_created',            (select count(*) from created),
    'orders_received',           (select count(*) from public.orders o where o.received_at >= p_from and o.received_at < p_to),
    'created_then_received',     (select count(*) from created where status = 'received'),
    'created_then_cancelled',    (select count(*) from created where status = 'cancelled'),
    'declared_value_tnd',        (select coalesce(sum(o.unit_price_tnd * o.quantity + coalesce(o.delivery_fee_tnd, 0)), 0)
                                    from public.orders o where o.received_at >= p_from and o.received_at < p_to),
    'acceptance_median_minutes', (select round(percentile_cont(0.5) within group (order by minutes))::integer from accepted),
    'acceptance_samples',        (select count(*) from accepted),
    'new_signups',               (select count(*) from public.profiles p where p.created_at >= p_from and p.created_at < p_to),
    'active_buyers',             (select count(distinct buyer_id) from created),
    'new_sellers',               (select count(*) from public.shops s where s.created_at >= p_from and s.created_at < p_to)
                                 + (select count(*) from public.freelancer_profiles fp where fp.created_at >= p_from and fp.created_at < p_to),
    'job_posts',                 (select count(*) from posts),
    'job_posts_with_proposal',   (select count(*) from posts where response_count > 0),
    'first_proposal_median_minutes', (select round(percentile_cont(0.5) within group (order by minutes))::integer from first_proposal),
    'first_proposal_samples',    (select count(*) from first_proposal)
  )
$$;

create or replace function private.admin_orders(p_search text, p_type text, p_city text, p_since timestamptz)
returns table (
  id uuid, ref text, item_title text, quantity integer, order_type text, amount_tnd numeric, status text,
  created_at timestamptz, status_since timestamptz, status_since_exact boolean, is_blocked boolean,
  buyer_id uuid, buyer_name text, buyer_city text,
  seller_id uuid, seller_name text, seller_kind text, seller_city text
)
language sql stable set search_path = '' as $$
  with base as (
    select o.id,
           '#' || upper(left(replace(o.id::text, '-', ''), 6)) as ref,
           coalesce(o.item_title, pr.title, sl.title) as item_title, o.quantity, o.order_type,
           o.unit_price_tnd * o.quantity + coalesce(o.delivery_fee_tnd, 0) as amount_tnd,
           o.status, o.created_at,
           coalesce(
             case o.status when 'pending' then o.created_at when 'received' then o.received_at when 'cancelled' then o.cancelled_at end,
             (select min(e.created_at) from public.order_events e where e.order_id = o.id and e.to_status = o.status)
           ) as exact_since,
           o.updated_at,
           o.buyer_id, b.full_name as buyer_name, b.city as buyer_city,
           o.seller_id,
           case o.order_type when 'product' then coalesce(sh.name, sp.full_name) else sp.full_name end as seller_name,
           case o.order_type when 'product' then 'shop' else 'freelancer' end as seller_kind,
           case o.order_type when 'product' then coalesce(sh.city, sp.city) else coalesce(fp.city, sp.city) end as seller_city
      from public.orders o
      left join public.profiles b on b.id = o.buyer_id
      left join public.profiles sp on sp.id = o.seller_id
      left join public.products pr on pr.id = o.product_id
      left join public.shops sh on sh.id = pr.shop_id
      left join public.service_listings sl on sl.id = o.service_listing_id
      left join public.freelancer_profiles fp on fp.id = sl.freelancer_profile_id
     where (p_since is null or o.created_at >= p_since)
       and (p_type is null or o.order_type = p_type)
  )
  select b.id, b.ref, b.item_title, b.quantity, b.order_type, b.amount_tnd, b.status, b.created_at,
         coalesce(b.exact_since, b.updated_at) as status_since,
         b.exact_since is not null as status_since_exact,
         (b.status = 'pending' and b.created_at < now() - interval '48 hours')
           or (b.status = 'arrived' and coalesce(b.exact_since, b.updated_at) < now() - interval '7 days') as is_blocked,
         b.buyer_id, b.buyer_name, b.buyer_city, b.seller_id, b.seller_name, b.seller_kind, b.seller_city
    from base b
   where (p_city is null or b.buyer_city = p_city or b.seller_city = p_city)
     and (p_search is null
          or b.ref = '#' || upper(ltrim(p_search, '#'))
          or b.item_title ilike '%' || replace(replace(replace(p_search, '\', '\\'), '%', '\%'), '_', '\_') || '%'
          or b.buyer_name  ilike '%' || replace(replace(replace(p_search, '\', '\\'), '%', '\%'), '_', '\_') || '%'
          or b.seller_name ilike '%' || replace(replace(replace(p_search, '\', '\\'), '%', '\%'), '_', '\_') || '%')
$$;

revoke all on function private.order_status_rank(text) from public, anon, authenticated;
revoke all on function private.admin_active_sellers() from public, anon, authenticated;
revoke all on function private.admin_period_kpis(timestamptz, timestamptz) from public, anon, authenticated;
revoke all on function private.admin_orders(text, text, text, timestamptz) from public, anon, authenticated;

create or replace function public.admin_dashboard_stats(p_days integer default 7)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_tz   constant text := 'Africa/Tunis';
  v_now  timestamptz := now();
  v_from timestamptz;
  v_prev timestamptz;
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
  v_week := date_trunc('week', v_now at time zone v_tz);
  return jsonb_build_object(
    'generated_at', v_now,
    'period', jsonb_build_object('days', p_days, 'from', v_from, 'to', v_now, 'previous_from', v_prev),
    'current',  private.admin_period_kpis(v_from, v_now),
    'previous', private.admin_period_kpis(v_prev, v_from),
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

create or replace function public.admin_list_orders(
  p_tab text default 'all', p_search text default null, p_type text default null, p_city text default null,
  p_days integer default 30, p_sort text default 'newest', p_limit integer default 10, p_offset integer default 0
)
returns table (
  id uuid, ref text, item_title text, quantity integer, order_type text, amount_tnd numeric, status text,
  created_at timestamptz, status_since timestamptz, status_since_exact boolean, is_blocked boolean,
  buyer_id uuid, buyer_name text, buyer_city text,
  seller_id uuid, seller_name text, seller_kind text, seller_city text,
  total_count bigint
)
language plpgsql stable security definer set search_path = '' as $$
#variable_conflict use_column
declare
  v_search text := nullif(btrim(coalesce(p_search, '')), '');
begin
  if not public.is_admin() then
    raise exception 'Accès réservé aux administrateurs.' using errcode = '42501';
  end if;
  if p_tab is null or p_tab not in ('all', 'blocked', 'in_progress', 'received', 'cancelled') then
    raise exception 'Onglet inconnu.' using errcode = '23514';
  end if;
  if p_type is not null and p_type not in ('product', 'service') then
    raise exception 'Type inconnu.' using errcode = '23514';
  end if;
  if p_days is not null and p_days not in (7, 30, 90) then
    raise exception 'Période inconnue (7, 30 ou 90 jours).' using errcode = '23514';
  end if;
  if p_sort is null or p_sort not in ('newest', 'oldest') then
    raise exception 'Tri inconnu.' using errcode = '23514';
  end if;
  if v_search is not null and char_length(v_search) > 80 then
    raise exception 'La recherche est trop longue (80 caractères maximum).' using errcode = '23514';
  end if;
  return query
  select o.id, o.ref, o.item_title, o.quantity, o.order_type, o.amount_tnd, o.status, o.created_at,
         o.status_since, o.status_since_exact, o.is_blocked,
         o.buyer_id, o.buyer_name, o.buyer_city, o.seller_id, o.seller_name, o.seller_kind, o.seller_city,
         count(*) over () as total_count
    from private.admin_orders(v_search, p_type, nullif(btrim(coalesce(p_city, '')), ''),
                              case when p_days is null then null else now() - make_interval(days => p_days) end) o
   where p_tab = 'all'
      or (p_tab = 'blocked' and o.is_blocked)
      or (p_tab = 'in_progress' and o.status in ('accepted', 'prepared', 'dispatched', 'in_delivery', 'arrived'))
      or (p_tab = 'received' and o.status = 'received')
      or (p_tab = 'cancelled' and o.status = 'cancelled')
   order by case when p_sort = 'oldest' then o.created_at end asc,
            case when p_sort = 'newest' then o.created_at end desc
   limit least(greatest(coalesce(p_limit, 10), 1), 200)
  offset greatest(coalesce(p_offset, 0), 0);
end;
$$;

create or replace function public.admin_count_orders(
  p_search text default null, p_type text default null, p_city text default null, p_days integer default 30
)
returns table (all_count bigint, blocked bigint, in_progress bigint, received bigint, cancelled bigint)
language plpgsql stable security definer set search_path = '' as $$
#variable_conflict use_column
declare
  v_search text := nullif(btrim(coalesce(p_search, '')), '');
begin
  if not public.is_admin() then
    raise exception 'Accès réservé aux administrateurs.' using errcode = '42501';
  end if;
  if p_type is not null and p_type not in ('product', 'service') then
    raise exception 'Type inconnu.' using errcode = '23514';
  end if;
  if p_days is not null and p_days not in (7, 30, 90) then
    raise exception 'Période inconnue (7, 30 ou 90 jours).' using errcode = '23514';
  end if;
  if v_search is not null and char_length(v_search) > 80 then
    raise exception 'La recherche est trop longue (80 caractères maximum).' using errcode = '23514';
  end if;
  return query
  select count(*),
         count(*) filter (where o.is_blocked),
         count(*) filter (where o.status in ('accepted', 'prepared', 'dispatched', 'in_delivery', 'arrived')),
         count(*) filter (where o.status = 'received'),
         count(*) filter (where o.status = 'cancelled')
    from private.admin_orders(v_search, p_type, nullif(btrim(coalesce(p_city, '')), ''),
                              case when p_days is null then null else now() - make_interval(days => p_days) end) o;
end;
$$;

create or replace function public.admin_list_audit_log(
  p_search text default null, p_action text default null, p_target_type text default null,
  p_days integer default 30, p_limit integer default 10, p_offset integer default 0
)
returns table (
  id uuid, created_at timestamptz, action text, target_type text, target_id uuid, target_label text,
  before_state jsonb, after_state jsonb, note text, admin_id uuid, admin_name text, total_count bigint
)
language plpgsql stable security definer set search_path = '' as $$
#variable_conflict use_column
declare
  v_search text := nullif(btrim(coalesce(p_search, '')), '');
  v_like   text;
begin
  if not public.is_admin() then
    raise exception 'Accès réservé aux administrateurs.' using errcode = '42501';
  end if;
  if p_days is not null and p_days not in (7, 30, 90) then
    raise exception 'Période inconnue (7, 30 ou 90 jours).' using errcode = '23514';
  end if;
  if v_search is not null and char_length(v_search) > 80 then
    raise exception 'La recherche est trop longue (80 caractères maximum).' using errcode = '23514';
  end if;
  v_like := '%' || replace(replace(replace(coalesce(v_search, ''), '\', '\\'), '%', '\%'), '_', '\_') || '%';
  return query
  with labelled as (
    select l.id, l.created_at, l.action, l.target_type, l.target_id,
           case l.target_type
             when 'user'               then (select p.full_name from public.profiles p where p.id = l.target_id)
             when 'shop'               then (select s.name from public.shops s where s.id = l.target_id)
             when 'product'            then (select pr.title from public.products pr where pr.id = l.target_id)
             when 'service'            then (select sl.title from public.service_listings sl where sl.id = l.target_id)
             when 'freelancer_profile' then (select p.full_name from public.freelancer_profiles fp
                                               join public.profiles p on p.id = fp.profile_id where fp.id = l.target_id)
             when 'job_post'           then (select jp.title from public.job_posts jp where jp.id = l.target_id)
             when 'order'              then '#' || upper(left(replace(l.target_id::text, '-', ''), 6))
             when 'dispute'            then (select '#' || upper(left(replace(d.order_id::text, '-', ''), 6))
                                               from public.disputes d where d.id = l.target_id)
             when 'report'             then '#' || upper(left(replace(l.target_id::text, '-', ''), 6))
             when 'deletion_request'   then (select p.full_name from public.deletion_requests dr
                                               join public.profiles p on p.id = dr.user_id where dr.id = l.target_id)
             when 'data_export'        then (select p.full_name from public.data_exports de
                                               join public.profiles p on p.id = de.user_id where de.id = l.target_id)
             when 'contact_message'    then (select m.name from public.contact_messages m where m.id = l.target_id)
           end as target_label,
           l.before_state, l.after_state, l.note, l.admin_id, a.full_name as admin_name
      from public.admin_audit_log l
      left join public.profiles a on a.id = l.admin_id
     where (p_days is null or l.created_at >= now() - make_interval(days => p_days))
       and (p_action is null or l.action = p_action)
       and (p_target_type is null or l.target_type = p_target_type)
  )
  select x.id, x.created_at, x.action, x.target_type, x.target_id, x.target_label,
         x.before_state, x.after_state, x.note, x.admin_id, x.admin_name,
         count(*) over () as total_count
    from labelled x
   where v_search is null
      or x.note ilike v_like or x.target_label ilike v_like or x.action ilike v_like
   order by x.created_at desc
   limit least(greatest(coalesce(p_limit, 10), 1), 200)
  offset greatest(coalesce(p_offset, 0), 0);
end;
$$;

revoke all on function public.admin_dashboard_stats(integer) from public, anon;
revoke all on function public.admin_list_orders(text, text, text, text, integer, text, integer, integer) from public, anon;
revoke all on function public.admin_count_orders(text, text, text, integer) from public, anon;
revoke all on function public.admin_list_audit_log(text, text, text, integer, integer, integer) from public, anon;
grant execute on function public.admin_dashboard_stats(integer) to authenticated;
grant execute on function public.admin_list_orders(text, text, text, text, integer, text, integer, integer) to authenticated;
grant execute on function public.admin_count_orders(text, text, text, integer) to authenticated;
grant execute on function public.admin_list_audit_log(text, text, text, integer, integer, integer) to authenticated;