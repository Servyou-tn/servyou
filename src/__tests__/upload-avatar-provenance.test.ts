/**
 * `uploadAvatarAction` (src/app/mon-compte/actions.ts) — provenance-write ordering.
 *
 * Scope, per CLAUDE.md's testing discipline: this is the security-sensitive slice of the action —
 * that it calls `recordUploadProvenance` with the right (bucket, path, owner), AWAITS and CONFIRMS
 * it BEFORE the `profiles.avatar_url` update, and cleans the provenance row up on every failure
 * path that already cleans up the storage object. The rest of the action (validation, the
 * integrity check's own reasoning, the sweep) is unchanged by this PR and not re-tested here.
 *
 * The Supabase client and normalizeAvatar are mocked at the call level — this covers WHAT THE
 * ACTION ASKS FOR, not the database or a real image decode. The real trigger/RLS proof against a
 * live database is uploaded-objects-provenance-rls.test.ts.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'

const USER_ID = 'user-1'

const h = vi.hoisted(() => {
  type Err = { message: string; code?: string } | null
  const state = {
    user: null as { id: string } | null,
    uploadError: null as Err,
    infoResult: { data: { size: 4 } as { size: number } | null, error: null as Err },
    profileUpdateError: null as Err,
  }
  const calls = {
    uploaded: [] as string[],
    removed: [] as string[][],
    profileUpdates: [] as Record<string, unknown>[],
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
      getPublicUrl: (p: string) => ({ data: { publicUrl: `https://cdn.test/avatars/${p}` } }),
      list: vi.fn(() => Promise.resolve({ data: [], error: null })),
    }),
  }
  function from(table: string) {
    if (table === 'profiles') {
      const b: Record<string, unknown> = {}
      b.update = vi.fn((row: Record<string, unknown>) => {
        calls.profileUpdates.push(row)
        return { eq: vi.fn(() => Promise.resolve({ error: state.profileUpdateError })) }
      })
      return b
    }
    throw new Error(`unexpected table ${table}`)
  }
  return { state, calls, storage, from }
})

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
vi.mock('@/lib/images/normalize', () => ({
  normalizeAvatar: vi.fn(async () => ({ ok: true, blob: new Blob(['test']), width: 10, height: 10 })),
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
vi.mock('@/lib/phone', () => ({ isValidPhone: () => true, normalizePhone: (p: string) => p }))
vi.mock('@/lib/tunisia-governorates', () => ({ GOVERNORATES: [{ value: 'Tunis', label: 'Tunis' }] }))

import { uploadAvatarAction } from '@/app/mon-compte/actions'

function avatarFormData(): FormData {
  const fd = new FormData()
  fd.set('avatar', new File([new Uint8Array([1, 2, 3, 4])], 'a.webp', { type: 'image/webp' }))
  return fd
}

beforeEach(() => {
  h.state.user = { id: USER_ID }
  h.state.uploadError = null
  h.state.infoResult = { data: { size: 4 }, error: null }
  h.state.profileUpdateError = null
  h.calls.uploaded.length = 0
  h.calls.removed.length = 0
  h.calls.profileUpdates.length = 0
  provenanceCalls.length = 0
  provenanceDeleteCalls.length = 0
  provenanceInsertShouldFail = false
  vi.clearAllMocks()
})

describe('uploadAvatarAction — provenance ordering', () => {
  it('records provenance for the uploaded path, owned by the caller, BEFORE updating profiles.avatar_url', async () => {
    const res = await uploadAvatarAction(avatarFormData())
    expect(res).toEqual({ ok: true })

    expect(provenanceCalls).toHaveLength(1)
    expect(provenanceCalls[0].bucket).toBe('avatars')
    expect(provenanceCalls[0].owner).toBe(USER_ID)
    expect(provenanceCalls[0].path).toBe(h.calls.uploaded[0])
    expect(h.calls.profileUpdates).toHaveLength(1)
    expect(h.calls.profileUpdates[0].avatar_url).toContain(provenanceCalls[0].path)
  })

  it('removes the storage object and skips the profile update when the provenance insert fails', async () => {
    provenanceInsertShouldFail = true
    const res = await uploadAvatarAction(avatarFormData())
    expect(res.ok).toBe(false)
    expect(h.calls.profileUpdates).toHaveLength(0)
    expect(h.calls.removed).toEqual([[h.calls.uploaded[0]]])
  })

  it('cleans up BOTH the storage object and the provenance row when the post-upload integrity check fails', async () => {
    h.state.infoResult = { data: { size: 999 }, error: null } // mismatched size
    const res = await uploadAvatarAction(avatarFormData())
    expect(res.ok).toBe(false)
    expect(h.calls.removed).toEqual([[h.calls.uploaded[0]]])
    expect(provenanceDeleteCalls).toEqual([{ bucket: 'avatars', path: h.calls.uploaded[0] }])
  })

  it('cleans up BOTH the storage object and the provenance row when the profiles update fails', async () => {
    h.state.profileUpdateError = { message: 'boom', code: '42501' }
    const res = await uploadAvatarAction(avatarFormData())
    expect(res.ok).toBe(false)
    expect(h.calls.removed).toEqual([[h.calls.uploaded[0]]])
    expect(provenanceDeleteCalls).toEqual([{ bucket: 'avatars', path: h.calls.uploaded[0] }])
  })
})
