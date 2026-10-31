# Mobile 375 batch 1 — page 3: C1 Produits (`m375-c1-produits`)

Frame: `C1 — Marketplace produits (375 mobile)` (dump `m375-c1-produits-dump.json`, untracked; the dump has no absolute x / y, so positions below come from the dump's sizes, paddings and the PNG). Rule: **Figma is the spec** — everything not built as drawn is a QUESTION for the founder. Shell: unchanged. Figma MCP reads: 0. Previous pages: `docs/design/m375-marche-services-deltas.md` (#271).

## Measured (375 × 812, signed in as the demo account; frame in brackets)
| Block | Frame | Built |
|---|---|---|
| Header block | 375 × 109: « Marketplace » 20 SemiBold + 343 × 41 sunken search « Rechercher un produit, une boutique… » | 375 × 109, search (16, 52, 343 × 41), same placeholder (new key `produits.filters.searchPlaceholderMobile`) |
| Toggle | 180 × 44, segments 80 / 92 | 179 × 44, segments 79 / 91 (font metrics) |
| Grid | 2 per row, card 165 wide, gap 13 across, 12 down (3 rows + 2 gaps = 1143) | 2 per row, 165 wide at x16 / x194, pitch 385 (373 + 12) |
| Product Card | 165 × 373, r12, 1 px `border/subtle` **inside** the box | 165 × 373 (stroke is an overlay; it was an outer border → 375) |
| Cover | 165 × 276 `surface/sunken` | 165 × 276 |
| Heart | 32 circle (`surface/base`, 1 px `border/subtle`), **18 icon-heart, stroke blue/300** | 32 circle at (8, 8), 18 × 18 icon, `text-brand-blue-300` (was the text glyph ♡ in muted) |
| Shop badge | 32 circle, 12 SemiBold blue/800 monogram, top end | 32 at the end edge (x 125 = 165 − 8 − 32) |
| Category | `Badge / category` pad 4/12, 14 Medium, bottom-start of the cover | 62 × 29 at (8, 239) |
| Title | (12, 288) 141 × 22, 16 SemiBold, one line + ellipsis | (12, 288, 141 × 22) |
| Price / city / CTA | 17 SemiBold · 12 Medium muted · 40 × 40 r8 blue/600 | 17 · 12 · 40 × 40 at (113, 321) |

## Built as drawn (changes)
- **Header block** (< `lg`): the same `MarketplaceMobileHeader` as the Services / Freelances lenses (plain GET form, other params kept, `page` dropped), with the frame's placeholder; the toggle sits 4 under it, the cards 20 under the toggle.
- **Product grid**: 2 columns below `sm` (it was 1 column of 343 × 375 cards), gap 13 / 12 as measured; `sm`+ unchanged.
- **Product card stroke** as an overlay, so the card is exactly 373 high.
- **Heart = the frame's icon-heart** (`FavoriteButton variant="icon"` gained `iconClassName`; the Service Card keeps its 20 muted heart).
- **Folded in (founder): the Boutiques lens focus loss.** `BoutiquesLens` keyed its bar on `q`, so every submitted search remounted the bar and dropped the input focus; the bar now follows the URL by itself (render-time sync). `ProduitsFilterBar` gets the same sync for its text and price fields (stale text after « Réinitialiser » — same bug as Services, fixed in #264). A test mounts both bars and asserts the same element keeps the focus.

## QUESTIONS for the founder (nothing here is decided by me)
1. **« Filtres » button.** The frame draws none between the toggle and the cards; the shipped sheet trigger stays (ruled for the Services lens, Oct 31) and pushes the first row 60 px below the frame. Same ruling for Produits (keep), or remove?
2. **The heart changes at EVERY width and on every page that shows this card** — C1 at 1440, the D3 boutique page and /mes-favoris (one shared `ProductBrowseCard`): the text ♡ becomes an 18 blue/300 icon-heart. The 1440 C1 frame was not re-read; if it draws the old glyph, tell me and I'll keep the old heart from `sm` up.
3. **Boutiques lens at 375.** The batch has no frame for it, so it is untouched apart from the focus fix: it still shows its own full-width bar (search + selects wrapping) and **no** « Marketplace » header block. Add the block (and hide the bar's search below `lg`) once its 375 frame exists?
4. **Category chip on the cover.** The frame's chip fill equals the cover fill (`surface/sunken`), so on its placeholder cover it reads as plain text; on a real photo the same fill shows as a pill. Built with the fill as drawn.
5. **Frame mock vs live data.** The frame's placeholder icon cover, « Textile artisanal / AS », « 45 TND » are mock; live cards show real photos, categories, monograms (« OS » for every demo shop) and prices. No pagination in the frame: the shipped one stays (as ruled on page 1).
6. **Hidden variants in the dump** (`ribbon « Nouveau »`, `shopName`, `rating 4.8 (24)`) are hidden in this instance and are not built (no data: rating deferred, no « new » flag).
7. The demo account is a freelancer (sidebar / topbar of the freelancer shell) — content compared only.

## Verification
- `tsc`, eslint on changed files, unit tests by path: card render (stroke overlay, 276 cover, icon heart, badge / category / price / title, Arabic), both filter bars (follow `q`, same element keeps the focus), header, i18n parity. No live-DB suite.
- Browser, isolated session, demo account via the repo's gate sign-in path (localhost, nothing persisted, no writes): FR + AR at 375 (probes equal the table; no overflow, 375 = 375) and 1440 regressions of C1 and the D3 boutique page. `/mes-favoris` was NOT exercised with data (the demo account has no favourite and I wrote none): the card there is the same component. Heart toggle not exercised.
- Figma vs preview: `docs/design/compare/m375-c1-produits-fr.png`, `-ar.png`; regressions `-1440-regression-c1.png`, `-1440-regression-d3-boutique.png`. The dev overlay's « 1 Issue » is a hydration warning from the gate's emulated reduced-motion (BlurFade), not the page.

## Review round (one read-only pass, no critical)
Fixed: a favourited icon-heart had two `text-*` colours at once (the stylesheet order would decide) — it is now danger/500 only, with a test that mounts a favourited heart; the product card shows a keyboard focus ring (the link's own ring was clipped by `overflow-hidden`); the cover `sizes` hint is a prop (single column by default for the shop page / favourites / related products, two across for C1); the price stays on one line with the frame's 8 gap at 320 px; the header search box follows `q` after a soft navigation; the filter bars sync each field only when ITS OWN prop changed (an unapplied price draft survives a change of `q`).

**Added question 8:** the header placeholder says « Rechercher un produit, une boutique… » (the frame's text) but the form searches the Produits lens only — a shop name matches product titles only. Keep the text, or point the header at both lenses?

## Founder rulings (page 3)
1. **« Filtres » on Produits: KEEP**, same ruling as Services.
2. **Heart at 1440 — read from Figma (1 MCP read, node `569:39818` = the 1440 C1 Product Card):** the 1440 card draws the **same icon-heart** as the 375 frame — an 18 icon in the 32 circle, blue stroke — so the change is right at every width on C1: `m375-c1-produits-1440-card-before-after.png` (Figma · before · after). **D3 (`540:32918`) and /mes-favoris (F1 `718:60584`) were NOT read: the Figma MCP hit its Starter call limit on the second read** (rule: no building from memory). The registry notes say both reuse the same Product Card master with its 1440 heart unchanged, so they now show the icon heart through the shared component, but this is unverified — **please supply the 1440 dumps of D3 and F1 Produits** (or confirm) and I will check; if either draws the glyph I keep the glyph at `lg`+ there.
3. **Boutiques lens at 375: leave as is** (no frame = no invention) — logged.
4. **Header placeholder:** the Produits lens header says « Rechercher un produit… » (the existing key; the frame's « produit, boutique » text is dropped), each lens searching its own results; the Boutiques lens keeps its own « Rechercher une boutique… » bar.
5. **« Nouveau » ribbon / rating variants: left out** (no data).

