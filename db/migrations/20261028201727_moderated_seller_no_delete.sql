-- A moderated freelancer profile or shop cannot be deleted by its owner (moderation evasion).
-- Founder ruling 5 (2026-10-28), Option A, on « MEDIUM — moderation is shed by deleting and re-creating the
-- freelancer profile (decision D4) » (docs/follow-ups/jobresponses-integrity.md; re-logged in
-- live-suite-teardown-guard.md « Moderated-freelancer read fix »). Standards-reference Section 3 A01 / A04.
--
-- Live before this migration (verified 2026-10-28): « Owner deletes own freelancer profile » and « Owner deletes
-- own shop » check only profile_id / owner_id = auth.uid(); enforce_admin_marker_lock is BEFORE UPDATE only. A
-- moderated freelancer with no orders DELETEs the profile and INSERTs a fresh one with admin_hidden_at NULL
-- (enforce_seller_capability passes) -- the moderation is gone, and migration 59's « not moderated » responder
-- check reads the new row. Same for a moderated shop. 0 moderated profiles / shops live; no row is rewritten.
--
-- After: a JWT caller's DELETE of a row with admin_hidden_at set is refused 42501 (hint `moderated`), admins
-- included (they only ever delete their OWN rows here: no admin DELETE policy). The message does not describe
-- the moderation (ModerationBanner's contract: the reason stays admin-internal). No-JWT callers bypass: the
-- service role, and the account-deletion cascade (profiles -> shops / freelancer_profiles runs as the
-- referential action of a service-role / auth-admin delete).
-- A trigger, not a policy predicate: a USING change would turn the refusal into a silent 0-row DELETE that the
-- app (and the owner) cannot tell from success.
-- Not covered (logged): a moderated PRODUCT / SERVICE listing can still be deleted and re-created by its owner
-- (item-level evasion; admin_hide_content also flips its status to 'hidden').

create or replace function public.enforce_moderated_row_no_delete()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
begin
  if (select auth.uid()) is null then
    return old;
  end if;
  if old.admin_hidden_at is not null then
    raise exception 'Ce contenu est en cours de modération et ne peut pas être supprimé. Contactez le support.'
      using errcode = '42501', hint = 'moderated';
  end if;
  return old;
end;
$function$;

-- P2-1: a trigger function needs no client EXECUTE.
revoke execute on function public.enforce_moderated_row_no_delete() from public, anon, authenticated;

create trigger trg_enforce_moderated_row_no_delete
  before delete on public.freelancer_profiles
  for each row execute function public.enforce_moderated_row_no_delete();

create trigger trg_enforce_moderated_row_no_delete
  before delete on public.shops
  for each row execute function public.enforce_moderated_row_no_delete();

comment on function public.enforce_moderated_row_no_delete() is
  'JWT callers cannot DELETE a freelancer_profiles / shops row while admin_hidden_at is set (42501 moderated): deleting and re-creating it would shed the moderation. Founder ruling 5, 2026-10-28.';

-- ─── ROLLBACK (do not run as part of this migration) ───────────────────────────────────────────
-- Per README "Rollback paths": apply as a NEW dated forward migration, never by deleting this file.
--
-- drop trigger if exists trg_enforce_moderated_row_no_delete on public.shops;
-- drop trigger if exists trg_enforce_moderated_row_no_delete on public.freelancer_profiles;
-- drop function if exists public.enforce_moderated_row_no_delete();
