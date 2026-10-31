-- Freelancer links: at most 5 per freelancer profile, enforced in the database (founder decision 2026-11-01; the
-- app cap was 3 with no DB guard). Same shape as migration 105 (image_count_caps): BEFORE INSERT, SECURITY DEFINER,
-- empty search_path, a per-profile advisory lock so two concurrent saves cannot both pass the count, 23514 + hint
-- `freelancer_links_cap`, service role bypassed (auth.uid() is null: seeds, admin tooling).
--
-- H3's save (applyProfileSave) deletes the profile's links, then inserts the new set in ONE multi-row statement. A
-- BEFORE ROW trigger sees the rows the same statement already inserted, so a set of 5 passes and a set of 6 is refused
-- whole (the statement is atomic) — the count is exact for that path.
--
-- Live on 2026-11-01: freelancer_links holds 0 rows (max per profile 0; profiles over 5: 0), so nothing existing is
-- rejected. Only trigger today: trg_enforce_active_user. freelancer_links_freelancer_profile_idx serves the count.
-- UPDATE is not capped: a row can only stay on its owner's single freelancer profile (owner-scoped policies, one
-- profile per account).

create function public.enforce_freelancer_links_cap()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  if (select auth.uid()) is null then
    return new;
  end if;

  perform pg_advisory_xact_lock(hashtextextended('freelancer_links.cap:' || new.freelancer_profile_id::text, 0));

  select count(*) into v_count
    from public.freelancer_links
   where freelancer_profile_id = new.freelancer_profile_id;

  if v_count >= 5 then
    raise exception 'Ce profil a déjà 5 liens, le maximum.'
      using errcode = '23514', hint = 'freelancer_links_cap';
  end if;

  return new;
end;
$$;

create trigger trg_limit_freelancer_links
  before insert on public.freelancer_links
  for each row execute function public.enforce_freelancer_links_cap();

-- Trigger functions need no EXECUTE grant; the PUBLIC default is revoked globally (migration 68). No grant changes
-- (client-write allow-list untouched).

-- Post-apply verification:
--   1. select tgname from pg_trigger where tgname = 'trg_limit_freelancer_links';  → 1 row
--   2. src/__tests__/freelancer-links-cap-live.test.ts (live, 1 sign-in): 5 links in one insert pass, the 6th is
--      refused 23514 + freelancer_links_cap, 6 in one insert are refused whole, the service role is not capped.
--
-- Rollback:
--   drop trigger trg_limit_freelancer_links on public.freelancer_links;
--   drop function public.enforce_freelancer_links_cap();
