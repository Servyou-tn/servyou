# D2 « Détail du service » — mobile 375 (`m375-d2-service`)

Mobile batch 1, page 4. Frame: `docs/design/m375-d2-service-dump.json` (+ `.png`, untracked), 375 × 1519. Route `/services/[id]`, component `src/components/marche/ServiceDetail.tsx`.
Rule: the existing mobile shell stays (header, search, page background); this PR matches the page CONTENT. From `lg` the page is unchanged (1440 checked, FR + AR).

## What changed, measured against the frame

Geometry is read from the DOM at 375 (FR + AR) and compared to the dump; every row below matches to the pixel unless noted. Frame y-positions assume the frame's own
content; the live page differs only where the data differs (one-line title, shorter text).

| Frame node | Frame | Now |
|---|---|---|
| `breadcrumb` | `‹ Services › {sub-category}`, 13 Regular, gap 6, chevrons 16 / 12 | same (`Accueil` and the title are desktop-only); RTL: both chevrons flip. Shows the SECTOR (see Q4) |
| `titleBlock` chips | 23 tall (12/Medium, line 15) | was 25 (line 16.8) → `max-lg:leading-[15px]` |
| `priceDelaiRow` | 343 × 46: « À partir de » 12 · price 24 Semi Bold (29) · délai 13 gap 6 | label 13 → 12/15; price line 32 → 29; délai 14/gap 8 → 13/gap 6 |
| `Button` lg | 343 × 48 | already ✓ |
| `freelancerRow` | 343 × 64, p 12, r 12, subtle; avatar 40, name 14 SemiBold, headline 12 on ONE line, chevron 18 | was a row with initials, city, no chevron. Now a **link to `/freelance/{id}`**: the picture (or the person glyph), name, headline (truncated), chevron (flips in RTL). City hidden at 375 |
| order | price · CTA · freelancer · COD note · favori/partager | was price · CTA · favori/partager · freelancer · COD → flex `order` below `lg` (the desktop order is the DOM order, restored with `lg:order-none`) |
| `heartShareRow` | two 166 × 44 buttons, r 10, 1 px `border/strong`, icon 20 + « Favori » / « Partager » 13 Medium, gap 12 | was two icon-only boxes, and « Partager » was an inert link to the page itself. Now `FavoriteButton variant="box"` and `ShareLinkButton variant="bordered"` (**copies the link**, toast « Lien copié ! »); labels are hidden from `lg` (icon-only there, as before) |
| COD note | 12 Regular muted, 36 (2 lines) | ✓, moved under the freelancer row |
| block gap | 20 everywhere | buy box 16 → 20, body 32 → 20 (desktop keeps 16 / 32) |
| `descSection` | 343 × 217: 15/24 text clamped at 8 lines (192) + gap 8 + « Voir plus » 14 blue-600 (17) | new `ServiceDescription`: clamp 8, « Voir plus / moins » **only when the text really overflows** (ResizeObserver; tolerance half a line for Arabic line boxes); no clamp from `lg` |
| `inclusSection` | heading 18 SemiBold; bullets 18 tall, icon-check-circle 18 blue-600, text 14/17 gap 8 | heading 20 → 18; bullets 15/24 + bare check → 14/17 + circle-check (desktop keeps both) |
| `modePill` | 125 × 34 | was 37 (line 20) → `max-lg:leading-[17px]` → 34 |
| `relatedSection` | heading 18; `cardsRow` = ONE row of 300 × 279 cards, gap 12, the next card **peeks** at the right edge | was a single-column stack. New `ListingResults layout="rail"`: horizontal scroll below `sm` (bleeds to the screen edge, snap), the same 2/3-column grid from `sm`. Cards fade in on mount (the in-view trigger needs 50 px on screen and the peeking card shows ~47) |
| `reviewsEmpty` | 343 × 81, r 10, text 14/17 | was 120 tall, 15 → 81 (`py-8`, line 17) |
| `reportLink` | 14 Regular muted | ✓ |

Added data: `getServiceDetail` now also reads `public_profiles.avatar_url` (same query as the name) for the 375 freelancer row.

## Questions for the founder (not decided by me)

1. **« Autres services de {name} » vs « Services similaires ».** The frame's related heading says « Autres services de Yassine Ben Ali » and all three cards are Yassine's.
   `getRelatedServices` is category-first (same category → same freelancer → newest), so its cards are often other freelancers' and that heading would be false.
   I kept « Services similaires ». **Recommendation:** make the tiers freelancer-first and use the frame's heading when there is at least one own service, falling back to
   « Services similaires » (a small loader change + one i18n key) — say the word and it is the next commit.
2. **« Verified » badge on the avatar** is not drawn (no verification concept in the schema — same ruling as D4).
3. **Page background.** The frame's root is `surface/base` (white); the shell's page is `surface/subtle`, so the « Avis » box (subtle fill) is invisible against it. Shell
   ruling stands (keep the existing mobile shell) — flagging because it is visible in the comparison.
4. **Breadcrumb tail.** The frame shows a SUB-category (« Application mobile »); the loader holds the sector (`category_id`). Adding the sub-category means a second
   FK embed (`service_listings_subcategory_id_fkey`). Want it?
5. **Desktop (1440).** Not re-measured (Figma cap); unchanged except: the heart is now the 20 px outline icon in its bordered box (was the `♡` glyph) and the share box really copies.
   The desktop avatar is still initials (the 375 row shows the picture) — one-line change to show the picture at 1440 too, if wanted.
6. **« Partager » now copies the link.** The old control linked to the page you were already on (logged in `docs/follow-ups.md`); the copy behaviour and toast are D1's
   (`product.detail.share` / `link_copied`).
7. **Ratings** (rating row on the related cards, « 4.9 · 12 commandes ») are not shown — no data, same as every card page.
8. AR drafts (REVIEW_AR_TRANSLATION): `serviceDetail.favorite` « المفضلة », `serviceDetail.showLess` « عرض أقل ».

## Folded in from the #278 / #279 reviews (founder, Nov 1)

« Normalise THEN validate length; refuse any userinfo (`user@`, `user:pass@`) in every URL field, same rule as the kit. »
- `hasUserinfo()` (kit, `lib/social/platforms.ts`): `https://github.com@evil.io`, `user:pass@host`, a pasted email.
- Refused client AND server on: H3 (portfolio link, portfolio item URLs, credential URLs — `optionalUrl`), H2 step 2 (portfolio link), H2 step 3 (credential URL),
  H12 proposal links (`validateProposal`, shared by form and server action). H3 links already had it (`isLinkUrl`).
- Length is measured after `https://` is added: H2 now shows a « trop longue (500 max) » message; H12's address field no longer has a `maxLength` (a pasted address was
  cut silently into a different link — the form says « trop longue » instead).

## Verified

tsc · eslint on every changed file · vitest by path (ServiceDetail render, ServiceDescription, FavoriteButton box, url-scheme/userinfo incl. H2 action, proposal validation, kit) green.
Browser (gate account, own session, no writes), FR + AR × 375, FR + AR × 1440: no horizontal scroll; blocks measured as above; « Voir plus » clamps at 192, expands to 216 and
back; the second related card peeks at x = 328 and the grid is 3-up at 1440. `docs/design/compare/m375-d2-service-figma-vs-preview.png`: frame · FR long text · FR 5 bullets +
mode · AR.
