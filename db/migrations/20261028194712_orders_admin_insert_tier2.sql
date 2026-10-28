-- orders INSERT: no is_admin() bypass of migration 54's tier 2.
-- Follow-up: « MEDIUM (Sonnet review of #76) — a JWT admin can still INSERT an order at any status »
-- (docs/follow-ups/live-suite-teardown-guard.md; README #76 « Not covered »). Same family as migration 76's
-- decisions 7 / 9a. Standards-reference Section 3 A01 / A04.
--
-- Live before this migration (verified 2026-10-28): enforce_order_insert_integrity returns before tier 2
-- when public.is_admin(). An admin buyer can therefore insert at 'received' / 'arrived' (with carrier and
-- tracking) -- a fake completed transaction on a real seller's item -- or at 'cancelled' with
-- cancelled_by = 'seller', pinning a cancellation on the seller (migration 76 normalises only the cancel
-- columns). 1 admin account, 16 orders; no row is rewritten.
--
-- After: a JWT admin follows tier 2 like any client -- 'pending' with every lifecycle column NULL
-- (42501 « Une commande est toujours créée en attente. »), the item must be live (23514), not their own
-- (23514). No-JWT callers (service role, fixtures) keep tier 1 only, unchanged. Consequence: migration 76's
-- « JWT INSERT at cancelled » branch of enforce_order_lifecycle_columns becomes unreachable from a JWT
-- (its decision 10 case disappears); it stays as defence in depth.
--
-- Re-created from its live definition with ONLY the admin early-return removed (migration 76's 9a pattern),
-- so every message and conjunct stays byte-identical. Raises if the live text differs.

do $do$
declare
  v_def   text := pg_get_functiondef('public.enforce_order_insert_integrity()'::regprocedure);
  v_block text := E'  if public.is_admin() then\n    return new;\n  end if;\n';
begin
  if (length(v_def) - length(replace(v_def, v_block, ''))) / length(v_block) <> 1 then
    raise exception 'admin bypass block not found exactly once -- live definition changed, aborting';
  end if;
  execute replace(v_def, v_block, '');
end
$do$;

-- CREATE OR REPLACE (inside pg_get_functiondef's text) keeps the owner and ACL (EXECUTE: postgres,
-- service_role only, per migration 68).

-- ─── ROLLBACK (do not run as part of this migration) ───────────────────────────────────────────
-- Per README "Rollback paths": apply as a NEW dated forward migration, never by deleting this file.
-- The removed block sat directly after the no-JWT early return (exactly one occurrence, verified live
-- 2026-10-28). Guarded like the forward block:
--
-- do $do$
-- declare
--   v_def    text := pg_get_functiondef('public.enforce_order_insert_integrity()'::regprocedure);
--   v_anchor text := E'  if auth.uid() is null then\n    return new;\n  end if;\n';
--   v_block  text := E'  if public.is_admin() then\n    return new;\n  end if;\n';
-- begin
--   if (length(v_def) - length(replace(v_def, v_anchor, ''))) / length(v_anchor) <> 1
--      or position(v_block in v_def) > 0 then
--     raise exception 'unexpected live definition -- aborting rollback';
--   end if;
--   execute replace(v_def, v_anchor, v_anchor || v_block);
-- end
-- $do$;
