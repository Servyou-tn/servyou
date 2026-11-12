# Shop upload cap — audit H4 + M5 leftovers (`fix/shop-upload-cap`, 2026-11-12)

## 1. A non-cap provenance failure still leaves the stored file (product + portfolio)

- **What:** `uploadProductImageAction` and `uploadPortfolioImageAction` now delete the stored object when the daily cap
  refuses its provenance row. Any OTHER provenance-insert failure still leaves the object in storage "for the
  reconciliation sweep", which is not built yet. Avatar and shop uploads delete on every failure.
- **Why deferred:** that posture was a deliberate choice: on a network or DB hiccup the row may have committed, and
  deleting a referenced file is worse than an orphan. Changing it is a separate decision, not part of H4.
- **Where it lives:** `src/app/actions/products.ts` (provenance branch of `uploadProductImageAction`),
  `src/app/mon-profil-freelance/modifier/actions.ts` (`uploadPortfolioImageAction`).
- **Trigger:** when the reconciliation sweep is built (`open-orphaned-storage-objects-need-a-reconciliation-sweep-before-the.md`), or
  if storage growth from failed uploads shows up.

## 2. Replaced files keep their provenance row

- **What:** replacing a shop logo / banner (create and edit pages) and an avatar deletes the old storage object but keeps
  its `uploaded_objects` row, so the table holds rows for files that no longer exist.
- **Why deferred:** on purpose. The daily upload cap counts those rows; deleting them on replace would let an
  upload-then-replace loop run forever without reaching the cap. Nothing reads a shop-assets / avatars row except the cap.
- **Where it lives:** `src/app/ma-boutique/creer/actions.ts`, `src/app/ma-boutique/modifier/actions.ts`,
  `src/app/mon-compte/actions.ts` (`sweepAvatarFolder`).
- **Trigger:** if `uploaded_objects` gets large, prune rows older than 24 h for those two buckets (a scheduled job, not
  the replace path).

