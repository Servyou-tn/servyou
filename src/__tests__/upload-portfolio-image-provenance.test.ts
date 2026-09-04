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

const h = vi.hoisted(() => {
  const USER_ID = 'user-1'
  const FREELANCER_PROFILE_ID = '33333333-3333-4333-8333-333333333333'
  type Err = { message: string; code?: string } | null
  const state = { user: null as { id: string } | null, uploadError: null as Err }
  const calls = { uploaded: [] as string[] }
  const storage = {
    from: () => ({
      upload: vi.fn((path: string) => {
        calls.uploaded.push(path)
        return Promise.resolve({ error: state.uploadError })
      }),
      getPublicUrl: (p: string) => ({ data: { publicUrl: `https://cdn.test/portfolio-media/${p}` } }),
    }),
  }
  return { state, calls, storage, USER_ID, FREELANCER_PROFILE_ID }
})

const { USER_ID } = h

const provenanceCalls: { bucket: string; path: string; owner: string }[] = []
let provenanceInsertShouldFail = false
let provenanceCallOrder: 'before-return' | null = null

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    from: () => {
      throw new Error('uploadPortfolioImageAction should not touch a Postgres table directly')
    },
    storage: h.storage,
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
vi.mock('@/lib/images/provenance', () => ({
  recordUploadProvenance: vi.fn(async (bucket: string, path: string, owner: string) => {
    provenanceCalls.push({ bucket, path, owner })
    provenanceCallOrder = 'before-return'
    return provenanceInsertShouldFail ? { ok: false, error: 'boom' } : { ok: true }
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
  h.state.uploadError = null
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
