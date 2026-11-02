# Follow-ups — D1 product page at 375 (`feat/m375-d1-produit`, 2026-11-02)

## Two product hearts on one page do not share state

**What** D1 shows the product's heart twice (the gallery circle and the « Favori » box at 375; the gallery and « Enregistrer » on desktop), and
the page mounts four `FavoriteButton` instances (two hidden per width). Each one fetches its own state, so toggling one leaves the other showing
the old state until a reload, and each runs its own `auth.getUser()` + `favorites` select.

**Why deferred** Pre-existing on desktop (the gallery heart and « Enregistrer » were already two instances); a shared favourite state (context
or one query per page) is its own change across every heart.

**Where it lives** `src/components/FavoriteButton.tsx`; consumers `src/components/produits/ProductGallery.tsx`, `ProductDetail.tsx`.

**Trigger** The favourites consolidation pass (FavoriteButton vs FavoriteHeart), or a report of the stale heart.

## Product breadcrumb and chip wait for the product taxonomy

**What** The 375 frame's breadcrumb is « ‹ {secteur} › {sous-catégorie} » and its chip is the sub-category. Product categories are one level in
the database (6 rows, `parent_id` null), so D1 shows « ‹ Produits › {catégorie} » and the category chip.

**Why deferred** Needs the product taxonomy migration (`src/lib/taxonomy/product-categories.ts`, 11 / 57, not in the DB) — schema work.

**Where it lives** `src/components/produits/ProductDetail.tsx` (breadcrumb, `titleBlock`), `src/lib/marche/product-detail.ts`.

**Trigger** The product taxonomy migration lands.
