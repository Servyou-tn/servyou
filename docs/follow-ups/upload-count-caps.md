# Upload count caps (`fix/upload-count-caps`, 2026-10-30)

From the PR's one Sonnet review. No critical / high finding; the fixed ones (hint-mapping unit test, the count's
filter asserted, a `console.warn` on a cap refusal, re-indent) shipped in the PR. These are logged, ranked.

## 1. LOW — portfolio save is delete-all then insert, outside a transaction
⏳ SCHEDULED — after the Nov 13 beta (architect's ruling, 2026-10-30). Shape: one SECURITY DEFINER function that
replaces the set in a single transaction, owner check inside, keeps the 23514 `portfolio_items_cap` hint; SQL goes to
the architect, who applies it.
- **What:** `applyProfileSave` (`src/app/mon-profil-freelance/modifier/apply-save.ts`) deletes every
  `freelancer_portfolio_items` row of the profile, then inserts the submitted set. If the insert fails, the old
  portfolio is already gone. With the 6-item cap (migration 105) the insert can now also fail with
  `portfolio_items_cap`, but only when two saves of the same profile race: a single save stays under 6 because the
  delete runs first. The freelancer then sees « Limite atteinte » with an emptied portfolio. Pre-existing for any
  insert failure (links, education and certifications use the same pattern).
- **Why deferred:** pre-existing design, out of this PR's scope; the race needs two concurrent saves by one owner.
- **Where it lives:** `apply-save.ts` portfolio block (and the links / education / certifications blocks).
- **Trigger:** the next change to the profile editor's save path — replace the delete+insert with one transactional
  RPC (`replace_portfolio_items(profile, items jsonb)`) so a refusal leaves the old rows in place.

## 2. LOW — the upload-time count does not check the product belongs to the caller's shop
✅ CLOSED — accepted as is (architect's ruling, 2026-10-30): count only, already public, nothing written. Do not fix.
- **What:** `uploadProductImageAction` (`src/app/actions/products.ts`) counts `product_images` for the submitted
  `productId` after resolving the caller's shop, but before checking that the product is in that shop. A seller can
  learn another product's image count via « limite atteinte » — a count already readable from public
  `product_images`. The stored path is built from the caller's own shop id, so nothing is written for the foreign
  product (the provenance trigger refuses attaching it).
- **Why deferred:** no data exposed beyond what is public; the foreign-product-id upload gap predates this PR.
- **Where it lives:** `products.ts`, the count before `normalizeProductImage`.
- **Trigger:** with the orphan reconciliation sweep, or any change to the upload action's ownership checks — scope the
  count (and the upload) to `products.shop_id = <caller's shop>`.

## 3. LOW (cosmetic) — « 6 » is written into the FR / AR cap message
✅ CLOSED — `fix/portfolio-cap-message`, 2026-10-30: the message interpolates `{max}` = `PORTFOLIO_CAP`.
- **What:** `freelance.edit.portfolio_cap_reached` hard-codes 6 instead of interpolating `PORTFOLIO_CAP`.
- **Why deferred:** both languages exist and match the cap; changing the cap already needs a migration.
- **Where it lives:** `src/lib/i18n/fr.ts`, `src/lib/i18n/ar.ts`, `PortfolioRepeater.tsx`.
- **Trigger:** if the portfolio cap ever changes — switch to `{max}` like `product.image.error.max`.
