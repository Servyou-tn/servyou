# H8 « Mes engagements » — Figma measurements

Frame **273:8575** (1440×1153, Screens page, x=3280). Sidebar 273:8576 (shared shell instance, not re-measured),
right column **273:8577**. Engagement Row component set **274:9204** (state default / hover).
File `jDNjJ8D1gnXiW7Ry3GkN4U`.

**Reads used: 1 of 3** — `get_design_context` on 273:8577 (2026-10-25). It returned the whole right column
(topbar, header, 4 tiles, tabs, filter, table header, all 6 rows), so no second read was needed for the list.
Not measured, still owed if wanted: the **hover** variant of the row (274:9204 / 274:9182) — memory notes only that
it keeps the same layout. No mobile frame and no detail frame exist (extrapolate: H5 ServiceRow stacking, G9).

Content area: `surface/subtle` page, `content` frame **p 32, gap 24** under the 64 px topbar.

## 1 · page-header (273:8580)
| Element | Measure |
|---|---|
| Row | flex, justify-between, items-center |
| Title « Mes engagements » | Inter Bold 32 / line-height normal, `text/primary` |
| Subtitle « Suivez vos projets en cours et vos livraisons » | Inter Regular 16 / 26, `text/muted`; gap title→subtitle 4 |
| Right | ghost Button md (h 40, px 16, r `radius/lg` 10): « Trouver des missions → » Semi Bold 16, `blue/600`. **No primary CTA** (engagements come from orders) |

## 2 · stats (273:8583) — 4 tiles, flex gap 16, each flex-1
Tile: `surface/base`, 1 px `border/subtle`, r `radius/xl` 12, **p 20 (`space/5`), gap 8**, vertical.
| # | iconCircle 44 (r full) | Label (Medium 14, `text/secondary`) | Value (Bold 28) | Context (12/17) |
|---|---|---|---|---|
| 1 | `blue/100`, briefcase 20 | En cours | 4 | « projets actifs » Medium, `text/muted` |
| 2 | `warning/100`, inbox 20 | À livrer | 2 | « échéance proche » **Semi Bold, `warning/700`** (action tile) |
| 3 | `success/100`, check-circle 20 | Terminés | 12 | « livrés avec succès » Medium, `text/muted` |
| 4 | `blue/100`, layout-grid 20 | Total engagements | 18 | « depuis le début » Medium, `text/muted` |
label + value sit in a `middle` frame, gap 2. Same tile treatment as H5 (`StatTile`).

## 3 · filter-bar (273:8614) — flex, justify-between, items-center
| Element | Measure |
|---|---|
| Tabs (273:9054) | `surface/base`, 5 Tab Items « Tous · En cours · Livrés · Terminés · Annulés », **no count chips**. Item h 44, px 16 (`space/4`), gap 8; 1 px `border/subtle` rule under the strip. Active = Semi Bold 16/26 `blue/600` + 2 px `blue/600` bottom indicator; inactive = Medium 16/26 `text/muted`. Active in frame: Tous |
| filter-right | gap 12 |
| Search | Input (variant search) **w 372**, h 44, px 16, r 10, 1 px `border/strong`, icon-search 18, placeholder « Rechercher un client ou service… » Regular 16 `text/muted`; no label, no helper |
| Sort | Select trigger **w 180**, h 44, px 16, r 10, 1 px `border/strong`, « Trier par » Regular 16 `text/muted`, chevron 18 |

## 4 · engagements-table (274:9223)
Panel: `surface/base`, 1 px `border/subtle`, r `radius/xl` 12, overflow clip, width 100 %.

**table-header (274:9224)**: `surface/subtle`, bottom 1 px `border/subtle`, px 24 (`space/6`), py 12 (`space/3`), **gap 16**.
Labels Medium 12/17, tracking 0.24, **UPPERCASE**, `text/muted`.
| Column | Width | Label |
|---|---|---|
| client | 200 | CLIENT |
| service | flex-1 | SERVICE |
| statut | 105 | STATUT |
| budget | 95 | BUDGET |
| échéance | 160 | ÉCHÉANCE |
| actions | 205 (spacer, no label) | — |

**Engagement Row (274:9204)**: **h 96**, px 24, py 20, gap 16, items-center, `surface/base`, bottom 1 px `border/subtle` (none on the last row).
| Cell | Anatomy |
|---|---|
| client (w 200, gap 12) | avatar **40** (photo `object-cover` r full, or initials: `blue/100` fill + Semi Bold 16 `blue/600`) · `clientText` gap 2: **name** Semi Bold 16/24 `text/primary` truncate · **clientType** gap 4: icon 16 + Medium 12 label. Consumer = icon-user + « Consommateur » `text/secondary`; Boutique = icon-store + « Boutique » `blue/600` |
| service (flex-1, gap 12) | **serviceIcon 32×32**, `blue/50`, r `radius/md` 8, category icon 20 · `serviceText` gap 2: **title** Regular 16/24 `text/primary` truncate · **category** Medium 12/17 `text/muted` truncate |
| statut (w 105) | StatusPill: px 12, py 4, r full, Semi Bold 12/17. En cours = `blue/100` + `blue/600`; Livré = `success/100` + `success/500`; Terminé = `indigo/100` + `indigo/500`; Annulé = red (`danger`, per memory; not drawn in the 6 rows) |
| budget (w 95) | Bold 16/24 `text/primary`, « 300 TND » |
| échéance (w 160, gap 2) | En cours rows: date Regular 14/20 `text/muted` over urgency Semi Bold 14/20 — « dans 2 jours » `text/muted`, « aujourd'hui » `warning/700`, « en retard » `danger/500`. Livré / Terminé rows: one Semi Bold 14 `text/muted` note (« en attente confirmation », « livré le 5 juil ») |
| actions (w 205, gap 8, justify-end) | **nextBtn** secondary sm (h 32, px 12, r 10, 1 px `border/strong`, Semi Bold 14 `text/primary`, **w 120**): « Marquer livré » on En cours, « Voir » on Livré/Terminé · **whatsapp** 36×36 icon button (20 glyph, brand-green literal, no token) · **kebab** 36×36 (icon-more-vertical 20) |
The 6 specimen rows: 4 consumers with photo avatars, 2 Boutiques with initials BZ / BN; statuses En cours ×4 (incl. today / late / in 2 / in 5 days), Livré ×1, Terminé ×1; budgets 300 / 1500 / 200 / 80 / 600 / 50 TND.

## 5 · What the frame does NOT draw
- A **pending / « À traiter »** state or an **Accepter** control (the first lifecycle hop).
- A cancel control (presumably the kebab) and what the kebab holds.
- Empty state, loading state, pagination, error state.
- Mobile layout, detail page.
- The Annulé pill and its row (colour taken from memory: danger).
- Right-column widgets: **none** — single-column page.
