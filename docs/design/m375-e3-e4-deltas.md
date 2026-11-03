# E3 « Mes commandes » + E4 « Détail de ma commande » — mobile 375 (`m375-e3-e4`)

Mobile batch 1, PR-A1 (two pages, one PR). Frames: `docs/design/m375-e3-commandes-dump.json` + `.png` (375 × 1164, Produits tab, third row
open) and `docs/design/m375-e4-commande-dump.json` + `.png` (375 × 2425, a product order at « Arrivée »). No Figma MCP read was used.
Routes `/mes-commandes` and `/mes-commandes/[id]`; components `src/app/mes-commandes/page.tsx`, `_components/OrdersTabs.tsx`,
`OrdersFilterBar.tsx`, `OrderAccordionRow.tsx`, `ProductOrdersList.tsx`, `src/app/mes-commandes/[id]/page.tsx`,
`_components/OrderPanels.tsx`, `BuyerOrderActions.tsx`.

Both pages already had a mobile layout, so this PR measures them against the exports and closes the gaps. Rule (as pages 1–8): the mobile
shell stays (header, search, grey page — it starts the content 24 down where the frame starts at 16, so every « Now » y below is the frame's
+ 8); `max-lg:` overrides only. **From `lg` both pages are unchanged**: stash + recapture against `main` on the same dev server — E3 Produits
and E3 Services (a row open) and E4 « Arrivée » at 1440 and 1100, E4 « En attente », « Reçue », « Annulée » at 1440, FR + AR: **0 differing
pixels in all 18**.

Geometry is read from the DOM at 375 (FR + AR, scrollbar hidden) on two temporary fixture routes (deleted before commit): E3 renders the real
tabs, filter bar and `ProductOrdersList` with the frame's six orders; E4 is a copy of the real page with only its auth + order read swapped for
a fixture order (four states). Both pages sit behind sign-in, so no live account and no live data were used.

## E3 — what changed, measured against the frame

| Frame node | Frame | Now (375) |
|---|---|---|
| `H1` | 22 Semi Bold / 28, **blue/800** | ✓ blue/800 (was text-primary) |
| `segmented` | **343** × 44 (FILL), pad 4, r10; segments hug **80 / 82**, h36, pad 0 12, **icons hidden** | ✓ 343 × 44, segments 79 / 82 (was a 214 track with 101 / 104 segments and their icons) |
| `Input` (search) | field **343 × 44**, pad 0 16, gap 8, 18 icon, **16** Regular placeholder; the instance's empty label row (21 + 8) above and helper row (8 + 16) below | ✓ 343 × 44 at y157 (= 149 + 8), text 16. It was **23 px tall**: `flex-1` collapsed it to its content in the column. The empty label / helper offsets are reproduced (mt 29 / mb 28) — see Q2 |
| `selRow` | two 168 × 40, gap 8, at y233 | ✓ 168 × 40 at y241 (labels: Q3) |
| `list` | rows 82 (header 81 + divider), gap 12, from y289 | ✓ from y297, pitch 94 (unchanged) |
| row `header` | pad 16, gap 12; thumb 48 **r8**; title 14 Semi Bold **/ 20**; sub 12 **/ 17**; price + pill gap 4; chevron 20 **blue/300** | ✓ thumb r8 (was 10), title line 20 (was 21), sub line 17 (was 16.8), chevron blue/300 (was text-muted). Price line stays 21: the shared `StatusPill` is 24 where the frame's is 25, and the extra 1 keeps the header at 81 (Q6) |
| row-3 `body` | pad 16, gap 16; actions **stacked, gap 8**: WhatsApp **311 × 36** with an 18 glyph, Confirmer 311 × 32 | ✓ WhatsApp 311 × 36 + 18 glyph (was a 199 wide label-only button), 8 apart (was 12) |
| `timeline` | 4 stages, 32 circles, labels 11 Medium | unchanged: the product chain has 7 stages and scrolls inside its strip (Q4) |
| `meta` | 12 / 17 muted | ✓ unchanged |
| `pagination` | ‹ 1 › + « Affichage 1 à 6 sur 6 » 13 muted, start-aligned | unchanged: the shared `Pagination` shows the caption only, centred, on a single page (Q1) |

The **Services tab** (no 375 export in this batch) shares the title, tabs, filter bar and row header, so it takes the same changes; its two
actions are now 8 apart like Produits' (its WhatsApp button was already 311 wide with the glyph). Measured at 375 FR + AR: no overflow.

## E4 — what changed, measured against the frame

| Frame node | Frame | Now (375) |
|---|---|---|
| breadcrumb | **none** | ✓ hidden below lg (was « Mes commandes › Commande #A4F729 ») — Q7 |
| `H1` | **22 Semi Bold / 28, blue/800** | ✓ 22 / 28 Semi Bold blue/800 (was 32 / 40 Bold text-primary, the desktop H1) |
| `StatusPill` | its own row, 16 under the H1 | ✓ y68 (= 60 + 8) (was beside the H1) |
| date | 14 secondary, 16 under the pill | ✓ 16 under the pill |
| root gap | **16** between every block | ✓ 16 (was 24 between the stepper and the panels) |
| `panel-stepper` | 343 × 428, pad 24 **stroke inside**; stepper a fixed **132** wide, **centred** (circles at x ≈ 121) | 343 × 428 ✓ (was 430); centred ✓ (was start-aligned in a 293 column), but it hugs its widest label — 121 in FR, so the circles sit at x 127, ~6 further in than the frame. Hugging keeps it centred whatever the AR label widths; a fixed 132 would not. Stepper rows, connectors and dates unchanged ✓ |
| every other panel | pad **24 / 16** with the stroke inside → content **311**; title 20 Semi Bold **/ 26** | ✓ content 311 (was 293), title line 26 (was 28) — Produit 366, Vendeur 309, Livraison 345, Suivi 208, Historique 222: **all equal to the frame** |
| `panel-action` | title · Confirmer 48 · Signaler 48 · **helper under the buttons** | ✓ helper under the buttons (was above them); the cancellation reason and the « Annuler la commande » link follow it. DOM order unchanged (the helper is not focusable). 297 tall vs 281: our helper is one line shorter (−21) and we show « Annuler la commande » (+37) — Q9 |
| `panel-produit` | title 16 Semi Bold **/ 25**; Total row **25** | ✓ 25 / 25 (were 26). Thumb: Q8 |
| `panel-client` | name 16 Semi Bold **/ 25**; disclosure 12 Medium **/ 17**; WhatsApp 48 with a **20 glyph** | ✓ 25, 17, glyph shown (was label only) |
| `panel-livraison` | fields **gap 12**; note **12** under the last field, r8, pad 12 12 12 16, blue/200 bar, label 12 / 17, text 14 **secondary** | ✓ gap 12 (was 16), note 12 under (was 16), r8, blue/200, text secondary (was primary) |
| `panel-historique` | entries 21 tall, gap 16 | ✓ every entry on one line now that the content is 311 (« Expédiée avec First Delivery · 19/07 11h20 » wrapped to 42 in 293) |

The Historique panel is the shared `OrderTimeline` (G9, H8): its 375 pad and title line are set from E4's wrapper
(`max-lg:[&>section]:…`), so the component file and its other consumers are untouched.

No horizontal overflow at 375 (FR + AR, both pages, E4 in all four states: `scrollWidth` 375).

## Every control at 375 (FR + AR)

| Page | Control | Goes to |
|---|---|---|
| E3 | Produits / Services | `/mes-commandes?tab=produits` / `?tab=services` |
| E3 | a row | opens / closes its body (`aria-expanded` true → false) |
| E3 | Statut | opens 9 options (Tous + 8 product statuses); a pick writes `?statut=` |
| E3 | Plus récentes | opens 4 sorts (FR « Plus récentes / Plus anciennes / Prix décroissant / Prix croissant », AR « الأحدث / الأقدم / السعر تنازليا / السعر تصاعديا ») |
| E3 | Rechercher | submits on Enter / blur → `?q=` |
| E3 | Contacter sur WhatsApp / Confirmer la réception / Annuler la commande | the phone reveal / the confirmation dialog / the cancel dialog (not submitted — they would write) |
| E3 | Voir le détail | `/mes-commandes/{id}` |
| E4 | Confirmer la réception | opens « Confirmer la réception ? » / « تأكيد الاستلام؟ » (not confirmed — it would write) |
| E4 | Signaler un problème | opens « Signaler un problème » / « الإبلاغ عن مشكلة » |
| E4 | Annuler la commande | opens « Annuler cette commande ? » / « إلغاء هذا الطلب؟ » |
| E4 | Contacter la boutique | the WhatsApp reveal (not clicked — it reads the seller's number) |
| both | the route itself, logged out | `/connexion` / `/connexion?next=/mes-commandes/{id}` (307) |

## Questions for the founder

1. **E3 pagination on one page.** The frame shows « ‹ 1 › » with the caption under it, start-aligned; the shared `Pagination` (every list
   page) renders only the centred caption when there is a single page. Not touched (shared component). Show the arrows on one page?
2. **E3 search spacing.** The frame's search is an `Input` instance whose empty label row and empty helper row push the field 45 below the
   tabs and the selects 40 below it. Reproduced as drawn. If that is an instance artefact, I tighten it to 16 / 12.
3. **E3 select labels.** The frame shows the placeholders « Statut » / « Trier » at 16; ours show the selected value (« Tous les statuts »
   / « Plus récentes ») at 14 — at 16 « Tous les statuts » truncates in a 168 select. Kept 14. The search placeholder also reads
   « Rechercher une commande… » where the frame says « Rechercher… » (text files not touched). Change either?
4. **E3 rail.** The frame's 4 stages (En attente · Acceptée · Livrée · Reçue) fit the row; a product order really walks 7, so ours scrolls
   sideways inside its strip (the decision in `docs/design/e3-produits-measurements.md`), with 12 labels (shared `OrderRail`) where the frame
   has 11. Keep?
5. **E3 extras not in the frame:** « Annuler la commande » and « Voir le détail » in an open row, and the package glyph in an empty thumbnail.
   Kept (existing decisions).
6. **StatusPill height.** The shared pill is 24 tall, the frame's 25 (line 17 vs 16). Not touched; the row keeps its 81 header.
7. **E4 breadcrumb.** The frame has none at 375, so it is hidden there: the only way back is the shell menu (or the browser). Add a
   « ‹ Mes commandes » crumb like E1 / E2's « ‹ Services »?
8. **E4 thumbnail.** The frame draws it **28 × 80** (desktop too, per `e4-order-detail-measurements.md`); ours stays 80 × 80. A Figma slip?
9. **E4 « Arrivée » panel.** The frame's helper reads « Confirmez seulement après avoir reçu et vérifié votre colis. La commande sera alors
   clôturée. » (ours: « Confirmez la réception une fois le colis en main et payé. En cas de souci, signalez-le. »), and its « Annuler la
   commande » layer is hidden, while ours shows it (a buyer may still cancel an arrived parcel, with a reason). Change the copy / hide the
   link at « Arrivée »?
10. **Arabic times reversed (every width, so desktop AR too — not changed here).** E4's Historique reads « 1809:12 07/ · » in AR instead of
    « 18/07 09h12 ». Same bidi class as E1 / E2 Q1; it lives in the shared `OrderTimeline` (G9, H8 too). Want it?
