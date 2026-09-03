/**
 * `uploadShopAsset` (src/app/ma-boutique/creer/actions.ts) and `updateShopAsset`
 * (src/app/ma-boutique/modifier/actions.ts) — provenance-write ordering, both shop-asset paths.
 *
 * Same scope note as upload-avatar-provenance.test.ts: this covers the provenance ordering and
 * cleanup, mocked at the call level. The real trigger/RLS proof is
 * uploaded-objects-provenance-rls.test.ts.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'

const h = vi.hoisted(() => {
  const USER_ID = 'user-1'
  const SHOP_ID = '11111111-1111-4111-8111-111111111111'
  type Err = { message: string; code?: string } | null
  const state = {
    user: null as { id: string } | null,
    shopsSelectResult: { data: { id: SHOP_ID } as { id: string } | null, error: null as Err }, // creer's ownership check
    currentAssetResult: { data: { logo_url: null, banner_url: null } as Record<string, unknown> | null, error: null as Err }, // modifier's current-value read
    uploadError: null as Err,
    infoResult: { data: { size: 4 } as { size: number } | null, error: null as Err },
    shopUpdateError: null as Err,
  }
  const calls = {
    uploaded: [] as string[],
    removed: [] as string[][],
    shopUpdates: [] as Record<string, unknown>[],
  }
  const storage = {
    from: () => ({
      upload: vi.fn((path: string) => {
        calls.uploaded.push(path)
        return Promise.resolve({ error: state.uploadError })
      }),
      info: vi.fn(() => Promise.resolve(state.infoResult)),
      remove: vi.fn((paths: string[]) => {
        calls.removed.push(paths)
        return Promise.resolve({ error: null })
      }),
      getPublicUrl: (p: string) => ({ data: { publicUrl: `https://cdn.test/shop-assets/${p}` } }),
    }),
  }
  function from(table: string) {
    if (table === 'shops') {
      const b: Record<string, unknown> = {}
      // Both files' shapes fit through the same chain: .select().eq(...).eq(...)?.maybeSingle()/.single(),
      // and .update(...).eq(...). eq() is chainable and returns `b` until a terminator is called.
      b.select = vi.fn(() => b)
      b.eq = vi.fn(() => b)
      b.maybeSingle = vi.fn(() => Promise.resolve(state.shopsSelectResult))
      b.single = vi.fn(() => Promise.resolve(state.currentAssetResult))
      b.update = vi.fn((row: Record<string, unknown>) => {
        calls.shopUpdates.push(row)
        return { eq: vi.fn(() => Promise.resolve({ error: state.shopUpdateError })) }
      })
      return b
    }
    throw new Error(`unexpected table ${table}`)
  }
  return { state, calls, storage, from, USER_ID, SHOP_ID }
})

const { USER_ID, SHOP_ID } = h

const provenanceCalls: { bucket: string; path: string; owner: string }[] = []
const provenanceDeleteCalls: { bucket: string; path: string }[] = []
let provenanceInsertShouldFail = false

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    from: h.from,
    storage: h.storage,
    auth: { getUser: async () => ({ data: { user: h.state.user } }) },
  })),
}))
vi.mock('@/lib/shops/owner-shop', () => ({
  resolveOwnedShopId: vi.fn(async () => ({ ok: true, shopId: h.SHOP_ID })),
}))
vi.mock('@/lib/images/normalize', () => ({
  normalizeShopLogo: vi.fn(async () => ({ ok: true, blob: new Blob(['test']), width: 10, height: 10 })),
  normalizeShopBanner: vi.fn(async () => ({ ok: true, blob: new Blob(['test']), width: 10, height: 10 })),
  MAX_INPUT_BYTES: 5 * 1024 * 1024,
  MAX_INPUT_MB: 5,
}))
vi.mock('@/lib/images/provenance', () => ({
  recordUploadProvenance: vi.fn(async (bucket: string, path: string, owner: string) => {
    provenanceCalls.push({ bucket, path, owner })
    return provenanceInsertShouldFail ? { ok: false, error: 'boom' } : { ok: true }
  }),
  deleteUploadProvenance: vi.fn(async (bucket: string, path: string) => {
    provenanceDeleteCalls.push({ bucket, path })
  }),
}))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/i18n/server', () => ({ getLang: async () => 'fr' }))
vi.mock('@/lib/i18n', () => ({ t: (k: string) => k }))
vi.mock('@/lib/tunisia-governorates', () => ({ GOVERNORATES: [{ value: 'Tunis', label: 'Tunis' }] }))

import { uploadShopLogoAction, uploadShopBannerAction } from '@/app/ma-boutique/creer/actions'
import { updateShopLogoAction, updateShopBannerAction } from '@/app/ma-boutique/modifier/actions'

function assetFormData(withShopId: boolean): FormData {
  const fd = new FormData()
  if (withShopId) fd.set('shopId', SHOP_ID)
  fd.set('file', new File([new Uint8Array([1, 2, 3, 4])], 'a.webp', { type: 'image/webp' }))
  return fd
}

beforeEach(() => {
  h.state.user = { id: USER_ID }
  h.state.shopsSelectResult = { data: { id: SHOP_ID }, error: null }
  h.state.currentAssetResult = { data: { logo_url: null, banner_url: null }, error: null }
  h.state.uploadError = null
  h.state.infoResult = { data: { size: 4 }, error: null }
  h.state.shopUpdateError = null
  h.calls.uploaded.length = 0
  h.calls.removed.length = 0
  h.calls.shopUpdates.length = 0
  provenanceCalls.length = 0
  provenanceDeleteCalls.length = 0
  provenanceInsertShouldFail = false
  vi.clearAllMocks()
})

describe.each([
  ['create-time (uploadShopAsset)', () => uploadShopLogoAction(assetFormData(true)), () => uploadShopBannerAction(assetFormData(true))],
  ['modify-time (updateShopAsset)', () => updateShopLogoAction(assetFormData(false)), () => updateShopBannerAction(assetFormData(false))],
])('%s — provenance ordering', (_label, logoAction, bannerAction) => {
  it('records provenance for the uploaded logo path, owned by the caller, BEFORE updating shops.logo_url', async () => {
    const res = await logoAction()
    expect(res.ok).toBe(true)

    expect(provenanceCalls).toHaveLength(1)
    expect(provenanceCalls[0].bucket).toBe('shop-assets')
    expect(provenanceCalls[0].owner).toBe(USER_ID)
    expect(provenanceCalls[0].path).toBe(h.calls.uploaded[0])
    expect(h.calls.shopUpdates[0].logo_url).toContain(provenanceCalls[0].path)
  })

  it('records provenance for the uploaded banner path (the other shop-asset kind) too', async () => {
    const res = await bannerAction()
    expect(res.ok).toBe(true)
    expect(provenanceCalls[0].bucket).toBe('shop-assets')
    expect(h.calls.shopUpdates[0].banner_url).toContain(provenanceCalls[0].path)
  })

  it('removes the storage object and skips the shops update when the provenance insert fails', async () => {
    provenanceInsertShouldFail = true
    const res = await logoAction()
    expect(res.ok).toBe(false)
    expect(h.calls.shopUpdates).toHaveLength(0)
    expect(h.calls.removed).toEqual([[h.calls.uploaded[0]]])
  })

  it('cleans up BOTH the storage object and the provenance row when the integrity check fails', async () => {
    h.state.infoResult = { data: { size: 999 }, error: null }
    const res = await logoAction()
    expect(res.ok).toBe(false)
    expect(h.calls.removed).toEqual([[h.calls.uploaded[0]]])
    expect(provenanceDeleteCalls).toEqual([{ bucket: 'shop-assets', path: h.calls.uploaded[0] }])
  })

  it('cleans up BOTH the storage object and the provenance row when the shops update fails', async () => {
    h.state.shopUpdateError = { message: 'boom', code: '42501' }
    const res = await logoAction()
    expect(res.ok).toBe(false)
    expect(h.calls.removed).toEqual([[h.calls.uploaded[0]]])
    expect(provenanceDeleteCalls).toEqual([{ bucket: 'shop-assets', path: h.calls.uploaded[0] }])
  })
})
