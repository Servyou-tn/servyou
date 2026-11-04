# H8 engagement detail + H6 « Créer un service » at 375 — measurements, diff, decisions

Frames (founder exports in this folder, PNG + dump):

| Screen | Frame | Export |
|---|---|---|
| H8 detail, 1440 | 1596:40690 | `h8-engagement-1440` |
| H8 detail, 375 | 1596:41132 | `m375-h8-engagement` |
| H6 steps 1–5, 375 | 1488:59392 · 1594:27724 · 1594:27846 · 1594:27978 · 1594:28113 | `m375-h6-step1` … `step5` |

No Figma MCP read was used: everything below comes from the dumps (`flat.js` trees) and pixel samples of the PNGs.

## 1. H8 — /mes-engagements/[id]

The page was built in H8 PR-2 without a frame (G9 mirror). The frames are new, so desktop may change.

### Measured (1440 / 375)

| Part | 1440 | 375 |
|---|---|---|
| content | pad 32, gap 32 (topGroup → twoCol) | root pad 20/16/32, gap 20 |
| topGroup | gap 24 (header → stepper panel) | same |
| header | gap 12; breadcrumb Medium 14, gap 8, chevron 14, « Mes engagements » blue/600, « #A4F729 » text/primary | same |
| titleRow | H1 32 Bold + StatusPill (gap 12) · date body-sm secondary at the end | column: H1, pill (drawn 343 wide), date — gap 12 |
| panels | surface/base, border/subtle, r 12, pad 24, gap 16 | pad 24/16 |
| stepper | « Order Stepper » 544×77, 4 columns, circle centres 162 apart, 32 circles, 14 px labels (current Semi Bold blue/600, upcoming muted), connector blue/600 behind a completed stage, border/strong ahead; date layer hidden | vertical: 4 nodes 311×56 (circle above label, centred), gap 12, no connector, no date |
| twoCol | main 752 + rail 360, gap 24; columns gap 16 | one column, gap 20 (main → rail), 16 inside |
| service | thumb 28×80 (surface/sunken, border/subtle, r 8, icon-package 28) · gap 16 · title Semi Bold 16 · price body-sm secondary | thumb 28×28 |
| request | fields gap 12; noteQuote surface/subtle, **3 px blue/200 start rule** (sampled), r 8, pad 12/12/12/16; caption Medium 12 muted; text body-sm secondary; budget/timeframe labels body-sm **muted**, values body | budget and timeframe stacked, gap 12 |
| client | name Semi Bold 16 + city body-sm muted (gap 4), **no avatar**; disclosure Caption 12 Medium muted; WhatsApp lg 48 with the 20 glyph | same |
| action | Button lg; hint body-sm **secondary**; « Annuler la commande » body-sm danger | same |

### Built in this PR (page-local, `src/app/mes-engagements/[id]/page.tsx`)

Breadcrumb style · gaps 32/24/12 (20 below lg) · panel pad 24/16 below lg · stepper in OrderRail's existing
`look="detail"` (E4's opt-in: 162 px columns for 4 stages, 14 px labels, blue connector, no date on desktop) inside a
77 px band · sunken tile (Briefcase glyph, see below) · noteQuote · muted request labels · client panel without avatar, Caption disclosure,
WhatsApp glyph (the button's existing `glyphClassName` opt-in) · hint secondary.

Desktop now matches the frame within the type ramp's line heights (breadcrumb 20 vs 17, H1 40 vs 38).

Checked in every status (pending · accepted · arrived · received · cancelled) at 1440 + 375, FR, and cancelled in AR.

**Removed to match the frame** (each shipped on purpose in H8 PR-2) — founder answers 2026-11-04 in brackets:

- the client's **avatar** (the frame's client row is the name + city only) [✅ removal OK];
- the bare **Briefcase** icon, now inside the sunken tile [the frame's icon-package was a Figma slip — a package reads as a parcel: ✅ the tile keeps the **Briefcase** glyph, PR-2];
- [✅ removal OK] the **stage dates under the desktop stepper** (the frame hides that layer; « Historique » still lists every time).
  Below lg the detail look still shows them under each label.

The stepper's accessible name reuses `buyerOrder.stepper_aria` (« Avancement de la commande » / « تقدّم الطلب »), which
E4 already uses for the same look, so no new string was added.

### Open — shared components / text (asked, not built)

| # | Item | Frame | Now | Proposal |
|---|---|---|---|---|
| D1 | Stepper below lg (`OrderRail`, shared with E3/E4/G9) | circle above label, centred, no connector, no date | E4's vertical rail: circle beside label, connectors, dates | add an opt-in `mobile="stacked"` to the detail look; other callers unchanged |
| D2 | StatusPill at 375 | 343 wide, text at start | hugs its text | keep hugging (FILL sizing in the frame) |
| D3 | « Historique » panel pad at 375 (`OrderTimeline`, shared) | 24/16 | 24 | add a `className` prop; other callers unchanged |
| D4 | Price line | « 800 TND · Par projet » | « 800 TND » for a fixed price, « · Par mois » etc. by unit | keep the code (H6 D13 replaced « Par projet » with « Par mois ») |
| D5 | Button / WhatsApp labels | label box fills the button (reads start-aligned) | centred | keep centred |
| D6 | Page background at 375 | surface/base | shell's surface/subtle (AppShell, shared) | keep |
| D7 | Cancelled engagement on the stepper | not drawn | **✅ BUILT (PR-2):** E4's red « Annulée » node replaces the stage after the last one reached (`cancelledAfter` = `cancelledAfterStage(events, service chain)`, label `common.status_cancelled`) — both already existed, no shared change | founder: yes, if OrderRail already supports it (it does) |
| D8 | Title at 375 | « Engagement #A4F729 » on one line (341 in a 343 box) | wraps: our Inter sets it at 349.5 | keep the type ramp (a smaller mobile H1 would be a token change) |

## 2. H6 — /mes-services/creer at 375

### Measured

| Part | 375 |
|---|---|
| root | pad 20/16/32 |
| top | page-header (gap 8) → stepper-wrap gap 24 |
| stepper | 36 circles (current blue/600 + white number; done blue/600 + check 18; upcoming surface/base + 2 px border/subtle + muted number); connectors 2 px; summary « Étape N sur 5 · … » Semi Bold 14; gap 12 |
| content | stepper → box gap **20** |
| box | r 12, border/subtle, pad **24/16**, gap 20 |
| récap (step 5) | surface/subtle, border/subtle, r 10, pad 4/16; rows pad 8/0 + border; label body-sm muted · gap 12 · value Medium 14 (wraps under the label when it does not fit) · « Modifier » blue/600 centred at the end |

The breadcrumb, H1, subtitle and stepper already match.

### Built in this PR (below lg only; desktop unchanged)

- `ServiceWizard.tsx`: `max-lg:gap-5` (stepper → box 20), `max-lg:px-4` on the box (pad 24/16).
- `StepPublication.tsx`: below sm, label + value wrap together (gap 12) with « Modifier » centred at the end. The value
  claims at least 144 px, so it stays beside « Titre », « Prix », « Délai », « Mode » and drops under « Catégorie »,
  « Compétences », as drawn (measured at 375 in FR; in AR only « طريقة التقديم » drops under). From sm the row is unchanged (label · value · Modifier, no wrap).

Both files are shared with the edit page (`/mes-services/[id]/modifier`, H7), which gets the same 375 layout — including
the read-only récap shown when moderation hides a service. Its desktop was checked the same way (1440 + 1100, FR + AR).

Desktop proof: before/after captures at 1440 and 1100, FR and AR, steps 1–5 filled: 0 px.

### Kept as built (earlier rulings — « H6 Dn » = h6-pr2/3/4-deltas.md)

| Frame at 375 | Built | Ruling |
|---|---|---|
| unit « Par projet » | « Par mois » | H6 D13 |
| récap without « Description » | « Description » row | H6 D23 |
| no footer drawn | sticky footer (brouillon · Précédent · Suivant / Publier) | H6 D8 / D21 / D27 |
| « Unité * », « Mode de prestation * » as 16 Medium headings | F3 field labels | H6 D20 |

### Open — text (asked, not built)

| # | Frame (375) | Built (desktop + mobile) |
|---|---|---|
| D9 | summary « Étape 3 sur 5 · Tarif & délai » | step name « Tarif » |
| D10 | short description placeholder « Ex: Boutique en ligne clé en main » / helper « Affiché dans les résultats de recherche. » | « Ex: Boutique en ligne complète avec paiement à la livraison, prête en 7 jours » / « Le résumé qui apparaît dans les résultats de recherche. » |
| D11 | « Minimum 100 caractères. » | « Minimum 100 caractères. C'est votre argumentaire de vente. » |
| D12 | délai « Ex: 5-7 jours » / « Optionnel. Ex: 5-7 jours, 2 semaines » | « ex : 7 jours » / « Optionnel — précisez le délai avec son unité (ex : 7 jours, 2 semaines, 1 mois) » |
| D13 | inclus helper « Une ligne par élément. » | « Une ligne par élément. Ex: Design UI iOS/Android » |
| D14 | « Ce que le client doit préparer. » | the longer helper |

These strings are shared with desktop, so changing them changes desktop text too.

## Founder answers 2026-11-04 (after #307)

D1 no (keep E4's mobile rail) · D2 keep · D3 no (keep 24) · D4 keep · D5 keep · D6 keep · D7 yes → built · D8 keep our type
sizes · D9–D14 no (keep the built texts). The Arabic « Historique » times were fixed by #308.
