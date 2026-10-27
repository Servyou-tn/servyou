-- Job-post write guards + response withdrawal window + orders admin-as-party.
-- Founder decisions 4-8 and 9a (2026-10-27) on the job_posts write-gap discovery
-- (docs/follow-ups.md « LOW — consumers can still set job_posts.status, and edit the content, freely
-- through REST » and « LOW — an admin who is a PARTY to an order can still rewrite its lifecycle
-- columns »), plus the job_responses DELETE window (H11 PR #211's « Retirer » rule). Standards-reference
-- Section 3 A01 / A04.
--
-- Live before this migration:
--   * job_posts: authenticated holds column INSERT (10 columns incl. status) and UPDATE (9 content /
--     status columns, migration 67); only the CHECK (open / filled / expired / deleted) constrains status.
--     A consumer can un-delete, reopen past 30 days, set 'expired' by hand, INSERT at filled / deleted,
--     and rewrite title / description / budget after freelancers answered. The app writes only
--     INSERT at 'open', open -> filled, filled -> open (30-day check in app code), and -> deleted.
--   * job_post_skills: the post owner inserts / deletes skills at any time (same bait-and-switch).
--   * job_responses: DELETE policy "Freelancer deletes own response" = freelancer_id = auth.uid(), so a
--     direct API call withdraws a response on a filled / expired / deleted / moderated post (the app
--     allows « Retirer » only while the post is open).
--   * orders: check_order_status_transition opens with IF is_admin() THEN RETURN NEW. orders has no admin
--     UPDATE policy and no function UPDATEs orders, so that override only fires when the admin is a PARTY
--     to the order: they can leave a terminal state and re-enter it. On INSERT an admin skips migration
--     54's tier 2, so they can insert at 'cancelled' with any cancel columns and a chosen cancelled_at.
--
-- Callers without a JWT (service role, migrations, fixtures) bypass every guard here, as elsewhere.
-- Admins do NOT (decision 7): job_posts and orders have no admin UPDATE policy for others' rows, so an
-- is_admin() bypass would only ever apply to an admin's OWN posts / orders -- the migration-66 gap.
--
-- Existing rows: none rewritten (decision 8). Live at discovery: 8 posts (7 open, 1 filled, 0 deleted),
-- 4 with responses (content-locked from apply), 5 open posts older than 30 days (stay 'open'; they can
-- now only be deleted, not filled / reopened); 4 job_responses, 3 of them on posts that are no longer
-- open (no longer withdrawable); 0 orders carrying cancel columns outside 'cancelled'.

-- ─── 1. job_posts: status transitions + content lock (decisions 4, 5, 7) ───────────────────────
create or replace function public.enforce_job_post_writes()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
begin
  if (select auth.uid()) is null then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.status is distinct from 'open' then
      raise exception 'Une annonce est toujours publiée ouverte.'
        using errcode = '42501', hint = 'invalid_status';
    end if;
    return new;
  end if;

  if new.status is distinct from old.status then
    if old.status = 'deleted' then
      raise exception 'Cette annonce a été supprimée.'
        using errcode = '42501', hint = 'job_deleted';
    elsif new.status = 'deleted' then
      null; -- open / filled / expired -> deleted: always allowed
    elsif (old.status, new.status) in (('open', 'filled'), ('filled', 'open')) then
      -- Same 30-day boundary as check_job_response_limits(): strictly older than 30 days = expired.
      if old.created_at < (now() - interval '30 days') then
        raise exception 'Cette annonce a expiré.'
          using errcode = '23514', hint = 'job_expired';
      end if;
    else
      -- Anything into 'expired' (computed from created_at, never client-set) and anything out of it.
      raise exception 'Ce changement de statut n''est pas autorisé.'
        using errcode = '42501', hint = 'invalid_transition';
    end if;
  end if;

  -- Content is frozen once a freelancer has answered. old.response_count: trg_sync_job_post_response_count
  -- holds the post row lock while it moves the counter, so a concurrent edit re-reads the committed count.
  if old.response_count > 0
     and (new.title is distinct from old.title
          or new.description is distinct from old.description
          or new.category_id is distinct from old.category_id
          or new.city is distinct from old.city
          or new.is_remote is distinct from old.is_remote
          or new.budget_min is distinct from old.budget_min
          or new.budget_max is distinct from old.budget_max
          or new.deadline is distinct from old.deadline) then
    raise exception 'Cette annonce a déjà reçu des propositions : son contenu ne peut plus être modifié.'
      using errcode = '42501', hint = 'content_locked';
  end if;

  return new;
end;
$function$;

comment on function public.enforce_job_post_writes() is
  'BEFORE INSERT OR UPDATE on job_posts, JWT callers only (admins included; no JWT = bypass). INSERT only at open (42501 invalid_status). Status: deleted is terminal (42501 job_deleted); open/filled/expired -> deleted always; open <-> filled only while created_at is within 30 days (23514 job_expired); everything else, incl. any move into or out of expired, 42501 invalid_transition. Once response_count > 0 the 8 content columns are frozen (42501 content_locked); status stays changeable. Founder decisions 4, 5, 7, 2026-10-27. SECURITY DEFINER, no client EXECUTE.';

revoke execute on function public.enforce_job_post_writes() from public, anon, authenticated;

create trigger trg_enforce_job_post_writes
  before insert or update on public.job_posts
  for each row execute function public.enforce_job_post_writes();

-- ─── 2. job_post_skills: the same content lock (decision 6) ────────────────────────────────────
create or replace function public.enforce_job_post_skills_lock()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_post_id uuid := case when tg_op = 'DELETE' then old.job_post_id else new.job_post_id end;
  v_count   integer;
begin
  if (select auth.uid()) is null then
    return case when tg_op = 'DELETE' then old else new end;
  end if;

  select jp.response_count into v_count from public.job_posts jp where jp.id = v_post_id;

  -- Not found: the post is being deleted and this is its ON DELETE CASCADE (the parent row is already
  -- gone), or the id is wrong (the FK / RLS refuse it on their own). Either way, not ours to block.
  if found and v_count > 0 then
    raise exception 'Cette annonce a déjà reçu des propositions : son contenu ne peut plus être modifié.'
      using errcode = '42501', hint = 'content_locked';
  end if;

  return case when tg_op = 'DELETE' then old else new end;
end;
$function$;

comment on function public.enforce_job_post_skills_lock() is
  'BEFORE INSERT OR DELETE on job_post_skills, JWT callers only: refused (42501 content_locked) once the post has response_count > 0. A cascade from a post delete passes (the parent is already gone). Founder decision 6, 2026-10-27. SECURITY DEFINER, no client EXECUTE.';

revoke execute on function public.enforce_job_post_skills_lock() from public, anon, authenticated;

create trigger trg_enforce_job_post_skills_lock
  before insert or delete on public.job_post_skills
  for each row execute function public.enforce_job_post_skills_lock();

-- ─── 3. job_responses: withdraw only while the post is open (H11 « Retirer ») ──────────────────
-- Same rule as withdrawProposalAction (PR #211): the post is open, not moderated, and not older than
-- 30 days. The EXISTS reads job_posts under its own SELECT policies -- an open, unmoderated post is
-- publicly readable, so the rule decides, not visibility. Acyclic: no job_posts policy reads
-- job_responses directly (the responder branch goes through has_responded(), SECURITY DEFINER, which
-- reads job_responses as its owner). A refused withdrawal is a silent 0-row DELETE, which the action
-- already reports (it selects the deleted ids). FK cascades (post or account deletion) bypass RLS.
drop policy "Freelancer deletes own response" on public.job_responses;

create policy "Freelancer withdraws own response while the post is open"
  on public.job_responses for delete
  to authenticated
  using (
    freelancer_id = (select auth.uid())
    and exists (
      select 1
        from public.job_posts jp
       where jp.id = job_responses.job_post_id
         and jp.status = 'open'
         and jp.admin_hidden_at is null
         and jp.created_at >= (now() - interval '30 days')
    )
  );

comment on policy "Freelancer withdraws own response while the post is open" on public.job_responses is
  'Own response, and only while its post is open, not moderated and within 30 days (the app rule of H11 « Retirer », PR #211). Replaced "Freelancer deletes own response" (freelancer_id = auth.uid(), PUBLIC), 2026-10-27. anon holds no DELETE grant.';

-- ─── 4. orders: no admin override for a party (decision 9a) ────────────────────────────────────
-- Same body as live, minus the leading `IF is_admin() THEN RETURN NEW; END IF;`. An admin who is the
-- buyer or seller now follows the same chain as anyone. Nobody else is affected: orders has no admin
-- UPDATE policy, the service role was already refused any status change (v_caller is null), and no
-- function updates orders. Consequence: no status data-fix path exists; a fix needs a migration.
create or replace function public.check_order_status_transition()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
DECLARE
  v_caller      uuid := auth.uid();
  v_caller_role text;
BEGIN
  -- Non-status edits sail through (buyer_note, delivery_phone, etc.)
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  -- Resolve caller role on this order
  IF v_caller = OLD.buyer_id THEN
    v_caller_role := 'buyer';
  ELSIF v_caller = OLD.seller_id THEN
    v_caller_role := 'seller';
  ELSE
    RAISE EXCEPTION 'Vous n''êtes pas autorisé à modifier cette commande.';
  END IF;

  -- Terminal states cannot be transitioned out of
  IF OLD.status IN ('received', 'cancelled') THEN
    RAISE EXCEPTION 'Cette commande est terminée et ne peut plus être modifiée.';
  END IF;

  -- Cancellation path
  IF NEW.status = 'cancelled' THEN
    IF NEW.cancelled_by IS NULL THEN
      RAISE EXCEPTION 'L''annulation doit indiquer son auteur.';
    END IF;
    IF NEW.cancelled_by <> v_caller_role THEN
      RAISE EXCEPTION 'cancelled_by doit correspondre à votre rôle (% attendu).', v_caller_role;
    END IF;
    -- Post-pivot cancellation requires a reason
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

  -- Buyer-only: received (from arrived)
  IF NEW.status = 'received' THEN
    IF v_caller_role <> 'buyer' THEN
      RAISE EXCEPTION 'Seul l''acheteur peut confirmer la réception.';
    END IF;
    IF OLD.status <> 'arrived' THEN
      RAISE EXCEPTION 'La réception ne peut être confirmée qu''après l''arrivée.';
    END IF;
    RETURN NEW;
  END IF;

  -- All remaining transitions are seller-only chain advancement
  IF v_caller_role <> 'seller' THEN
    RAISE EXCEPTION 'Seul le vendeur peut faire avancer la commande.';
  END IF;

  -- Per-order-type adjacent-transition validation
  IF OLD.order_type = 'product' THEN
    IF NOT (
      (OLD.status = 'pending'     AND NEW.status = 'accepted')    OR
      (OLD.status = 'accepted'    AND NEW.status = 'prepared')    OR
      (OLD.status = 'prepared'    AND NEW.status = 'dispatched')  OR
      (OLD.status = 'dispatched'  AND NEW.status = 'in_delivery') OR
      (OLD.status = 'in_delivery' AND NEW.status = 'arrived')
    ) THEN
      RAISE EXCEPTION 'Transition invalide pour une commande produit: % → %.',
        OLD.status, NEW.status;
    END IF;
  ELSIF OLD.order_type = 'service' THEN
    IF NOT (
      (OLD.status = 'pending'  AND NEW.status = 'accepted') OR
      (OLD.status = 'accepted' AND NEW.status = 'arrived')
    ) THEN
      RAISE EXCEPTION 'Transition invalide pour une commande service: % → %.',
        OLD.status, NEW.status;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

-- ─── 5. orders: JWT-INSERT cancel-column guard (follow-up of migration 66) ─────────────────────
-- Same body as live, plus the INSERT branch's cancel columns. For a JWT caller (in practice only an
-- admin reaches this: everyone else is refused earlier by migration 54's tier 2, which runs first --
-- BEFORE triggers fire in name order):
--   * not inserting at 'cancelled': cancelled_by, cancellation_reason, cancelled_at are discarded (NULL);
--   * inserting at 'cancelled': cancelled_at is the database's clock (set_cancelled_at_on_transition is
--     BEFORE UPDATE only, so nothing else stamps it on INSERT). See decision 10 in the report.
-- Discarded rather than refused, as received_at already is. No-JWT callers keep explicit values.
create or replace function public.enforce_order_lifecycle_columns()
 returns trigger
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  -- No JWT: service role, SQL editor, migrations, fixtures. They keep explicit values.
  v_system boolean := (select auth.uid()) is null;
begin
  if tg_op = 'INSERT' then
    if new.status = 'received' then
      new.received_at := case when v_system then coalesce(new.received_at, now()) else now() end;
    elsif not v_system then
      new.received_at := null;
    end if;

    if not v_system then
      if new.status = 'cancelled' then
        new.cancelled_at := now();
      else
        new.cancelled_by := null;
        new.cancellation_reason := null;
        new.cancelled_at := null;
      end if;
    end if;
    return new;
  end if;

  -- received_at: the database's clock on the transition into 'received', otherwise unchanged.
  if new.status = 'received' and old.status is distinct from 'received' then
    new.received_at := case when v_system then coalesce(new.received_at, now()) else now() end;
  elsif not v_system then
    new.received_at := old.received_at;
  end if;

  -- cancelled_by / cancellation_reason: written inside the cancel transition, then frozen.
  if not v_system
     and not (new.status = 'cancelled' and old.status is distinct from 'cancelled')
     and (new.cancelled_by is distinct from old.cancelled_by
          or new.cancellation_reason is distinct from old.cancellation_reason) then
    raise exception 'Les informations d''annulation ne peuvent pas être modifiées.'
      using errcode = '42501';
  end if;

  return new;
end;
$function$;

-- CREATE OR REPLACE keeps both functions' owner and ACL (EXECUTE: postgres, service_role only).

-- ─── ROLLBACK (do not run as part of this migration) ───────────────────────────────────────────
-- Per README "Rollback paths": apply as a NEW dated forward migration, never by deleting this file.
--
-- drop trigger if exists trg_enforce_job_post_skills_lock on public.job_post_skills;
-- drop function if exists public.enforce_job_post_skills_lock();
-- drop trigger if exists trg_enforce_job_post_writes on public.job_posts;
-- drop function if exists public.enforce_job_post_writes();
--
-- drop policy "Freelancer withdraws own response while the post is open" on public.job_responses;
-- create policy "Freelancer deletes own response" on public.job_responses for delete
--   using (freelancer_id = auth.uid());
--
-- check_order_status_transition: re-create with the live body of migration 20260606155746 (as dumped
-- 2026-10-27), i.e. the body in section 4 with this block restored right after BEGIN:
--   -- Admin override: data fixes always allowed
--   IF is_admin() THEN
--     RETURN NEW;
--   END IF;
--
-- enforce_order_lifecycle_columns: re-create with migration 20261025222218's body, i.e. the body in
-- section 5 without the `if not v_system then ... end if;` block inside the INSERT branch.
