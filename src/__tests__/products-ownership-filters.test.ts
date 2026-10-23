/**
 * Ownership filters on the products write actions (src/app/actions/products.ts) — an auth path,
 * so must-test per CLAUDE.md. RLS already scopes these writes; the explicit shop_id match is the
 * defence-in-depth layer this suite pins: every write is filtered to the caller's OWN shop, and a
 * caller whose shop cannot be resolved never reaches a write at all.
 *
 * The Supabase client is a recording builder: every chain (`from(table).method(args)…`) is logged,
 * and a per-test `respond` decides what each terminal call resolves to. So the assertions read
 * the actual filters the action applied, not a mock's opinion of them. resolveOwnedShopId is
 * mocked (same as add-product-image-action.test.ts): its own query is not under test here.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'

const OWN_SHOP = '11111111-1111-4111-8111-111111111111'
const PRODUCT = '22222222-2222-4222-8222-222222222222'
const OTHER_PRODUCT = '33333333-3333-4333-8333-333333333333'
const IMAGE = '44444444-4444-4444-8444-444444444444'
const CATEGORY = '55555555-5555-4555-8555-555555555555'

type Op = { m: string; args: unknown[] }
type Chain = { table: string; ops: Op[] }

const h = vi.hoisted(() => {
  const state: {
    chains: Chain[]
    respond: (c: Chain) => unknown
    shop: { ok: true; shopId: string } | { ok: false; reason: 'no_shop' | 'query_failed' }
  } = {
    chains: [],
    respond: () => ({ data: null, error: null }),
    shop: { ok: true, shopId: '11111111-1111-4111-8111-111111111111' },
  }

  function from(table: string): unknown {
    const chain: Chain = { table, ops: [] }
    state.chains.push(chain)
    const builder: Record<string, unknown> = new Proxy({} as Record<string, unknown>, {
      get(_target, prop) {
        if (prop === 'then') {
          return (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) =>
            Promise.resolve(state.respond(chain)).then(resolve, reject)
        }
        return (...args: unknown[]) => {
          chain.ops.push({ m: String(prop), args })
          if (prop === 'maybeSingle' || prop === 'single') return Promise.resolve(state.respond(chain))
          return builder
        }
      },
    })
    return builder
  }

  const remove = vi.fn(() => Promise.resolve({ error: null }))
  const storage = { from: vi.fn(() => ({ remove })) }
  const getUser = vi.fn(() => Promise.resolve({ data: { user: { id: 'owner-1' } } }))
  const resolveOwnedShopId = vi.fn(async () => state.shop)
  const revalidatePath = vi.fn()
  return { state, from, storage, remove, getUser, resolveOwnedShopId, revalidatePath }
})

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({ from: h.from, storage: h.storage, auth: { getUser: h.getUser } })),
}))
vi.mock('@/lib/shops/owner-shop', () => ({ resolveOwnedShopId: h.resolveOwnedShopId }))
vi.mock('next/cache', () => ({ revalidatePath: h.revalidatePath }))
vi.mock('@/lib/i18n/server', () => ({ getLang: async () => 'fr' }))
vi.mock('@/lib/i18n', () => ({ t: (k: string) => k }))

import {
  toggleProductStatusAction,
  updateProductAction,
  deleteProductAction,
  deleteProductImageAction,
  bulkActivateProductsAction,
  bulkDeleteProductsAction,
} from '@/app/actions/products'

const has = (c: Chain, m: string) => c.ops.some((o) => o.m === m)
const eqs = (c: Chain, col: string) => c.ops.filter((o) => o.m === 'eq' && o.args[0] === col).map((o) => o.args[1])
const writes = (table: string) =>
  h.state.chains.filter((c) => c.table === table && (has(c, 'update') || has(c, 'delete') || has(c, 'insert')))

const UPDATE_INPUT = {
  productId: PRODUCT,
  title: 'Panier en osier',
  categoryId: CATEGORY,
  description: '',
  priceTnd: 45,
  deliveryFeeTnd: 7,
  tracksStock: false,
}

beforeEach(() => {
  h.state.chains = []
  h.state.shop = { ok: true, shopId: OWN_SHOP }
  h.state.respond = () => ({ data: null, error: null })
  vi.clearAllMocks()
  vi.spyOn(console, 'error').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})

describe('single-row writes are scoped to the caller’s own shop', () => {
  it('toggleProductStatusAction filters the UPDATE by id AND shop_id', async () => {
    h.state.respond = () => ({ data: { id: PRODUCT }, error: null })
    const res = await toggleProductStatusAction({ productId: PRODUCT, nextStatus: 'hidden' })
    expect(res).toEqual({ ok: true })
    const [w] = writes('products')
    expect(eqs(w, 'id')).toEqual([PRODUCT])
    expect(eqs(w, 'shop_id')).toEqual([OWN_SHOP])
  })

  it('updateProductAction filters the UPDATE by id AND shop_id', async () => {
    h.state.respond = () => ({ data: { id: PRODUCT }, error: null })
    const res = await updateProductAction(UPDATE_INPUT)
    expect(res).toEqual({ ok: true })
    const [w] = writes('products')
    expect(eqs(w, 'id')).toEqual([PRODUCT])
    expect(eqs(w, 'shop_id')).toEqual([OWN_SHOP])
  })

  it('deleteProductAction filters the DELETE by id AND shop_id', async () => {
    h.state.respond = (c) => (c.table === 'orders' ? { count: 0, error: null } : { data: { id: PRODUCT }, error: null })
    const res = await deleteProductAction({ productId: PRODUCT })
    expect(res).toEqual({ ok: true })
    const [w] = writes('products')
    expect(eqs(w, 'shop_id')).toEqual([OWN_SHOP])
  })

  it.each([
    ['toggleProductStatusAction', () => toggleProductStatusAction({ productId: OTHER_PRODUCT, nextStatus: 'active' })],
    ['updateProductAction', () => updateProductAction({ ...UPDATE_INPUT, productId: OTHER_PRODUCT })],
  ])('%s: another shop’s product matches zero rows → generic error, nothing revalidated', async (_name, run) => {
    // The shop_id filter excludes it, so the UPDATE reads back no row.
    h.state.respond = () => ({ data: null, error: null })
    const res = await run()
    expect(res).toMatchObject({ ok: false, error: 'common.error_generic' })
    expect(h.revalidatePath).not.toHaveBeenCalled()
  })
})

describe('an unresolvable shop never reaches a write', () => {
  it.each([
    ['toggleProductStatusAction', () => toggleProductStatusAction({ productId: PRODUCT, nextStatus: 'hidden' })],
    ['updateProductAction', () => updateProductAction(UPDATE_INPUT)],
    ['deleteProductAction', () => deleteProductAction({ productId: PRODUCT })],
    ['deleteProductImageAction', () => deleteProductImageAction({ productId: PRODUCT, imageId: IMAGE })],
  ])('%s: no shop → rejected before any query', async (_name, run) => {
    h.state.shop = { ok: false, reason: 'no_shop' }
    const res = await run()
    expect(res).toMatchObject({ ok: false, error: 'common.error_generic' })
    expect(h.state.chains).toEqual([])
  })

  it('deleteProductAction resolves ownership BEFORE probing another product’s order history', async () => {
    h.state.shop = { ok: false, reason: 'query_failed' }
    await deleteProductAction({ productId: OTHER_PRODUCT })
    expect(h.state.chains.some((c) => c.table === 'orders')).toBe(false)
  })
})

describe('deleteProductImageAction confirms the parent product is the caller’s', () => {
  it('rejects an image on a product outside the caller’s shop — no image read, no delete, no storage call', async () => {
    // products ownership check (id + shop_id) finds nothing.
    h.state.respond = () => ({ data: null, error: null })
    const res = await deleteProductImageAction({ productId: OTHER_PRODUCT, imageId: IMAGE })
    expect(res).toEqual({ ok: false, error: 'common.error_generic' })
    const [check] = h.state.chains
    expect(check.table).toBe('products')
    expect(eqs(check, 'id')).toEqual([OTHER_PRODUCT])
    expect(eqs(check, 'shop_id')).toEqual([OWN_SHOP])
    expect(h.state.chains.some((c) => c.table === 'product_images')).toBe(false)
    expect(h.remove).not.toHaveBeenCalled()
  })

  it('deletes an owned product’s image, scoped by image id AND the confirmed product id', async () => {
    h.state.respond = (c) => {
      if (c.table === 'products') return { data: { id: PRODUCT }, error: null }
      if (has(c, 'delete')) return { data: { id: IMAGE }, error: null }
      return {
        data: { image_url: `https://x.supabase.co/storage/v1/object/public/product-images/${OWN_SHOP}/${PRODUCT}/a.webp` },
        error: null,
      }
    }
    const res = await deleteProductImageAction({ productId: PRODUCT, imageId: IMAGE })
    expect(res).toEqual({ ok: true })
    const [del] = writes('product_images')
    expect(eqs(del, 'id')).toEqual([IMAGE])
    expect(eqs(del, 'product_id')).toEqual([PRODUCT])
  })
})

describe('bulk writes carry the shop_id filter too', () => {
  it('bulkActivateProductsAction: the UPDATE is scoped to the caller’s shop', async () => {
    h.state.respond = (c) =>
      has(c, 'update')
        ? { data: [{ id: PRODUCT }], error: null }
        : { data: [{ id: PRODUCT, title: 'Panier', admin_hidden_at: null }], error: null }
    const res = await bulkActivateProductsAction({ productIds: [PRODUCT] })
    expect(res).toMatchObject({ ok: true, updatedCount: 1 })
    const [w] = writes('products')
    expect(eqs(w, 'shop_id')).toEqual([OWN_SHOP])
  })

  it('bulkDeleteProductsAction: every per-row DELETE is scoped to the caller’s shop', async () => {
    h.state.respond = (c) => {
      if (c.table === 'orders') return { data: [], error: null }
      if (has(c, 'delete')) return { error: null }
      return { data: [{ id: PRODUCT, title: 'A' }, { id: OTHER_PRODUCT, title: 'B' }], error: null }
    }
    const res = await bulkDeleteProductsAction({ productIds: [PRODUCT, OTHER_PRODUCT] })
    expect(res).toMatchObject({ ok: true, updatedCount: 2 })
    const deletes = writes('products')
    expect(deletes).toHaveLength(2)
    for (const d of deletes) expect(eqs(d, 'shop_id')).toEqual([OWN_SHOP])
  })
})
