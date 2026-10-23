-- fix(security): enforce 18+ and one-seller-capability on shops / freelancer_profiles INSERT.
-- Until now "Owner inserts own shop" and "Owner inserts own freelancer profile" checked only
-- owner_id / profile_id = auth.uid(), and neither table had an INSERT trigger. The 18+ gate lives on
-- profiles.seller_type (enforce_seller_type_age_gate, BEFORE UPDATE), which creating a shop or a
-- freelancer profile never touches. Through the REST API a signed-in consumer of any age could
-- therefore POST /rest/v1/shops and/or /rest/v1/freelancer_profiles and become a seller -- or both
-- -- without ever setting seller_type. Closes docs/follow-ups.md "Security audit -- open findings
-- (2026-10-23)", HIGH "shops / freelancer_profiles INSERT bypass the 18+ and one-seller-capability
-- rules" -- for shops and freelancer_profiles only. job_responses, a sibling path where an account
-- also acts as a freelancer, is not covered here and is logged as its own HIGH.
--
-- Part 1 -- shops / freelancer_profiles (BEFORE INSERT OR UPDATE OF owner_id / profile_id).
-- One shared function, per-table triggers -- the enforce_admin_marker_lock() shape. For signed-in
-- non-admin callers the row's owner must:
--   * hold the matching seller_type -- 'shop_owner' for shops, 'freelancer' for freelancer_profiles
--     (42501). seller_type only becomes non-null through the age-gated UPDATE, so this carries the
--     18+ rule onto both tables;
--   * not already own the other capability's row (42501). seller_type is single-valued only at a
--     point in time and stays client-UPDATEable, so the matching check alone would let an adult
--     freelancer flip to 'shop_owner' and then POST a shop, keeping the freelancer profile. This
--     conjunct closes "both rows" on the insert side independently of Part 2.
-- The owner's profiles row is read FOR SHARE: a concurrent seller_type UPDATE waits for this insert
-- to commit (and then sees the new row), and an insert behind an uncommitted seller_type UPDATE waits
-- and re-reads the new value -- so the check and a switch cannot interleave.
-- The owner is read from NEW, not auth.uid(): BEFORE triggers run before the RLS WITH CHECK. A
-- non-admin can only insert or keep rows owned by themselves (WITH CHECK / USING owner = auth.uid()),
-- so NEW's owner is the caller whenever the row can land; reading NEW keeps the rule correct if a
-- policy is ever widened. Probing another user's seller_type through the error text leaks nothing:
-- public_profiles already exposes seller_type.
-- UPDATE OF owner_id / profile_id is defense in depth -- RLS already stops a non-admin reassigning a
-- row. UPDATE OF fires whenever the column is in the SET list, even unchanged, so the function
-- returns early unless the owner actually changes.
--
-- 42501, not 23514: both creation actions (ma-boutique/creer, mon-profil-freelance/creer) map a
-- 23514 on their seller_type UPDATE to the age-gate copy ("18 ans"); a capability rejection must not
-- surface as an age refusal. The app's own order -- flip seller_type (age-gated) THEN insert -- passes
-- unchanged. Both actions refuse the cross-capability case by seller_type only, not by owned rows,
-- so the one D2 account below (seller_type NULL, owns a freelancer profile) is still shown the G2
-- form; its seller_type flip to 'shop_owner' now fails Part 2's 42501, which G2 maps to its generic
-- error (logged in docs/follow-ups.md).
--
-- Part 2 -- profiles (BEFORE UPDATE OF seller_type), founder decision D1. Part 1 stops a second
-- capability from being CREATED, but a seller could still move seller_type away from the
-- capability they hold (shop owner -> NULL or 'freelancer'), leaving a live shop on an account
-- that reads as consumer or freelancer. For signed-in non-admin callers, when seller_type actually
-- changes, the NEW value must match every capability row the account owns (42501). Keyed on the
-- new value, so a seller_type-NULL account that already owns a freelancer profile can still move to
-- 'freelancer' (repairs it) but not to 'shop_owner'. No app path moves seller_type away from a
-- non-null value (only the two creation actions write it, NULL -> matching value or same value).
-- Deleting the old content and then switching passes this guard, but only for a seller with no
-- orders: deleting a shop or freelancer profile cascades to products / service_listings, the orders
-- FK on those is ON DELETE SET NULL, and enforce_order_identity_lock rejects that cascaded SET NULL
-- for a signed-in non-admin (42501). A "switch" flow (CLAUDE.md: switching deletes own role content
-- but preserves completed transactions) therefore needs its own design -- logged in
-- docs/follow-ups.md. Sibling of enforce_seller_type_age_gate_trigger, which is untouched; the two
-- fire in name order, this one first.
--
-- Bypass: auth.uid() NULL and is_admin(), like every other guard trigger (enforce_seller_type_age_gate,
-- enforce_order_insert_integrity). Load-bearing: these service-role fixtures and seeds insert a shop
-- or freelancer profile without setting seller_type first -- rls-smoke (charlie's shop),
-- shop-check-constraints, shop-config-rls, freelancer-details-wizard, freelancer-publish-gate-rls,
-- h3-links-portfolio-rls, d4-completed-project-count, d4-freelancer-services-visibility,
-- h5-service-delete-orders-gate, h5-service-monthly-stats, h5-service-status-cascade,
-- h6-service-listings-hardening-rls and uploaded-objects-provenance-rls -- and
-- seller-capability-integrity seeds its mixed (both capabilities) and orphan states the same way.
-- anon also has auth.uid() NULL but can never insert: the RLS WITH CHECK owner = auth.uid() fails
-- for it, and owner_id / profile_id are NOT NULL.
--
-- New writes only; no existing row is rewritten. Discovery (2026-10-23): 1 shop (owner seller_type
-- 'shop_owner'), 11 freelancer profiles, 0 accounts owning both, 0 sellers under 18. 1 freelancer
-- profile belongs to an account whose seller_type is NULL (adult, unpublished, 0 listings, 0 orders,
-- created 2026-08-22) -- left as is (founder decision D2); the UPDATE OF / IS DISTINCT FROM gating
-- means this migration never blocks that account's ordinary profile edits.

-- ─── Part 1 ─────────────────────────────────────────────────────────────────────────────────────
create or replace function public.enforce_seller_capability()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_owner    uuid;
  v_required text;
  v_type     text;
begin
  if auth.uid() is null then
    return new;
  end if;
  if public.is_admin() then
    return new;
  end if;

  -- Nested IFs, not AND: an INSERT must never evaluate OLD.
  if tg_table_name = 'shops' then
    if tg_op = 'UPDATE' then
      if new.owner_id is not distinct from old.owner_id then
        return new;
      end if;
    end if;
    v_owner    := new.owner_id;
    v_required := 'shop_owner';
  else
    if tg_op = 'UPDATE' then
      if new.profile_id is not distinct from old.profile_id then
        return new;
      end if;
    end if;
    v_owner    := new.profile_id;
    v_required := 'freelancer';
  end if;

  -- FOR SHARE serializes this check against a concurrent seller_type UPDATE on the same profile.
  select p.seller_type
    into v_type
    from public.profiles p
   where p.id = v_owner
     for share;

  if v_type is distinct from v_required then
    if v_required = 'shop_owner' then
      raise exception 'Seul un compte boutique peut posséder une boutique.'
        using errcode = '42501';
    end if;
    raise exception 'Seul un compte freelance peut posséder un profil freelance.'
      using errcode = '42501';
  end if;

  if (v_required = 'shop_owner'
        and exists (select 1 from public.freelancer_profiles f where f.profile_id = v_owner))
     or (v_required = 'freelancer'
        and exists (select 1 from public.shops s where s.owner_id = v_owner)) then
    raise exception 'Un compte ne peut pas être à la fois boutique et freelance.'
      using errcode = '42501';
  end if;

  return new;
end;
$function$;

comment on function public.enforce_seller_capability() is
  'BEFORE INSERT OR UPDATE OF owner_id (shops) / profile_id (freelancer_profiles). Signed-in non-admin callers only: the row''s owner must hold the matching profiles.seller_type -- shop_owner / freelancer, itself age-gated by enforce_seller_type_age_gate (42501) -- and must not own the other capability''s row (42501). Owner''s profiles row read FOR SHARE to serialize against a seller_type switch. UPDATE returns early unless the owner changes. auth.uid() NULL (service role, seeds) and is_admin() bypass, matching the other guard triggers. 2026-10-23. SECURITY DEFINER.';

create trigger trg_enforce_seller_capability_shops
  before insert or update of owner_id on public.shops
  for each row execute function public.enforce_seller_capability();

create trigger trg_enforce_seller_capability_freelancer_profiles
  before insert or update of profile_id on public.freelancer_profiles
  for each row execute function public.enforce_seller_capability();

-- ─── Part 2 ─────────────────────────────────────────────────────────────────────────────────────
create or replace function public.enforce_seller_capability_switch()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if auth.uid() is null then
    return new;
  end if;
  if public.is_admin() then
    return new;
  end if;
  if new.seller_type is not distinct from old.seller_type then
    return new;
  end if;

  if (new.seller_type is distinct from 'shop_owner'
        and exists (select 1 from public.shops s where s.owner_id = new.id))
     or (new.seller_type is distinct from 'freelancer'
        and exists (select 1 from public.freelancer_profiles f where f.profile_id = new.id)) then
    raise exception 'Le type de vendeur ne peut pas changer tant que le compte possède une boutique ou un profil freelance.'
      using errcode = '42501';
  end if;

  return new;
end;
$function$;

comment on function public.enforce_seller_capability_switch() is
  'BEFORE UPDATE OF seller_type on profiles (fires before enforce_seller_type_age_gate_trigger by name). Signed-in non-admin callers only, and only when seller_type actually changes: the new value must match every capability row the account owns -- no shop unless shop_owner, no freelancer profile unless freelancer (42501). Pairs with enforce_seller_capability() on shops / freelancer_profiles. auth.uid() NULL and is_admin() bypass. 2026-10-23. SECURITY DEFINER.';

create trigger enforce_seller_capability_switch_trigger
  before update of seller_type on public.profiles
  for each row execute function public.enforce_seller_capability_switch();

-- ─── ROLLBACK (do not run as part of this migration) ───────────────────────────────────────────
-- Per README "Rollback paths": apply as a NEW dated forward migration, never by deleting this file.
-- Re-opens the hole: a consumer of any age can again become a seller, or both, over REST. Only ever
-- ship it together with a replacement guard. No data to undo -- the triggers never rewrite rows.
--
-- drop trigger if exists enforce_seller_capability_switch_trigger on public.profiles;
-- drop function if exists public.enforce_seller_capability_switch();
-- drop trigger if exists trg_enforce_seller_capability_shops on public.shops;
-- drop trigger if exists trg_enforce_seller_capability_freelancer_profiles on public.freelancer_profiles;
-- drop function if exists public.enforce_seller_capability();
