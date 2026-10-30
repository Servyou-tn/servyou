# Buyer service-cancel rule + missions pref column — logged, not fixed (`feat/order-cancel-and-missions-pref`, 2026-10-29)

Ranked.

## 1. ✅ CLOSED in this PR — `cancelOrderAction` returned the raw database message to the client
Architect brief 2026-10-29 (« fold in if small »). It now answers `t(cancelErrorKey(updateError))`
(`src/lib/orders/cancel-error.ts`): hint `buyer_cancel_service`, and `check_order_status_transition`'s « raison
requise » / « terminée » refusals, map to their FR + AR keys. Everything else gets the generic error.

## 2. ✅ CLOSED in this PR — `src/components/CancelOrderModal.tsx` cancelled orders straight from the browser
Mounted nowhere: `grep -rn "CancelOrderModal" src .storybook` finds only comments, and no import site. Deleted. The
live cancel UI is `components/orders/CancelOrderButton.tsx`, which calls `cancelOrderAction`.

## 3. MEDIUM — the same raw-message pattern is still in two other order actions
✅ CLOSED — PR #242 (`9c99153`, 2026-10-29): `advanceOrderAction` / `setOrderTracking` map known refusals
(`advanceErrorKey`, `trackingErrorKey`), otherwise the generic error; the raw text is only logged.
**What:** `advanceOrderAction` and `setOrderTracking` (`src/app/actions/orders.ts`) still return
`updateError.message || t('common.error_generic')`. The file header calls this deliberate (« surfaced verbatim »),
but it shows French trigger text on the AR site. `check_order_status_transition` messages can also name the expected
role.
**Why deferred:** the brief named `cancelOrderAction` only.
**Trigger:** audit pass 2. Same treatment: map known refusals, otherwise the generic error.

## 4. LOW — two more buyer-side order writes still go straight from the browser
**What:** the actions header names `OrdersList.tsx` and `ReceiptConfirmButton.tsx` as « correct-but-unmigrated »
client `.update()` calls. The database guards them (RLS + transition trigger), but they skip Zod and the action's
error mapping.
**Trigger:** audit pass 2. Check whether each is still mounted, then route through an action or delete it.

## 5. INFO — `email_missions_matching` has no UI or sender yet
**What:** the column exists so B5's Paramètres › Notifications toggle can save it. The writer lands with B5. No email
is sent on it at MVP (notifications are Phase 3+).
