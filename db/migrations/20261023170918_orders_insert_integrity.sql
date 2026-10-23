-- fix(orders): INSERT integrity. Until now the only INSERT gate on orders was the RLS WITH CHECK
-- `buyer_id = auth.uid()`. Nothing checked that the item is live, that seller_id is the item's
-- owner, that the order starts 'pending', or that the buyer is not the seller -- and
-- set_order_snapshot (SECURITY DEFINER) reads the item regardless of its status. Through the REST
-- API a signed-in user could therefore:
--   * order a draft, owner-paused or admin-moderated item -- and since migration 52 an order is
--     also a READ grant on that service listing (the buyer branch, decision D1);
--   * pin an order on ANY profile as seller_id -- which also unlocks get_contact_phone(victim),
--     because that function returns the phone whenever any order links caller and target;
--   * insert an order already 'received' (inflating get_completed_service_order_count on the
--     public D4 profile) or already 'accepted'/'arrived' (opening the disputes INSERT path, which
--     requires status <> 'pending').
-- Closes docs/follow-ups.md "Orders INSERT never checks that the target listing is live".
--
-- Shape: a sibling BEFORE INSERT trigger, not a rewrite of set_order_snapshot (extend, don't
-- replace). Same-timing row triggers fire in name order, so trg_enforce_order_insert_integrity runs
-- BEFORE trg_set_order_snapshot: a rejected order never reaches the snapshot. The RLS WITH CHECK
-- runs after both BEFORE triggers and still only checks buyer_id; emit_order_event (AFTER INSERT)
-- sees the DB-resolved seller_id. The seller age gate is unaffected -- it lives on profiles
-- (enforce_seller_type_age_gate, BEFORE UPDATE), not on orders. enforce_order_identity_lock is
-- BEFORE UPDATE and is untouched.
--
-- Two tiers:
--   1. EVERY caller: seller_id is set from the item's owner (product -> shops.owner_id; service ->
--      freelancer_profiles.profile_id), discarding any client value -- the same unconditional
--      assignment set_order_snapshot uses. A missing item raises the snapshot's own 23503. Every
--      existing service-role fixture already passes the true owner, so none changes.
--   2. Signed-in non-admin callers only (auth.uid() not null and not is_admin()) -- the same bypass
--      cascade as every other orders trigger, so seeds, the service role and the live-DB fixtures
--      that insert 'received'/'cancelled' rows directly keep working:
--        * status must be 'pending' and every lifecycle column NULL (42501);
--        * the item must be live: product status='active' (so not 'hidden' or 'sold_out') and not
--          admin-moderated, its shop not admin-moderated; service status='active' (so not 'draft'
--          or 'hidden') and not admin-moderated, its freelancer profile not admin-moderated (23514).
--          shops has no publish column; freelancer_profiles.is_published is derived from having an
--          active listing, so an active listing implies it;
--        * the buyer cannot be the item's seller (23514).
--      anon also has auth.uid() NULL and so skips tier 2 -- but it can never insert, because the
--      RLS WITH CHECK `buyer_id = auth.uid()` fails for it and buyer_id is NOT NULL.
-- Applies to new inserts only; existing rows are never rewritten. Discovery (2026-10-23): of 16
-- orders, 0 have a seller_id that differs from the item's owner, 0 are self-orders, 0 sit on a
-- non-live item. 14 predate order_events, so their insert-time status cannot be known; both orders
-- that have a 'created' event were inserted 'pending' by their buyer.
create or replace function public.enforce_order_insert_integrity()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_seller uuid;
  v_live   boolean;
begin
  if new.order_type = 'product' then
    select s.owner_id,
           (p.status = 'active' and p.admin_hidden_at is null and s.admin_hidden_at is null)
      into v_seller, v_live
      from public.products p
      join public.shops s on s.id = p.shop_id
     where p.id = new.product_id;
  elsif new.order_type = 'service' then
    select fp.profile_id,
           (sl.status = 'active' and sl.admin_hidden_at is null and fp.admin_hidden_at is null)
      into v_seller, v_live
      from public.service_listings sl
      join public.freelancer_profiles fp on fp.id = sl.freelancer_profile_id
     where sl.id = new.service_listing_id;
  end if;

  -- Same error as set_order_snapshot, which would raise it next anyway.
  if v_seller is null then
    raise exception 'Impossible de créer la commande : article introuvable.'
      using errcode = '23503';
  end if;

  -- Tier 1, every caller. Any client-supplied seller_id is discarded here.
  new.seller_id := v_seller;

  if auth.uid() is null then
    return new;
  end if;
  if public.is_admin() then
    return new;
  end if;

  -- Tier 2. The lifecycle starts at 'pending' and only check_order_status_transition moves it.
  if new.status is distinct from 'pending'
     or new.cancelled_by is not null
     or new.cancelled_at is not null
     or new.cancellation_reason is not null
     or new.received_at is not null
     or new.carrier is not null
     or new.tracking_number is not null then
    raise exception 'Une commande est toujours créée en attente.'
      using errcode = '42501';
  end if;

  if not v_live then
    raise exception 'Cet article n''est plus disponible.'
      using errcode = '23514';
  end if;

  if new.buyer_id = v_seller then
    raise exception 'Vous ne pouvez pas commander votre propre article.'
      using errcode = '23514';
  end if;

  return new;
end;
$function$;

comment on function public.enforce_order_insert_integrity() is
  'BEFORE INSERT on orders (fires before trg_set_order_snapshot by name). Every caller: seller_id := the item''s owner (products -> shops.owner_id; service_listings -> freelancer_profiles.profile_id), client value discarded; missing item raises 23503. Signed-in non-admin callers only: status must be pending and cancelled_by/cancelled_at/cancellation_reason/received_at/carrier/tracking_number NULL (42501); item must be live -- status=active, not admin-moderated, parent shop/freelancer profile not admin-moderated (23514); buyer_id <> seller (23514). auth.uid() NULL (service role, seeds) and is_admin() bypass tier 2, matching the other orders triggers. 2026-10-23. SECURITY DEFINER.';

create trigger trg_enforce_order_insert_integrity
  before insert on public.orders
  for each row execute function public.enforce_order_insert_integrity();

-- ─── ROLLBACK (do not run as part of this migration) ───────────────────────────────────────────
-- Per README "Rollback paths": apply as a NEW dated forward migration, never by deleting this file.
-- Rows inserted while this was live keep their DB-resolved seller_id; nothing to undo in data.
--
-- drop trigger if exists trg_enforce_order_insert_integrity on public.orders;
-- drop function if exists public.enforce_order_insert_integrity();
