-- choose_job_response race fix + withdraw guard (db-guardian follow-up #6; reviewed + tested rolled-back + applied by architect 2026-11-06).
create or replace function public.choose_job_response(p_response_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_uid        uuid := auth.uid();
  v_post_id    uuid;
  v_freelancer uuid;
  v_post       public.job_posts%rowtype;
  v_chosen     integer;
  v_mine       boolean;
begin
  if v_uid is null then
    raise exception 'Connectez-vous pour choisir une proposition.' using errcode = '42501', hint = 'not_signed_in';
  end if;
  if not public.is_active_user() then
    raise exception 'Ce compte est suspendu.' using errcode = '42501', hint = 'suspended';
  end if;
  select jr.job_post_id into v_post_id from public.job_responses jr where jr.id = p_response_id;
  if v_post_id is not null then
    select * into v_post from public.job_posts jp where jp.id = v_post_id for update;
  end if;
  if v_post_id is null or v_post.id is null or v_post.consumer_id is distinct from v_uid then
    raise exception 'Proposition introuvable.' using errcode = 'P0002', hint = 'not_found';
  end if;
  select jr.freelancer_id into v_freelancer from public.job_responses jr
   where jr.id = p_response_id and jr.job_post_id = v_post_id
     for update;
  if v_freelancer is null then
    raise exception 'Proposition introuvable.' using errcode = 'P0002', hint = 'not_found';
  end if;
  if v_post.admin_hidden_at is not null or v_post.status <> 'open' then
    raise exception 'Cette annonce n''est plus ouverte.'
      using errcode = '23514',
            hint = case when v_post.admin_hidden_at is not null then 'job_unavailable'
                        when v_post.status = 'filled' then 'job_filled'
                        when v_post.status = 'deleted' then 'job_deleted'
                        when v_post.status = 'expired' then 'job_expired'
                        else 'job_unavailable' end;
  end if;
  if v_post.created_at < now() - interval '30 days' then
    raise exception 'Cette annonce a expiré.' using errcode = '23514', hint = 'job_expired';
  end if;
  if exists (select 1 from public.profiles p where p.id = v_freelancer and p.suspended_at is not null)
     or exists (select 1 from public.freelancer_profiles f where f.profile_id = v_freelancer and f.admin_hidden_at is not null) then
    raise exception 'Ce freelance n''est plus disponible.' using errcode = '23514', hint = 'freelancer_unavailable';
  end if;
  update public.job_responses set status = case when id = p_response_id then 'chosen' else 'not_chosen' end
   where job_post_id = v_post_id;
  select count(*) filter (where jr.status = 'chosen'),
         coalesce(bool_or(jr.id = p_response_id and jr.status = 'chosen'), false)
    into v_chosen, v_mine
    from public.job_responses jr
   where jr.job_post_id = v_post_id;
  if v_chosen <> 1 or not v_mine then
    raise exception 'Proposition introuvable.' using errcode = 'P0002', hint = 'not_found';
  end if;
  update public.job_posts set status = 'filled' where id = v_post_id;
  return v_post_id;
end;
$$;
create or replace function public.enforce_job_response_withdraw()
returns trigger language plpgsql set search_path = '' as $$
begin
  if current_user not in ('anon', 'authenticated') then
    return old;
  end if;
  if old.status is distinct from 'pending' then
    raise exception 'Cette proposition a déjà reçu une réponse : elle ne peut plus être retirée.'
      using errcode = '42501', hint = 'response_decided';
  end if;
  return old;
end;
$$;
create trigger trg_enforce_job_response_withdraw
  before delete on public.job_responses
  for each row execute function public.enforce_job_response_withdraw();
revoke all on function public.enforce_job_response_withdraw() from public, anon, authenticated;