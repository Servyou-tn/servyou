-- enforce_order_insert_integrity v3: no order aimed at a suspended seller; the stock rule; server timestamps.
-- Founder rulings 7 (orders half) and 8 (2026-10-28) on « MEDIUM — active users can still transact with a
-- suspended account » (docs/follow-ups/suspension-enforcement.md) and « LOW — order-insert decisions deferred
-- from migration 54 (D2 / D4) » (security-audit-open-findings.md). One file because all three change the same
-- function (a second file's re-create would silently drop the first's changes). Standards-reference Section 3
-- A01 / A04.
--
-- Live before this migration (verified 2026-10-28, after migration 80):
--   * nothing reads the SELLER's suspended_at: an active buyer orders from a suspended seller's live item;
--   * the stock rule (tracks_stock and quantity > stock_count) lives only in demander/[id]/actions.ts -- a REST
--     INSERT orders 50 of an item with 1 left. No trigger touches stock_count;
--   * authenticated holds table-level INSERT on orders, so a client sets created_at / updated_at (backdating
--     skews H5's monthly stats, which bucket by created_at).
--   0 suspended accounts; 16 orders; no row is rewritten.
--
-- After, for JWT callers (tier 2; admins included since migration 80) -- no-JWT callers (service role,
-- fixtures that backdate on purpose) keep tier 1 only, unchanged:
--   * the seller suspended -> 23514 « Cet article n'est plus disponible. » (the existing not-live message, so it
--     never tells the buyer the seller is suspended);
--   * product order with tracks_stock and quantity > stock_count -> 23514 « Quantité supérieure au stock
--     disponible. » (the app's own copy, demander.error.stock). stock_count NULL passes, as in the app;
--   * created_at and updated_at := now() (client values discarded, like seller_id / the snapshot columns).
-- The stock read takes FOR SHARE on the product row, so a concurrent stock edit by the seller is serialised
-- against the check (nothing decrements stock on order today, so this is the rule, not a reservation).
-- Body = live definition (2026-10-28) + the three additions; owner, ACL (no client EXECUTE) and
-- search_path ('public') kept by CREATE OR REPLACE.

create or replace function public.enforce_order_insert_integrity()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_seller  uuid;
  v_live    boolean;
  v_tracks  boolean;
  v_stock   integer;
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

  -- Ruling 7: a suspended seller's item is not orderable. Same message as a hidden item.
  if not v_live
     or exists (select 1 from public.profiles sp where sp.id = v_seller and sp.suspended_at is not null) then
    raise exception 'Cet article n''est plus disponible.'
      using errcode = '23514';
  end if;

  if new.buyer_id = v_seller then
    raise exception 'Vous ne pouvez pas commander votre propre article.'
      using errcode = '23514';
  end if;

  -- Ruling 8 (D4): the stock rule, previously app-only (demander/[id]/actions.ts).
  if new.order_type = 'product' then
    select p.tracks_stock, p.stock_count
      into v_tracks, v_stock
      from public.products p
     where p.id = new.product_id
       for share;
    if v_tracks and v_stock is not null and new.quantity > v_stock then
      raise exception 'Quantité supérieure au stock disponible.'
        using errcode = '23514', hint = 'stock';
    end if;
  end if;

  -- Ruling 8 (D2): the database's clock, never the client's.
  new.created_at := now();
  new.updated_at := now();

  return new;
end;
$function$;

-- ─── ROLLBACK (do not run as part of this migration) ───────────────────────────────────────────
-- Per README "Rollback paths": apply as a NEW dated forward migration, never by deleting this file.
-- Re-create the function with migration 20261028194712's resulting body (the live definition of 2026-10-28):
-- the body above without v_tracks / v_stock, without the suspended-seller EXISTS (back to `if not v_live then`),
-- and without the « Ruling 8 » blocks.
