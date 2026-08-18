import { describe, it, expect } from 'vitest'
import { isPathWithinProduct, nextDisplayOrder } from './gallery'

describe('isPathWithinProduct', () => {
  const shopId = 'shop-1'
  const productId = 'product-1'

  it('accepts a path under this shop and product', () => {
    expect(isPathWithinProduct('shop-1/product-1/abc.webp', shopId, productId)).toBe(true)
  })

  it('rejects another product under the same shop', () => {
    expect(isPathWithinProduct('shop-1/product-2/abc.webp', shopId, productId)).toBe(false)
  })

  it('rejects another shop entirely', () => {
    expect(isPathWithinProduct('shop-2/product-1/abc.webp', shopId, productId)).toBe(false)
  })

  it('rejects a prefix-looking path that is not actually scoped (no trailing slash match)', () => {
    // "shop-1/product-10/..." starts with "shop-1/product-1" as a raw string but not as a path
    // segment — the trailing "/" in the real check is what tells the two apart.
    expect(isPathWithinProduct('shop-1/product-10/abc.webp', shopId, productId)).toBe(false)
  })
})

describe('nextDisplayOrder', () => {
  it('is 0 for an empty gallery', () => {
    expect(nextDisplayOrder([])).toBe(0)
  })

  it('is one past the current max', () => {
    expect(nextDisplayOrder([0, 1, 2])).toBe(3)
  })

  it('is one past the max even with a gap from a prior delete — never reuses a retired value', () => {
    expect(nextDisplayOrder([0, 2])).toBe(3)
  })

  it('does not depend on array order', () => {
    expect(nextDisplayOrder([5, 1, 3])).toBe(6)
  })
})
