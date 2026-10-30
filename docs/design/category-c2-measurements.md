# C2 — Catégorie (service category page) — measurements

Frames: **1486:24359** « C2 - Catégorie — Design graphique & logo (1440) » and **1488:66061** (375 mobile). Read from the bridge dumps `c2-category-1440-dump.json` / `c2-category-375-dump.json` (kept untracked). Figma MCP reads: 0.

## 1440 (frame 1440 × 1152; shell = Sidebar 240 + Topbar 64, out of scope — built)
`content`: vertical, pad 32, gap 24, width 1136.

| Block | Values |
|---|---|
| category-head | vertical, gap 16 |
| breadcrumb | horizontal, gap 6, 14 Regular `text/muted`; chevron-right 14; last item 14 Medium `text/primary`. « Marketplace › Services › Design graphique & logo » |
| title-row | horizontal, gap 12, baseline-aligned: H1 32 Bold `text/primary` (h 38) + count « 86 services » 16 Regular `text/muted` |
| description | 16 Regular `text/secondary`, full width, h 26 |
| subcategories | horizontal wrap, gap 8. Chip: pad 6 14, radius full, 14 Medium. Active « Tout »: fill `blue/600`, text `text/inverse` (58 × 33). Others: fill `surface/base`, 1 px `border/subtle`, text `text/secondary` (h 35, hug width) |
| browseHead | Filter Bar / viewport=desktop: search (field h 44 → reused control h 40), selects Catégorie · Ville · Prix · « Trier par : Plus récents » (h 40, radius 10, `border/strong`, pad 0 16, 16 Regular `text/muted`) |
| gridWrap | vertical, gap 32 |
| grid | horizontal wrap, gap 16 (rows and columns), Service Card 362 × 279 (radius 12, 2 px `blue/600` stroke), 3 per row, 2 rows |
| paginationRow | centred; Pagination 252 × 62 (pages row 36 + gap 10 + caption) — « 1 2 3 … 15 », caption « Affichage 1 à 6 sur 86 » |

Mock data implies **6 cards per page** (86 services → 15 pages).

## 375 (frame 375 × 2092; content only, no shell drawn)
Frame pad 20/16/32/16, `content` width 343, gap 20.

| Block | Values |
|---|---|
| breadcrumb | same items, wraps onto two lines (h 50) |
| title-row | vertical, gap 12: H1 32 Bold wraps to 2 lines (h 76), count 16 muted |
| description | 16, 3 lines (h 78) |
| subcategories | chips wrap, several `FILL/HUG` with the text clipped (« Bar », « Car… ») — a frame defect |
| browseHead | search + the four selects stacked, each full width 343 (the same Filter Bar instance as desktop) |
| grid | vertical, gap 16, Service Card 343 × 208 (`FILL/HUG`) |
| pagination | « ‹ 1 2 3 … 15 › » + caption |

## Built vs measured (browser, 2026-10-30, real data: sector « Design graphique & logo », 5 services, 10 sub-categories)
| Check | Frame | Built |
|---|---|---|
| FR 1440 chips « Tout » | 58 × 33 | 58 × 33 |
| FR 1440 chip heights / widths | 35 · 186 / 209 / 216 / 164 … | 35 · 185 / 209 / 214 / 164 … (hug, font metrics) |
| Count beside H1 | 16 muted, baseline | 16 muted, baseline (`items-baseline`) |
| Controls | h 40, radius 10 | h 40 (the existing FilterBar) |
| Card columns | 3 × 362, gap 16 | 3 columns, gap 16 (`gap="tight"`) |
| 375 horizontal overflow | none | none (scrollWidth ≤ viewport), FR + AR |
| AR | — | mirrored (dir=rtl), breadcrumb chevron flipped, « الكل », no raw key |
