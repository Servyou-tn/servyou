-- orders: at most 5 PENDING orders per buyer per seller, and at most 20 orders per buyer per rolling 24 h.
-- Architect brief (2026-10-29) step 2, from the pre-launch security audit pass 1 finding 2
-- (docs/audits/prelaunch-security-audit-2026-10-29.md: « no per-user rate limit on COD orders »). Same pattern as
-- migration 99 (20261029183540_reports_anti_abuse). Standards-reference Section 3 A06:2025 (insecure design: no
-- anti-automation on a user-facing write).
--
-- Column check (verified live 2026-10-29) -- why no grant change is needed here, unlike migration 99:
--   * authenticated holds column INSERT on every orders column (created_at and status included), BUT
--     enforce_order_insert_integrity (BEFORE INSERT, migration 54 + ruling 8) already, for every JWT caller:
--     forces status 'pending' (anything else is 42501), sets created_at := now() (« the database's clock, never the
--     client's »), and replaces any client seller_id with the item's real seller (tier 1, every caller). So neither
--     the 24 h window nor the per-seller key can be steered by the client.
--   * This trigger must run AFTER that one, so the per-seller count reads the REAL seller_id: BEFORE ROW triggers
--     fire in name order, and trg_limit_orders sorts after trg_enforce_order_insert_integrity and
--     trg_enforce_order_lifecycle_columns (and before trg_set_order_snapshot, which it does not depend on).
--
-- Live before this migration (verified 2026-10-29): 16 orders (pending 5, accepted 2, prepared 1, arrived 2,
-- received 4, cancelled 2); the most pending orders any buyer has with one seller is 3, the most orders any buyer
-- filed in any 24 h is 2 -- nothing below rejects an existing pattern, and no row is rewritten.
--
-- After: enforce_order_rate_limit (BEFORE INSERT, FOR EACH ROW), for a JWT caller filing in their own name:
--   1. 5 orders still 'pending' between this buyer and this seller -> 23514, hint 'order_cap_seller'. Once the
--      seller accepts or either side cancels one, the buyer can order again (only 'pending' counts).
--   2. 20 orders by this buyer created in the last 24 h, every status -> 23514, hint 'order_cap_daily'.
--   Checked in that order (an order hitting both answers order_cap_seller). Service role / SQL editor
--   (auth.uid() is null) bypass. A row whose buyer_id is not the caller skips both counts and is left to RLS
--   (« Buyer creates own order », WITH CHECK buyer_id = auth.uid(), checked after BEFORE triggers) -- so the
--   trigger never reveals another user's order volume. A per-buyer advisory xact lock serialises count + insert.
--   The app maps both hints (FR + AR) in demander/[id]/actions.ts.

create or replace function public.enforce_order_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_pending integer;
  v_recent  integer;
begin
  -- Service role, SQL editor, seeds.
  if (select auth.uid()) is null then
    return new;
  end if;

  -- Filed in someone else's name: RLS refuses it (42501). Counting the claimed buyer here would leak their volume.
  if new.buyer_id is distinct from (select auth.uid()) then
    return new;
  end if;

  perform pg_advisory_xact_lock(hashtextextended('orders.rate:' || new.buyer_id::text, 0));

  select count(*) into v_pending
    from public.orders
   where buyer_id = new.buyer_id
     and seller_id = new.seller_id
     and status = 'pending';

  if v_pending >= 5 then
    raise exception 'Vous avez déjà 5 commandes en attente chez ce vendeur. Attendez qu''il en traite une avant d''en passer une autre.'
      using errcode = '23514', hint = 'order_cap_seller';
  end if;

  select count(*) into v_recent
    from public.orders
   where buyer_id = new.buyer_id
     and created_at > now() - interval '24 hours';

  if v_recent >= 20 then
    raise exception 'Vous avez atteint la limite de 20 commandes par 24 heures. Réessayez plus tard.'
      using errcode = '23514', hint = 'order_cap_daily';
  end if;

  return new;
end;
$$;

-- Trigger function: no client EXECUTE (not checked when a trigger fires).
revoke execute on function public.enforce_order_rate_limit() from public, anon, authenticated;

create trigger trg_limit_orders
  before insert on public.orders
  for each row execute function public.enforce_order_rate_limit();

-- ─── ROLLBACK (do not run as part of this migration) ───────────────────────────────────────────
-- Per README "Rollback paths": apply as a NEW dated forward migration, never by deleting this file.
--
-- drop trigger if exists trg_limit_orders on public.orders;
-- drop function if exists public.enforce_order_rate_limit();
