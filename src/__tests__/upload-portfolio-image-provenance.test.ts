/**
 * `uploadPortfolioImageAction` (src/app/mon-profil-freelance/modifier/actions.ts) —
 * provenance-write ordering. Same invariant as upload-product-image-provenance.test.ts (the
 * sibling this mirrors): the uploaded_objects row for `path` must be durably committed BEFORE
 * `path` is returned, because the client's next call (saveProfileAction, referencing the path in
 * a freelancer_portfolio_items insert) is a separate round trip with no shared transaction.
 * h3-links-portfolio-rls.test.ts proves the trigger itself against a live database; this file
 * proves the ordering this action alone is responsible for.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

// The daily upload cap's pre-check (src/lib/images/upload-quota.ts) — a service-role count, mocked.
const quota = vi.hoisted(() => ({ value: { ok: true, reached: false } as { ok: true; reached: boolean } | { ok: false } }))
vi.mock('@/lib/images/upload-quota', () => ({ dailyUploadQuota: vi.fn(async () => quota.value), DAILY_UPLOAD_CAP: 100 }))

const h = vi.hoisted(() => {
  const USER_ID = 'user-1'
  const FREELANCER_PROFILE_ID = '33333333-3333-4333-8333-333333333333'
  type Err = { message: string; code?: string } | null
  const state = { user: null as { id: string } | null, uploadError: null as Err, storedSize: 4 as number | null }
  const calls = { uploaded: [] as string[] }
  const storage = {
    from: () => ({
      upload: vi.fn((path: string) => {
        calls.uploaded.push(path)
        return Promise.resolve({ error: state.uploadError })
      }),
      getPublicUrl: (p: string) => ({ data: { publicUrl: `https://cdn.test/portfolio-media/${p}` } }),
      // The stored-size read-back; the mocked normalizer's blob is 4 bytes ('test').
      info: vi.fn(async () =>
        state.storedSize === null ? { data: null, error: { message: 'not found' } } : { data: { size: state.storedSize }, error: null },
      ),
    }),
  }
  return { state, calls, storage, USER_ID, FREELANCER_PROFILE_ID }
})

const { USER_ID } = h

const provenanceCalls: { bucket: string; path: string; owner: string }[] = []
let provenanceInsertShouldFail = false
let provenanceCapReached = false
let provenanceCallOrder: 'before-return' | null = null

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    from: () => {
      throw new Error('uploadPortfolioImageAction should not touch a Postgres table directly')
    },
    // S-3: the session client must never upload; uploadBucket (service role) is the only writer.
    storage: { from: () => ({ ...h.storage.from(), upload: () => { throw new Error('session-client upload: must go through uploadBucket') } }) },
    auth: { getUser: async () => ({ data: { user: h.state.user } }) },
  })),
}))
vi.mock('@/lib/freelancer/owner-profile', () => ({
  resolveOwnedFreelancerProfileId: vi.fn(async () => ({ ok: true, freelancerProfileId: h.FREELANCER_PROFILE_ID })),
}))
vi.mock('@/lib/images/normalize', () => ({
  normalizePortfolioImage: vi.fn(async () => ({ ok: true, blob: new Blob(['test']), width: 10, height: 10 })),
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
    provenanceCallOrder = 'before-return'
    return provenanceInsertShouldFail ? { ok: false, error: 'boom', capReached: provenanceCapReached } : { ok: true }
  }),
}))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/i18n/server', () => ({ getLang: async () => 'fr' }))
vi.mock('@/lib/i18n', () => ({ t: (k: string) => k }))

import { uploadPortfolioImageAction } from '@/app/mon-profil-freelance/modifier/actions'

function imageFormData(): FormData {
  const fd = new FormData()
  fd.set('image', new File([new Uint8Array([1, 2, 3, 4])], 'a.webp', { type: 'image/webp' }))
  return fd
}

beforeEach(() => {
  h.state.user = { id: USER_ID }
  guard.active = true
  h.state.uploadError = null
  h.state.storedSize = 4
  h.calls.uploaded.length = 0
  provenanceCalls.length = 0
  provenanceInsertShouldFail = false
  provenanceCallOrder = null
  vi.clearAllMocks()
})

describe('uploadPortfolioImageAction — provenance ordering', () => {
  it('records provenance for the uploaded path, owned by the caller (auth uid, not the freelancer_profile_id), before returning it', async () => {
    const res = await uploadPortfolioImageAction(imageFormData())
    expect(res.ok).toBe(true)
    if (!res.ok) throw new Error('unreachable')

    expect(provenanceCalls).toHaveLength(1)
    expect(provenanceCalls[0].bucket).toBe('portfolio-media')
    // The trigger resolves owner via freelancer_profiles.profile_id, which IS auth.uid() — the
    // provenance row must be keyed the same way, not on freelancer_profile_id.
    expect(provenanceCalls[0].owner).toBe(USER_ID)
    expect(provenanceCalls[0].path).toBe(h.calls.uploaded[0])
    expect(res.path).toBe(provenanceCalls[0].path)
    expect(provenanceCallOrder).toBe('before-return')
  })

  it('the path is server-derived under {authUid}/, matching the storage RLS policy and what the trigger checks ownership against', async () => {
    const res = await uploadPortfolioImageAction(imageFormData())
    expect(res.ok).toBe(true)
    if (!res.ok) throw new Error('unreachable')
    expect(res.path.startsWith(`${USER_ID}/`)).toBe(true)
  })

  it('fails the whole action, without returning a path, when the provenance insert fails', async () => {
    provenanceInsertShouldFail = true
    const res = await uploadPortfolioImageAction(imageFormData())
    expect(res.ok).toBe(false)
  })

  it('never calls recordUploadProvenance when the storage upload itself fails', async () => {
    h.state.uploadError = { message: 'network boom' }
    const res = await uploadPortfolioImageAction(imageFormData())
    expect(res.ok).toBe(false)
    expect(provenanceCalls).toHaveLength(0)
  })
})

describe('S-3 — a suspended caller is refused before any byte is stored or recorded', () => {
  it.each([['uploadPortfolioImageAction', () => uploadPortfolioImageAction(imageFormData())]] as const)('%s', async (_label, run) => {
    guard.active = false
    const res = await run()
    expect(res).toMatchObject({ ok: false, error: 'auth.suspended_banner' })
    expect(h.calls.uploaded).toEqual([])
    expect(provenanceCalls).toEqual([])
  })
})

// Audit pass 2 « Logged »: the portfolio path now has the same two checks as the other four upload paths.
describe('uploadPortfolioImageAction — size pre-check and stored-size integrity check', () => {
  it('refuses a file over MAX_INPUT_BYTES with the « too large » message, before anything is stored', async () => {
    const fd = new FormData()
    fd.set('image', new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'big.jpg', { type: 'image/jpeg' }))
    const res = await uploadPortfolioImageAction(fd)
    expect(res).toEqual({ ok: false, error: 'product.image.error.tooLarge' })
    expect(h.calls.uploaded).toEqual([])
    expect(provenanceCalls).toEqual([])
  })

  it('fails without returning a path when the stored size differs from what was sent', async () => {
    h.state.storedSize = 7
    const res = await uploadPortfolioImageAction(imageFormData())
    expect(res).toEqual({ ok: false, error: 'common.error_generic' })
  })

  it('fails without returning a path when the stored object cannot be read back', async () => {
    h.state.storedSize = null
    const res = await uploadPortfolioImageAction(imageFormData())
    expect(res.ok).toBe(false)
  })

  it('returns the path when the stored size matches', async () => {
    const res = await uploadPortfolioImageAction(imageFormData())
    expect(res.ok).toBe(true)
  })
})

describe('uploadPortfolioImageAction — the daily upload cap (100 per rolling 24 h)', () => {
  beforeEach(() => {
    quota.value = { ok: true, reached: false }
    provenanceCapReached = false
  })

  it('cap reached: « limite atteinte », nothing decoded, stored or recorded', async () => {
    quota.value = { ok: true, reached: true }
    const res = await uploadPortfolioImageAction(imageFormData())
    expect(res).toEqual({ ok: false, error: 'upload.error.daily_cap' })
    expect(h.calls.uploaded).toEqual([])
    expect(provenanceCalls).toEqual([])
  })

  it('a failed count is the generic error, never an unchecked upload', async () => {
    quota.value = { ok: false }
    const res = await uploadPortfolioImageAction(imageFormData())
    expect(res).toMatchObject({ ok: false, error: 'common.error_generic' })
    expect(h.calls.uploaded).toEqual([])
  })

  it('the database backstop (provenance refused with daily_upload_cap) reads as « limite atteinte »', async () => {
    provenanceInsertShouldFail = true
    provenanceCapReached = true
    const res = await uploadPortfolioImageAction(imageFormData())
    expect(res).toEqual({ ok: false, error: 'upload.error.daily_cap' })
  })

  it('any other provenance failure keeps its own error', async () => {
    provenanceInsertShouldFail = true
    const res = await uploadPortfolioImageAction(imageFormData())
    expect(res).toMatchObject({ ok: false, error: 'common.error_generic' })
  })
})
