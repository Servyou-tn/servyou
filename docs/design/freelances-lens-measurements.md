# Freelances lens — measurements

Frames: **662:53894** « Marketplace services — Freelances (1440) » and **663:55017** (375 mobile). Read from the bridge dumps `freelances-1440-dump.json` / `freelances-375-dump.json` (kept untracked). Figma MCP reads: 0. The founder confirms this is the page behind the old « Freelances · Bientôt » button.

## 1440 (frame 1440 × 1287; shell = Sidebar 240 + Topbar 64, built)
`content`: vertical, pad 32, gap 24, width 1136.

| Block | Values |
|---|---|
| browseHead | vertical, gap 16 |
| view-toggle | Segmented count=2: track 188 × 44, fill `surface/sunken`, radius 10, pad 4; segments 36 high, radius 8, pad-x 12, **text only** (Services 82 wide, Freelances 98); active = `surface/base`, label 14 Medium `text/primary`; inactive `text/secondary`. The frame has **Services** selected (selected=0) — see D3 |
| Filter Bar | search (field 44, radius 10, `border/strong`, placeholder 16 muted « Rechercher un service… » — the services text, see D6), selects Catégorie · Ville · **Prix** · « Trier par : Plus récents » (h 40, radius 10, `border/strong`, pad 0 16, 16 muted) |
| gridWrap | vertical, gap 32 |
| grid | horizontal wrap, **gap 24**, 2 columns: Freelancer Card 556 × 203 (radius 12, 2 px `blue/600` stroke), 4 rows = **8 cards** |
| Freelancer Card | pad 20, gap 16: avatar 72 (`border/strong`), content gap 12: header (name 16 SemiBold `blue/800`; headline 14 muted ≤ 2 lines; city row 14 icon + 12 muted; heart 20), chips (r6, `blue/50`, 12 Medium `blue/700`, up to 4 + « +N »), footer (« N services offerts » 13 muted · CTA 120 × 32 « Voir le profil ») |
| paginationRow | Pagination 252 × 62: `‹ 1 2 3 … N ›` + caption « Affichage 1 à 12 sur 1 248 » (mock) |

## 375 (frame 375 × 1061)
| Block | Values |
|---|---|
| mobile-header | pad 16, gap 12, `surface/base`, bottom border: « Marketplace » 20 SemiBold + a 343 × 41 search (`surface/sunken`, 14) — the shell's own header |
| view-toggle-bar | pad 4 16: the same toggle, **Freelances selected** |
| cards | vertical, pad 16 16 24, gap 16, Freelancer Card 343 × 203 (`FILL`), then pagination |
| filters | **none drawn** — only the header search |

## Built vs measured (browser, 2026-10-30, at the frame sizes; fixture = the frame's own mock data)
| Check | Frame | Built |
|---|---|---|
| Card | 556 × 203, stroke 2 `blue/600`, r12 | 549 × 203 (content 1121: scrollbar), 2 px `rgb(31,95,224)`, 12 |
| Card at 375 | 343 × 203 | 328 × 203 (content 328: scrollbar) |
| Avatar | 72 ring, Avatar lg 56 inside | 72 at (20, 20), 56 at (28, 28) |
| Content column / name cluster | 428 / 408 (= 428 − the 20 heart, no gap) at a 556 card | 421 / 401 at a 549 card (7 px scrollbar) — same arithmetic |
| Name / title / city | 19 · 42 FIXED · 15, city at y 89 | 19 · 42 · 15, city y 89 |
| Chips (y 116) | 49 · 56 · 60 · 79 · 31 / 375: 49 · 56 · 32 | 49 · 56 · 60 · 78 · 31 / 49 · 56 · 32, radius 6, `blue/50` · `blue/700` |
| Heart | 20 × 20 icon, header end | 20 × 20 at the header end |
| Footer | count 13 · CTA 120 × 32 r10 | 13 · 120 × 32 r10; « N services » below `sm` |
| Grid | 2 columns, gap 24; 375 gap 16 | 2 columns gap 24; gap 16 |
| Caption | « Affichage 1 à 12 sur 1 248 » | real total, thousands grouped in French |
