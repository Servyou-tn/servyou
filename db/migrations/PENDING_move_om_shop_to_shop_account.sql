-- Move « OM shop » from the admin account to its own shop account (founder task, 2026-11-02). DATA ONLY — no schema
-- change, no grant, no types to regenerate. Prepared by CC, NOT applied: the founder / architect applies it.
--
-- From : 0f4c929b-05e4-474e-b2ce-a3c84443a0ad  moatezsahbeni500@gmail.com       (is_admin = true, seller_type = shop_owner)
-- To   : the account moatezsahbeni500+shop@gmail.com (created by the founder before this runs; looked up by email)
-- Shop : f4757d2d-705c-48c8-bd58-37a35c7bdab3  « OM shop »
-- After: the admin account keeps is_admin and has seller_type = NULL (admin only); the new account is a normal
--        shop_owner that owns the shop, its orders and its files.
--
-- ─── Every table that points to the owner (live counts, read-only, 2026-11-02) ─────────────────────────────────────
-- MOVED by this file (keyed on the owner's user id):
--   profiles.seller_type ............ target → 'shop_owner'; admin → NULL (last write)
--   shops.owner_id .................. 1 row  (unique index shops_owner_id_key: one shop per account)
--   orders.seller_id ................ 6 rows (pending 3, prepared 1, arrived 1, received 1 — all on OM shop products)
--                                     Must move with the shop: the shops read policy lets a buyer see a hidden shop via
--                                     orders.seller_id = shops.owner_id, and get_contact_phone / Commandes reçues key
--                                     on seller_id.
--   uploaded_objects.owner_id ....... 35 rows (product-images 33, shop-assets 2), all under « <shop id>/ ».
--                                     Must move: enforce_product_image_provenance (product_images INSERT) and
--                                     enforce_shop_asset_provenance (logo/banner change) require
--                                     uploaded_objects.owner_id = the shop's owner_id — otherwise the new owner's
--                                     first product-image edit fails. The FK also cascades on auth user delete.
--   storage.objects owner/owner_id .. 35 rows, same files. Metadata only (storage RLS keys on shops.owner_id via the
--                                     first folder), moved so the uploader of record matches the owner.
-- FOLLOW the shop id, untouched (no owner column):
--   products 26 · product_images 33 · shop_categories 3 · shop_payment_methods 1 · favorites (on the shop or its
--   products) 1 · reports targeting the shop 1 · admin_audit_log rows targeting the shop 4.
-- STAY with the admin (they are the admin's own acts, not the shop's):
--   admin_audit_log.admin_id 8 · job_posts.consumer_id 1 (a consumer post).
-- Zero today, so nothing to decide: orders as buyer 0 · order_events.actor_id = admin 0 · disputes on these orders 0 ·
--   freelancer_profiles 0 · favorites by the admin 0 · notification_preferences 0 · reports by the admin 0 ·
--   contact_messages / data_exports / deletion_requests / password_change_attempts: not shop data, not moved.
--
-- Side effects: updated_at moves to now() on the shop, the moved orders and both profiles (handle_updated_at), and
-- on the moved storage objects. No order_events row: emit_order_event only logs a STATUS change.
--
-- Why the checks below: run from the SQL editor / MCP, auth.uid() is NULL, so every guard trigger
-- (enforce_seller_capability, enforce_seller_capability_switch, enforce_seller_type_age_gate,
-- enforce_order_identity_lock, …) bypasses itself. This block re-checks those rules for the target by hand and
-- aborts — changing nothing — on the first failure. It is safe to run twice: the second run stops at
-- « déjà déplacée ». It checks the END STATE, not today's counts, so products or orders added before it runs move too.
--
-- Prerequisites for the founder (the block refuses otherwise):
--   1. Sign up moatezsahbeni500+shop@gmail.com as a normal account (Consommateur) and confirm the email.
--   2. On that account, fill the phone (Mon compte) — sign-up does not store it, and buyers reach the shop by
--      WhatsApp through it. The same number as the admin account is allowed (phone is not unique).
--      Date of birth comes from sign-up (18+ required).
--   3. Do NOT start « Devenir vendeur » on it: an account that already owns a shop is refused.

do $$
declare
  c_admin       constant uuid := '0f4c929b-05e4-474e-b2ce-a3c84443a0ad';
  c_admin_email constant text := 'moatezsahbeni500@gmail.com';
  c_shop        constant uuid := 'f4757d2d-705c-48c8-bd58-37a35c7bdab3';
  c_target_mail constant text := 'moatezsahbeni500+shop@gmail.com';
  v_target      uuid;
  v_admin       public.profiles%rowtype;
  v_tgt         public.profiles%rowtype;
  v_shop_owner  uuid;
  n_orders      int;
  n_uploads     int;
  n_objects     int;
begin
  -- ── Checks (no write before this section ends) ─────────────────────────────────────────────────────────────────
  select u.id into v_target
    from auth.users u
   where lower(u.email) = c_target_mail and u.email_confirmed_at is not null;
  if v_target is null then
    raise exception 'Le compte % n''existe pas ou son email n''est pas confirmé.', c_target_mail using errcode = 'P0002';
  end if;
  if v_target = c_admin then
    raise exception 'Le compte cible est le compte admin.' using errcode = '23514';
  end if;

  -- Lock the shop and both profiles for the duration of the move.
  select s.owner_id into v_shop_owner from public.shops s where s.id = c_shop for update;
  if v_shop_owner is null then
    raise exception 'La boutique % est introuvable.', c_shop using errcode = 'P0002';
  end if;
  if v_shop_owner = v_target then
    raise exception 'La boutique est déjà déplacée vers %.', c_target_mail using errcode = '23514';
  end if;
  if v_shop_owner <> c_admin then
    raise exception 'La boutique n''appartient pas au compte admin attendu.' using errcode = '23514';
  end if;

  select * into v_admin from public.profiles where id = c_admin for update;
  if not found or v_admin.email is distinct from c_admin_email or not v_admin.is_admin then
    raise exception 'Le profil admin attendu ne correspond pas.' using errcode = '23514';
  end if;

  select * into v_tgt from public.profiles where id = v_target for update;
  if not found then
    raise exception 'Le profil du compte cible est introuvable.' using errcode = 'P0002';
  end if;
  if v_tgt.is_admin then
    raise exception 'Le compte cible ne doit pas être administrateur.' using errcode = '23514';
  end if;
  if v_tgt.suspended_at is not null then
    raise exception 'Le compte cible est suspendu.' using errcode = '23514';
  end if;
  if v_tgt.seller_type is not null and v_tgt.seller_type <> 'shop_owner' then
    raise exception 'Le compte cible est déjà freelance.' using errcode = '23514';
  end if;
  -- enforce_seller_capability / _switch, by hand: one seller capability per account.
  if exists (select 1 from public.shops where owner_id = v_target) then
    raise exception 'Le compte cible possède déjà une boutique.' using errcode = '23514';
  end if;
  if exists (select 1 from public.freelancer_profiles where profile_id = v_target)
     or exists (select 1 from public.job_responses where freelancer_id = v_target) then
    raise exception 'Le compte cible a un contenu freelance.' using errcode = '23514';
  end if;
  -- enforce_seller_type_age_gate, by hand.
  if v_tgt.date_of_birth is null or v_tgt.date_of_birth > (current_date - interval '18 years') then
    raise exception 'Le compte cible doit avoir une date de naissance (18 ans ou plus).' using errcode = '23514';
  end if;
  if v_tgt.phone is null or btrim(v_tgt.phone) = '' then
    raise exception 'Le compte cible doit avoir un numéro de téléphone (contact WhatsApp des acheteurs).'
      using errcode = '23514';
  end if;
  -- An order the target placed on OM shop would become a self-order.
  if exists (select 1 from public.orders where buyer_id = v_target and seller_id = c_admin) then
    raise exception 'Le compte cible a commandé dans cette boutique : la commande deviendrait une auto-commande.'
      using errcode = '23514';
  end if;
  -- The admin sells only through this shop (no freelance side), so every seller order of the admin is a shop order.
  if exists (select 1 from public.freelancer_profiles where profile_id = c_admin)
     or exists (select 1 from public.orders where seller_id = c_admin and order_type <> 'product') then
    raise exception 'Le compte admin a des ventes hors boutique : déplacement à revoir.' using errcode = '23514';
  end if;

  -- ── Writes (seller_type first so the target is a shop_owner before it owns the shop; admin's NULL last) ───────────
  update public.profiles set seller_type = 'shop_owner'
   where id = v_target and seller_type is distinct from 'shop_owner';

  update public.shops set owner_id = v_target where id = c_shop and owner_id = c_admin;

  update public.orders set seller_id = v_target where seller_id = c_admin;
  get diagnostics n_orders = row_count;

  update public.uploaded_objects set owner_id = v_target
   where owner_id = c_admin
     and bucket in ('product-images', 'shop-assets')
     and split_part(path, '/', 1) = c_shop::text;
  get diagnostics n_uploads = row_count;

  update storage.objects set owner = v_target, owner_id = v_target::text
   where bucket_id in ('product-images', 'shop-assets')
     and split_part(name, '/', 1) = c_shop::text
     and (owner = c_admin or owner_id = c_admin::text);
  get diagnostics n_objects = row_count;

  update public.profiles set seller_type = null where id = c_admin;

  -- ── End state (aborts the whole move if any rule fails) ───────────────────────────────────────────────────────────
  if not exists (select 1 from public.shops where id = c_shop and owner_id = v_target)
     or exists (select 1 from public.shops where owner_id = c_admin)
     or exists (select 1 from public.orders where seller_id = c_admin)
     or exists (select 1 from public.uploaded_objects
                 where owner_id = c_admin and bucket in ('product-images', 'shop-assets')
                   and split_part(path, '/', 1) = c_shop::text)
     or not exists (select 1 from public.profiles where id = c_admin and is_admin and seller_type is null)
     or not exists (select 1 from public.profiles where id = v_target and seller_type = 'shop_owner' and not is_admin)
  then
    raise exception 'Vérification finale échouée : rien n''a été déplacé.' using errcode = '23514';
  end if;

  raise notice 'OM shop déplacée vers % (%): % commandes, % uploaded_objects, % storage.objects.',
    c_target_mail, v_target, n_orders, n_uploads, n_objects;
end
$$;

/* ─── ROLLBACK — copy the block below into the SQL editor (do not run it with the move) ─────────────────────────────
   Puts OM shop back on the admin account. Guarded: it runs only while the target owns the shop and the admin owns none.
   Orders placed AFTER the move go back to the admin too (they belong to the shop, which goes back). The target's
   seller_type returns to NULL (it was a fresh consumer account before the move).

do $$
declare
  c_admin       constant uuid := '0f4c929b-05e4-474e-b2ce-a3c84443a0ad';
  c_shop        constant uuid := 'f4757d2d-705c-48c8-bd58-37a35c7bdab3';
  c_target_mail constant text := 'moatezsahbeni500+shop@gmail.com';
  v_target      uuid;
  v_shop_owner  uuid;
begin
  select id into v_target from auth.users where lower(email) = c_target_mail;
  select owner_id into v_shop_owner from public.shops where id = c_shop for update;
  if v_target is null
     or v_shop_owner is distinct from v_target
     or exists (select 1 from public.shops where owner_id = c_admin)
     or exists (select 1 from public.orders where buyer_id = c_admin and seller_id = v_target) then
    raise exception 'Rollback impossible : état inattendu (voir les conditions).' using errcode = '23514';
  end if;
  perform 1 from public.profiles where id in (c_admin, v_target) for update;

  update public.profiles set seller_type = 'shop_owner' where id = c_admin;
  update public.shops set owner_id = c_admin where id = c_shop and owner_id = v_target;
  update public.orders set seller_id = c_admin where seller_id = v_target;
  update public.uploaded_objects set owner_id = c_admin
   where owner_id = v_target and bucket in ('product-images', 'shop-assets') and split_part(path, '/', 1) = c_shop::text;
  update storage.objects set owner = c_admin, owner_id = c_admin::text
   where bucket_id in ('product-images', 'shop-assets') and split_part(name, '/', 1) = c_shop::text
     and (owner = v_target or owner_id = v_target::text);
  update public.profiles set seller_type = null where id = v_target;

  if not exists (select 1 from public.shops where id = c_shop and owner_id = c_admin)
     or exists (select 1 from public.orders where seller_id = v_target) then
    raise exception 'Vérification du rollback échouée : rien n''a été restauré.' using errcode = '23514';
  end if;
  raise notice 'OM shop remise sur le compte admin.';
end
$$;
*/
