-- Walk 2026-11-02 #17 follow-up (fix packet 1, #303): a seller who relies on the contact phone cannot CLEAR it.
-- Prepared by CC, NOT applied: the founder / architect applies it. The app enforces the same rule first
-- (updateProfileAction → sellerPhoneClearBlocked, src/lib/seller/contact-phone.ts, field error « Le numéro de
-- téléphone est requis… »); this makes it hold for every JWT caller (a direct PostgREST PATCH included).
--
-- The rule (same as the app): profiles.phone going from a stored value to NULL / blank is refused when the account is
-- a shop owner, or a freelancer with at least one ACTIVE service. Setting or changing a number, a consumer clearing
-- theirs, a freelancer whose services are all paused / drafts, and an account that never had a phone are untouched.
-- Skipped for auth.uid() null (service role, SQL editor, migrations, fixtures, account deletion by the service role)
-- and for admins — the enforce_seller_contact_phone (20261103190052) precedent. Raises 23514 with the SAME hint,
-- 'seller_phone_required', so the app maps it with SELLER_PHONE_REQUIRED_HINT.
--
-- Fires on UPDATE OF phone only — a profiles UPDATE that does not name phone (seller_type, avatar_url, …) never runs
-- it. Named trg_require_seller_phone_kept so it sorts after the trg_enforce_* triggers on profiles.
-- No grant: a trigger function needs no EXECUTE, and new functions get none by default (migration 68).
create or replace function public.enforce_seller_phone_not_cleared()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    return new;
  end if;
  if public.is_admin() then
    return new;
  end if;
  -- Only a stored number going empty.
  if old.phone is null or btrim(old.phone) = '' then
    return new;
  end if;
  if new.phone is not null and btrim(new.phone) <> '' then
    return new;
  end if;

  if new.seller_type = 'shop_owner'
     or (new.seller_type = 'freelancer' and exists (
           select 1
             from public.service_listings sl
             join public.freelancer_profiles fp on fp.id = sl.freelancer_profile_id
            where fp.profile_id = new.id and sl.status = 'active')) then
    raise exception 'Le numéro de téléphone est requis : les clients vous contactent sur WhatsApp.'
      using errcode = '23514', hint = 'seller_phone_required';
  end if;
  return new;
end;
$$;

comment on function public.enforce_seller_phone_not_cleared() is
  'Walk 2026-11-02 #17 follow-up: a shop owner, or a freelancer with an active service, cannot clear profiles.phone (stored → NULL/blank). Skips service role and admins. 23514, hint seller_phone_required — mirror of sellerPhoneClearBlocked (src/lib/seller/contact-phone.ts).';

create trigger trg_require_seller_phone_kept
  before update of phone on public.profiles
  for each row execute function public.enforce_seller_phone_not_cleared();

/* ─── For the architect ─────────────────────────────────────────────────────────────────────────────────────────────
   Confirm live: the BEFORE triggers on profiles (`select tgname from pg_trigger where tgrelid = 'public.profiles'::regclass
   and not tgisinternal order by 1;`) — no existing trigger named trg_require_seller_phone_kept.
   Affected today (2026-11-03): every shop owner has a phone; 1 of 10 freelancers has one (+ its active services);
   nothing is rewritten — the trigger only refuses a future clear.

   Post-apply live tests: a shop owner's own client PATCHing phone → null = 23514 / seller_phone_required; → a new
   number = ok. A freelancer with an active service: → null refused; after pausing every service: → null ok. A consumer:
   → null ok. An admin client and the service role: → null ok.

   ROLLBACK (not part of the migration):
   drop trigger if exists trg_require_seller_phone_kept on public.profiles;
   drop function if exists public.enforce_seller_phone_not_cleared();
*/
