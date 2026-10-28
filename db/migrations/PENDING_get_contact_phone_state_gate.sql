-- get_contact_phone: no phone when either party is suspended, or when the only link is a moderated post.
-- Founder ruling 6 (2026-10-28) on « MEDIUM — admin-moderated job posts ... (READ half closed) » (the
-- get_contact_phone half, docs/follow-ups/jobresponses-integrity.md) and « LOW — suspending or moderating a
-- freelancer does not revoke the phone unlock they already hold ». Standards-reference Section 3 A01.
--
-- Live before this migration (verified 2026-10-28): get_contact_phone(target) returns target's phone when an
-- order or a job_responses row links caller and target, whatever their state: a freelancer who answered a post
-- that was later moderated still unlocks the poster's phone, and a suspended account keeps every unlock (and a
-- suspended poster's phone stays readable). 0 suspended accounts, 0 moderated posts live.
--
-- After (checked at CALL time, so it also withdraws unlocks granted earlier):
--   * the caller reading their OWN phone is unchanged (first branch);
--   * either party suspended -> NULL, on every branch (orders included);
--   * the two job_responses branches require the post not moderated (admin_hidden_at is null). Post status is
--     NOT checked: a filled post is the normal path to contact the chosen freelancer.
-- NULL, not an error: the function's contract is « NULL when there is no unlock », and a refusal must not tell
-- the caller that the other account is suspended (CLAUDE.md: messages never describe another account).
-- Body = live definition (2026-10-28) + the two conditions; search_path, volatility, SECURITY DEFINER kept.
-- CREATE OR REPLACE keeps the ACL (EXECUTE: anon, authenticated -- intentional, migration 68).

create or replace function public.get_contact_phone(target uuid)
returns text
language plpgsql
stable security definer
set search_path to 'public'
as $function$
DECLARE
  v_caller uuid := auth.uid();
  v_phone  text;
BEGIN
  IF v_caller IS NULL THEN RETURN NULL; END IF;

  IF v_caller = target THEN
    SELECT phone INTO v_phone FROM profiles WHERE id = target;
    RETURN v_phone;
  END IF;

  -- Either party suspended: no unlock, whatever links them (ruling 6, checked at call time).
  IF EXISTS (
    SELECT 1 FROM profiles
    WHERE id IN (v_caller, target)
      AND suspended_at IS NOT NULL
  ) THEN
    RETURN NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM orders
    WHERE (buyer_id = v_caller AND seller_id = target)
       OR (seller_id = v_caller AND buyer_id = target)
  ) THEN
    SELECT phone INTO v_phone FROM profiles WHERE id = target;
    RETURN v_phone;
  END IF;

  IF EXISTS (
    SELECT 1 FROM job_responses jr
    JOIN job_posts jp ON jp.id = jr.job_post_id
    WHERE jr.freelancer_id = v_caller
      AND jp.consumer_id = target
      AND jp.admin_hidden_at IS NULL
  ) THEN
    SELECT phone INTO v_phone FROM profiles WHERE id = target;
    RETURN v_phone;
  END IF;

  IF EXISTS (
    SELECT 1 FROM job_responses jr
    JOIN job_posts jp ON jp.id = jr.job_post_id
    WHERE jr.freelancer_id = target
      AND jp.consumer_id = v_caller
      AND jp.admin_hidden_at IS NULL
  ) THEN
    SELECT phone INTO v_phone FROM profiles WHERE id = target;
    RETURN v_phone;
  END IF;

  RETURN NULL;
END;
$function$;

-- ─── ROLLBACK (do not run as part of this migration) ───────────────────────────────────────────
-- Per README "Rollback paths": apply as a NEW dated forward migration, never by deleting this file.
-- Re-create the function with the body above minus the « Either party suspended » block and the two
-- `AND jp.admin_hidden_at IS NULL` lines (the live definition of 2026-10-28).
