/**
 * `addProductImageAction` (src/app/actions/products.ts) — the SECOND call site
 * `enforce_product_image_provenance` (product_images BEFORE INSERT trigger) has to hold for, next
 * to `createProductAction`'s multi-row insert. Scope here is narrow: that a normal insert still
 * succeeds, and that a provenance-check rejection from the DB is logged with the same distinct
 * "possible tampering" signal `createProductAction` already gets (create-product-action.test.ts).
 * Ownership/path/max-images checks are unchanged by this PR and not re-tested exhaustively here.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'

const USER_ID = 'user-1'
const SHOP_ID = '11111111-1111-4111-8111-111111111111'
const PRODUCT_ID = '22222222-2222-4222-8222-222222222222'

const h = vi.hoisted(() => {
  type Err = { message: string; code?: string; details?: string } | null
  const state = {
    user: null as { id: string } | null,
    productResult: { data: { id: '', product_images: [] as { id: string }[] } as Record<string, unknown> | null, error: null as Err },
    ordersResult: { data: [] as { display_order: number }[], error: null as Err },
    insertResult: { data: { id: 'new-image-id' } as { id: string } | null, error: null as Err },
  }
  function from(table: string) {
    if (table === 'products') {
      const b: Record<string, unknown> = {}
      b.select = vi.fn(() => b)
      b.eq = vi.fn(() => b)
      b.maybeSingle = vi.fn(() => Promise.resolve(state.productResult))
      return b
    }
    if (table === 'product_images') {
      const b: Record<string, unknown> = {}
      b.select = vi.fn((cols: string) => {
        // The display_order lookup selects only 'display_order'; the insert's own .select('id')
        // is chained off .insert() below, not off this branch.
        if (cols === 'display_order') {
          return { eq: vi.fn(() => Promise.resolve(state.ordersResult)) }
        }
        return b
      })
      b.insert = vi.fn(() => ({
        select: vi.fn(() => ({ single: vi.fn(() => Promise.resolve(state.insertResult)) })),
      }))
      return b
    }
    throw new Error(`unexpected table ${table}`)
  }
  const storage = {
    from: () => ({ getPublicUrl: (p: string) => ({ data: { publicUrl: `https://cdn.test/product-images/${p}` } }) }),
  }
  return { state, from, storage }
})

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    from: h.from,
    storage: h.storage,
    auth: { getUser: async () => ({ data: { user: h.state.user } }) },
  })),
}))
vi.mock('@/lib/shops/owner-shop', () => ({
  resolveOwnedShopId: vi.fn(async () => ({ ok: true, shopId: SHOP_ID })),
}))
vi.mock('@/lib/products/gallery', () => ({
  isPathWithinProduct: (p: string, shopId: string, productId: string) => p.startsWith(`${shopId}/${productId}/`),
  nextDisplayOrder: (existing: number[]) => (existing.length === 0 ? 0 : Math.max(...existing) + 1),
}))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/i18n/server', () => ({ getLang: async () => 'fr' }))
vi.mock('@/lib/i18n', () => ({ t: (k: string) => k }))

import { addProductImageAction } from '@/app/actions/products'

const okInput = () => ({ productId: PRODUCT_ID, path: `${SHOP_ID}/${PRODUCT_ID}/real-upload.webp` })

beforeEach(() => {
  h.state.user = { id: USER_ID }
  h.state.productResult = { data: { id: PRODUCT_ID, product_images: [] }, error: null }
  h.state.ordersResult = { data: [], error: null }
  h.state.insertResult = { data: { id: 'new-image-id' }, error: null }
  vi.clearAllMocks()
})

describe('addProductImageAction', () => {
  it('a path with real provenance (the normal flow) succeeds', async () => {
    const res = await addProductImageAction(okInput())
    expect(res).toEqual({ ok: true, imageId: 'new-image-id', url: expect.stringContaining('real-upload.webp') })
  })

  it('logs a distinct "possible tampering" line when the DB rejects the row for failing the provenance check', async () => {
    h.state.insertResult = {
      data: null,
      error: { message: 'product-images provenance check failed: no validated upload record', code: '' },
    }
    const err = vi.spyOn(console, 'error').mockImplementation(() => {})
    const res = await addProductImageAction(okInput())
    expect(res.ok).toBe(false)
    const logged = err.mock.calls.flat().join(' ')
    expect(logged).toContain('possible tampering')
    err.mockRestore()
  })

  it('an ordinary DB error does NOT get the tampering-specific log line', async () => {
    h.state.insertResult = { data: null, error: { message: 'connection reset', code: '' } }
    const err = vi.spyOn(console, 'error').mockImplementation(() => {})
    const res = await addProductImageAction(okInput())
    expect(res.ok).toBe(false)
    const logged = err.mock.calls.flat().join(' ')
    expect(logged).not.toContain('possible tampering')
    err.mockRestore()
  })
})
