-- enforce_seller_capability: refuse a row owned by someone else BEFORE reading their profile.
-- Follow-up: « LOW — migration 55 locks the target owner's profile row before RLS rejects a foreign write »
-- (docs/follow-ups/security-audit-open-findings.md), incl. its 2026-10-23 note « Can leak more than
-- seller_type ». Migration 59's enforce_job_responder_capability already has this fail-closed-first shape.
-- Standards-reference Section 3 A01.
--
-- Live before this migration (verified 2026-10-28): for a signed-in non-admin, the function reads the NEW
-- owner's profiles row FOR SHARE and raises a capability message about THAT account before RLS's WITH
-- CHECK (owner_id / profile_id = auth.uid()) rejects the foreign row. So any account can (a) briefly lock
-- any profile row and (b) learn from the message whether the named account is a shop owner / freelancer
-- and -- for a mixed account -- whether it owns the other capability's row (private while a freelancer
-- profile is unpublished). 0 mixed accounts live; no row is rewritten.
--
-- After: a JWT non-admin naming another account gets 42501 « Vous ne pouvez créer ce contenu qu'en votre
-- propre nom. » (hint not_self) with no read of that account. Own-row behaviour, admin and no-JWT bypasses,
-- messages and the FOR SHARE serialisation are unchanged. Body = live definition (2026-10-28) + the one
-- check; search_path kept as live ('public') so nothing else moves.

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

  -- Fail closed first: never read (or lock) another account's profile on a write RLS will refuse anyway.
  if v_owner is distinct from auth.uid() then
    raise exception 'Vous ne pouvez créer ce contenu qu''en votre propre nom.'
      using errcode = '42501', hint = 'not_self';
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

-- CREATE OR REPLACE keeps the owner and ACL (EXECUTE: postgres, service_role only, per migration 68).

-- ─── ROLLBACK (do not run as part of this migration) ───────────────────────────────────────────
-- Per README "Rollback paths": apply as a NEW dated forward migration, never by deleting this file.
-- Re-create the function with the body above minus the « Fail closed first » block (that is the live
-- definition of 2026-10-28, from migration 20261023182532_seller_capability_integrity).
