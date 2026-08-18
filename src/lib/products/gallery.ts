// Pure, DB-independent rules for G7's image gallery (add/remove only — no reorder, see
// EditImageGallery's own header for why). Extracted so the two real invariants here — the
// tampering check and the append-only ordering — are testable without a live Supabase call,
// matching G5's own reasoning for extracting matchesProductTab/countProductTabs into
// seller-products.ts: the actions in src/app/actions/products.ts stay thin call sites over these.

/**
 * A caller-supplied storage path must live under `{shopId}/{productId}/` or it could attach
 * another shop's (or another product's) object to this gallery — the same check
 * `createProductAction` runs on its `imagePaths` array, restated here for the single path
 * `addProductImageAction` receives per call.
 */
export function isPathWithinProduct(path: string, shopId: string, productId: string): boolean {
  return path.startsWith(`${shopId}/${productId}/`)
}

/**
 * Append-only: MAX(existing) + 1, never `count()`. A prior delete can leave a gap in the sequence
 * (0, 2 remaining after removing 1) — `count()` would reuse the retired value 1, MAX+1 never does.
 * The cover is always "whichever remaining row has the lowest display_order", so removing the
 * current cover promotes the next one with no extra bookkeeping anywhere else.
 */
export function nextDisplayOrder(existing: number[]): number {
  return existing.length === 0 ? 0 : Math.max(...existing) + 1
}
