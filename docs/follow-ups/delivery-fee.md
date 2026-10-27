# delivery_fee (`discovery/delivery-fee`, 2026-08-01)

Both entries surfaced during Phase-1 discovery for `delivery_fee_tnd`. Neither is caused by that
work and neither is fixed in it — logged per "one PR, one focus".

## 🔴 The BUYER's order detail reads the LIVE product price, not the snapshot

- `src/lib/marche/order-detail.ts` — the data layer behind `/mes-commandes/[id]` — selects
  `products ( id, title, price_tnd, shop_id, categories )` and **never reads `unit_price_tnd` or
  `item_title`**. Verified by grep: both column names are absent from the file.
- **So a buyer's past order already drifts.** Seller edits the price of a product from 80 → 120
  TND, and every historical order that buyer placed silently re-renders at 120. The order was
  never for 120. `set_order_snapshot` froze the correct value at insert; this surface just doesn't
  read it.
- The seller side does it right — `src/lib/marche/seller-orders.ts:230` reads
  `r.item_title ?? one(r.products)?.title ?? …`, snapshot first with the join as fallback. The
  asymmetry is the bug: the same order shows different money to the two parties once a price moves.
- **Why it matters for `delivery_fee_tnd`:** the fee is frozen onto `orders` by the same trigger
  for the same reason. Wiring the buyer's total off the `products` join would inherit this exact
  drift the moment a seller raises their rate — and on a COD invoice a wrong total is a wrong
  instruction to a carrier, not just a cosmetic slip.
- **Fix shape:** select `unit_price_tnd, item_title` (and later `delivery_fee_tnd`) in
  `order-detail.ts` and prefer them over the join, mirroring `seller-orders.ts`. Keep the join as
  fallback for the 10 pre-snapshot orders whose `unit_price_tnd` is NULL — `netProfitOf`'s
  null-gate reasoning at `seller-dashboard.ts:53` applies verbatim: a missing snapshot must not
  render as a confident 0.
- **Trigger:** whenever `/mes-commandes/[id]` is next touched, and necessarily BEFORE any buyer
  surface renders a delivery-fee total.

## The governorate is text inside `delivery_address` — a Phase 2 zone table cannot join on it

- `src/app/demander/[id]/actions.ts:92` writes
  `delivery_address: \`${address}, ${gov}\`  // governorate folded in (no dedicated column)`, and
  `order-detail.ts` splits it back out on the LAST `", "` against a `Set` of known values.
- It round-trips today, but it is a string, not a key. **Per-governorate delivery rates (Phase 2)
  need `orders.delivery_governorate` as a real column first** — a rate table cannot join a
  suffix-parsed address, and the parse is lossy the moment a street name itself ends in something
  that matches a governorate.
- The vocabulary is already there and typed: `GOVERNORATES` in `src/lib/tunisia-governorates.ts`
  (`value` / `fr` / `ar`), consumed at 5 call sites. Only the column is missing.
- **This does not block `products.delivery_fee_tnd`.** A flat per-product fee layers under a zone
  table cleanly: the table overrides at quote time, and the frozen `orders.delivery_fee_tnd`
  remains the record of what was actually charged. The point of logging it is that the zone work
  is not "just add a table" — it carries a schema change and a backfill of existing orders.
- **Trigger:** the per-governorate rate-table PR.

## 🔴 The AppShell topbar overflows the viewport at 375px — every shell page, not one

- **Measured on the G6 gate pass (2026-08-06).** At a 375×812 viewport, `document.scrollWidth` is
  **431px against a 375px viewport — 56px of horizontal overflow.** The outermost offender is the
  topbar's right-hand cluster, `div.flex.shrink-0.items-center.gap-4`, holding the Radix user-menu
  button and the 40px avatar.
- **It is the SHELL, not any one page.** The same 431px and the same offending element were
  measured on `/commandes-recues`, `/tableau-de-bord-vendeur`, `/mes-missions/nouvelle` and
  `/mes-produits/ajouter`. No page-level element appears in the offender list on any of them.
- ⚑ **This is why the earlier frontend audit recorded "380px 0-overflow".** That pass measured at
  **380px**, where it happens to fit. The defect sits between 375 and 380 — and 375 is the iPhone
  SE / iPhone mini width, i.e. the narrowest real device, on a platform that is 70%+ mobile.
- **Not fixed in the G6 PR.** The topbar is shared by 19+ routes; changing it is a shell PR with its
  own visual gate, not a line in a form PR.
- **Reproduce:**
  `node scripts/gate/authed.mjs --email <shop-owner> --route /tableau-de-bord-vendeur --width 375 --height 812 --eval <overflow-probe> --json`
- **Trigger:** the next shell/topbar PR, or any mobile-polish pass. Gate at **375**, not 380.
- **✅ RESOLVED — `fix/appshell-topbar-and-pitch-pages`, 2026-08-13.** `Topbar.tsx` below `sm` now
  renders the icon-only S-mark instead of the full wordmark (saves ~79px) and the icon cluster's
  gap tightens from 16px to 8px below `md` (saves 16px); both revert to the original at their
  breakpoint. Re-measured with the same `authed.mjs` command as above, plus `/marche/produits`,
  `/produits/[id]`, `/ma-boutique/creer`, and the two newly AppShell-migrated
  `/devenir-vendeur/{boutique,freelance}`: `scrollWidth == clientWidth` on all of them, FR and AR,
  at 375. Full writeup on the G4 entry above (same fix, not repeated here). S4 (the 65px-vs-64px
  height delta on the same component) remains open — out of this PR's stated scope.
