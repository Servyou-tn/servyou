// The stock state a buyer sees on D1, derived from the two columns that actually govern it.
//
// ⚑ IT IS NOT `products.status`, AND THAT IS THE WHOLE POINT OF THIS FILE. The CHECK on
// `products.status` allows 'sold_out', which reads like the obvious source — but NOTHING in the app
// ever writes it. G6 writes 'active' on publish and 'hidden' on Brouillon (createProductAction),
// and there is no other write path to `products`. A detail page that branched on
// `status === 'sold_out'` would therefore render the rupture state for exactly zero products, and
// the bug would be invisible: the page looks correct on every row that exists.
//
// The real signal is the pair `tracks_stock` + `stock_count`, which G6 does write on every publish.
//
// Extracted from the component rather than inlined because it is business-rule logic with a
// documented threshold, and because no seeded product currently has stock 0 — the sold-out branch
// is unreachable from the database today, so the unit test is the only thing that exercises it.

/** Below this, D1 shows the « Plus que {n} en stock » urgency line. Project-documented value. */
export const LOW_STOCK_THRESHOLD = 10

export type StockState =
  /** Tracked and exhausted — rupture pill, CTA disabled. */
  | 'sold_out'
  /** Tracked, in stock, and under the threshold — the urgency line. */
  | 'low'
  /** Healthy stock, or `tracks_stock = false` ("Toujours disponible"). D1 draws NO line for this. */
  | 'none'

export function resolveStockState(product: {
  tracks_stock: boolean
  stock_count: number | null
}): StockState {
  // `tracks_stock = false` is "Toujours disponible" — it can never be out of stock, and its
  // stock_count is NULL rather than 0. Checking this first is what stops NULL reading as empty.
  if (!product.tracks_stock) return 'none'
  const n = product.stock_count ?? 0
  if (n <= 0) return 'sold_out'
  return n < LOW_STOCK_THRESHOLD ? 'low' : 'none'
}
