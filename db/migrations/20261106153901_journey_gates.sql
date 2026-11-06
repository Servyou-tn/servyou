-- Journey gates (db-guardian, reviewed + tested rolled-back + applied by architect 2026-11-06): G1 proposal outcome, G2 no accept without phone, G10 expired missions read filter.
create or replace function public.enforce_job_response_message()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.proposal_message is null or char_length(btrim(new.proposal_message)) not between 20 and 1000 then
    raise exception 'new row for relation "job_responses" violates check constraint "job_responses_proposal_message_length"'
      using errcode = '23514', constraint = 'job_responses_proposal_message_length';
  end if;
  return new;
end;
$$;
create trigger trg_check_job_response_message
  before insert or update of proposal_message on public.job_responses
  for each row execute function public.enforce_job_response_message();
alter table public.job_responses drop constraint job_responses_proposal_message_length;
alter table public.job_responses
  add column status text not null default 'pending'
    constraint job_responses_status_check check (status in ('pending', 'chosen', 'not_chosen'));
create unique index job_responses_one_chosen_per_post
  on public.job_responses (job_post_id) where status = 'chosen';
update public.job_responses jr set status = 'not_chosen' from public.job_posts jp
 where jp.id = jr.job_post_id and jp.status <> 'open' and jr.status = 'pending';
create or replace function public.enforce_job_response_status()
returns trigger language plpgsql set search_path = '' as $$
begin
  if current_user not in ('anon', 'authenticated') then
    return new;
  end if;
  if tg_op = 'INSERT' then
    if new.status is distinct from 'pending' then
      raise exception 'Une proposition est toujours envoyée en attente.'
        using errcode = '42501', hint = 'invalid_status';
    end if;
  elsif new.status is distinct from old.status then
    raise exception 'Le statut d''une proposition ne peut pas être modifié directement.'
      using errcode = '42501', hint = 'invalid_status';
  end if;
  return new;
end;
$$;
create trigger trg_enforce_job_response_status
  before insert or update of status on public.job_responses
  for each row execute function public.enforce_job_response_status();
create or replace function public.sync_job_responses_on_post_status()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status is not distinct from old.status then
    return null;
  end if;
  if old.status = 'open' then
    update public.job_responses set status = 'not_chosen' where job_post_id = new.id and status = 'pending';
  elsif new.status = 'open' then
    if exists (select 1 from public.job_responses where job_post_id = new.id and status = 'chosen') then
      raise exception 'Un freelance a été choisi : cette annonce ne peut plus être rouverte.'
        using errcode = '23514', hint = 'job_response_chosen';
    end if;
    update public.job_responses set status = 'pending' where job_post_id = new.id and status = 'not_chosen';
  end if;
  return null;
end;
$$;
create trigger trg_sync_job_responses_on_post_status
  after update of status on public.job_posts
  for each row execute function public.sync_job_responses_on_post_status();
create or replace function public.choose_job_response(p_response_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_uid        uuid := auth.uid();
  v_post_id    uuid;
  v_freelancer uuid;
  v_post       public.job_posts%rowtype;
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
   where jr.id = p_response_id and jr.job_post_id = v_post_id;
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
  update public.job_posts set status = 'filled' where id = v_post_id;
  return v_post_id;
end;
$$;
revoke all on function public.enforce_job_response_message() from public, anon, authenticated;
revoke all on function public.enforce_job_response_status() from public, anon, authenticated;
revoke all on function public.sync_job_responses_on_post_status() from public, anon, authenticated;
revoke all on function public.choose_job_response(uuid) from public, anon;
grant execute on function public.choose_job_response(uuid) to authenticated;
CREATE OR REPLACE FUNCTION public.check_order_status_transition()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_caller      uuid := auth.uid();
  v_caller_role text;
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;
  IF v_caller = OLD.buyer_id THEN
    v_caller_role := 'buyer';
  ELSIF v_caller = OLD.seller_id THEN
    v_caller_role := 'seller';
  ELSE
    RAISE EXCEPTION 'Vous n''êtes pas autorisé à modifier cette commande.';
  END IF;
  IF OLD.status IN ('received', 'cancelled') THEN
    RAISE EXCEPTION 'Cette commande est terminée et ne peut plus être modifiée.';
  END IF;
  IF NEW.status = 'cancelled' THEN
    IF NEW.cancelled_by IS NULL THEN
      RAISE EXCEPTION 'L''annulation doit indiquer son auteur.';
    END IF;
    IF NEW.cancelled_by <> v_caller_role THEN
      RAISE EXCEPTION 'cancelled_by doit correspondre à votre rôle (% attendu).', v_caller_role;
    END IF;
    IF OLD.order_type = 'product'
       AND OLD.status IN ('dispatched', 'in_delivery', 'arrived')
       AND (NEW.cancellation_reason IS NULL OR btrim(NEW.cancellation_reason) = '') THEN
      RAISE EXCEPTION 'Une raison d''annulation est requise après l''expédition.';
    END IF;
    IF OLD.order_type = 'service'
       AND OLD.status IN ('accepted', 'arrived')
       AND (NEW.cancellation_reason IS NULL OR btrim(NEW.cancellation_reason) = '') THEN
      RAISE EXCEPTION 'Une raison d''annulation est requise après l''acceptation.';
    END IF;
    RETURN NEW;
  END IF;
  IF NEW.status = 'received' THEN
    IF v_caller_role <> 'buyer' THEN
      RAISE EXCEPTION 'Seul l''acheteur peut confirmer la réception.';
    END IF;
    IF OLD.status <> 'arrived' THEN
      RAISE EXCEPTION 'La réception ne peut être confirmée qu''après l''arrivée.';
    END IF;
    RETURN NEW;
  END IF;
  IF v_caller_role <> 'seller' THEN
    RAISE EXCEPTION 'Seul le vendeur peut faire avancer la commande.';
  END IF;
  IF OLD.status = 'pending' AND NEW.status = 'accepted'
     AND NOT EXISTS (SELECT 1 FROM public.profiles p
                      WHERE p.id = OLD.seller_id AND nullif(btrim(p.phone), '') IS NOT NULL) THEN
    RAISE EXCEPTION 'Ajoutez votre numéro de téléphone dans « Mon compte » avant d''accepter : l''acheteur doit pouvoir vous joindre.'
      USING ERRCODE = '23514', HINT = 'seller_phone_required';
  END IF;
  IF OLD.order_type = 'product' THEN
    IF NOT (
      (OLD.status = 'pending'     AND NEW.status = 'accepted')    OR
      (OLD.status = 'accepted'    AND NEW.status = 'prepared')    OR
      (OLD.status = 'prepared'    AND NEW.status = 'dispatched')  OR
      (OLD.status = 'dispatched'  AND NEW.status = 'in_delivery') OR
      (OLD.status = 'in_delivery' AND NEW.status = 'arrived')
    ) THEN
      RAISE EXCEPTION 'Transition invalide pour une commande produit: % → %.', OLD.status, NEW.status;
    END IF;
  ELSIF OLD.order_type = 'service' THEN
    IF NOT (
      (OLD.status = 'pending'  AND NEW.status = 'accepted') OR
      (OLD.status = 'accepted' AND NEW.status = 'arrived')
    ) THEN
      RAISE EXCEPTION 'Transition invalide pour une commande service: % → %.', OLD.status, NEW.status;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;
alter policy "Open posts or own posts readable" on public.job_posts
  using (
    ((status = 'open') and (admin_hidden_at is null) and private.is_account_active(consumer_id)
      and (created_at >= (now() - interval '30 days')))
    or (consumer_id = (select auth.uid()))
  );