-- Fix packet 1 (journey walk 2026-11-02, docs/journeys/walk-2026-11-02.md) — the DB side of #17 and #31. Prepared by
-- CC on fix/packet-1-phone-counts-product, NOT applied: the founder / architect applies it. The app side (actions,
-- forms, tests) ships in the same PR and already enforces both rules; this makes them hold for every JWT caller.
--
-- ─── 1. Products (#31): a title and a price > 0 on EVERY row ──────────────────────────────────────────────────────
-- Live (read-only, service role, 2026-11-03): 26 products, 0 with price_tnd <= 0, 0 with a blank title — so both
-- constraints validate immediately (no NOT VALID needed). Added NEXT TO the existing column check (price_tnd >= 0,
-- migration 20260603182611), not replacing it. CHECKs bind the service role too: no live test / seed / script inserts
-- a product with price 0 or a blank title (grep of src/__tests__ and scripts/, 2026-11-03).
alter table public.products
  add constraint products_price_positive check (price_tnd > 0),
  add constraint products_title_not_blank check (btrim(title) <> '');

-- ─── 2. Seller contact phone (#17): no publish, no shop, without a phone ───────────────────────────────────────────
-- Buyers reach a seller on WhatsApp through profiles.phone (get_contact_phone). The rule fires ONLY on the moment of
-- publishing — never on existing rows, which stay as they are (founder: « report, don't touch »):
--   • service_listings: INSERT as 'active', or UPDATE OF status to 'active' from anything else (draft → active =
--     « Publier mon service », hidden → active = « Activer »). Editing an active row, pausing, drafts: never.
--   • shops: BEFORE INSERT (« Créer ma boutique »). The app writes the phone with seller_type BEFORE the insert.
-- Skipped when auth.uid() is null (service role, SQL editor, migrations, live-test fixtures — the
-- enforce_active_user / enforce_service_publish_requirements precedent) and for admins (moderation's un-hide moves a
-- listing's status and must not depend on the seller's phone).
-- Live (2026-11-03): 9 of 10 freelancers have no phone (mostly the 9 demo accounts); 12 of 21 active services belong
-- to them and STAY active; if one of them is paused it cannot be reactivated until a phone is added. 0 shop owners lack
-- a phone.
-- Refusal: errcode 23514 (invalid data, shared — hence the hint), hint 'seller_phone_required', a French message that
-- names no other account. The app maps the hint (SELLER_PHONE_REQUIRED_HINT, src/lib/seller/contact-phone.ts).
-- Not covered (follow-up, docs/follow-ups/packet-1-phone-counts-product.md): a seller can still CLEAR the phone in
-- Mon compte after publishing.
create or replace function public.enforce_seller_contact_phone()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner uuid;
  v_phone text;
begin
  if (select auth.uid()) is null then
    return new;
  end if;
  if public.is_admin() then
    return new;
  end if;

  if tg_table_name = 'service_listings' then
    -- Only the publish moment: becoming 'active' (INSERT as active, or a status change into active).
    if new.status is distinct from 'active' then
      return new;
    end if;
    if tg_op = 'UPDATE' and old.status = 'active' then
      return new;
    end if;
    select fp.profile_id into v_owner from public.freelancer_profiles fp where fp.id = new.freelancer_profile_id;
  else
    v_owner := new.owner_id;
  end if;

  select p.phone into v_phone from public.profiles p where p.id = v_owner;
  if v_phone is null or btrim(v_phone) = '' then
    raise exception 'Ajoutez votre numéro de téléphone dans Mon compte : les clients vous contactent sur WhatsApp.'
      using errcode = '23514', hint = 'seller_phone_required';
  end if;
  return new;
end;
$$;

comment on function public.enforce_seller_contact_phone() is
  'Walk 2026-11-02 #17: a seller needs a contact phone (profiles.phone) to publish/reactivate a service (service_listings → active) or to create a shop. Fires only on those transitions; skips service role (auth.uid() null) and admins. Raises 23514, hint seller_phone_required — mapped by src/lib/seller/contact-phone.ts.';

-- Trigger names sort AFTER the trg_enforce_* integrity triggers on each table (BEFORE triggers fire alphabetically),
-- so « Seul un compte boutique… », the age gate, suspension and moderation locks still report first; on
-- service_listings it sorts BEFORE trg_service_publish_requirements (a phone-less publisher hears about the phone
-- first — the same order publishServiceDraftAction checks in).
create trigger trg_require_seller_phone_listings
  before insert or update of status on public.service_listings
  for each row execute function public.enforce_seller_contact_phone();

create trigger trg_require_seller_phone_shops
  before insert on public.shops
  for each row execute function public.enforce_seller_contact_phone();

-- Grants: none. A trigger function needs no EXECUTE (it is not checked when a trigger fires), and since migration 68
-- (default privileges closed) a new function gets EXECUTE for nobody but service_role.

/* ─── For the architect: confirm against the live DB before applying (no SQL access in the CC session) ─────────────
   • products constraints today: `select conname, pg_get_constraintdef(oid) from pg_constraint
     where conrelid = 'public.products'::regclass and contype = 'c';` — no products_price_positive /
     products_title_not_blank yet; re-count `price_tnd <= 0` and `btrim(title) = ''` = 0.
   • BEFORE triggers on service_listings and shops (names + order): `select tgname from pg_trigger where tgrelid in
     ('public.service_listings'::regclass, 'public.shops'::regclass) and not tgisinternal order by 1;`
   • public.is_admin() exists with no arguments.

   Post-apply live tests (db-guardian pass, then rename this file + README entry):
   • a phone-less freelancer's own client: draft → active = 23514 / seller_phone_required; hidden → active = same;
     active → hidden = ok; editing an active row's title = ok; INSERT as draft = ok.
   • the same with a phone: all ok. An admin client: un-hide ok without the owner's phone. Service role: ok.
   • shops INSERT by a phone-less shop_owner's own client = 23514 / seller_phone_required; with a phone = ok;
     a consumer's own client still gets « Seul un compte boutique… » (capability trigger first).
   • products: an owner's INSERT/UPDATE with price_tnd 0 or title '  ' = 23514 (products_price_positive /
     products_title_not_blank); the service role too.
   • suites h5-service-status-cascade, h6-service-listings-hardening-rls, seller-capability-integrity (their
     fixtures now seed a phone in this PR) stay green.

   ROLLBACK (not part of the migration):
   drop trigger if exists trg_require_seller_phone_listings on public.service_listings;
   drop trigger if exists trg_require_seller_phone_shops on public.shops;
   drop function if exists public.enforce_seller_contact_phone();
   alter table public.products drop constraint if exists products_price_positive,
                               drop constraint if exists products_title_not_blank;
*/
