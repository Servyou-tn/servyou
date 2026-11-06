-- Reviewed by the architect 2026-11-06 (D6 scrub of hidden shop / freelancer text added, section c2). Applied via Supabase MCP.
-- Admin « Demandes » backend: admin-only RPCs to LIST and PROCESS account-deletion requests, data-export requests and /contact
-- messages, every decision written to admin_audit_log through log_admin_action(). Discovery: docs/discovery/admin-requests-backend.md.
-- « deletion » = a TOMBSTONE (D1): the profile row stays with every personal field replaced; personal lists deleted; listings an order
-- still points to are hidden instead of deleted; terminal orders the person BOUGHT lose their delivery identity. Auth side (ban, auth
-- e-mail, storage files) is the server action's job (D2). Errors: 42501 not allowed · 23514 invalid state / data · P0002 not found.

-- 1. Processing goes through the RPCs only, so every decision is logged
drop policy if exists "Admins update deletion requests" on public.deletion_requests;
drop policy if exists "Admins update export requests" on public.data_exports;
revoke update (status, processed_at, processed_by) on table public.deletion_requests from authenticated;
revoke update (status, processed_at, processed_by, export_url) on table public.data_exports from authenticated;

-- 2. Lists (admin-only; pending first, oldest first)
create or replace function public.admin_list_deletion_requests(p_status text default 'pending', p_limit int default 50, p_offset int default 0)
returns table (
  id uuid, user_id uuid, full_name text, email text, seller_type text, reason text, status text,
  requested_at timestamptz, processed_at timestamptz, processed_by uuid, processed_by_name text, open_orders bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
begin
  if not public.is_admin() then
    raise exception 'Accès réservé aux administrateurs.' using errcode = '42501';
  end if;
  if p_status is not null and p_status not in ('pending', 'approved', 'rejected') then
    raise exception 'Statut inconnu.' using errcode = '23514';
  end if;

  return query
  select d.id, d.user_id, p.full_name, p.email, p.seller_type, d.reason, d.status,
         d.requested_at, d.processed_at, d.processed_by, a.full_name,
         (select count(*) from public.orders o
           where (o.buyer_id = d.user_id or o.seller_id = d.user_id)
             and o.status not in ('received', 'cancelled'))
    from public.deletion_requests d
    left join public.profiles p on p.id = d.user_id
    left join public.profiles a on a.id = d.processed_by
   where p_status is null or d.status = p_status
   order by (d.status <> 'pending'),
            case when d.status = 'pending' then d.requested_at end asc,
            d.requested_at desc
   limit least(greatest(coalesce(p_limit, 50), 1), 200)
  offset greatest(coalesce(p_offset, 0), 0);
end;
$$;

create or replace function public.admin_list_data_exports(p_status text default 'pending', p_limit int default 50, p_offset int default 0)
returns table (
  id uuid, user_id uuid, full_name text, email text, status text,
  requested_at timestamptz, processed_at timestamptz, processed_by uuid, processed_by_name text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
begin
  if not public.is_admin() then
    raise exception 'Accès réservé aux administrateurs.' using errcode = '42501';
  end if;
  if p_status is not null and p_status not in ('pending', 'completed', 'rejected') then
    raise exception 'Statut inconnu.' using errcode = '23514';
  end if;

  return query
  select x.id, x.user_id, p.full_name, p.email, x.status,
         x.requested_at, x.processed_at, x.processed_by, a.full_name
    from public.data_exports x
    left join public.profiles p on p.id = x.user_id
    left join public.profiles a on a.id = x.processed_by
   where p_status is null or x.status = p_status
   order by (x.status <> 'pending'),
            case when x.status = 'pending' then x.requested_at end asc,
            x.requested_at desc
   limit least(greatest(coalesce(p_limit, 50), 1), 200)
  offset greatest(coalesce(p_offset, 0), 0);
end;
$$;

create or replace function public.admin_list_contact_messages(p_status text default 'new', p_limit int default 50, p_offset int default 0)
returns table (
  id uuid, created_at timestamptz, name text, email text, subject text, message text, user_id uuid, status text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
begin
  if not public.is_admin() then
    raise exception 'Accès réservé aux administrateurs.' using errcode = '42501';
  end if;
  if p_status is not null and p_status not in ('new', 'handled') then
    raise exception 'Statut inconnu.' using errcode = '23514';
  end if;

  return query
  select m.id, m.created_at, m.name, m.email, m.subject, m.message, m.user_id, m.status
    from public.contact_messages m
   where p_status is null or m.status = p_status
   order by (m.status <> 'new'),
            case when m.status = 'new' then m.created_at end asc,
            m.created_at desc
   limit least(greatest(coalesce(p_limit, 50), 1), 200)
  offset greatest(coalesce(p_offset, 0), 0);
end;
$$;

-- 3. Process an account-deletion request ('approve' | 'reject'). Rejection needs a note. Approval refuses while an order is open,
-- refuses an admin account and the caller's own, then tombstones the account. The profile row lock (FOR UPDATE) also blocks any
-- concurrent order insert on this account (its FK check needs KEY SHARE on the profile), so the open-order check cannot race.
create or replace function public.admin_process_deletion_request(p_request_id uuid, p_decision text, p_note text default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_req      public.deletion_requests%rowtype;
  v_target   public.profiles%rowtype;
  v_note     text := nullif(btrim(coalesce(p_note, '')), '');
  v_open     bigint;
  v_n        bigint;
  v_counts   jsonb := '{}'::jsonb;
  v_email    text;
begin
  if not public.is_admin() then
    raise exception 'Accès réservé aux administrateurs.' using errcode = '42501';
  end if;
  if p_decision is null or p_decision not in ('approve', 'reject') then
    raise exception 'Décision inconnue.' using errcode = '23514';
  end if;
  if v_note is not null and char_length(v_note) > 500 then
    raise exception 'La note est trop longue (500 caractères maximum).' using errcode = '23514';
  end if;

  select * into v_req from public.deletion_requests where id = p_request_id for update;
  if not found then
    raise exception 'Demande introuvable.' using errcode = 'P0002';
  end if;
  if v_req.status <> 'pending' then
    raise exception 'Cette demande a déjà été traitée.' using errcode = '23514';
  end if;

  if p_decision = 'reject' then
    if v_note is null then
      raise exception 'Indiquez le motif du refus.' using errcode = '23514';
    end if;
    update public.deletion_requests
       set status = 'rejected', processed_at = now(), processed_by = auth.uid()
     where id = p_request_id;
    perform public.log_admin_action(
      p_action       => 'reject_deletion_request',
      p_target_type  => 'deletion_request',
      p_target_id    => p_request_id,
      p_before_state => jsonb_build_object('status', 'pending', 'user_id', v_req.user_id),
      p_after_state  => jsonb_build_object('status', 'rejected'),
      p_note         => v_note
    );
    return jsonb_build_object('status', 'rejected', 'user_id', v_req.user_id);
  end if;

  select * into v_target from public.profiles where id = v_req.user_id for update;
  if not found then
    raise exception 'Compte introuvable.' using errcode = 'P0002';
  end if;
  if v_target.id = auth.uid() then
    raise exception 'Vous ne pouvez pas traiter la suppression de votre propre compte.' using errcode = '42501';
  end if;
  if v_target.is_admin then
    raise exception 'Un compte administrateur ne peut pas être supprimé ici.' using errcode = '42501';
  end if;

  select count(*) into v_open
    from public.orders o
   where (o.buyer_id = v_target.id or o.seller_id = v_target.id)
     and o.status not in ('received', 'cancelled');
  if v_open > 0 then
    raise exception 'Ce compte a encore % commande(s) en cours : elles doivent être terminées ou annulées avant la suppression.', v_open
      using errcode = '23514';
  end if;

  -- a. Personal lists. (D6) reports and contact_messages the person SENT are kept: moderation and support records.
  delete from public.favorites where user_id = v_target.id;
  get diagnostics v_n = row_count;  v_counts := v_counts || jsonb_build_object('favorites', v_n);
  delete from public.notification_preferences where profile_id = v_target.id;
  delete from public.job_responses where freelancer_id = v_target.id;
  get diagnostics v_n = row_count;  v_counts := v_counts || jsonb_build_object('job_responses', v_n);
  -- (D8) A post with proposals or an open report is closed (status 'deleted') instead of deleted.
  delete from public.job_posts jp
   where jp.consumer_id = v_target.id
     and jp.response_count = 0
     and not exists (select 1 from public.reports r where r.target_id = jp.id and r.status in ('open', 'under_review'));
  get diagnostics v_n = row_count;  v_counts := v_counts || jsonb_build_object('job_posts', v_n);
  update public.job_posts set status = 'deleted' where consumer_id = v_target.id and status <> 'deleted';

  -- b. Listings: deleted when no order and no open report points to them, otherwise hidden for good.
  delete from public.products pr
   using public.shops s
   where pr.shop_id = s.id and s.owner_id = v_target.id
     and pr.admin_hidden_at is null
     and not exists (select 1 from public.orders o where o.product_id = pr.id)
     and not exists (select 1 from public.reports r where r.target_id = pr.id and r.status in ('open', 'under_review'));
  get diagnostics v_n = row_count;  v_counts := v_counts || jsonb_build_object('products_deleted', v_n);
  update public.products pr
     set status = 'hidden',
         admin_hidden_at = coalesce(pr.admin_hidden_at, now()),
         admin_hidden_reason = coalesce(pr.admin_hidden_reason, 'Compte supprimé')
    from public.shops s
   where pr.shop_id = s.id and s.owner_id = v_target.id;
  get diagnostics v_n = row_count;  v_counts := v_counts || jsonb_build_object('products_hidden', v_n);

  delete from public.service_listings sl
   using public.freelancer_profiles fp
   where sl.freelancer_profile_id = fp.id and fp.profile_id = v_target.id
     and sl.admin_hidden_at is null
     and not exists (select 1 from public.orders o where o.service_listing_id = sl.id)
     and not exists (select 1 from public.reports r where r.target_id = sl.id and r.status in ('open', 'under_review'));
  get diagnostics v_n = row_count;  v_counts := v_counts || jsonb_build_object('services_deleted', v_n);
  -- A draft stays a draft (draft → hidden would trip the publish requirements). Drafts are never public.
  update public.service_listings sl
     set status = case when sl.status = 'draft' then 'draft' else 'hidden' end,
         admin_hidden_at = coalesce(sl.admin_hidden_at, now()),
         admin_hidden_reason = coalesce(sl.admin_hidden_reason, 'Compte supprimé')
    from public.freelancer_profiles fp
   where sl.freelancer_profile_id = fp.id and fp.profile_id = v_target.id;
  get diagnostics v_n = row_count;  v_counts := v_counts || jsonb_build_object('services_hidden', v_n);

  -- c. The shop / freelancer profile: deleted when nothing is left under it, otherwise hidden.
  delete from public.shops s
   where s.owner_id = v_target.id and s.admin_hidden_at is null
     and not exists (select 1 from public.products pr where pr.shop_id = s.id)
     and not exists (select 1 from public.reports r where r.target_id = s.id and r.status in ('open', 'under_review'));
  get diagnostics v_n = row_count;  v_counts := v_counts || jsonb_build_object('shops_deleted', v_n);
  update public.shops
     set admin_hidden_at = coalesce(admin_hidden_at, now()),
         admin_hidden_reason = coalesce(admin_hidden_reason, 'Compte supprimé')
   where owner_id = v_target.id;
  get diagnostics v_n = row_count;  v_counts := v_counts || jsonb_build_object('shops_hidden', v_n);

  delete from public.freelancer_profiles fp
   where fp.profile_id = v_target.id and fp.admin_hidden_at is null
     and not exists (select 1 from public.service_listings sl where sl.freelancer_profile_id = fp.id)
     and not exists (select 1 from public.reports r where r.target_id = fp.id and r.status in ('open', 'under_review'));
  get diagnostics v_n = row_count;  v_counts := v_counts || jsonb_build_object('freelancer_profiles_deleted', v_n);
  update public.freelancer_profiles
     set admin_hidden_at = coalesce(admin_hidden_at, now()),
         admin_hidden_reason = coalesce(admin_hidden_reason, 'Compte supprimé')
   where profile_id = v_target.id;
  get diagnostics v_n = row_count;  v_counts := v_counts || jsonb_build_object('freelancer_profiles_hidden', v_n);

  -- c2. (D6, architect 2026-11-06) What stays hidden for the orders' sake loses its personal text: past buyers can still open it.
  update public.shops
     set name = 'Boutique supprimée', description = null, city = null, location_detail = null, working_hours = null,
         delivery_setup = null, preferred_carriers = null, facebook_url = null, instagram_url = null, tiktok_url = null,
         logo_url = null, banner_url = null
   where owner_id = v_target.id;
  delete from public.shop_payment_methods spm using public.shops s where spm.shop_id = s.id and s.owner_id = v_target.id;
  update public.freelancer_profiles
     set headline = null, bio = null, city = null, current_workplace = null, workplace_location = null, portfolio_link = null,
         working_hours = null, preferred_payment_method = null, languages = null, is_published = false
   where profile_id = v_target.id;
  delete from public.freelancer_certifications   c using public.freelancer_profiles fp where c.freelancer_id = fp.id and fp.profile_id = v_target.id;
  delete from public.freelancer_education        c using public.freelancer_profiles fp where c.freelancer_id = fp.id and fp.profile_id = v_target.id;
  delete from public.freelancer_tools            c using public.freelancer_profiles fp where c.freelancer_id = fp.id and fp.profile_id = v_target.id;
  delete from public.freelancer_languages        c using public.freelancer_profiles fp where c.freelancer_profile_id = fp.id and fp.profile_id = v_target.id;
  delete from public.freelancer_links            c using public.freelancer_profiles fp where c.freelancer_profile_id = fp.id and fp.profile_id = v_target.id;
  delete from public.freelancer_portfolio_items  c using public.freelancer_profiles fp where c.freelancer_profile_id = fp.id and fp.profile_id = v_target.id;
  delete from public.freelancer_skills           c using public.freelancer_profiles fp where c.freelancer_profile_id = fp.id and fp.profile_id = v_target.id;

  -- d. Terminal orders the person BOUGHT keep amounts, title, dates and statuses but lose the delivery identity (D3).
  update public.orders
     set delivery_name = null, delivery_address = null, delivery_phone = null, buyer_note = null
   where buyer_id = v_target.id
     and (delivery_name is not null or delivery_address is not null or delivery_phone is not null or buyer_note is not null);
  get diagnostics v_n = row_count;  v_counts := v_counts || jsonb_build_object('orders_anonymised', v_n);

  -- e. The profile becomes a tombstone (D1), suspended so any open session can write nothing.
  v_email := 'supprime-' || v_target.id::text || '@deleted.servyou.invalid';
  update public.profiles
     set full_name        = 'Compte supprimé',
         email            = v_email,
         phone            = null,
         city             = null,
         avatar_url       = null,
         date_of_birth    = date '1900-01-01',
         suspended_at     = coalesce(suspended_at, now()),
         suspended_reason = 'Compte supprimé'
   where id = v_target.id;

  -- (D9) A pending data-export request of the same account is closed with it.
  update public.data_exports
     set status = 'rejected', processed_at = now(), processed_by = auth.uid()
   where user_id = v_target.id and status = 'pending';
  get diagnostics v_n = row_count;  v_counts := v_counts || jsonb_build_object('exports_closed', v_n);

  update public.deletion_requests
     set status = 'approved', processed_at = now(), processed_by = auth.uid()
   where id = p_request_id;

  perform public.log_admin_action(
    p_action       => 'approve_deletion_request',
    p_target_type  => 'user',
    p_target_id    => v_target.id,
    p_before_state => jsonb_build_object('request_id', p_request_id, 'seller_type', v_target.seller_type),
    p_after_state  => jsonb_build_object('status', 'approved', 'counts', v_counts),
    p_note         => v_note
  );

  return jsonb_build_object('status', 'approved', 'user_id', v_target.id, 'tombstone_email', v_email, 'counts', v_counts);
end;
$$;

-- 4. Process a data-export request ('completed' | 'rejected' with a note).
create or replace function public.admin_process_data_export(p_export_id uuid, p_decision text, p_note text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row  public.data_exports%rowtype;
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
begin
  if not public.is_admin() then
    raise exception 'Accès réservé aux administrateurs.' using errcode = '42501';
  end if;
  if p_decision is null or p_decision not in ('completed', 'rejected') then
    raise exception 'Décision inconnue.' using errcode = '23514';
  end if;
  if v_note is not null and char_length(v_note) > 500 then
    raise exception 'La note est trop longue (500 caractères maximum).' using errcode = '23514';
  end if;
  if p_decision = 'rejected' and v_note is null then
    raise exception 'Indiquez le motif du refus.' using errcode = '23514';
  end if;

  select * into v_row from public.data_exports where id = p_export_id for update;
  if not found then
    raise exception 'Demande introuvable.' using errcode = 'P0002';
  end if;
  if v_row.status <> 'pending' then
    raise exception 'Cette demande a déjà été traitée.' using errcode = '23514';
  end if;

  update public.data_exports
     set status = p_decision, processed_at = now(), processed_by = auth.uid()
   where id = p_export_id;

  perform public.log_admin_action(
    p_action       => case p_decision when 'completed' then 'complete_data_export' else 'reject_data_export' end,
    p_target_type  => 'data_export',
    p_target_id    => p_export_id,
    p_before_state => jsonb_build_object('status', 'pending', 'user_id', v_row.user_id),
    p_after_state  => jsonb_build_object('status', p_decision),
    p_note         => v_note
  );
end;
$$;

-- 5. Mark a /contact message handled
create or replace function public.admin_mark_contact_message_handled(p_message_id uuid, p_note text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_status text;
  v_note   text := nullif(btrim(coalesce(p_note, '')), '');
begin
  if not public.is_admin() then
    raise exception 'Accès réservé aux administrateurs.' using errcode = '42501';
  end if;
  if v_note is not null and char_length(v_note) > 500 then
    raise exception 'La note est trop longue (500 caractères maximum).' using errcode = '23514';
  end if;

  select m.status into v_status from public.contact_messages m where m.id = p_message_id for update;
  if not found then
    raise exception 'Message introuvable.' using errcode = 'P0002';
  end if;
  if v_status = 'handled' then
    raise exception 'Ce message est déjà traité.' using errcode = '23514';
  end if;

  update public.contact_messages set status = 'handled' where id = p_message_id;

  perform public.log_admin_action(
    p_action       => 'handle_contact_message',
    p_target_type  => 'contact_message',
    p_target_id    => p_message_id,
    p_before_state => jsonb_build_object('status', v_status),
    p_after_state  => jsonb_build_object('status', 'handled'),
    p_note         => v_note
  );
end;
$$;

-- 6. EXECUTE: authenticated only (the gate inside is is_admin()); nothing for anon / PUBLIC
revoke all on function public.admin_list_deletion_requests(text, int, int)         from public, anon;
revoke all on function public.admin_list_data_exports(text, int, int)              from public, anon;
revoke all on function public.admin_list_contact_messages(text, int, int)          from public, anon;
revoke all on function public.admin_process_deletion_request(uuid, text, text)     from public, anon;
revoke all on function public.admin_process_data_export(uuid, text, text)          from public, anon;
revoke all on function public.admin_mark_contact_message_handled(uuid, text)       from public, anon;
grant execute on function public.admin_list_deletion_requests(text, int, int)      to authenticated;
grant execute on function public.admin_list_data_exports(text, int, int)           to authenticated;
grant execute on function public.admin_list_contact_messages(text, int, int)       to authenticated;
grant execute on function public.admin_process_deletion_request(uuid, text, text)  to authenticated;
grant execute on function public.admin_process_data_export(uuid, text, text)       to authenticated;
grant execute on function public.admin_mark_contact_message_handled(uuid, text)    to authenticated;
