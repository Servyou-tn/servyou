# G7 — Modifier un produit (`feat/g7-modifier-produit`, 2026-08-17)

## `ProductForm`'s post-create redirect targets `/tableau-de-bord-vendeur` on reasoning that is now stale

- **What:** `ProductForm.tsx`'s `submit()` ends with `router.push('/tableau-de-bord-vendeur')`, and
  the comment directly above it explains why: "G5 /mes-produits is unbuilt, so the dashboard is
  where a new product is visible." G5 shipped (`feat/g5-mes-produits`, merged as PR #145, ancestor
  of `origin/main` as of this PR) — `/mes-produits` is a real page now, and it is the page a seller
  would actually expect to land on after publishing a product, not the dashboard's stat tiles.
- **Not fixed here** — this PR (G7) touches the edit surface, not the create one, and one-PR-one-
  focus means a create-flow redirect change doesn't ride along on an edit-flow PR.
- **Trigger:** a small, dedicated one-line PR against `ProductForm.tsx:122` (and its now-stale
  comment at lines 115-121), changing the redirect target to `/mes-produits`.
