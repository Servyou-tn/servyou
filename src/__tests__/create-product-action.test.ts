/**
 * Unit tests for `createProductAction` — the first write path to `products` anywhere in the app.
 *
 * Scope, per CLAUDE.md's testing discipline: auth paths, OWNERSHIP, business-rule logic and
 * data-integrity logic. Form rendering, layout and i18n strings are may-skip and are not here.
 *
 * The Supabase client is mocked at the query-builder level, so these cover WHAT THE ACTION ASKS
 * FOR and WHAT IT WRITES, not the database. RLS enforces all of it a second time in Postgres.
 *
 * The two that matter most, and why:
 *
 *   · `shop_id` comes from the SESSION, never from the caller. `products` has no owner_id, so
 *     ownership runs products.shop_id -> shops.owner_id. An action that accepted a shopId argument
 *     would let a caller aim a write at someone else's shop.
 *   · The COMPENSATING DELETE. If the product row lands and the image rows do not, the product must
 *     be removed — both tables are publicly SELECTable, so a half-written product is visible to
 *     buyers immediately. See docs/design/g6-write-path.md §4d.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'

const VALID_USER = 'user-1'
const VALID_SHOP = '11111111-1111-4111-8111-111111111111'
const PRODUCT_ID = '22222222-2222-4222-8222-222222222222'
const CATEGORY_ID = '33333333-3333-4333-8333-333333333333'

const h = vi.hoisted(() => {
  type Err = { message: string; code?: string; details?: string } | null
  const state = {
    user: null as { id: string } | null,
    shopsResult: { data: [] as { id: string }[], error: null as Err },
    productsInsertError: null as Err,
    imagesInsertError: null as Err,
    productsDeleteError: null as Err,
  }
  const calls = {
    productsInsert: [] as Record<string, unknown>[],
    imagesInsert: [] as Record<string, unknown>[][],
    productsDeleted: [] as string[],
    shopsOwnerFilter: [] as string[],
  }

  function from(table: string) {
    if (table === 'shops') {
      const b: Record<string, unknown> = {}
      b.select = vi.fn(() => b)
      b.eq = vi.fn((_c: string, v: string) => (calls.shopsOwnerFilter.push(v), b))
      b.order = vi.fn(() => b)
      b.limit = vi.fn(() => Promise.resolve(state.shopsResult))
      return b
    }
    if (table === 'products') {
      const b: Record<string, unknown> = {}
      b.insert = vi.fn((row: Record<string, unknown>) => {
        calls.productsInsert.push(row)
        return Promise.resolve({ error: state.productsInsertError })
      })
      b.delete = vi.fn(() => ({
        eq: vi.fn((_c: string, v: string) => {
          calls.productsDeleted.push(v)
          return Promise.resolve({ error: state.productsDeleteError })
        }),
      }))
      return b
    }
    if (table === 'product_images') {
      const b: Record<string, unknown> = {}
      b.insert = vi.fn((rows: Record<string, unknown>[]) => {
        calls.imagesInsert.push(rows)
        return Promise.resolve({ error: state.imagesInsertError })
      })
      return b
    }
    throw new Error(`unexpected table ${table}`)
  }

  const storage = {
    from: () => ({
      getPublicUrl: (p: string) => ({ data: { publicUrl: `https://cdn.test/${p}` } }),
    }),
  }

  return { state, calls, from, storage }
})

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    from: h.from,
    storage: h.storage,
    auth: { getUser: async () => ({ data: { user: h.state.user } }) },
  })),
}))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/i18n/server', () => ({ getLang: async () => 'fr' }))
// Return the key itself so assertions read against a stable identifier, not French copy.
vi.mock('@/lib/i18n', () => ({ t: (k: string) => k }))

import { createProductAction } from '@/app/actions/products'

const okInput = (over: Record<string, unknown> = {}) => ({
  productId: PRODUCT_ID,
  title: 'Chaussures',
  categoryId: CATEGORY_ID,
  priceTnd: 45,
  deliveryFeeTnd: 7,
  tracksStock: true,
  stockCount: 3,
  imagePaths: [`${VALID_SHOP}/${PRODUCT_ID}/a.webp`],
  publish: true,
  ...over,
})

beforeEach(() => {
  h.state.user = { id: VALID_USER }
  h.state.shopsResult = { data: [{ id: VALID_SHOP }], error: null }
  h.state.productsInsertError = null
  h.state.imagesInsertError = null
  h.state.productsDeleteError = null
  h.calls.productsInsert.length = 0
  h.calls.imagesInsert.length = 0
  h.calls.productsDeleted.length = 0
  h.calls.shopsOwnerFilter.length = 0
  vi.clearAllMocks()
})

describe('createProductAction — auth', () => {
  it('rejects an unauthenticated caller and writes nothing', async () => {
    h.state.user = null
    const res = await createProductAction(okInput())
    expect(res).toEqual({ ok: false, error: 'product.error.notAuth' })
    expect(h.calls.productsInsert).toHaveLength(0)
  })

  it('guards a shop_owner with no shop rather than crashing', async () => {
    h.state.shopsResult = { data: [], error: null }
    const res = await createProductAction(okInput())
    expect(res).toEqual({ ok: false, error: 'product.error.noShop' })
    expect(h.calls.productsInsert).toHaveLength(0)
  })

  it('does NOT collapse a failed shops query into "no shop"', async () => {
    // Collapsing them would push an owner WITH a shop into the create-a-shop funnel and invite a
    // duplicate shop row.
    h.state.shopsResult = { data: [], error: { message: 'boom', code: '500' } }
    const res = await createProductAction(okInput())
    expect(res).toEqual({ ok: false, error: 'common.error_generic' })
  })
})

describe('createProductAction — ownership', () => {
  it('resolves shop_id from the session and ignores any client-supplied shop', async () => {
    // The security-relevant test. A caller passing someone else's shop must not reach the row.
    const res = await createProductAction(okInput({ shopId: 'attacker-chosen-shop' }))
    expect(res).toEqual({ ok: true })
    expect(h.calls.shopsOwnerFilter).toEqual([VALID_USER])
    expect(h.calls.productsInsert[0].shop_id).toBe(VALID_SHOP)
  })

  it('rejects image paths outside the caller\'s own shop/product prefix', async () => {
    const res = await createProductAction(
      okInput({ imagePaths: [`${VALID_SHOP}/${PRODUCT_ID}/a.webp`, 'other-shop/other-product/b.webp'] }),
    )
    expect(res.ok).toBe(false)
    expect(h.calls.productsInsert).toHaveLength(0)
  })

  it('rejects a path under the right shop but a DIFFERENT product', async () => {
    const res = await createProductAction({
      ...okInput(),
      imagePaths: [`${VALID_SHOP}/44444444-4444-4444-8444-444444444444/a.webp`],
    })
    expect(res.ok).toBe(false)
    expect(h.calls.productsInsert).toHaveLength(0)
  })
})

describe('createProductAction — business rules mirroring the live CHECKs', () => {
  it.each([
    ['negative price', { priceTnd: -1 }],
    ['negative delivery fee', { deliveryFeeTnd: -1 }],
    ['negative stock', { stockCount: -1 }],
    ['empty title', { title: '   ' }],
    ['title over 100', { title: 'x'.repeat(101) }],
    ['description over 2000', { description: 'x'.repeat(2001) }],
    ['non-uuid category', { categoryId: 'not-a-uuid' }],
    ['more than 8 images', { imagePaths: Array.from({ length: 9 }, (_, i) => `${VALID_SHOP}/${PRODUCT_ID}/${i}.webp`) }],
  ])('rejects %s before touching the database', async (_label, over) => {
    const res = await createProductAction(okInput(over))
    expect(res.ok).toBe(false)
    expect(h.calls.productsInsert).toHaveLength(0)
  })

  it('rejects a price with sub-centime precision that numeric(10,2) would silently round', async () => {
    const res = await createProductAction(okInput({ priceTnd: 12.345 }))
    expect(res.ok).toBe(false)
  })
})

describe('createProductAction — the publish gate is conditional, not unconditional', () => {
  it('refuses to PUBLISH with zero images', async () => {
    const res = await createProductAction(okInput({ imagePaths: [], publish: true }))
    expect(res).toEqual({ ok: false, error: 'product.error.image_required' })
    expect(h.calls.productsInsert).toHaveLength(0)
  })

  it('ALLOWS a brouillon with zero images — an ungated save is why the second CTA exists', async () => {
    const res = await createProductAction(okInput({ imagePaths: [], publish: false }))
    expect(res).toEqual({ ok: true })
    expect(h.calls.productsInsert[0].status).toBe('hidden')
    // No image rows attempted at all when the gallery is empty.
    expect(h.calls.imagesInsert).toHaveLength(0)
  })
})

describe('createProductAction — data integrity', () => {
  it('writes stock_count NULL when tracks_stock is false', async () => {
    // "Toujours disponible" must be a real state, not a stale count left behind by the toggle.
    await createProductAction(okInput({ tracksStock: false, stockCount: 9 }))
    expect(h.calls.productsInsert[0].tracks_stock).toBe(false)
    expect(h.calls.productsInsert[0].stock_count).toBeNull()
  })

  it('maps publish -> active and brouillon -> hidden (there is no draft status)', async () => {
    await createProductAction(okInput({ publish: true }))
    expect(h.calls.productsInsert[0].status).toBe('active')
    h.calls.productsInsert.length = 0
    await createProductAction(okInput({ publish: false }))
    expect(h.calls.productsInsert[0].status).toBe('hidden')
  })

  it('uses the pre-generated uuid rather than letting the database mint one', async () => {
    await createProductAction(okInput())
    expect(h.calls.productsInsert[0].id).toBe(PRODUCT_ID)
  })

  it('writes image rows in ONE statement, numbered by insert order', async () => {
    // One multi-row insert is what keeps the failure window a single statement wide. A loop of
    // per-row inserts is what would make a genuinely partial gallery possible.
    const paths = ['a', 'b', 'c'].map((n) => `${VALID_SHOP}/${PRODUCT_ID}/${n}.webp`)
    await createProductAction(okInput({ imagePaths: paths }))
    expect(h.calls.imagesInsert).toHaveLength(1)
    expect(h.calls.imagesInsert[0].map((r) => r.display_order)).toEqual([0, 1, 2])
    expect(h.calls.imagesInsert[0][0].product_id).toBe(PRODUCT_ID)
  })

  it('stores an empty description as NULL, not an empty string', async () => {
    await createProductAction(okInput({ description: '   ' }))
    expect(h.calls.productsInsert[0].description).toBeNull()
  })
})

describe('createProductAction — compensation when the gallery insert fails', () => {
  it('deletes the product it just created, so no partial gallery reaches a buyer', async () => {
    h.state.imagesInsertError = { message: 'images boom', code: '23503' }
    const res = await createProductAction(okInput())
    expect(res.ok).toBe(false)
    expect(h.calls.productsDeleted).toEqual([PRODUCT_ID])
  })

  it('still reports failure — and logs loudly — when the compensating delete ALSO fails', async () => {
    // The residual: the product persists degraded. It must never be reported as success, and the
    // log line carries the product id because that is the only thing that makes the row findable.
    const err = vi.spyOn(console, 'error').mockImplementation(() => {})
    h.state.imagesInsertError = { message: 'images boom', code: '23503' }
    h.state.productsDeleteError = { message: 'delete boom', code: '42501' }

    const res = await createProductAction(okInput())

    expect(res.ok).toBe(false)
    const logged = err.mock.calls.flat().join(' ')
    expect(logged).toContain('COMPENSATION FAILED')
    expect(logged).toContain(PRODUCT_ID)
    err.mockRestore()
  })

  it('does not attempt a compensating delete when the PRODUCT insert is what failed', async () => {
    // Nothing landed, so there is nothing to compensate — deleting here would be a no-op write.
    h.state.productsInsertError = { message: 'product boom', code: '23514' }
    const res = await createProductAction(okInput())
    expect(res.ok).toBe(false)
    expect(h.calls.productsDeleted).toHaveLength(0)
    expect(h.calls.imagesInsert).toHaveLength(0)
  })
})
