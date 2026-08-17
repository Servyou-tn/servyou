/**
 * Unit tests for the G5 tab predicates — the invariant that matters is that the JS-reduced counts
 * (used for the tab badges + pagination total) and the per-tab row filter agree with each other,
 * and that Épuisés overlapping Actifs/Masqués is reflected correctly, not silently summed away.
 *
 * Run: npx vitest run src/lib/marche/seller-products.test.ts
 */

import { describe, it, expect } from 'vitest'
import { matchesProductTab, countProductTabs, isOutOfStock } from './seller-products'

describe('isOutOfStock', () => {
  it('is false when tracks_stock is false, regardless of stock_count', () => {
    expect(isOutOfStock({ tracks_stock: false, stock_count: null })).toBe(false)
    expect(isOutOfStock({ tracks_stock: false, stock_count: 0 })).toBe(false)
  })

  it('is true when tracked and stock_count is 0 or null', () => {
    expect(isOutOfStock({ tracks_stock: true, stock_count: 0 })).toBe(true)
    expect(isOutOfStock({ tracks_stock: true, stock_count: null })).toBe(true)
  })

  it('is false when tracked and in stock', () => {
    expect(isOutOfStock({ tracks_stock: true, stock_count: 5 })).toBe(false)
  })
})

describe('matchesProductTab', () => {
  const active = { status: 'active', tracks_stock: true, stock_count: 10 }
  const hidden = { status: 'hidden', tracks_stock: true, stock_count: 10 }
  const activeOutOfStock = { status: 'active', tracks_stock: true, stock_count: 0 }

  it('all matches every row', () => {
    expect(matchesProductTab(active, 'all')).toBe(true)
    expect(matchesProductTab(hidden, 'all')).toBe(true)
  })

  it('a product that is active AND out of stock matches both active and out_of_stock', () => {
    expect(matchesProductTab(activeOutOfStock, 'active')).toBe(true)
    expect(matchesProductTab(activeOutOfStock, 'out_of_stock')).toBe(true)
    expect(matchesProductTab(activeOutOfStock, 'hidden')).toBe(false)
  })

  it('hidden and out_of_stock are independent axes', () => {
    const hiddenOutOfStock = { status: 'hidden', tracks_stock: true, stock_count: 0 }
    expect(matchesProductTab(hiddenOutOfStock, 'hidden')).toBe(true)
    expect(matchesProductTab(hiddenOutOfStock, 'out_of_stock')).toBe(true)
    expect(matchesProductTab(hiddenOutOfStock, 'active')).toBe(false)
  })
})

describe('countProductTabs', () => {
  it('tous is not the sum of the other three when épuisés overlaps', () => {
    const rows = [
      { status: 'active', tracks_stock: true, stock_count: 10 }, // active only
      { status: 'active', tracks_stock: true, stock_count: 0 }, // active AND out_of_stock
      { status: 'hidden', tracks_stock: true, stock_count: 10 }, // hidden only
    ]
    const counts = countProductTabs(rows)
    expect(counts).toEqual({ all: 3, active: 2, hidden: 1, out_of_stock: 1 })
    // The sum (2 + 1 + 1 = 4) exceeds `all` (3) — the overlap, not a bug.
    expect(counts.active + counts.hidden + counts.out_of_stock).toBeGreaterThan(counts.all)
  })

  it('is all zero for an empty catalogue', () => {
    expect(countProductTabs([])).toEqual({ all: 0, active: 0, hidden: 0, out_of_stock: 0 })
  })
})
