# C2 service category page (`feat/c2-category-page`, 2026-10-30)

## Descriptions for the other 12 sectors
**What:** only `design-graphique-logo` has a `category.description.<slug>` line (the frame's sentence). The other 12 sectors show no description, and the DB has no description column.
**Why deferred:** copy is the founder's; nothing was invented.
**Trigger:** the founder supplies the 12 sentences (FR + AR) — one pair of i18n keys per sector, no code. A description column on `categories` only if they should be admin-editable.

## `ServicesFilterBar` keeps its typed text across a server-driven navigation on `/marche/services`
**What:** `query`, `min` and `max` are `useState(prop)` seeds, so on `/marche/services` a soft navigation that clears the URL filters (the empty-state « Réinitialiser » link, Back) leaves the old text in the search box and the Prix popover. C2 sidesteps it with `key={carry}` on the bar; `/marche/services` is untouched (out of this PR's scope).
**Trigger:** the next change to `ServicesBrowsePage` / `ServicesFilterBar` — resync the seeds on a prop change, or key the bar there too.

## Mobile filter sheet has no Ville and no sort
**What:** below `lg` the category page uses the shared `SearchFiltersSheet` (price only), as `/marche/services` does, so a phone cannot filter by city or sort here although the URL supports both. Already known for `/marche/services`.
**Trigger:** the shared-sheet Ville / sort parity pass.

## The shell's active « Marketplace » item and the Topbar placeholder
**What:** the frames draw the sidebar's « Marketplace » as the active item and the Topbar placeholder as « Rechercher une boutique, un produit… »; the live shell shows it expanded / « Rechercher… ». Shell concerns, not C2.
**Trigger:** the shell alignment pass (queue item 3).

## Product category pages keep the old layout
**What:** only service categories got C2; a product category still has the legacy search box + price sidebar + `SubcategoryStrip` (whose comment still says the taxonomy is flat).
**Trigger:** the product taxonomy migration (11 / 57) and its frame.
