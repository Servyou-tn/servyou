-- A moderated product or service listing cannot be deleted by its owner (item-level moderation evasion).
-- Founder ruling 5a (2026-10-28) on the item-level gap logged by batch 2 (docs/follow-ups/
-- security-followups-batch-2.md « LOW — item-level moderation evasion »): migration 20261028201727 refused the
-- DELETE of a moderated freelancer profile / shop; an owner could still delete a moderated product / service and
-- re-create it unmoderated. Standards-reference Section 3 A01 / A04.
--
-- Live before this migration (verified 2026-10-28): « products » / « service_listings » DELETE policies check
-- ownership only; trg_enforce_moderated_row_no_delete exists on shops and freelancer_profiles only. 0 moderated
-- products / services live; no row is rewritten.
--
-- After: the same trigger function (unchanged; it reads only OLD.admin_hidden_at) on products and
-- service_listings. A JWT caller's DELETE of a moderated item is refused 42501 (hint `moderated`); the app maps the
-- hint (deleteProductAction / deleteServiceAction -> *.error_delete_moderated, approved wording). No-JWT callers
-- (service role, account deletion) bypass.
-- Consequence, by design: deleting the PARENT under a JWT (a shop / freelancer profile that is not itself
-- moderated) cascades to its items under the same JWT, so a parent holding a moderated item cannot be deleted
-- either -- otherwise the parent delete would be the new evasion path. No app path deletes a shop or a freelancer
-- profile today.

create trigger trg_enforce_moderated_row_no_delete
  before delete on public.products
  for each row execute function public.enforce_moderated_row_no_delete();

create trigger trg_enforce_moderated_row_no_delete
  before delete on public.service_listings
  for each row execute function public.enforce_moderated_row_no_delete();

comment on function public.enforce_moderated_row_no_delete() is
  'JWT callers cannot DELETE a freelancer_profiles / shops / products / service_listings row while admin_hidden_at is set (42501 moderated): deleting and re-creating it would shed the moderation. Founder rulings 5 and 5a, 2026-10-28.';

-- ─── ROLLBACK (do not run as part of this migration) ───────────────────────────────────────────
-- Per README "Rollback paths": apply as a NEW dated forward migration, never by deleting this file.
--
-- drop trigger if exists trg_enforce_moderated_row_no_delete on public.service_listings;
-- drop trigger if exists trg_enforce_moderated_row_no_delete on public.products;
-- comment on function public.enforce_moderated_row_no_delete() is
--   'JWT callers cannot DELETE a freelancer_profiles / shops row while admin_hidden_at is set (42501 moderated): deleting and re-creating it would shed the moderation. Founder ruling 5, 2026-10-28.';
