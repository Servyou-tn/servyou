# Admin PR-3 — Contenu (J4) + Litiges (J7) — deltas

Frames: Figma « NOV 4 — Admin » — dumps `docs/design/admin-j4-content-*`, `admin-j7-disputes-*` (on disk, untracked). No
Figma MCP read used. No 375 frame for either: cards / stacked columns below lg.

## Measured vs built (DOM probe, fixture route, 1440)

| Element | Frame | Built |
|---|---|---|
| J4 tabs | 129 · 131 · 133 · 133 · 187 × 44 | 128 · 130 · 133 · 133 · 186 × 44 |
| J4 filters | search FILL · 3 selects 190×40 | same |
| J4 rows | 77 (thumb 48), cols fill·200·80·140·110·40·110 | 77, same columns |
| J7 table row | 66, cols 80·170·fill·90 | 66 |
| J7 columns | main FILL + Décision rail 380, gap 24 | same (Décision 380×464) |

## Diff table (frame ≠ build)

| # | What | Class | Why |
|---|---|---|---|
| 1 | « #L-0007 » dispute number | DATA | No human number; shows the first 8 hex of the id (as « #R-… » in PR-1). |
| 2 | « Ouvrir la commande » | DATA | There is no admin order page yet (Commandes is still « Bientôt »). Left out. |
| 3 | Historique stamp « 28 oct. 10:12 » | DIFFERENT | The built order-timeline stamp `formatTunisDateTime` is kept (« 28/10 10h12 »). |
| 4 | « Travail marqué livré » | DIFFERENT | The built status label « Travail livré » is kept (order-status.ts). |
| 5 | J4 thumbnails | as drawn | The frame draws an icon placeholder; kept (no image read). |
| 6 | J4 « Catégories » | DATA | Options come from the categories present in the current tab (none for Boutiques / Profils freelance, so the select is hidden there). |
| 7 | J4 « N signalements » | DATA | Counts the open + under-review reports on each item. |
| 8 | J7 decision panel status pill | EXTRA | The selected dispute's status sits beside « Décision », with « Prendre en charge » (built) for an open one. |
| 9 | J7 « Motif » column | DATA | Shows the dispute description, or the reason label when there is none. |

## Decisions (defaults applied — please rule)

- **D1** J4 « Masquer » / « Réafficher » need no report: a new `src/app/admin/contenu/actions.ts` calls the same admin-gated `admin_hide_content` / `admin_unhide_content` functions as the report page (Zod → checkAdmin → RPC, audit row written by the function). Masquer asks for the moderation reason in a modal (the function requires it); Réafficher confirms. Unit-tested.
- **D2** J4 status vocabulary across five tables: Masqué (admin) > Brouillon (service draft / unpublished freelance profile) > Visible (active / open) > Inactif (seller-paused, sold out, filled, expired). Only Visible items link to their public page (the rest would 404).
- **D3** J7 is one screen: `/admin/litiges` selects the first dispute of the tab; `/admin/litiges/[id]` selects that one on its status tab. « Ouverts » = open + claimed, as for reports.
- **D4** J7 Décision: one note → the existing `resolveDispute(id, outcome, note)` (Donner raison à l'acheteur = sided_buyer, au vendeur = sided_seller, Proposer un accord = compromise) and `dismissDispute(id, note)`.
- **D5** The built order stepper (OrderLifecycleStepper) is replaced by the frame's Historique (from `order_events` plus the dispute itself). The order's cancellation reason is kept as a line on the order card. The resolve / dismiss forms are replaced by the Décision panel.
- **D6** The J7 disclaimer « ServYou ne rembourse pas … » is the drawn text (it states the opposite of a payment-protection claim).

## Questions

1. D6: keep the disclaimer as drawn?
2. Should « Proposer un accord » open a separate flow (an amount, a message), or stay a resolution with outcome « compromis » plus the note (today's DB model)?
