-- orders: a BUYER cannot cancel a SERVICE order. Only the freelancer (the seller) can decline or cancel it.
-- Architect brief (2026-10-29) step 2a; founder ruling E4 (#233), whose server action (src/app/actions/orders.ts
-- cancelOrderAction) already refuses it: « The matching database rule is a separate DB PR » — this one.
-- Standards-reference Section 3 A01:2025 (Broken Access Control: a business rule enforced only in app code).
--
-- Why the app check is not enough: the buyer holds column UPDATE on orders.status / cancelled_by /
-- cancellation_reason, and RLS « Buyer or seller updates order » lets them update their own order, so a direct
-- PostgREST PATCH (or the older browser-side src/components/CancelOrderModal.tsx, which updates orders straight from
-- the client) skips cancelOrderAction entirely.
--
-- Live before this migration (verified 2026-10-29): check_order_status_transition (BEFORE UPDATE, row) lets either
-- party cancel any order type, from any non-terminal status, with cancelled_by = their role. 10 service orders
-- (pending 2, accepted 2, arrived 1, received 3, cancelled 2). The 2 cancelled ones were cancelled by their buyer.
-- They are terminal and are NOT touched (new writes only).
--
-- After: enforce_buyer_cancel_product_only (BEFORE UPDATE OF status, row). When a JWT caller who is the order's
-- buyer moves a 'service' order to 'cancelled', it is refused 42501, hint 'buyer_cancel_service', with the action's
-- own wording (buyerOrder.error_service_cancel). Unchanged:
--   * the seller's cancel of a service order;
--   * a buyer's cancel of a product order;
--   * every other transition;
--   * service role (auth.uid() is null).
-- A separate trigger, not a rewrite of check_order_status_transition: that function's other rules stay byte-identical.
-- It fires after trg_check_order_status_transition (name order), so a terminal order or a wrong cancelled_by keeps
-- its existing error. order_type cannot change on an update: it is not in authenticated's UPDATE grant (cancellation_reason,
-- cancelled_by, carrier, status, tracking_number), and enforce_order_identity_lock pins it too. So OLD.order_type is
-- the order's type.

create or replace function public.enforce_buyer_cancel_product_only()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Service role, SQL editor.
  if (select auth.uid()) is null then
    return new;
  end if;

  if new.status = 'cancelled'
     and old.status is distinct from 'cancelled'
     and old.order_type = 'service'
     and old.buyer_id = (select auth.uid()) then
    raise exception 'Une demande de service ne peut pas être annulée par le client. Contactez le freelance si besoin.'
      using errcode = '42501', hint = 'buyer_cancel_service';
  end if;

  return new;
end;
$$;

-- Trigger function: no client EXECUTE (not checked when a trigger fires).
revoke execute on function public.enforce_buyer_cancel_product_only() from public, anon, authenticated;

create trigger trg_enforce_buyer_cancel_product_only
  before update of status on public.orders
  for each row execute function public.enforce_buyer_cancel_product_only();

-- ─── ROLLBACK (do not run as part of this migration) ───────────────────────────────────────────
-- Per README "Rollback paths": apply as a NEW dated forward migration, never by deleting this file.
--
-- drop trigger if exists trg_enforce_buyer_cancel_product_only on public.orders;
-- drop function if exists public.enforce_buyer_cancel_product_only();
