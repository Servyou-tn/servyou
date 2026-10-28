-- shops: one shop per owner.
-- Founder ruling 9 (2026-10-28) on « LOW — shops.owner_id is not unique »
-- (docs/follow-ups/security-audit-open-findings.md). Standards-reference Section 3 A04.
--
-- Live before this migration (verified 2026-10-28): the unique indexes on shops are the PK and lower(name);
-- shops_owner_idx (owner_id) is non-unique. A shop owner can POST several shops over REST (migration 55 checks
-- the capability, not the count), while the app assumes one (resolveOwnedShopId, G2's « already owns a shop »
-- check). Duplicates: 0 owners with more than one shop (1 shop in total) -- the index builds cleanly.
--
-- After: a second shop for the same owner fails 23505 on shops_owner_id_key, for every caller (service role
-- included -- the rule is a data invariant, not a client guard). Note: G2's createShopAction maps a 23505 to the
-- « name taken » copy (shops_name_lower_key); this index can only fire there on a double-submit race that the
-- action's own « already owns a shop » check lost, so the copy is wrong only in that race (logged, app side).
-- shops_owner_idx becomes redundant; it is kept (dropping an index is not this ruling).
-- A plain CREATE (not CONCURRENTLY): the table has 1 row, and CONCURRENTLY cannot run in a transaction.

create unique index shops_owner_id_key on public.shops (owner_id);

-- ─── ROLLBACK (do not run as part of this migration) ───────────────────────────────────────────
-- Per README "Rollback paths": apply as a NEW dated forward migration, never by deleting this file.
--
-- drop index if exists public.shops_owner_id_key;
