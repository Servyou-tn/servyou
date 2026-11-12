/**
 * `uploadShopAsset` (src/app/ma-boutique/creer/actions.ts) and `updateShopAsset`
 * (src/app/ma-boutique/modifier/actions.ts) — provenance-write ordering, both shop-asset paths.
 *
 * Same scope note as upload-avatar-provenance.test.ts: this covers the provenance ordering and
 * cleanup, mocked at the call level. The real trigger/RLS proof is
 * uploaded-objects-provenance-rls.test.ts.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'

// The daily upload cap's pre-check (src/lib/images/upload-quota.ts) — a service-role count, mocked.
const quota = vi.hoisted(() => ({ value: { ok: true, reached: false } as { ok: true; reached: boolean } | { ok: false } }))
vi.mock('@/lib/images/upload-quota', () => ({ dailyUploadQuota: vi.fn(async () => quota.value), DAILY_UPLOAD_CAP: 100 }))

const h = vi.hoisted(() => {
  const USER_ID = 'user-1'
  const SHOP_ID = '11111111-1111-4111-8111-111111111111'
  type Err = { message: string; code?: string } | null
  const state = {
    user: null as { id: string } | null,
    // creer's ownership check (since M5 it also reads the current logo / banner URL)
    shopsSelectResult: { data: { id: SHOP_ID, logo_url: null, banner_url: null } as Record<string, unknown> | null, error: null as Err },
    currentAssetResult: { data: { logo_url: null, banner_url: null } as Record<string, unknown> | null, error: null as Err }, // modifier's current-value read
    uploadError: null as Err,
    infoResult: { data: { size: 4 } as { size: number } | null, error: null as Err },
    shopUpdateError: null as Err,
  }
  const calls = {
    uploaded: [] as string[],
    removed: [] as string[][], // service-role (uploadBucket) deletes: the new object on a failure path
    sessionRemoved: [] as string[][], // session-client deletes: the replaced object, scoped by the owner-delete policy
    shopUpdates: [] as Record<string, unknown>[],
    shopsEq: [] as [string, unknown][],
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
      b.eq = vi.fn((column: string, value: unknown) => {
        calls.shopsEq.push([column, value])
        return b
      })
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
let provenanceCapReached = false

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    from: h.from,
    // S-3: the session client must never upload; uploadBucket (service role) is the only writer.
    storage: {
      from: () => ({
        ...h.storage.from(),
        upload: () => { throw new Error('session-client upload: must go through uploadBucket') },
        remove: (paths: string[]) => {
          h.calls.sessionRemoved.push(paths)
          return Promise.resolve({ error: null })
        },
      }),
    },
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
// S-3: new objects go through the service role (uploadBucket), routed here to the same storage mock; the
// caller-active check is controllable per test.
const guard = vi.hoisted(() => ({ active: true }))
vi.mock('@/lib/images/upload-guard', () => ({
  isCallerActive: vi.fn(async () => guard.active),
  uploadBucket: () => h.storage.from(),
}))
vi.mock('@/lib/images/provenance', () => ({
  recordUploadProvenance: vi.fn(async (bucket: string, path: string, owner: string) => {
    provenanceCalls.push({ bucket, path, owner })
    return provenanceInsertShouldFail ? { ok: false, error: 'boom', capReached: provenanceCapReached } : { ok: true }
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
import { resolveOwnedShopId } from '@/lib/shops/owner-shop'
import { updateShopLogoAction, updateShopBannerAction } from '@/app/ma-boutique/modifier/actions'

function assetFormData(withShopId: boolean): FormData {
  const fd = new FormData()
  if (withShopId) fd.set('shopId', SHOP_ID)
  fd.set('file', new File([new Uint8Array([1, 2, 3, 4])], 'a.webp', { type: 'image/webp' }))
  return fd
}

beforeEach(() => {
  h.state.user = { id: USER_ID }
  guard.active = true
  h.state.shopsSelectResult = { data: { id: SHOP_ID, logo_url: null, banner_url: null }, error: null }
  h.state.currentAssetResult = { data: { logo_url: null, banner_url: null }, error: null }
  h.state.uploadError = null
  h.state.infoResult = { data: { size: 4 }, error: null }
  h.state.shopUpdateError = null
  h.calls.uploaded.length = 0
  h.calls.removed.length = 0
  h.calls.sessionRemoved.length = 0
  h.calls.shopsEq.length = 0
  h.calls.shopUpdates.length = 0
  provenanceCalls.length = 0
  provenanceDeleteCalls.length = 0
  provenanceInsertShouldFail = false
  provenanceCapReached = false
  quota.value = { ok: true, reached: false }
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

describe('S-3 — a suspended caller is refused before any byte is stored or recorded', () => {
  it.each([['uploadShopAsset (create)', () => uploadShopLogoAction(assetFormData(true))], ['updateShopAsset (modify)', () => updateShopLogoAction(assetFormData(false))]] as const)('%s', async (_label, run) => {
    guard.active = false
    const res = await run()
    expect(res).toMatchObject({ ok: false, error: 'auth.suspended_banner' })
    expect(h.calls.uploaded).toEqual([])
    expect(provenanceCalls).toEqual([])
  })
})

describe('S-3 — ownership is re-derived server-side before the service-role upload', () => {
  it('create-time: a client shopId the caller does not own is refused, nothing stored or recorded', async () => {
    h.state.shopsSelectResult = { data: null, error: null } // the .eq('owner_id', user.id) re-read found no row
    const res = await uploadShopLogoAction(assetFormData(true))
    expect(res).toMatchObject({ ok: false })
    expect(h.calls.shopsEq).toContainEqual(['owner_id', h.USER_ID]) // the filter itself is pinned, not just its outcome
    expect(h.calls.uploaded).toEqual([])
    expect(provenanceCalls).toEqual([])
    h.state.shopsSelectResult = { data: { id: h.SHOP_ID, logo_url: null, banner_url: null }, error: null }
  })

  it('modify-time: no shop resolved from the session, nothing stored or recorded', async () => {
    vi.mocked(resolveOwnedShopId).mockResolvedValueOnce({ ok: false, reason: 'no_shop' } as Awaited<ReturnType<typeof resolveOwnedShopId>>)
    const res = await updateShopLogoAction(assetFormData(false))
    expect(res).toMatchObject({ ok: false })
    expect(h.calls.uploaded).toEqual([])
    expect(provenanceCalls).toEqual([])
  })
})

// Audit 2026-11-11 H4: shop images count toward the daily upload cap, like every other upload path.
describe.each([
  ['create-time (uploadShopAsset)', () => uploadShopLogoAction(assetFormData(true))],
  ['modify-time (updateShopAsset)', () => updateShopLogoAction(assetFormData(false))],
])('%s — the daily upload cap (100 per rolling 24 h)', (_label, logoAction) => {
  it('cap reached: « limite atteinte », nothing decoded, stored or recorded', async () => {
    quota.value = { ok: true, reached: true }
    const res = await logoAction()
    expect(res).toEqual({ ok: false, error: 'upload.error.daily_cap' })
    expect(h.calls.uploaded).toEqual([])
    expect(provenanceCalls).toEqual([])
    expect(h.calls.shopUpdates).toEqual([])
  })

  it('a failed count is the generic error, never an unchecked upload', async () => {
    quota.value = { ok: false }
    const res = await logoAction()
    expect(res).toEqual({ ok: false, error: 'common.error_generic' })
    expect(h.calls.uploaded).toEqual([])
  })

  it('the database backstop (provenance refused with daily_upload_cap) reads as « limite atteinte » and deletes the stored file', async () => {
    provenanceInsertShouldFail = true
    provenanceCapReached = true
    const res = await logoAction()
    expect(res).toEqual({ ok: false, error: 'upload.error.daily_cap' })
    expect(h.calls.removed).toEqual([[h.calls.uploaded[0]]])
    expect(h.calls.shopUpdates).toEqual([])
  })

  it('any other provenance failure keeps its own error (and still deletes the stored file)', async () => {
    provenanceInsertShouldFail = true
    const res = await logoAction()
    expect(res).toEqual({ ok: false, error: 'product.image.error.upload' })
    expect(h.calls.removed).toEqual([[h.calls.uploaded[0]]])
  })
})

// Audit 2026-11-11 M5: replacing a logo / banner keeps one file per kind per shop — on the create page too.
const OLD_LOGO = `${SHOP_ID}/logo/00000000-0000-4000-8000-00000000000a.webp`
const OLD_BANNER = `${SHOP_ID}/banner/00000000-0000-4000-8000-00000000000b.webp`
const oldUrls = { logo_url: `https://cdn.test/storage/v1/object/public/shop-assets/${OLD_LOGO}`, banner_url: `https://cdn.test/storage/v1/object/public/shop-assets/${OLD_BANNER}` }

describe.each([
  ['create-time (uploadShopAsset)', () => uploadShopLogoAction(assetFormData(true)), () => uploadShopBannerAction(assetFormData(true))],
  ['modify-time (updateShopAsset)', () => updateShopLogoAction(assetFormData(false)), () => updateShopBannerAction(assetFormData(false))],
])('%s — replacing an existing logo / banner', (_label, logoAction, bannerAction) => {
  beforeEach(() => {
    h.state.shopsSelectResult = { data: { id: SHOP_ID, ...oldUrls }, error: null }
    h.state.currentAssetResult = { data: { ...oldUrls }, error: null }
  })

  it('logo: deletes ONLY the old logo, after the update; its provenance row is kept (the cap counts it)', async () => {
    const res = await logoAction()
    expect(res.ok).toBe(true)
    expect(h.calls.shopUpdates).toHaveLength(1)
    // Through the session client (the owner-delete policy scopes it to this shop), never the service role.
    expect(h.calls.sessionRemoved).toEqual([[OLD_LOGO]])
    expect(h.calls.removed).toEqual([])
    expect(provenanceDeleteCalls).toEqual([])
  })

  it('banner: deletes ONLY the old banner, never the logo', async () => {
    const res = await bannerAction()
    expect(res.ok).toBe(true)
    expect(h.calls.sessionRemoved).toEqual([[OLD_BANNER]])
    expect(h.calls.removed).toEqual([])
  })

  it('a failed shops update keeps the old file (the column still points at it); only the new one is cleaned up', async () => {
    h.state.shopUpdateError = { message: 'boom', code: '42501' }
    const res = await logoAction()
    expect(res.ok).toBe(false)
    expect(h.calls.removed).toEqual([[h.calls.uploaded[0]]])
    expect(h.calls.sessionRemoved).toEqual([])
  })

  it('no previous file: nothing else is deleted', async () => {
    h.state.shopsSelectResult = { data: { id: SHOP_ID, logo_url: null, banner_url: null }, error: null }
    h.state.currentAssetResult = { data: { logo_url: null, banner_url: null }, error: null }
    const res = await logoAction()
    expect(res.ok).toBe(true)
    expect(h.calls.removed).toEqual([])
    expect(h.calls.sessionRemoved).toEqual([])
  })

  it('a malformed stored URL is "nothing to clean up", never a failure after the update', async () => {
    const bad = { logo_url: 'https://cdn.test/storage/v1/object/public/shop-assets/%E0%A4%A.webp', banner_url: null }
    h.state.shopsSelectResult = { data: { id: SHOP_ID, ...bad }, error: null }
    h.state.currentAssetResult = { data: { ...bad }, error: null }
    const res = await logoAction()
    expect(res.ok).toBe(true)
    expect(h.calls.sessionRemoved).toEqual([])
  })
})
