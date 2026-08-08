import { describe, it, expect } from 'vitest'
import { resolveStockState, LOW_STOCK_THRESHOLD } from '@/lib/marche/product-stock'

/**
 * D1 — the stock state a buyer sees, and the one branch the database cannot currently reach.
 *
 * WHY THIS IS TESTED AND THE REST OF D1's LAYOUT IS NOT. Two reasons, both about invisibility:
 *
 *   1. `sold_out` is UNREACHABLE FROM THE SEEDED DATA. Every product row today has stock_count in
 *      {1, 5, 7, 8, 10, 12, 18, 20, 30} or NULL — not one is 0 — so the rupture pill and the
 *      disabled CTA cannot be exercised by clicking around the app. Browser smoke covered `low`
 *      (stock 8) and `none` (stock 10); this file is the only thing that covers `sold_out`.
 *
 *   2. The rule is a TRAP. `products.status` has a 'sold_out' value in its CHECK constraint, so
 *      the obvious implementation reads it — and would be wrong on every row, silently, because
 *      G6 only ever writes 'active' | 'hidden'. Pinning the derivation here means a future edit
 *      that "simplifies" this to a status check fails loudly instead of shipping a state nobody
 *      can see.
 */
describe('resolveStockState', () => {
  it('reports sold_out only when the product tracks stock and has none', () => {
    expect(resolveStockState({ tracks_stock: true, stock_count: 0 })).toBe('sold_out')
  })

  it('treats a negative count as sold_out rather than low', () => {
    // The column has a `stock_count >= 0` CHECK so this should be unreachable, but the boundary is
    // `<= 0` rather than `=== 0` precisely so a bad row degrades to "cannot buy" and not to an
    // urgency line advertising "Plus que -3 en stock".
    expect(resolveStockState({ tracks_stock: true, stock_count: -3 })).toBe('sold_out')
  })

  it('reports low strictly below the threshold', () => {
    expect(resolveStockState({ tracks_stock: true, stock_count: 1 })).toBe('low')
    expect(resolveStockState({ tracks_stock: true, stock_count: LOW_STOCK_THRESHOLD - 1 })).toBe('low')
  })

  it('reports none AT the threshold — the boundary is exclusive', () => {
    // The seeded five-image product sits exactly here (stock 10) and must show no stock line at
    // all; browser smoke asserts the same thing against the rendered page.
    expect(resolveStockState({ tracks_stock: true, stock_count: LOW_STOCK_THRESHOLD })).toBe('none')
  })

  it('never reports sold_out for an untracked product, whose count is NULL', () => {
    // `tracks_stock = false` is "Toujours disponible". Its stock_count is NULL, and a NULL that
    // fell through to the `?? 0` coalesce would read as empty and disable the buy button on a
    // product that is always available — the one failure this ordering exists to prevent.
    expect(resolveStockState({ tracks_stock: false, stock_count: null })).toBe('none')
    expect(resolveStockState({ tracks_stock: false, stock_count: 0 })).toBe('none')
  })

  it('treats a tracked product with a NULL count as sold_out', () => {
    // tracks_stock = true with a NULL count is an inconsistent row (G6 always writes a number when
    // the toggle is on). Failing closed is the safe reading: better to under-sell one broken row
    // than to accept an order for stock that may not exist.
    expect(resolveStockState({ tracks_stock: true, stock_count: null })).toBe('sold_out')
  })
})
