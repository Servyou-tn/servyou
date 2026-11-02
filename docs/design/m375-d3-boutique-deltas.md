# D3 « Boutique publique » — mobile 375 (`m375-d3-boutique`)

Mobile batch 1, page 7. Frame: **D3 375 `1549:40814`**. The export `docs/design/m375-d3-boutique-dump.json` + `.png` (untracked) dates from Oct 30, before the
social links. The social block was measured from 1549:40814 in #293 (`docs/design/shop-social-links-measurements.md`), and the founder confirmed this
pair as the spec (no fresh export, Figma closed). No Figma MCP read was used. Route `/boutique/[id]`, component
`src/app/boutique/[id]/_components/ShopDetail.tsx`.

Rule (as pages 4–6): the mobile shell stays (header, search, grey page); this PR matches the page CONTENT, as `max-lg:` / `max-sm:` overrides.
**From `lg` the page is unchanged**: stash + recapture against `main` on the same dev server, at 1440 FR + AR on the real shop (« OM shop ») and on
the fixture, and at 1100: **0 differing pixels** in all five. The 375 capture differs, as it should (1 → 2 columns: 10 782 → 5 859 px tall).

## Founder rulings for this page (Nov 2)

- **The shop heart stays on mobile** (B6; not in the 375 frame): first in the actions row, as on desktop.
- **Spec = the Oct 30 dump + the #293 social measurements.** The approved change list is the table below.

## What changed, measured against the frame

Geometry read from the DOM at 375 (FR + AR, scrollbar hidden) on a temporary fixture route carrying the frame's content (initials, gradient
banner, Tunis, the long description, 2 payment + 3 category chips, 6 products; with and without three social links). The fixture was deleted before commit.
The real shop has a logo, a banner photo and 25 products, and was checked too.

| Frame node | Frame | Now (375) |
|---|---|---|
| root | gap 24 | hero → products 24 ✓ (was 32) |
| `hero` | full width, no card | bleeds to the screen edges under the header, no border, no radius ✓ (D4's 375 hero) |
| `banner` | 375 × 120, gradient | ✓ 120 (was 200); a real banner photo still wins over the gradient |
| `avatar-ring` | 96, surface/base, at 16 / 72 | ✓ 96 at x 16, 72 under the banner top; AR at the right edge |
| `Avatar` xl | 80, initials 32 Semi Bold blue-600 on blue-100 | ✓ 80, initials 32 / 600 blue-600 (was 36); a logo still wins |
| `identity` | p 64 / 16 / 24, gap 24 | ✓ 64 / 16 / 24 (was 76 / 24 / 24) |
| `shop-name` | 32 Bold (38) | ✓ 32 / 700 / 38 (was 30) |
| `metaWrap` | rows 6 apart, items 20 apart, icons 16, 14 Regular text/secondary | ✓. The real labels (« Magasin physique », « Livraison par moi-même ») are longer than the frame's sample text (« Artisan », « Livraison à domicile »), so the second row can wrap: its lines now sit 6 apart like the rows (was 20) |
| social block (#293) | caption 12 Medium uppercase 0.48 muted, 6 to the 20 glyphs, 14 apart; 16 from the meta and the description | ✓ unchanged from #293 and re-checked: glyph step 34, caption → glyph 6, 16 / 16. AR starts at the right edge |
| `description` | 343 × 182, 16 / 26 text/secondary | ✓ 343 × 182 |
| `chipsWrap` | groups 10 apart; caption Overline; chips 29 tall, pad 4 / 12, **r8**, 14 Medium | ✓ already matched (chips 29, r8; widths within 1 px) |
| `actions` | pad 4 / 0, gap 12: Partager (Button secondary md 100 × 40, r10) + « Signaler cette boutique » 14 Regular muted | ✓ Partager 101 × 40 r10; Signaler 14 muted with a **45 px touch target** below `lg` (padding with negative margin, layout unchanged). The heart (44) opens the row, so the row is 52 tall instead of 48. Partager is drawn 40 tall; the shared `Button` md already gives it a 44 hit area (`-inset-0.5` span) |
| `sec-header` | « Produits » 20 Semi Bold (26) + count 14 **text/secondary**, baseline, gap 8 | ✓ count muted → secondary |
| `products` | gap 20 | ✓ header → grid 20 (was 24) |
| `grid` | Product Cards 165 × 373, **two across at 13**, rows 12 | ✓ 165 × 373, x 16 / 194, rows 12 (was one 343 column below `sm`). Image `sizes` 50vw below `lg` (desktop's 25vw unchanged) |
| page background | the frame's root is white | the shell's grey stays (shell ruling, as D2 / D4 Q4): the products sit on grey, the hero is white |

No horizontal overflow at 375 (FR + AR, `scrollWidth` 375). Tab order = visual order (DOM unchanged, nothing uses `order`).

## Every control at 375 (logged out, FR + AR, real shop)

| Control | Goes to |
|---|---|
| Shop heart « Favori : {shop} » | `/connexion?next=/boutique/{id}` (200) |
| Partager | copies the link — toast « Lien copié ! » / « تم نسخ الرابط! » |
| Signaler cette boutique | `/connexion?next=/boutique/{id}` (200) |
| Facebook · Instagram · TikTok (when set) | the shop's profiles, new tab, `noopener noreferrer` (fixture; the real shop has none) |
| Product cards | `/produits/{id}` (200) |
| Card hearts « Ajouter aux favoris » | `/connexion?next=/boutique/{id}` |

The frame has no breadcrumb or other link on this page. Runtime: next-devtools `get_errors` with a live session → no config or session errors.

## Questions for the founder

None blocking. Two things seen on the shared product card (also on C1 / D1), logged in `docs/follow-ups/m375-d3-boutique.md`, not changed here:
the card heart's tap target is 20 px on mobile, and in AR a French title is cut at its start and the price reads « TND 120 ».
