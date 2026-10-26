# E3 « Mes commandes » — Produits tab: measurements and decisions

Frames: E3 Produits 1440 = `704:58976` (read once, 2026-10-26, session `555103d1…`), 375 = `706:59409` (**not read** — the budget was one read; the mobile layout is derived from the Services mobile frame `710:59945`, which this tab shares). The Services tab built from `709:59662` / `710:59945` is extended, not rebuilt. **Figma reads used: 1.**

## 1. What the frame says (read from `704:58976`)

Page shell, topbar, sidebar, page title (28/36 SemiBold `blue/800`), filter bar (search + Statut 148 + Trier par 148, gap 12) and pagination (« Affichage 1 à 6 sur 6 ») are **identical** to the Services frame — already built and measured; nothing re-measured.

| Element | Node | Measured | Built as |
|---|---|---|---|
| Segmented toggle | `704:59172` | track `surface/sunken`, pad 4, radius `lg`; segment h 36, px 12, radius `md`; **Produits first and selected** (white + `shadow/xs`), Services second `text/secondary` | `OrdersTabs`, now two links (`?tab=`) |
| Row (6 specimens) | `705:59339` … | header px 20 / py 16, gap 12, 1 px `border/subtle` divider | `OrderAccordionRow` (shared with Services) |
| thumb | `705:59341` | **48 × 48 square**, radius **8**, fill `surface/subtle`, 1 px `border/subtle` (empty in the frame) | product first image via `next/image`, `Package` glyph when none |
| middle | `705:59342` | title 15/22 SemiBold `text/primary` · **shop name** 13/18 Regular `text/muted` · date 12/17 `text/muted` (« 24 nov ») | same type ramp as Services |
| right | `705:59346` | price 15/22 SemiBold `blue/800` (« 2400 TND ») · StatusPill · chevron-down 20 | same |
| Expanded body | `704:59276` | pad 20, gap 16: timeline · actions (gap 12) · reference line 12/17 `text/muted` | same container |
| timeline | `704:59277` | 32 circles (completed `blue/600` + check · current white + 2 px `blue/600` ring + 10 dot · upcoming white + 1.5 px `border/strong`), 2 px connectors, labels 12/16 Medium | `OrderRail` (shared with G9) |
| actions | `704:59301` | WhatsApp Button `wa/brand` h 36 « Contacter sur WhatsApp » · primary sm h 32 « Confirmer la réception » | `WhatsAppContactButton` (sm = h 36) · `ConfirmReceipt` |
| reference | `704:59335` | « Commande #CMD-2024-0312 · Passée le 20 novembre 2024 » | `mesCommandes.ref` with `shortRef` |

Frame pills seen: « Livré » (success), « Acceptée » (blue), « En attente » (warning), « Reçue » (success), « Annulée » (danger). The frame has **no** specimen for Préparée / Expédiée / En livraison / Arrivée, no cancelled body, no empty state, no mobile frame.

## 2. Decisions (numbered, for the founder)

1. **D1 — smart default (architect ruling on #202, supersedes « default = Produits »).** An explicit `?tab=` is taken as given. Without it, `/mes-commandes` opens the tab of the buyer's **most recent order** (service or product); no orders → Produits (the frame's `selected=0`). The sidebar link, the dashboard quick action and old bookmarks (`?statut=` without a tab) all follow it, and `statut` is validated against the resolved tab. `/demander/succes` still links to `?tab=produits|services`.
2. **D2 — the rail walks the full 7-step product chain**, not the frame's 4 mock stages (En attente · Acceptée · Livrée · Reçue): a parcel is prepared, shipped, out for delivery and arrives; collapsing that hides where the order is. Labels are the shipped product ones (`common.status_*`, « Arrivée » not « Travail livré »). The 8th status, `cancelled`, is off the rail.
3. **D3 — the frame's « Livré » pill is not used**: it paints `arrived` green (`delivered`), identical to « Reçue »; the code keeps `arrivee` (blue), so a buyer can see at a glance that they still owe a confirmation (same ruling as the Services tab).
4. **D4 — cancelled orders drop the rail and show « Annulée par {vous | le vendeur} » + the stored reason.** Not in the frame; the reason is already in `orders.cancellation_reason` and a buyer whose order the shop cancelled should read why.
5. **D5 — buyer cancel**: a text link « Annuler la commande » while the order is non-terminal, through the existing role-aware `cancelOrderAction` (cancelled_by derived from the caller; a reason is required from `dispatched` on, as the DB trigger demands). Buyer reason presets are the keys the legacy buyer modal already shipped. The frame draws no cancel affordance; the Services tab's earlier « buyer cancellation dropped » follow-up is **not** closed by this (services keep the frame as built).
6. **D6 — the price is what the buyer pays**: snapshot unit price × quantity + the delivery-fee snapshot (`orders.delivery_fee_tnd`); the live product price is the fallback for pre-snapshot orders; no price shown when none is known. The frame shows one figure.
7. **D7 — `received_at` is never sent**: confirmation updates `{ status: 'received' }` only; the DB stamps the timestamp. Pinned by a test on the Produits call site.
8. **D8 — the reference is the shipped `#A4F729`**, not the frame's invented `#CMD-2024-0312` (no such column; ruling from the Services tab). `mesCommandes.ref` no longer carries its own `#` (it printed `##A4F729` on Services rows).
9. **D9 — « Voir le détail » is not rendered**: the accordion carries the detail in place (same as Services), and `/mes-commandes/[id]` stays the placeholder — E4 needs a Figma design first. If you want the link anyway it is one `<Link>` in the row body.
10. **D10 — mobile (derived)**: header folds shop + date into one line (as Services). The 7-step rail is ~540 px wide at 56 px a node, so below `lg` it scrolls sideways inside its own strip instead of overflowing the page (G9's seller rail has the same logged overflow, unfixed).
11. **D11 — unreadable product**: if RLS hides a product the buyer ordered (seller unpublished it), the order stays in the list with the snapshot title and no shop / image, never silently dropped.
12. **D12 — Arabic is a `REVIEW_AR_TRANSLATION` draft** for the 8 new keys.

## 3. Not done / logged

- Tracking (`carrier`, `tracking_number`) is not shown — not in the frame.
- Filtering/sorting run in memory after fetching all of a buyer's product orders (PostgREST caps at 1000), as the Services tab and H8.
