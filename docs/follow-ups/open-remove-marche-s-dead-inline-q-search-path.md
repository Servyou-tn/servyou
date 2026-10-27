# Remove /marche's dead inline `?q=` search path
- **What:** With the header search repointed to **/recherche** (see
  `components/marche/MarcheTopBar.tsx`), `/marche`'s own inline `?q=` handling in
  `app/marche/page.tsx` (and the `q` plumbing through `getActiveProducts(q)` /
  `getActiveServices(q)`) is no longer reached from the UI.
- **Why deferred:** Kept as a no-op for this PR to keep the search build scoped to adding
  /recherche; deleting browse-page query handling is a separate, reviewable cleanup.
- **Trigger:** A dedicated cleanup commit after /recherche is merged and verified.
