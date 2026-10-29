# C1 « vue Boutiques » (`feat/c1-vue-boutiques`, 2026-10-29)

## Prix select / « 20-250 TND » chip and the grid-list toggle are not built
**What:** the frame's Filter Bar (578:42528) carries a Prix select, a « 20-250 TND » chip and a grid / list layout toggle. A shop has no price, so the Prix control and chip read as the PRODUCTS bar copied over; there is no list-layout specimen for shops. The lens ships search, Catégorie, Ville and a sort.
**Trigger:** the founder confirms (a) whether Prix means « shops with a product in this range » (then a product-price join, a new query) and (b) whether a list layout is wanted (then a frame).

## Sort options are derived
**What:** the frame names only « Plus récentes ». The lens offers « Plus récentes » and « Nom (A–Z) » (`?tri=nom`) so the dropdown is not a single option.
**Trigger:** design names the real sorts (e.g. most products).

## Shop Card hover has no recorded delta
**What:** the state frames (578:42186 / 42216 / 42246) differ only by `banner` — hover shows no exported change (effects are not dumped). Hover reuses a `shadow-md` lift. The older 72-px-logo variant in those frames is superseded by the 88-px ring the B4 frame itself uses.
**Trigger:** design states the hover treatment.

## No Boutiques mobile frame
**What:** « C1 — Marketplace produits (375 mobile) » (1482:21401) draws the PRODUCTS lens (2-up product cards). The Boutiques lens on a phone is derived: one full-width Shop Card per row, the search on its own row and the selects wrapping beneath it.
**Trigger:** a 375 Boutiques frame.

## The third filter bar
**What:** `BoutiquesFilterBar` is a trimmed fork of `ProduitsFilterBar` (itself a fork of `ServicesFilterBar`). Three near-identical bars is the consolidation trigger logged in `ProduitsFilterBar`'s header.
**Trigger:** the next change to any of them — introduce a shared `MarketplaceFilterBar` (search + single-select Catégorie / Ville + sort + chips) with per-lens slots.

## Shops with no product yet are listed
**What:** every public shop (`admin_hidden_at IS NULL`) appears, including one with zero active products (card shows « 0 produit », no thumbnails). Product-less storefronts add noise once there are many shops.
**Trigger:** a count of empty shops that hurts discovery → add « at least one active product » to `searchShops`.

## ShopCard's no-banner block changed on a shipped surface (/mes-favoris)
**What:** `ShopCard` (built in B6) used D3's indigo→blue gradient when a shop has no banner; the B4 state frames (`banner=false`, 578:42216 / 42246) draw a flat `surface/sunken` block, so it now does too — and `/mes-favoris` › Boutiques shows the same card. D3's own hero still uses the gradient.
**Trigger:** founder confirms the flat block for both surfaces (frame-driven); otherwise revert to a gradient prop on the Boutiques lens only.

## Leftovers
- `produits.lens.soon` (fr/ar) is no longer used by the products toggle (`services.lens.soon` still is) — delete it in the next i18n tidy.
- The « Boutiques lens — DEFERRED with a Bientôt badge » entry in `docs/follow-ups.md` (stub file) is stale now that the lens is live.
