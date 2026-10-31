# Mobile 375 batch 1 — page 1: Marketplace · Services (`m375-marche-services`)

Frame: `Marketplace services — 375 (mobile)` (dump `m375-marche-services-dump.json`, untracked). Rule: **Figma is the spec** — everything below that is not built as drawn is a QUESTION for the founder. Shell: unchanged (founder ruling: keep the existing mobile shell, match the page CONTENT). Figma MCP reads: 0.

## Measured (frame 375 × 1955; block-relative y)
| Block | Frame | Built (375, signed in as the demo account) |
|---|---|---|
| Header block | surface/base, pad 16, gap 12, bottom stroke, 375 × 109 | 375 × 109 (stroke inside the last padding pixel) |
| « Marketplace » | 20 SemiBold, text/primary, h24 | 20 / 600, h24, (16, 16) |
| Search | 343 × 41, surface/sunken, r10, pad 12, 14 muted « Rechercher un service… », no icon | 343 × 41, same fill / radius / size, y 52 |
| Toggle bar | pad 4 16: toggle 188 × 44 at y113, segments 82 / 98 | 44 high at y113; segments 82 / 97 |
| Cards | gap 16, 343 × 279 at x16 | 343 × 279 at x16, pitch 295 |
| Card title | (16, 16) FIXED 44, 16 SemiBold blue/800 | (16, 16, 311 × 44), 16 / 600 / 22 |
| Card description | y72, FIXED 63, 14 text/secondary | y72, 63 high |
| Heart | 20 × 20 icon at (307, 16) | 20 × 20 at (307, 16) |
| Chips | y163, h23, r6, pad 4/8 | h23, r6 (was 25 / 8) |
| Footer | avatar (16, 231); price right edge 327, y202; CTA 120 × 32 at (207, 231), 14 SemiBold r10 | identical: (16, 231) · 327 / 202 · (207, 231, 120 × 32) 14 / 600 |

## Built as drawn (changes)
- **Page header block** (< `lg` only): « Marketplace » over a sunken search — page content, as ruled. It is a plain GET form (`?q=`), no JS; other active params (categorie, ville, prix, tri) ride along as hidden fields, `page` is dropped. Bleeds to the screen edges through the shell's padding.
- **Service Card** (shared by every list that shows services — 1440 checked): the 2 px stroke is now an overlay (Figma draws it inside and measures padding from the OUTER edge: title x = 16, it was 18); fixed 44 title and 63 description boxes; chip 23 high r6 (the old `rounded-md` was 8, not 6); CTA ≥ 120 wide SemiBold (was Medium); no resting shadow (the frame has none); the name truncates at 120.
- **Heart**: the Figma icon-heart (plain 20, text/muted, filled danger when favourited, 44 px invisible hit area) via a new `variant="icon"` on `FavoriteButton`; the product pages keep the text glyph until their frames are done.
- **Folded in (founder):** the filter bar's typed text and price fields follow the URL after « Réinitialiser » / a chip / Back, without remounting the bar (shipped in #264; now covered by a test). The Boutiques focus loss goes with page 3 (`/marche/produits?vue=boutiques`).

## QUESTIONS for the founder (nothing here is decided by me)
1. **« Filtres » button.** The frame draws nothing between the toggle and the first card, but the shipped page has a « Filtres » trigger there (price / sector sheet) — without it a phone cannot filter by price. It is still there, so the cards start 60 px lower than the frame. Remove it, keep it, or move it (e.g. inline at the end of the toggle row)?
2. **Two search fields.** The shell's mobile topbar already has a search (« Rechercher une boutique, un produit… », goes to `/recherche`); the new page block adds the frame's own « Rechercher un service… ». Both show at 375. Is that intended, or should the shell search be hidden on Marketplace pages (shell change — I did not touch it)?
3. **No pagination in the frame** (cards only). The shipped numbered pagination stays below the cards.
4. **Shell chrome.** The demo account is a *freelancer* (sidebar « Mes activités », topbar « Freelance »), not a client, so the shell does not match the frame's client sidebar; content is compared only.
5. **Card details I could not match exactly:** the name box is 120 fixed in the frame (I cap it with `max-width 120`); the mock data has the same « 120 TND » price on every card (live data differs, by design); AR cards mirror (heart on the left, price on the left).
6. **Freelances segment 97 vs 98 wide**: font metrics, not layout.

## Verification
- `tsc`, eslint on changed files, unit tests by path (header render, Service Card render — stroke overlay / fixed boxes / chips / CTA / icon heart / Arabic, filter-bar stale text). No live-DB suite.
- Browser, own isolated session, signed in through the repo's gate path (`scripts/gate/authed.mjs` logic: service-role magic link for the demo account, localhost only, nothing persisted), FR + AR at 375 × 812, and 1440 as a regression: geometry probes match the table above; no horizontal overflow (375 = 375). Figma vs preview: `docs/design/compare/m375-marche-services-fr.png`, `-ar.png`, and `-1440-regression.png`. The dev overlay's « 1 Issue » is a hydration warning caused by the gate's emulated `prefers-reduced-motion` (BlurFade), not the page.
- Signed-in heart toggle not exercised (no production writes).
