# G8 — Commandes reçues (`feat/g8-commandes-recues`, 2026-07-28)

## The delivery documents are their own PR, gated on schema
- **What:** `bordereau de ramassage` (Figma `510:27851`) is a multi-order A4 pickup manifest;
  `bon de livraison` (`504:27094`) is its per-order sibling, produced from G9. Both are print
  documents (595×842 = A4 @72dpi, frames named « aperçu impression »).
- **Three of the six money/identity columns cannot be filled today:** `LIVRAISON` (no
  `delivery_fee` — the same gap that blocks G4's Bénéfice net), `TRANSPORTEUR` (no carrier column
  on `orders`; `shops.preferred_carriers` is a shop-level preference, not a per-slip choice), and
  `Réf. RAM-…` (no slip table or reference column). `TOTAL À ENCAISSER (COD)` follows from
  `delivery_fee`.
- **Approved production method (founder, 2026-07-28):** a dedicated route with `@media print` +
  `window.print()`. **No PDF dependency.** Revisit `pdf-lib`/puppeteer only if a bordereau must be
  emailed or archived — which is the same question as whether it is persisted, and that question
  is what decides whether `Réf.` needs a table.
- **Trigger:** after the schema PR (`delivery_fee` + carrier + slip reference).

## Multi-select on G8 is deferred with the documents
- The main frame (`489:25313`) bakes in a checkbox column and a "Tout sélectionner" header
  (`508:27221`), and the `sélection prêtes + bordereau` specimen (`508:27230`) adds a `bulkBar`.
  All of it exists to feed the bordereau.
- **Not built (founder call):** with the documents deferred, multi-select has no destination, and
  building it now would mean defining partial-failure semantics for a bulk transition nothing
  consumes. G8 ships the `filtre` specimen's layout (`490:25690`) — the same list without the
  checkbox column.
- **Trigger:** with the documents PR.

## Migrate the three buyer-side client writes onto `cancelOrderAction` / `advanceOrderAction`
- `mes-commandes/_components/OrdersList.tsx:279`, `components/ReceiptConfirmButton.tsx:33` (both →
  `received`) and `components/CancelOrderModal.tsx:81` (cancel) still write with a direct browser
  `supabase.update()`.
- `cancelOrderAction` was written **role-aware from the start** for exactly this: it derives
  `cancelled_by` from which side of the order the caller is on, so the buyer path needs no new
  action — only the call site changes. `components/CancelOrderModal.tsx` has **zero importers**
  today and can likely be deleted outright once E3's detail page adopts the new button.
- **Trigger:** the next E3/buyer-orders PR.

## `orders` has no per-step timestamps — wait time is `pending`-only
- The row's `waitTime` slot (Figma prop on `OrderActionRow` `488:24951`) wants "waiting since" per
  state, but `orders` carries only `created_at`, `updated_at`, `received_at`, `cancelled_at`.
  `updated_at` is the last touch of *anything* on the row, so deriving a per-state wait from it
  would print a confidently wrong number.
- **Shipped (founder call):** wait shows on `pending` only, computed from `created_at`; every
  other state shows nothing.
- **Fix:** add `accepted_at` / `prepared_at` / `dispatched_at` / `in_delivery_at` / `arrived_at`,
  or a normalised `order_status_events` table (which would also give G9 a real timeline — it
  currently has no source for one). **Trigger:** the schema PR.

## 🔴 Page `<title>` is hardcoded French on every route
- Found while AR-checking G8: the Arabic page serves `<title>Commandes reçues — Servyou</title>`.
  Not a G8 defect — **every** page does this (`export const metadata = { title: '…' }`, e.g.
  `mes-favoris/page.tsx:10`), so the leak is platform-wide and G8 deliberately did not diverge
  from the pattern on one page.
- **Fix:** replace the static `metadata` export with `generateMetadata()` reading `getLang()`, and
  add the titles to both dictionaries. ~20 routes, mechanical.
- **Trigger:** an i18n pass; worth doing in one sweep rather than per page.

## G9 needs a seller-scoped counterpart to `getOrderDetail`
- `lib/marche/order-detail.ts` re-checks `buyer_id === currentUserId` — it is the buyer's view and
  returns null for a seller. G9 needs the same shape scoped on `seller_id` (or the existing one
  taught a role). `parseDeliveryAddress()` and `parseServiceBuyerNote()` in that file are already
  role-neutral and reusable as-is. **Trigger:** the G9 PR (next).

## 🔴 GATE-DESIGN PRINCIPLE: a check that can pass without the feature running is not a gate
- **Three defects in one session all had the same shape** — a verification that stopped short of
  the observable behaviour, and passed:
  1. **`tsc` passed on a server→client boundary violation.** `SortSelect` took a
     `buildHref(value)` callback prop from a Server Component. Types were perfectly valid; a
     function cannot cross the RSC boundary, so the route returned **HTTP 500** at request time.
     Typecheck cannot see runtime serialization.
  2. **Grepping the RSC flight payload instead of loading the page.** `curl | grep` found the
     expected strings in the streamed payload and read as a pass — while the page itself was
     500ing. The flight stream contains content that never renders.
  3. **Measuring a dropdown trigger without opening the panel.** The G8 sort trigger measured
     correct against Figma and was signed off; the panel was a native OS list with **no
     `[role=menu]` in the DOM at all**. A closed dropdown always looks fine.
- **The principle:** if a check can pass while the feature is broken or absent, it is not a gate —
  it is a formality. Ask of every check: *what would have to be true for this to pass while the
  thing is still broken?* If there is an easy answer, the check is aimed at the wrong layer.
- **Concretely, for this codebase:**
  - `tsc` + `build` green is **not** evidence a route renders. Load it and assert the status code.
  - Grepping served bytes is **not** evidence of a render. Check the HTTP status first, and prefer
    a DOM read over a payload grep — the earlier `scrollbar-gutter` and G8 pill findings were only
    trustworthy because they were computed geometry, not string matches.
  - Measuring a control in its default state is **not** evidence about its other states. Open the
    panel, expand the row, seed the missing status. Three separate findings this session
    (`prepared` rendering no pill, the 56px topbar overflow appearing only when logged in, the
    sidebar scroller appearing only below ~616px) were invisible in the default state.
  - A **negative control** is the cheapest way to test the check itself: break the thing on
    purpose and confirm the check fails. Two of this session's controls were themselves broken —
    one injected a `2000px` div that flexbox shrank, one toggled `scrollbar-gutter` in the state
    where both values behave identically — and each returned a **false pass**.
- **Trigger:** when adding any gate, CI step, or "verified" claim to a PR report.
