/**
 * `uploadProductImageAction` (src/app/actions/products.ts) — provenance-write ordering.
 *
 * This is the action whose output (`path`) `createProductAction` and `addProductImageAction` later
 * reference in a `product_images` INSERT that the `enforce_product_image_provenance` DB trigger
 * gates. The invariant this action alone is responsible for: the provenance row for `path` must be
 * durably committed BEFORE `path` is returned to the caller — the client cannot invoke either
 * consumer action before it receives `path` from THIS action's return, so confirming the insert
 * here is what makes the trigger's check reliably pass for a legitimate upload. See
 * uploaded-objects-provenance-rls.test.ts for the trigger itself proven against a live database.
 *
 * `createProductAction`'s own request/response shape (ownership, Zod, the compensating delete) is
 * covered by create-product-action.test.ts and unchanged here.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'

const h = vi.hoisted(() => {
  const USER_ID = 'user-1'
  const SHOP_ID = '11111111-1111-4111-8111-111111111111'
  const PRODUCT_ID = '22222222-2222-4222-8222-222222222222'
  type Err = { message: string; code?: string } | null
  const state = {
    user: null as { id: string } | null,
    uploadError: null as Err,
    infoResult: { data: { size: 4 } as { size: number } | null, error: null as Err },
  }
  const calls = { uploaded: [] as string[] }
  const storage = {
    from: () => ({
      upload: vi.fn((path: string) => {
        calls.uploaded.push(path)
        return Promise.resolve({ error: state.uploadError })
      }),
      info: vi.fn(() => Promise.resolve(state.infoResult)),
      getPublicUrl: (p: string) => ({ data: { publicUrl: `https://cdn.test/product-images/${p}` } }),
    }),
  }
  return { state, calls, storage, USER_ID, SHOP_ID, PRODUCT_ID }
})

const { USER_ID, SHOP_ID, PRODUCT_ID } = h

const provenanceCalls: { bucket: string; path: string; owner: string }[] = []
let provenanceInsertShouldFail = false
let provenanceCallOrder: 'before-return' | null = null

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    from: () => {
      throw new Error('uploadProductImageAction should not touch a Postgres table directly')
    },
    storage: h.storage,
    auth: { getUser: async () => ({ data: { user: h.state.user } }) },
  })),
}))
vi.mock('@/lib/shops/owner-shop', () => ({
  resolveOwnedShopId: vi.fn(async () => ({ ok: true, shopId: h.SHOP_ID })),
}))
vi.mock('@/lib/images/normalize', () => ({
  normalizeProductImage: vi.fn(async () => ({ ok: true, blob: new Blob(['test']), width: 10, height: 10 })),
  MAX_INPUT_BYTES: 5 * 1024 * 1024,
  MAX_INPUT_MB: 5,
}))
vi.mock('@/lib/images/provenance', () => ({
  recordUploadProvenance: vi.fn(async (bucket: string, path: string, owner: string) => {
    provenanceCalls.push({ bucket, path, owner })
    provenanceCallOrder = 'before-return' // set before the action can possibly have returned
    return provenanceInsertShouldFail ? { ok: false, error: 'boom' } : { ok: true }
  }),
}))
vi.mock('@/lib/products/gallery', () => ({
  isPathWithinProduct: (p: string, shopId: string, productId: string) => p.startsWith(`${shopId}/${productId}/`),
  nextDisplayOrder: (existing: number[]) => (existing.length === 0 ? 0 : Math.max(...existing) + 1),
}))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/i18n/server', () => ({ getLang: async () => 'fr' }))
vi.mock('@/lib/i18n', () => ({ t: (k: string) => k }))

import { uploadProductImageAction } from '@/app/actions/products'

function imageFormData(): FormData {
  const fd = new FormData()
  fd.set('productId', PRODUCT_ID)
  fd.set('image', new File([new Uint8Array([1, 2, 3, 4])], 'a.webp', { type: 'image/webp' }))
  return fd
}

beforeEach(() => {
  h.state.user = { id: USER_ID }
  h.state.uploadError = null
  h.state.infoResult = { data: { size: 4 }, error: null }
  h.calls.uploaded.length = 0
  provenanceCalls.length = 0
  provenanceInsertShouldFail = false
  provenanceCallOrder = null
  vi.clearAllMocks()
})

describe('uploadProductImageAction — provenance ordering', () => {
  it('records provenance for the uploaded path, owned by the caller, before returning it', async () => {
    const res = await uploadProductImageAction(imageFormData())
    expect(res.ok).toBe(true)
    if (!res.ok) throw new Error('unreachable')

    expect(provenanceCalls).toHaveLength(1)
    expect(provenanceCalls[0].bucket).toBe('product-images')
    expect(provenanceCalls[0].owner).toBe(USER_ID)
    expect(provenanceCalls[0].path).toBe(h.calls.uploaded[0])
    // The exact path returned to the caller is the one provenance was recorded for — the caller
    // literally cannot reference any other path in the next call.
    expect(res.path).toBe(provenanceCalls[0].path)
    expect(provenanceCallOrder).toBe('before-return')
  })

  it('the path is server-derived under {shopId}/{productId}/, matching what the trigger will check ownership against', async () => {
    const res = await uploadProductImageAction(imageFormData())
    expect(res.ok).toBe(true)
    if (!res.ok) throw new Error('unreachable')
    expect(res.path.startsWith(`${SHOP_ID}/${PRODUCT_ID}/`)).toBe(true)
  })

  it('fails the whole action, without returning a path, when the provenance insert fails', async () => {
    provenanceInsertShouldFail = true
    const res = await uploadProductImageAction(imageFormData())
    expect(res.ok).toBe(false)
  })

  it('never calls recordUploadProvenance when the storage upload itself fails', async () => {
    h.state.uploadError = { message: 'network boom' }
    const res = await uploadProductImageAction(imageFormData())
    expect(res.ok).toBe(false)
    expect(provenanceCalls).toHaveLength(0)
  })
})
