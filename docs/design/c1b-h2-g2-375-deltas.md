# C1 Boutiques + H2 + G2 at 375 — diff, kept, questions

Frames (exports in this folder): C1 Boutiques 1595:28748 (`m375-c1-boutiques`) · H2 1440 466:20159 (`h2-step1-1440`) ·
H2 375 1488:59688 / 1593:25904 / 1593:26069 / 1593:26180 (`m375-h2-step1/2/3/succes`) · G2 375 1593:26283 / 1593:27073
(`m375-g2-step2/succes`). **G2 step 1 (1488:64715) has no export** — not built (Q1).

## Built (below lg / sm only)

| Screen | Change | File |
|---|---|---|
| H2 steps 1–3, G2 step 2 | Header: breadcrumb 14 Medium muted (both crumbs), gap 8, chevron 14 · H1 32 Bold / 38 · subtitle 14 secondary, 8 under · stepper → box 20 · box pad 24/16 | the 4 step forms |
| H2 step 1 | Avatar 80 (120 from sm), empty and uploaded alike | `AvatarField.tsx` |
| H2 step 3 | Accordion rows 100 tall (drawn fixed 311×100, pad 20/24) | `details/_components/AccordionSection.tsx` |
| G2 step 2 | Accordion header pad 20/24, title 20 Semi Bold / 26 (`px-4 … sm:px-6` → `px-6`: same 24 from sm) | `configuration/_components/AccordionSection.tsx` |
| H2 + G2 succès | The wizard header above the card (existing keys; the title is a `<p>`, the card title stays the h1) · card pad 40/16, gap 20 · circle success/100 · title 24 Bold text/primary · body 16/26 secondary | both `succes/page.tsx` |
| C1 Boutiques | The shared « Marketplace » + sunken search band (`MarketplaceMobileHeader`, reused unchanged, `vue=boutiques` kept); toggle 4 under it; the bar's own search hidden below lg (its dropdowns stay, Q2) | `BoutiquesLens.tsx`, `BoutiquesFilterBar.tsx` |
| H2 1440 phone field | Already as drawn (280, asterisk, « +216 \| », helper) — no change | — |

## Kept as built

Texts that differ from the frames (« Titre » helper, placeholders) · the phone shown as stored (« 55123456 ») · native
selects · G2's « Retour à Modifier ma boutique » link · the H2 « only you can see it » note · the shop-card heart · the
step footers (not drawn) · G2 « Catégories de la boutique » wraps to 3 lines (our Inter is wider than Figma's).

## Questions (standing defaults applied)

1. **G2 step 1 (1488:64715)**: no export on main. Send it, or allow one Figma MCP read. Until then `CreateShopForm` is
   untouched, so step 1's header differs from step 2's at 375.
2. **C1 filters on mobile**: the frame draws no Catégorie / Ville / Trier par. Kept (dropping them removes filtering on
   phones). Drop, or move them behind a « Filtres » sheet?
3. **C1 shop card**: the frame shows 3 thumbnails with « Voir la boutique » under them; `ShopCard` (shared with
   /mes-favoris) shows 4 and the link beside the 4th. Change `ShopCard` below sm?
4. **C1 cards**: no pagination caption drawn at 375 — kept (`Pagination` shared).
5. **H2 succès « Voir mon profil public »**: drawn 40 tall; kept 48 (the 44 px touch-target rule).

Controls: tsc · eslint · desktop 0 px (full set, 9 screens × 1440 + 1100 × FR + AR) · 375 FR side by side · AR spot check.

## Founder answers (2026-11-04, after #314)

Q1 G2 step 1 export sent → built in PR-B4 · Q2 keep the Boutiques filters on mobile · Q3 keep 4 thumbnails, `ShopCard`
stays shared and unchanged · Q5 keep 48 px.
