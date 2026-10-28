-- orders.received_at: no client UPDATE grant (E2).
-- Follow-ups: « ✅ CLOSED (except E2) — MEDIUM — orders UPDATE: lifecycle columns stay writable after the
-- fact » (docs/follow-ups/security-audit-open-findings.md) and « received_at is stamped in app code only »
-- (open-closed-receivedat-...md): « Still owed: E2, revoke update (received_at) on orders from
-- authenticated, once #191 has merged. » #191 merged 2026-10-25. Standards-reference Section 3 A01.
--
-- Live before this migration (verified 2026-10-28): authenticated holds column UPDATE on received_at
-- (attacl authenticated=w). Migration 66's trg_enforce_order_lifecycle_columns stamps now() on the
-- transition into 'received' and silently DISCARDS any client value elsewhere, so the grant only lets a
-- client send a value the database then throws away. No app code writes received_at (grep 2026-10-28;
-- ProductOrders.test.tsx asserts the receipt payload omits it). INSERT stays: migration 66 handles it.
--
-- After: a client PATCH naming received_at is refused 42501 « permission denied for table orders »
-- instead of passing with the value dropped. The trigger stamp is unaffected (a trigger assignment is not
-- a privilege check). orders-lifecycle-columns.test.ts « a seller cannot plant received_at » asserts the
-- old silent pass and must flip to the 42501 when this is applied.

revoke update (received_at) on public.orders from authenticated;

-- ─── ROLLBACK (do not run as part of this migration) ───────────────────────────────────────────
-- Per README "Rollback paths": apply as a NEW dated forward migration, never by deleting this file.
--
-- grant update (received_at) on public.orders to authenticated;
