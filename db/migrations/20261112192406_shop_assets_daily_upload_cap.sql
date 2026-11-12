-- Audit 2026-11-11 H4: shop logos and banners count toward the daily upload cap.
--
-- Live today (verified read-only 2026-11-12): public.enforce_daily_upload_cap() (trigger trg_limit_daily_uploads,
-- BEFORE INSERT on public.uploaded_objects, made in 20261031201742_listing_upload_caps) counts only
-- 'product-images', 'portfolio-media' and 'avatars'. A 'shop-assets' provenance row is never refused, so a script
-- calling the shop logo / banner upload actions in a loop can write without limit.
--
-- Change: 'shop-assets' joins the counted buckets, in BOTH the early-return test and the COUNT. A logo or banner upload
-- now uses one of the same 100 slots per rolling 24 hours as every other image. Everything else is unchanged: the body
-- is the live body with the two IN lists widened (backfilled rows still pass, same advisory lock, same 23514 + hint
-- daily_upload_cap, same French message).
--
-- Rows affected: none rewritten (new inserts only). Live counts at discovery: 2 shop-assets rows in total, 0 rows of
-- any capped bucket in the last 24 hours, so no account is at or near the cap when this applies.
--
-- Grants: none. The function stays a trigger function (EXECUTE is not checked when a trigger fires; the PUBLIC
-- default is revoked globally since migration 68). CREATE OR REPLACE keeps the existing owner and grants.
-- Client-write allow-list untouched.

create or replace function public.enforce_daily_upload_cap()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  -- Not auth.uid(): these rows are written by the service role (see 20261031201742). Only the backfill is exempt.
  if new.backfilled or new.bucket not in ('product-images', 'portfolio-media', 'avatars', 'shop-assets') then
    return new;
  end if;

  perform pg_advisory_xact_lock(hashtextextended('uploads.daily:' || new.owner_id::text, 0));

  select count(*) into v_count
    from public.uploaded_objects
   where owner_id = new.owner_id
     and bucket in ('product-images', 'portfolio-media', 'avatars', 'shop-assets')
     and created_at > now() - interval '24 hours';

  if v_count >= 100 then
    raise exception 'Vous avez envoyé 100 photos en 24 heures, le maximum.'
      using errcode = '23514', hint = 'daily_upload_cap';
  end if;

  return new;
end;
$$;

-- Post-apply verification:
--   1. select pg_get_functiondef('public.enforce_daily_upload_cap()'::regprocedure);
--      → both IN lists name 'shop-assets'.
--   2. select tgname from pg_trigger where tgname = 'trg_limit_daily_uploads';  → 1 row (trigger untouched).
--   3. src/__tests__/listing-caps-live.test.ts (live, 1 sign-in): the 101st row in 24 h is refused 23514 +
--      daily_upload_cap, now also for a shop-assets row; a backfilled row still passes.
--
-- Rollback (the 20261031201742 body, three buckets):
--   create or replace function public.enforce_daily_upload_cap()
--   returns trigger language plpgsql security definer set search_path = '' as $$
--   declare v_count integer;
--   begin
--     if new.backfilled or new.bucket not in ('product-images', 'portfolio-media', 'avatars') then
--       return new;
--     end if;
--     perform pg_advisory_xact_lock(hashtextextended('uploads.daily:' || new.owner_id::text, 0));
--     select count(*) into v_count from public.uploaded_objects
--      where owner_id = new.owner_id
--        and bucket in ('product-images', 'portfolio-media', 'avatars')
--        and created_at > now() - interval '24 hours';
--     if v_count >= 100 then
--       raise exception 'Vous avez envoyé 100 photos en 24 heures, le maximum.'
--         using errcode = '23514', hint = 'daily_upload_cap';
--     end if;
--     return new;
--   end;
--   $$;
