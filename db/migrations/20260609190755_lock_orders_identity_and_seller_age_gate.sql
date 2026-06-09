-- Closes audit IMP-1 (PR #58): a buyer could reassign seller_id / change quantity (any
-- non-status column) on their own order — the role-gating trigger check_order_status_transition
-- only gates STATUS transitions ("non-status edits sail through"). Also adds the DB-level 18+
-- seller gate (audit IMP-3 / CLAUDE.md "age 18+ to sell must be DB-enforced"), previously
-- app-layer only. Same two-layer approach as the profiles lock (REVOKE table UPDATE -> GRANT
-- allow-list, plus guard triggers).

-- Layer 1 — freeze order identity columns; keep only the lifecycle columns writable by authenticated.
REVOKE UPDATE ON public.orders FROM anon, authenticated;
GRANT UPDATE (status, cancelled_by, cancellation_reason, received_at) ON public.orders TO authenticated;
-- Frozen (no authenticated grant): buyer_id, seller_id, product_id, service_listing_id,
-- order_type, quantity, buyer_note, delivery_name, delivery_address, delivery_phone.
-- cancelled_at and updated_at are written by BEFORE-UPDATE triggers via NEW (need no column grant).
-- INSERT is unaffected (order creation still works). service_role retains its grant.

-- Layer 2 — identity-lock trigger (defense-in-depth).
CREATE OR REPLACE FUNCTION public.enforce_order_identity_lock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
begin
  if auth.uid() is null then
    return new;
  end if;
  if public.is_admin() then
    return new;
  end if;
  if new.buyer_id is distinct from old.buyer_id
     or new.seller_id is distinct from old.seller_id
     or new.product_id is distinct from old.product_id
     or new.service_listing_id is distinct from old.service_listing_id
     or new.order_type is distinct from old.order_type
     or new.quantity is distinct from old.quantity
     or new.buyer_note is distinct from old.buyer_note
     or new.delivery_name is distinct from old.delivery_name
     or new.delivery_address is distinct from old.delivery_address
     or new.delivery_phone is distinct from old.delivery_phone then
    raise exception 'Order identity columns cannot be modified' using errcode = '42501';
  end if;
  return new;
end;
$function$;

CREATE TRIGGER enforce_order_identity_lock_trigger
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_order_identity_lock();

-- 18+ seller age gate. BEFORE UPDATE only: seller_type can only transition to a non-null value
-- via UPDATE — the sole profile-INSERT path (handle_new_user) always inserts seller_type NULL,
-- and a user cannot re-INSERT their own profile (PK + RLS). UPDATE-only fully covers the
-- devenir-vendeur upgrade and avoids any OLD-is-NULL-on-INSERT ambiguity.
CREATE OR REPLACE FUNCTION public.enforce_seller_type_age_gate()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
begin
  if auth.uid() is null then
    return new;
  end if;
  if public.is_admin() then
    return new;
  end if;
  if new.seller_type is not null and new.seller_type is distinct from old.seller_type then
    if new.date_of_birth is null then
      raise exception 'Date of birth is required to become a seller' using errcode = '23514';
    end if;
    if new.date_of_birth > (current_date - interval '18 years') then
      raise exception 'You must be 18 or older to become a seller' using errcode = '23514';
    end if;
  end if;
  return new;
end;
$function$;

CREATE TRIGGER enforce_seller_type_age_gate_trigger
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_seller_type_age_gate();