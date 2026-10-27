import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock-only: the Supabase client is a recording stub. The image pipeline (sharp, service-role storage)
// is mocked away — it is not under test here.
const h = vi.hoisted(() => ({
  getUser: vi.fn(),
  signInWithPassword: vi.fn(),
  updateUser: vi.fn(),
  signOut: vi.fn(),
  update: vi.fn(),
  eq: vi.fn(),
  insert: vi.fn(),
  calls: [] as string[],
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: {
      getUser: h.getUser,
      signInWithPassword: (...a: unknown[]) => {
        h.calls.push('signIn')
        return h.signInWithPassword(...a)
      },
      updateUser: (...a: unknown[]) => {
        h.calls.push('updateUser')
        return h.updateUser(...a)
      },
      signOut: (...a: unknown[]) => {
        h.calls.push('signOut')
        return h.signOut(...a)
      },
    },
    from: () => ({
      update: (...a: unknown[]) => {
        h.update(...a)
        return { eq: h.eq }
      },
      insert: h.insert,
    }),
  }),
}))
vi.mock('@/lib/i18n/server', () => ({ getLang: async () => 'fr' }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/images/normalize', () => ({ normalizeAvatar: vi.fn(), MAX_INPUT_BYTES: 1, MAX_INPUT_MB: 1 }))
vi.mock('@/lib/images/provenance', () => ({ recordUploadProvenance: vi.fn(), deleteUploadProvenance: vi.fn() }))
vi.mock('@/lib/images/upload-guard', () => ({ isCallerActive: vi.fn(), uploadBucket: vi.fn() }))

import { updateProfileAction, requestAccountDeletionAction, changePasswordAction } from './actions'

const USER = { id: 'u1', email: 'me@example.com' }

beforeEach(() => {
  for (const m of [h.getUser, h.signInWithPassword, h.updateUser, h.signOut, h.update, h.eq, h.insert]) m.mockReset()
  h.calls.length = 0
  h.getUser.mockResolvedValue({ data: { user: USER } })
  h.signOut.mockResolvedValue({ error: null })
  h.eq.mockResolvedValue({ error: null })
  h.signInWithPassword.mockResolvedValue({ error: null })
  h.updateUser.mockResolvedValue({ error: null })
  h.insert.mockResolvedValue({ error: null })
})

describe('updateProfileAction', () => {
  const valid = { fullName: ' Yassine Ben Ali ', phone: '55 123 456', city: 'Tunis', language: 'ar' }

  it('trims, normalises the phone and writes only the four allowed columns for the session user', async () => {
    expect(await updateProfileAction(valid)).toEqual({ ok: true })
    expect(h.update).toHaveBeenCalledWith({ full_name: 'Yassine Ben Ali', phone: '+21655123456', city: 'Tunis', language: 'ar' })
    expect(h.eq).toHaveBeenCalledWith('id', 'u1')
  })

  it("turns '' into null for phone and city (ParametresShell's pass-through of null fields)", async () => {
    await updateProfileAction({ fullName: 'A', phone: '', city: '', language: 'fr' })
    expect(h.update).toHaveBeenCalledWith({ full_name: 'A', phone: null, city: null, language: 'fr' })
  })

  it('sends an unknown language as fr', async () => {
    await updateProfileAction({ ...valid, language: 'xx' })
    expect(h.update).toHaveBeenCalledWith(expect.objectContaining({ language: 'fr' }))
  })

  it('does not write language at all when the caller omits it (I1 leaves it to I2)', async () => {
    await updateProfileAction({ fullName: 'A', phone: '', city: '' })
    expect(h.update).toHaveBeenCalledWith({ full_name: 'A', phone: null, city: null })
  })

  it.each([
    [{ fullName: '   ' }, 'fullName'],
    [{ fullName: 'x'.repeat(121) }, 'fullName'],
    [{ phone: '123' }, 'phone'],
    [{ phone: '5'.repeat(40) }, 'phone'],
    [{ city: 'Atlantis' }, 'city'],
  ])('refuses %j before any write and names the field', async (patch, field) => {
    const res = await updateProfileAction({ ...valid, ...patch })
    expect(res).toMatchObject({ ok: false, field })
    expect(h.update).not.toHaveBeenCalled()
  })

  it('refuses a visitor without a session', async () => {
    h.getUser.mockResolvedValue({ data: { user: null } })
    expect(await updateProfileAction(valid)).toMatchObject({ ok: false })
    expect(h.update).not.toHaveBeenCalled()
  })

  it('logs message / code / details — never the raw error object', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    h.eq.mockResolvedValue({ error: { message: 'boom', code: '42501', details: 'd' } })
    expect(await updateProfileAction(valid)).toMatchObject({ ok: false })
    expect(log).toHaveBeenCalledWith('[updateProfileAction] update error:', 'boom', '42501', 'd')
    log.mockRestore()
  })
})

describe('requestAccountDeletionAction', () => {
  it('inserts the session user with a trimmed reason, or null when blank', async () => {
    expect(await requestAccountDeletionAction('  trop cher ')).toEqual({ ok: true })
    expect(h.insert).toHaveBeenLastCalledWith({ user_id: 'u1', reason: 'trop cher' })
    await requestAccountDeletionAction('   ')
    expect(h.insert).toHaveBeenLastCalledWith({ user_id: 'u1', reason: null })
  })

  it('refuses a reason over 500 characters without inserting', async () => {
    expect(await requestAccountDeletionAction('x'.repeat(501))).toMatchObject({ ok: false })
    expect(h.insert).not.toHaveBeenCalled()
  })

  it('answers « already pending » on the unique-index violation (23505)', async () => {
    h.insert.mockResolvedValue({ error: { code: '23505', message: 'dup' } })
    const res = await requestAccountDeletionAction('')
    expect(res).toMatchObject({ ok: false, error: expect.stringContaining('déjà en cours') })
  })
})

describe('changePasswordAction', () => {
  const input = { currentPassword: 'OldPass123', newPassword: 'NewPass456' }

  it("re-authenticates with the SESSION user's email, updates, then ends the OTHER sessions — in that order", async () => {
    expect(await changePasswordAction(input)).toEqual({ ok: true })
    expect(h.signInWithPassword).toHaveBeenCalledWith({ email: 'me@example.com', password: 'OldPass123' })
    expect(h.updateUser).toHaveBeenCalledWith({ password: 'NewPass456' })
    expect(h.signOut).toHaveBeenCalledWith({ scope: 'others' })
    expect(h.calls).toEqual(['signIn', 'updateUser', 'signOut'])
  })

  it('still succeeds, and logs the fields, when ending the other sessions fails', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    h.signOut.mockResolvedValue({ error: { message: 'down', code: 'x', status: 500 } })
    expect(await changePasswordAction(input)).toEqual({ ok: true })
    expect(log).toHaveBeenCalledWith('[changePasswordAction] sign-out of other sessions failed:', 'down', 'x', 500)
    log.mockRestore()
  })

  it('does not end other sessions when the update failed', async () => {
    h.updateUser.mockResolvedValue({ error: { code: 'same_password', message: 'x', status: 422 } })
    await changePasswordAction(input)
    expect(h.signOut).not.toHaveBeenCalled()
  })

  it('names currentPassword on invalid_credentials and never updates', async () => {
    h.signInWithPassword.mockResolvedValue({ error: { code: 'invalid_credentials', message: 'x', status: 400 } })
    expect(await changePasswordAction(input)).toMatchObject({ ok: false, field: 'currentPassword' })
    expect(h.updateUser).not.toHaveBeenCalled()
  })

  it.each([
    [{ newPassword: 'short1' }, 'newPassword'],
    [{ newPassword: 'onlyletters' }, 'newPassword'],
    [{ currentPassword: '' }, 'currentPassword'],
    [{ newPassword: 'OldPass123' }, 'newPassword'],
  ])('refuses %j before any Auth call', async (patch, field) => {
    expect(await changePasswordAction({ ...input, ...patch })).toMatchObject({ ok: false, field })
    expect(h.signInWithPassword).not.toHaveBeenCalled()
  })

  it.each([
    ['same_password', 'newPassword'],
    ['weak_password', 'newPassword'],
  ])('maps Auth %s to the new-password field', async (code, field) => {
    h.updateUser.mockResolvedValue({ error: { code, message: code, status: 422 } })
    expect(await changePasswordAction(input)).toMatchObject({ ok: false, field })
  })

  it('refuses a visitor without a session', async () => {
    h.getUser.mockResolvedValue({ data: { user: null } })
    expect(await changePasswordAction(input)).toMatchObject({ ok: false })
    expect(h.signInWithPassword).not.toHaveBeenCalled()
  })
})
