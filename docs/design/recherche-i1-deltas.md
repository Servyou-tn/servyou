# I1 « Mon compte » at 375 + /recherche — measurements, diff, decisions

Frames (founder exports in this folder, PNG + dump; no Figma MCP read used):

| Screen | Frame | Export |
|---|---|---|
| I1 Mon compte, 375 | 1595:28325 | `m375-i1-mon-compte` |
| /recherche, 1440 | 1596:41289 | `recherche-1440` |
| /recherche, 375 | 1596:42384 | `m375-recherche` |

I1 ships in PR-2 (with the H8 fixes). /recherche is its own PR-2b — §2 is filled in there.

## 1. I1 — /mon-compte at 375

I1 was built on the older 375 frame 728:64216 (`docs/design/i1-k-measurements.md`). 1595:28325 is the newer one.

### Measured (375)

| Part | Frame |
|---|---|
| root | pad 20/16/32; « content » holds « page » + the footer bar, gap 0 |
| page | pad 20/16/20/16, gap 24 (header → form column), so the panels sit 32 from the screen edge, 311 wide |
| page-header | breadcrumb « Accueil › Mon compte » Medium 14 muted, chevron 14, gap 8 → H1 « Mon compte » 32 Bold / 38 |
| formCol | panels gap 20; panel pad 24, r 12, border/subtle; fields 263 |
| avatar row | 80 avatar + CTA column (button md 40 + caption 14 muted, gap 8), side by side, gap 16 |
| account type | « Type de compte » row 33 tall (pad 4/0), gap 20 after Ville |
| password | « Mot de passe » over « Changer le mot de passe » (row wraps), 8 between |
| delete panel | border 2 danger/500, pad 24, gap 12 |
| footer bar | 343 at x 16, border-top, pad 20/16; dirty caption, then primary lg 48 + secondary md 40, both 311 full |

### Built in PR-2 (below sm only; route-local files)

| # | Change | File |
|---|---|---|
| 1 | Breadcrumb shown below sm (was `hidden sm:flex`) | `src/app/mon-compte/page.tsx` |
| 2 | H1 32 Bold / 38 below sm (the `sm:` 28/38 is unchanged) | same |
| 3 | Header + form column + footer buttons inset 16 (`max-sm:px-4`), header `max-sm:pt-4` (40 to the breadcrumb, as drawn) | `page.tsx`, `_components/MonCompteForm.tsx` |
| 4 | Panels gap 20 (`max-sm:gap-5`) | `MonCompteForm.tsx` |
| 5 | Avatar + CTA side by side (was stacked below sm). The CTA column claims ≥ 160 px and the row wraps, so below ~360 px the button drops under the avatar instead of widening the page (review fix: « Choisir une photo » is 171 px, the frame's label 166; at 375 FR it runs 6 px into the panel padding, no scroll) | `_components/AvatarUploadCard.tsx` |
| 6 | « Type de compte » row without its 100 px floor below sm (`max-sm:min-h-0`) | `MonCompteForm.tsx` |
| 7 | Password row: no 100 px floor, 8 between label and button below sm | same |
| 8 | Footer bar 20 under the last panel (`max-sm:mt-5`) | same |

### Kept as built (text or logic — unchanged on purpose)

| Frame (375) | Built | Why |
|---|---|---|
| « Changer la photo » | « Choisir une photo » with no photo yet, « Changer la photo » once one exists | state-driven label |
| « JPG ou PNG, 2 Mo max » | « JPEG, PNG, WebP ou AVIF, 4 Mo max » | the real upload limits |
| Email editable, asterisk, « Un email de confirmation sera envoyé… » | read-only + « Pour modifier votre email, contactez le support. » | D10: the column grants lock email |
| Téléphone with an asterisk | no asterisk; the helper says « Requis : les clients vous contactent sur WhatsApp à ce numéro. » for a seller and « Optionnel — … » for a consumer | the #303 seller phone rule (`accountPhoneHelperKey`) |
| « Cette action est irréversible… » | « Vous pouvez demander la suppression… sous 48 h. » | deletion is a request to the team |
| custom 18 px chevron on Ville | the native select arrow | the built select |
| « 55 123 456 » | « 55123456 » | the field shows what is stored; no input formatting added |

### Verification

- Desktop 0 px, before/after at 1440 + 1100, FR + AR, seller and consumer: 8/8 identical. Each set has a 375 sentinel shot,
  and the before and after sentinels differ.
- 375 FR + AR, side by side with the frame.
- #303 rule: a seller sees « Requis : … », a consumer « Optionnel — … ». `actions.test.ts` + `account-phone-helper.test.ts`
  pass (47/47, mocked).

## 2. /recherche — PR-2b

Founder answers 2026-11-04 (the 7 questions from the PR-2 handoff):

1. Move `ProduitsFilterBar` to shared with zero behaviour change; prove /marche/produits is 0 px.
2. Ville: yes. Products by the shop's city, services by the freelancer's city; add a test.
3. Keep « Pertinence » as the default for a typed search.
4. 2 columns at 375 for /recherche only, through an optional prop on `ListingResults` (the default is unchanged).
5. Keep the icon on « Filtres ». Reuse `SearchFiltersSheet`'s optional Ville + Trier par fieldsets (#271).
6. A page-local results header using the existing keys, no new text.
7. The desktop /recherche change is allowed; before/after shots go here.

### Measured

| Part | 1440 (1596:41289) | 375 (1596:42384) |
|---|---|---|
| content | pad 32, gap 24 (browseHead → grid) | page on surface/subtle |
| search head | the « Filter Bar »: search field (flex, 44) · Catégorie · Ville · Prix · « Trier par : … » (40, r 10, border/strong); chips row hidden | full-bleed white band, border-bottom, pad 16, gap 12: « Recherche » 20 Semi Bold + a **sunken** field 41 (pad 12, r 10, 14 Regular, no icon) |
| results header | « **7 résultats** pour « coussin » » 16 (count Semi Bold, rest muted) · « Effacer la recherche » 14 Medium muted, underlined, at the end; 16 under the bar | pad 8/16/4/16, gap 12: the header wraps (clear under the count), then « Filtres » (secondary md 40, r 10) |
| grid | **marketplace card** (category chip on the cover, shop initials, heart, blue bag CTA, city pin), 4 × 272, gap 16 | same card, 2 × 165, 13 across · 12 down; 20 under « Filtres » |
| pagination | 32 under the grid: ‹ 1 › + « Affichage 1 à 7 sur 7 » (13 muted) | same |

### Built in PR-2b

| # | Change | Where |
|---|---|---|
| 1 | `ProduitsFilterBar` **moved** to `src/components/marche/` (`git mv`; /marche/produits + its test re-pointed). New props, all optional and defaulted to the old behaviour: `sortOptions`, `triDefault`, `showQueryChip`, `searchPlaceholderKey`. With the old props « Tout effacer » still clears `q`; without the « q » chip it keeps the query | `src/components/marche/ProduitsFilterBar.tsx` |
| 2 | /recherche desktop: the shared bar replaces the full-width field + the CATÉGORIE / PRIX sidebar (`SearchFilters` inline, removed from this page only) | `src/app/recherche/page.tsx` |
| 3 | **Ville**: `?ville` reaches `searchMarketplace` (products → `shops.city`, services → `freelancer_profiles.city`, both predicates already there); options = `getProductCities` / `getServiceCities`; « Effacer les filtres », « Parcourir tout » and the other-side nudge drop it. Test: `src/__tests__/recherche-ville-filter.test.ts` (mocked) | page + test |
| 4 | Sort: « Pertinence » stays the typed-search default; the bar and the sheet offer Pertinence · Plus récents · Prix croissant · Prix décroissant. **One new string** `produits.sort.pertinence` « Pertinence » (the founder's word) / AR « الأكثر صلة » (REVIEW_AR_TRANSLATION) | `fr.ts`, `ar.ts` |
| 5 | Results header page-local from the existing `page_header.recherche.subtitle` / `.emphasis` plurals; the clear link underlined at rest | page |
| 6 | `ListingResults` `look="browse"` (product branch only, optional): the frame's marketplace card (`ProductBrowseCard`, already shared) on C1's ramp — 2-up below sm (13 × 12), 4-up from lg. Default unchanged. ⚑ `marche/produits/_components/ProductBrowseGrid.tsx`'s header says not to add such a variant; the founder's answer 4 overrides it, and that file is left untouched (0 px on /marche/produits) | `src/components/listings/ListingResults.tsx` |
| 7 | Mobile: the white header band (« Recherche » h1 + the search field), « Filtres » sheet with the Ville + Trier par fieldsets | page |
| 8 | Pagination caption « Affichage {start} à {end} sur {total} » (its existing optional props) | page |

The landing (bare /recherche) and the error state are not drawn and stay as built.

### Kept as built / open

| # | Frame | Built | Why |
|---|---|---|---|
| D1 | 375 search field **sunken**, 41, no icon | the bordered 44 field with its icon (`SearchQueryInput`) | shared with /categories/[slug]; an opt-in `look` prop would do it — **asking** |
| D2 | trigger labels 16 Regular | 14 (`text-body-sm`) | the shared bar's measured /marche/produits look (zero-change rule) |
| D3 | an empty 21 + 8 label slot above the search field (the Input instance's blank label) | not reproduced | Figma instance artifact; /marche/produits never had it |
| D4 | ‹ 1 › drawn on a single page | caption only when there is one page | shared `Pagination` behaviour |
| D5 | « Filtres » r 10 rectangle, no icon | the pill with its icon | founder answer 5 |
| D6 | page background white under the 375 band | shell surface/subtle | AppShell |

### Before / after (desktop change allowed — answer 7)

- `recherche-before-after-1440.png`: before · after · frame (FR, the frame's 7 « coussin » results via a fixture).
- `recherche-before-after-375.png`: before · after · frame.

### Verification

- /marche/produits after the move: **0 px** at 1440 + 1100, FR + AR (and 375). The /recherche sentinel changed in the
  same run, so the new code was being served.
- /recherche FR + AR at 1440 + 375 compared side by side; AR reads « 7 نتائج عن « coussin » » with the guillemets in order.
- Tests (mocked): `recherche-ville-filter.test.ts` 6/6; `filter-bars.test.tsx`, `SearchFiltersSheet.extras.test.tsx`,
  `seller-services.test.ts`, `ProductBrowseCard.render.test.tsx`, `plurals.test.ts`, `i18n-parity.test.ts` pass (82/82).
- The dev overlay's « 1 issue » is the known `BlurFade` reduced-motion hydration mismatch (already logged in
  `docs/follow-ups/f1-mes-favoris.md` and `m375-d2-service.md`); the before capture shows it too.
