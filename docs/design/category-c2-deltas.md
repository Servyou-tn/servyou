# C2 — Catégorie — diff + decisions

Frame measurements: `docs/design/category-c2-measurements.md`. Branch `feat/c2-category-page` (from origin/main 0041f99). Architect GO 2026-10-30.

## Diff (live `/categories/[slug]` vs the frame)
| # | Class | Frame | Was live |
|---|---|---|---|
| 1 | DIFFERENT | breadcrumb « Marketplace › Services › {category} » with chevron icons | « Accueil › Catégories › {category} » with « › » glyphs |
| 2 | DIFFERENT | H1 32 + count « 86 services » on one baseline | no H1; `PageHeader` with « N services dans … » |
| 3 | MISSING | one-line description under the title | none (no column, no copy) |
| 4 | DIFFERENT | pill chips « Tout » + sub-categories | `SubcategoryStrip` of 160 px cards, only on a sector that has children |
| 5 | DIFFERENT | top FilterBar: search · Catégorie · Ville · Prix · Trier par | separate search box above the crumb + a price-only sidebar; no sort |
| 6 | DIFFERENT | 3-up service grid at gap 16, 6 per page, « Affichage 1 à 6 sur 86 » | 20 per page, no caption |
| 7 | DIFFERENT | — | a service sector opened on an empty product grid unless `?type=service` |

## Decisions (numbered, reversible)
- **D1 Built on the existing public route `/categories/[slug]`** — no new route. It already resolves sectors and sub-categories (13 + 91 since the taxonomy cutover). A **service** category renders the new page; every other slug keeps the product layout exactly as it was (the frame is services-only, products are not in the 11/57 migration yet).
- **D2 The catalogue follows the category.** Without `?type=`, a slug of the service taxonomy (`isServiceCategorySlug`) opens on its services; `?type=` still wins either way. (Row 7: before, `/categories/design-graphique-logo` showed an empty product grid and offered « Voir les services ».)
- **D3 Description = a per-sector i18n line, only where one exists.** The categories table has no description column (logged earlier) and I did not invent copy for the other 12 sectors: only the framed sentence ships (`category.description.design-graphique-logo`, FR from the frame, AR a draft). The key lookup means adding a sector's line later is one FR + one AR string, no code. **Needs the founder's 12 sentences.**
- **D4 Chip order = the locked taxonomy's order**, not the frame's. The frame lists « Logo, Bannières, Cartes, Flyer… », the taxonomy (`docs/design/taxonomy-services.md`) is « Logo, Flyer, Cartes, Packaging, Menu, Bannières, Pitch deck, Illustration, Photographie ». Unknown slugs sort after, alphabetically (a DB row ahead of the TS file never disappears). On a sub-category page the chips are its siblings, the sub-category is the filled one, and « Tout » goes back to the sector. The breadcrumb gains the sector as a step there.
- **D5 Six cards per page**, as the frame's mock implies (86 / 6 = 15 pages, caption « 1 à 6 sur 86 »), not the 12 of `/marche/services`. `ListingResults` gets `gap="tight"` (16 everywhere; the /marche/services frame draws 24).
- **D6 Filters: the existing FilterBar from `lg`; the shared bottom-sheet trigger below.** The 375 frame stacks search + four selects (≈ 300 px, the first card would sit below the fold) — the shipped mobile pattern of `/marche/services` (621:49740) is kept. The Catégorie control **shows the current category** (the frame shows the placeholder « Catégorie ») and picking another sector navigates to that sector's page, carrying q / ville / prix / tri; « Toutes les catégories » goes to `/marche/services`. The category is the page's identity, so it gets no removable chip (`ServicesFilterBar` `scopedCategory`).
- **D7 Chips scroll on one line below `sm`.** The 375 frame wraps ten chips into a block with clipped text (« Bar », « Car… ») — a frame defect; a properly wrapped block is 9 rows in Arabic and pushes the first card a full screen down. Wraps from `sm` up, as drawn.
- **D8 The legacy search box above the breadcrumb is dropped on this page** (the FilterBar carries the search). Product categories keep it.
- **D9 Frame details not reproduced:** the H1 uses the shared `text-h1` (32 / 40) where the frame's text box is 38 high; the sidebar's « Marketplace » active state and the Topbar's « Rechercher une boutique, un produit… » placeholder are shell concerns (not this PR); the filter-bar search field's 44 px height is the frame's label-row artefact, the shared control is 40.
- **D10 Empty state:** a service category with no listing shows the services empty card (« Aucun service dans cette catégorie pour le moment » + « Parcourir tout »), or « Aucun service trouvé » + « Réinitialiser les filtres » when filters caused it — not the old « Voir les produits » escape, which is wrong for a service sector. A failed search shows the inline `ErrorState`, never the empty card.

## Arabic
New AR strings (`category.breadcrumb.aria`, `category.chips.all`, `category.empty.services*`, the framed description) are drafts, marked `REVIEW_AR_TRANSLATION`.

## Verification
- `tsc`, eslint on changed files, unit tests by path (taxonomy slug helper + ordering, chips render, i18n parity). No live-DB suite; the browser pass only READS public data.
- Browser (own isolated session, URL asserted): FR + AR × 1440 + 375 on `/categories/design-graphique-logo` (5 live services, 10 sub-categories): header / chips / controls measured against the frame, no raw key, no horizontal overflow; Catégorie dropdown → another sector keeps `ville` + `tri`; « Toutes les catégories » → `/marche/services?ville=…&tri=…`.
- Figma MCP reads: 0.
