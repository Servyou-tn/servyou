# E4 buyer order detail (`feat/e4-order-detail-buyer`, 2026-10-29)

## Service orders: « no buyer cancel » is UI-only
**What:** `cancelOrderAction` and the DB both let a buyer cancel a SERVICE order; E4 (founder ruling) simply does not offer it.
**Why deferred:** pre-existing, and a rule change is a product + DB decision, not a page build.
**Where it lives:** `src/app/actions/orders.ts`, `src/lib/orders/buyer-order.ts` (`buyerCanCancel`).
**Trigger:** if services must truly be non-cancellable by the buyer, add a trigger/RLS rule (db-guardian) and drop the UI-only guard.

## `orders.carrier` is written by nothing
**What:** E4's « Société de livraison » reads « Non communiquée » on every real order; the history line « Expédiée avec {carrier} » is ready but never fires.
**Where it lives:** `TrackingPanel` (OrderPanels.tsx), `buyerEventLabel`.
**Trigger:** the G3/shop-settings PR that lets a seller record a carrier.

## ReportListingModal still carries its own dialog logic
**What:** `components/report/ReportListingModal` duplicates what `components/shared/ModalDialog` now provides (focus, scroll lock, backdrop press, focus restore).
**Trigger:** next touch of the report modal — move it onto `ModalDialog`.

## Mobile DOM order vs visual order
**What:** DOM = action → seller → product → delivery → tracking → history; the mobile frame's visual order puts the product before the seller. One pair differs.
**Trigger:** only if a11y review objects; the fix is moving the seller panel to follow the product in the DOM.

## Product received / cancelled states have no live fixture
**What:** verified by logic tests, not in a browser (no such product rows for the fixture buyer; creating one is a production write).
**Trigger:** next time a founder-approved fixture exists, gate those two states.
