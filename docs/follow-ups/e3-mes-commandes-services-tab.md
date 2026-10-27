# E3 — Mes commandes, Services tab (`feat/e3-mes-commandes-services`)

## Three things the accordion design drops — all candidates for reviving `/mes-commandes/[id]`
Founder direction: `/mes-commandes/[id]` stays a ComingSoon stub rather than being deleted or
redirected, precisely because these three land there later. Deleting it now would mean rebuilding
the route, its i18n block (`fr.ts` / `ar.ts`, "Order detail page") and its `active-route` entry.

1. **Buyer cancellation has no surface, though the DB permits it.**
   `check_order_status_transition` lets a buyer cancel from any non-terminal state
   (`pending` / `accepted` / `arrived`) with `cancelled_by='buyer'`, plus a
   `cancellation_reason` once the order is at `accepted` or later. The Figma body
   (709:59730) offers only WhatsApp + "Confirmer la réception". `CancelOrderModal.tsx`
   already exists and has **zero importers**.
2. **The buyer's own brief is absent, though it is the substance of a service order.**
   E1 collects description / délai / budget, E2 displays them, and `getOrderDetail`
   already unfolds all three from `buyer_note`. The accordion body shows none of it — the
   buyer cannot re-read what they asked for.
3. **Cancelled rows have no designed body.** row-6 (`annulée`) is collapsed-only in both
   frames, so `cancellation_reason` and `cancelled_by` (already bilingual as
   `common.cancelled_by_buyer` / `_seller`) have nowhere to render, and the 4-stage rail has
   no cancelled representation. This build keeps a body for cancelled orders but renders it
   SUBTRACTIVELY — WhatsApp + reference only, no rail, no confirm — rather than inventing one.

## Order reference is a truncated uuid, not a sequence
- Figma meta (709:59733) reads "Commande #CMD-2024-0318". `orders` has 18 columns and **no
  order-number column** — the PK is a bare uuid, so that string has no data source.
- Founder call: **no migration.** Render the uuid's first 8 chars ("Commande #3cf896e1 · Passée
  le 20 novembre 2024") — unique, stable, already exists, zero DB work for a cosmetic string.
- **Trigger:** if support ever needs a human-quotable reference (phone/WhatsApp support reading an
  order number aloud), add a `CMD-{year}-{seq}` generated column. Until then the short uuid is
  strictly better than a migration.

## Two deliberate divergences from Figma 709:59662 — fix the FIGMA, not the code
1. **Label for `arrived`.** The frame says "Livrée" in the rail and "Livré" in the pill — two
   spellings of the same state, in the same frame. The shipped i18n already has
   `common.status_arrived_service` = "Travail livré" / "العمل مُسلَّم", which is correct for a
   service (work delivered, not a parcel) and exists in both locales. Code uses the shipped
   string. **Changing shipped, bilingual i18n to match a Figma authoring bug is backwards.**
2. **Tone for `arrived`.** The frame uses StatusPill `delivered` → tone `success` (green). But
   `reçue` is ALSO `success`, so two adjacent lifecycle states render identically and the buyer
   cannot see at a glance whether they still owe a confirmation. Code uses `arrivee` → tone
   `info` (blue). **Green means done.**
- **Trigger:** next Figma pass on E3 — fix the gender mismatch and repaint the pill.

## The `received` rail renders all four stages completed — a documented choice
- Figma 709:59662 only ever mocks the `arrived` row, so **there is no frame showing what a
  finished order's rail looks like**. This is a decision, not a measurement, and it is recorded
  here because nothing in the design can be pointed at to justify it.
- **Decision (founder, 2026-07-27): a terminal state owes nothing.** `received` renders every
  stage — including "Reçue" itself — in the `completed` treatment (blue-600 fill + white check),
  and the connectors all read `border-strong`.
- **Why not `current` on stage 4:** the `current` treatment (white circle, 2px blue ring, blue
  dot) is the rail's signal for *"you are here, something is outstanding"*. On a received order
  it would imply an action the buyer still has to take, when `check_order_status_transition` has
  already closed the row — `received` is terminal and raises on any further transition.
- Verified across all four states against 709:59712 / 59717 / 59722 / 59727; the other three
  match the frames exactly. Implemented in `stageState()`
  (`src/app/mes-commandes/_components/order-status.ts`).
- **Trigger:** if E3 ever gets a `received` frame in Figma, reconcile against it — and if the
  design disagrees, this reasoning is what has to be argued with.

## `refresh-registry.js` validation cannot detect a screens-less scan
- The wrapper "REFUSES to overwrite a good registry with an error/empty scan", but its guard only
  checks `variables >= 50`. A transient CDP hiccup mid-scan produced a registry with **0 screen
  frames** and an `ERROR reading components` line, and it was written over the good file anyway
  (recovered by re-running once the bridge settled).
- **Fix:** extend the guard to also require a plausible `screen frames` count and to reject output
  containing `ERROR reading`.
- **Trigger:** next time that script is touched. Note both `scripts/figma/` and
  `docs/design/figma-registry.md` are UNTRACKED, so this is a local-tooling item.

## `globals.css` is shared with Storybook — bare element selectors there hit all 32 VRT baselines
- **What happened:** the E3 expand-reflow fix first landed as `html { scrollbar-gutter: stable }`
  in `src/app/globals.css` (`3f42247`). `.storybook/preview.ts:4` imports that file **by design**
  (stories must render through the real F1 token chain), so the rule also applied to every story
  iframe and shifted **all 16 desktop VRT baselines** — max **0.697%** against a **0.05%** gate.
  Storybook renders isolated components on a centred canvas with no page to scroll: there was no
  shift to prevent there, only 15px narrower snapshots forever, for an app-layout reason.
- **Resolution:** the declaration moved to a `[scrollbar-gutter:stable]` class on the app's root
  element in `src/app/layout.tsx`, which Storybook never renders. Same computed result in the app
  (verified: `getComputedStyle(document.documentElement).scrollbarGutter === 'stable'`), zero
  reach into stories.
- **The general rule:** `globals.css` is not app-only. A bare element selector (`html`, `body`,
  `a`, `ul`…) added there is a **global change to the component gate as well**. App-layout
  concerns belong on an app-owned element/class; only tokens and genuinely universal resets
  belong in the shared file. A `@layer`/`:root`-scoped custom property is safe; a styled element
  selector is not.
- **Fix (optional hardening):** either give Storybook a preview stylesheet that imports only
  `src/styles/tokens.css`, or add a lint/CI check that fails on new bare element selectors in
  `globals.css`. Neither was done here — the one-line placement fix is enough for this defect and
  the split-stylesheet change would need its own re-baseline.
- **Trigger:** next time anything is added to `globals.css` outside `@theme`/`:root`.
