# D1 « Détail du produit » — mobile 375 (`m375-d1-produit`)

Mobile batch 1, page 6. Frame: **D1 375 `1549:41101`** (« réseaux (approuvé) »), export `docs/design/sl-d1-375-dump.json` + `.png` (untracked),
375 × 1686. No Figma MCP read was used (the founder's dump). Route `/produits/[id]`, components `src/components/produits/ProductDetail.tsx`,
`ProductGallery.tsx`, `ProductDescription.tsx`.

Rule (as pages 4–5): the mobile shell stays (header, search, grey page); this PR matches the page CONTENT, as `max-lg:` overrides and `lg:hidden`
blocks. **From `lg` the page is unchanged**, pixel-compared with `main` (stash + recapture on the same dev server): 1440 FR + AR on a real
product and on the fixture, and 1100 (the lg–xl stacked band) — **0 differing pixels** in all five.

## What changed, measured against the frame

Geometry read from the DOM at 375 (FR + AR, scrollbar hidden) on a temporary fixture route carrying the frame's content (2-line title, stock 3,
three social links, a long description) on a real product's images; the fixture was deleted before commit. No production product has social
links, low stock or a long description today.

| Frame node | Frame | Now (375) |
|---|---|---|
| root | one column, gap 20 | every block 20 apart ✓ (was 16 / 24 / 32 / 40) |
| `breadcrumb` | « ‹ Artisanat & fait main › Textile artisanal », 13 Regular, gap 6, chevrons 16 / 12 | « ‹ Produits › {catégorie} », one line, 343 × 16 ✓ (was 4 crumbs on 2 lines). Q1 |
| `gallery` | 343 × 343, r10, surface/sunken, no stroke | ✓ (was r12 + 1 px border) |
| `counter` | blue/950 pill, pad 3 / 8, 12 Medium text/inverse, inset 12 | ✓ 21 tall (was black/60, r6) |
| `arrow` × 2 | 40, surface/base, no stroke, chevron 20 text/primary, inset 12, centred | ✓ (was white/90 + border, text/secondary) |
| `fav-circle` | 44 (the earlier founder ruling), border/subtle, icon-heart 24 text/muted | ✓ icon-heart 24 (desktop keeps its ♡ glyph) |
| thumbnail strip | **not drawn** | hidden below `lg` |
| `titleBlock` | 343 × 91: title 22 Semi Bold (28) blue-800, gap 12, chip blue-50 r6 pad 4 / 8, 12 Medium blue-700 | ✓ 91. The chip shows the category (Q2); the desktop sunken badge above the title is desktop-only |
| `priceDelaiRow` | 343 × 29, space-between: price 24 Semi Bold (29) · icon-clock 16 + « + 7 TND de livraison » 13 muted (147 wide) | ✓ 29, delivery 147 wide. The « Total … à la livraison » line is not drawn → hidden (Q6) |
| stock | « Plus que 3 en stock » 14 Medium **warning/700** | ✓ 21 (was warning/500) |
| `Button` lg | 343 × 48, r10 | ✓ (was r8) |
| `shopRow` | 343 × 64, pad 12, gap 12, r12, surface/subtle; Avatar 40; name 14 Semi Bold blue-800; « Boutique · Tunis · Voir la boutique » 12 muted; chevron 18 | ✓ 64, **one link to `/boutique/{id}`** (plain, without chevron or « Voir la boutique », when there is no shop id). City `<bdi>`-isolated. Q3 |
| `socials` | « Suivez la boutique » + 3 glyphs 20, start pad 12 | ✓ (shipped in #293, now placed after the shop row) |
| COD note | « 💬 Paiement à la livraison. Aucune carte requise. » 12 muted (18) | ✓ 18, the 💬 decorative (`aria-hidden`) |
| `heartShareRow` | two 166 × 44 bordered r10 buttons, gap 12, icon 20 + « Favori » / « Partager » 13 Medium | ✓ D2's two controls (`FavoriteButton variant="box"`, `ShareLinkButton variant="bordered"` — copies the link) |
| `descSection` | 343 × 145: text 15/24 text/secondary (5 lines), gap 8, « Voir plus » 14 Regular blue-600 (17); **no heading** | ✓ 145. Heading `sr-only` below `lg`. Clamp **5** (Q7); « Voir plus » only when the text really overflows (measured, like D2), so a short description shows no dead link |
| shop panel (desktop `shopPanel`) | **not drawn** | hidden below `lg` (Q4) |
| `relatedSection` | 343 × 407: heading 18 Semi Bold (22), gap 12, ONE row of 272 × 373 Product Cards at gap 12, the next card peeking | ✓ 407; rail below `sm` (second card at x 300; in AR it starts at the right edge and peeks left). From `sm`: the grid as before |
| `reviewsSection` | 343 × 115: « Avis » 18 Semi Bold + `reviewsEmpty` 81, r10, pad 32, 14 muted (17), surface/subtle | ✓ 115, as D2's white card + border (Q5) |
| `reportLink` | « Signaler ce produit » 14 Regular muted | ✓ (44 px target, unchanged) |

No horizontal overflow at 375 (FR + AR, `scrollWidth` 375). Tab order = visual order (DOM is the 375 order; nothing uses `order`).

## Every control at 375 (logged out, FR + AR)

| Control | Goes to |
|---|---|
| ‹ Produits | `/marche/produits` (200) |
| Gallery ‹ › | previous / next image, counter updates |
| Gallery heart, Favori box | **`/connexion?next={this page}`** — was a bare `/connexion` that lost the page (decision D1 below) |
| Demander ce produit | `/demander/{id}` → E1's COD form (guest: `/connexion?next=/demander/{id}`) |
| Shop row | `/boutique/{shopId}` (200) |
| Facebook · Instagram · TikTok | the shop's profiles, new tab, `noopener noreferrer` |
| Partager | copies the link — toast « Lien copié ! » / « تم نسخ الرابط ! » |
| Voir plus / Voir moins | expands 120 → 216 and back (AR 120 → 192) |
| Related cards (+ their hearts) | `/produits/{id}` (200) |
| Signaler ce produit | `/connexion?next=/produits/{id}` |

## Decision taken in this PR (the brief's « no dead end »)

- **D1 — a guest's heart returns them to the page.** `FavoriteButton` (shared by every product / service heart) sent guests to `/connexion`
  with no way back. It now uses the existing `signInHref()` (`/connexion?next=<current page>`), the pattern the shop / freelancer hearts
  (`FavoriteHeart`) and « Signaler » already use. Two lines + the test updated.

## Questions for the founder (not decided by me)

1. **Breadcrumb.** The frame shows « ‹ {secteur} › {sous-catégorie} ». Product categories are ONE level in the database (6 rows, `parent_id` null
   on all of them; the 11 / 57 product taxonomy exists only in a TS file). I used D2's mobile shape « ‹ Produits › {catégorie} ». The frame's
   shape needs the product taxonomy migration first.
2. **Chip under the title** shows the category (« Mode »), not a sub-category, for the same reason.
3. **Shop avatar.** The frame draws the Avatar's image placeholder (person glyph). I show the shop logo, and the placeholder when there is none
   (desktop still shows the monogram « OS »). Want the monogram on mobile too?
4. **Shop panel** (shop description + « Voir tous les produits ») is not in the 375 frame, so it is hidden on mobile. The shop description is
   therefore not shown on mobile at all; the shop row links to the shop page, which shows it.
5. **« Avis » box.** You approved white + border for D2's identical box (the subtle fill vanishes on the grey shell); I applied the same here.
   The tinted shop row has the same low contrast on the grey page (as D2's freelancer row) — kept as drawn.
6. **Total line** (« Total : 67 TND à la livraison ») is not drawn at 375, so the mobile page no longer states the total; the clock icon on the
   delivery fee is drawn and kept.
7. **Description clamp = 5 lines** is inferred: the frame's text is exactly 5 lines with « Voir plus » under it.
8. AR draft (REVIEW_AR_TRANSLATION): `product.detail.shop_kind` « متجر ». `product.detail.favorite` reuses D2's approved « المفضلة ».

## Verified

tsc · eslint on every changed file · vitest by path: `ProductDetail.render.test.tsx` (new — 375 order, shop row link / no-link, breadcrumb,
chip / badge, hidden desktop blocks, description toggle), `FavoriteButton.render.test.tsx` (guest `?next=`), `FavoriteButton.test.tsx`.
Browser (own headless Chrome, anonymous, no writes): FR + AR × 375 on the fixture and on a real product, 768, 1100 and 1440 FR + AR.
`docs/design/compare/m375-d1-produit-figma-vs-preview.png`: frame · FR fixture · AR fixture · FR real product.
