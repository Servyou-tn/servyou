# Buyer service-cancel rule + missions pref column — logged, not fixed (`feat/order-cancel-and-missions-pref`, 2026-10-29)

Ranked.

## 1. MEDIUM — `cancelOrderAction` returns the raw database message to the client
**What:** `src/app/actions/orders.ts`: `return { ok: false, error: updateError.message || t('common.error_generic', lang) }`.
Any trigger or constraint text reaches the UI as-is: the transition errors, `cancelled_by doit correspondre à votre
rôle (% attendu)`, and from now on the new rule's message. That breaks the "generic error, never the raw message"
rule, and in AR it shows French.
**Why deferred:** app-layer error handling is audit pass 2's scope (next). This PR only adds the DB rule.
**Trigger:** audit pass 2. Map known hints to keys and fall back to the generic error.

## 2. LOW — `src/components/CancelOrderModal.tsx` cancels orders straight from the browser
**What:** a browser-side `supabase.from('orders').update({ status: 'cancelled', … })` that skips `cancelOrderAction`
(and its Zod / role checks). After this migration the database refuses the one case that action alone blocked. Check
whether the component is still mounted anywhere. If it is, route it through the action. If not, delete it.
**Trigger:** audit pass 2 (it is the same "client write bypasses the action" class).

## 3. INFO — `email_missions_matching` has no UI or sender yet
**What:** the column exists so B5's Paramètres › Notifications toggle can save it. The writer lands with B5. No email
is sent on it at MVP (notifications are Phase 3+).
