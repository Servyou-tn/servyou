import { describe, it, expect, vi, beforeEach } from 'vitest'

// The step-2 server action against a recording Supabase client: the call ORDER is the contract with complete_my_account
// (signOut others → updateUser → RPC; docs/follow-ups/two-step-signup-db.md, item 2), its retry on other_sessions, and
// that what comes back is i18n keys, never the database's French text.

const h = vi.hoisted(() => {
  const calls: string[] = []
  return {
    calls,
    getUser: vi.fn(),
    signOut: vi.fn(),
    updateUser: vi.fn(),
    rpc: vi.fn(),
  }
})

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    auth: {
      getUser: h.getUser,
      signOut: (...args: unknown[]) => {
        h.calls.push('signOut')
        return h.signOut(...args)
      },
      updateUser: (...args: unknown[]) => {
        h.calls.push('updateUser')
        return h.updateUser(...args)
      },
    },
    rpc: (...args: unknown[]) => {
      h.calls.push('rpc')
      return h.rpc(...args)
    },
  })),
}))

import { completeAccount } from './actions'

const VALID = {
  fullName: '  Amira Ben Salah ',
  password: 'Soleil2026',
  dateOfBirth: '1995-04-12',
  city: 'Sfax',
  termsAccepted: true,
  termsVersion: 'cgu-2026-06-17+confidentialite-2026-11-14',
  next: '/devenir-vendeur/boutique',
}
const rpcError = (hint: string) => ({ data: null, error: { message: 'refusé (texte FR de la base)', code: '23514', details: null, hint } })

beforeEach(() => {
  h.calls.length = 0
  vi.clearAllMocks()
  vi.spyOn(console, 'error').mockImplementation(() => {})
  h.getUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null })
  h.signOut.mockResolvedValue({ error: null })
  h.updateUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null })
  h.rpc.mockResolvedValue({ data: null, error: null })
})

describe('completeAccount — the call order', () => {
  it('ends the other sessions, sets the password, then completes; lands on the validated next', async () => {
    expect(await completeAccount(VALID)).toEqual({ ok: true, destination: '/devenir-vendeur/boutique' })
    expect(h.calls).toEqual(['signOut', 'updateUser', 'rpc'])
    expect(h.signOut).toHaveBeenCalledWith({ scope: 'others' })
    expect(h.updateUser).toHaveBeenCalledWith({ password: 'Soleil2026' })
    expect(h.rpc).toHaveBeenCalledWith('complete_my_account', {
      p_full_name: 'Amira Ben Salah',
      p_date_of_birth: '1995-04-12',
      p_city: 'Sfax',
      p_terms_version: 'cgu-2026-06-17+confidentialite-2026-11-14',
    })
  })

  it('an unsafe or missing next lands home', async () => {
    expect(await completeAccount({ ...VALID, next: 'https://evil.example' })).toEqual({ ok: true, destination: '/' })
    expect(await completeAccount({ ...VALID, next: null })).toEqual({ ok: true, destination: '/' })
  })

  it('other_sessions: ends them again and retries the RPC once, WITHOUT a second updateUser (same_password)', async () => {
    h.rpc.mockResolvedValueOnce(rpcError('other_sessions')).mockResolvedValueOnce({ data: null, error: null })
    expect(await completeAccount(VALID)).toEqual({ ok: true, destination: '/devenir-vendeur/boutique' })
    expect(h.calls).toEqual(['signOut', 'updateUser', 'rpc', 'signOut', 'rpc'])
  })

  it('other_sessions twice: gives up on this session — « Recevoir un nouveau lien »', async () => {
    h.rpc.mockResolvedValue(rpcError('other_sessions'))
    expect(await completeAccount(VALID)).toEqual({ ok: false, outcome: { kind: 'new_link' } })
    expect(h.calls).toEqual(['signOut', 'updateUser', 'rpc', 'signOut', 'rpc'])
  })

  it('a failed signOut(others) is not fatal: the RPC checks the sessions itself', async () => {
    h.signOut.mockResolvedValue({ error: { message: 'boom', code: 'unexpected_failure', status: 500 } })
    expect(await completeAccount(VALID)).toEqual({ ok: true, destination: '/devenir-vendeur/boutique' })
    expect(h.calls).toEqual(['signOut', 'updateUser', 'rpc'])
  })

  it('a weak password stops before the RPC', async () => {
    h.updateUser.mockResolvedValue({ data: { user: null }, error: { message: 'x', code: 'weak_password', status: 422 } })
    expect(await completeAccount(VALID)).toEqual({
      ok: false,
      outcome: { kind: 'field', field: 'password', key: 'signup.form.errors.passwordWeak' },
    })
    expect(h.calls).toEqual(['signOut', 'updateUser'])
  })

  it('same_password on a resubmit (THIS session set it, the RPC failed last time): the RPC decides and completes', async () => {
    h.updateUser.mockResolvedValue({ data: { user: null }, error: { message: 'x', code: 'same_password', status: 422 } })
    expect(await completeAccount(VALID)).toEqual({ ok: true, destination: '/devenir-vendeur/boutique' })
    expect(h.calls).toEqual(['signOut', 'updateUser', 'rpc'])
  })

  it('same_password and the RPC says no password was set in this session: « choose a different password »', async () => {
    h.updateUser.mockResolvedValue({ data: { user: null }, error: { message: 'x', code: 'same_password', status: 422 } })
    h.rpc.mockResolvedValue(rpcError('password_required'))
    expect(await completeAccount(VALID)).toEqual({
      ok: false,
      outcome: { kind: 'field', field: 'password', key: 'completeAccount.errors.samePassword' },
    })
  })

  it('same_password and the account was already complete (a double submit): success', async () => {
    h.updateUser.mockResolvedValue({ data: { user: null }, error: { message: 'x', code: 'same_password', status: 422 } })
    h.rpc.mockResolvedValue(rpcError('already_complete'))
    expect(await completeAccount(VALID)).toEqual({ ok: true, destination: '/devenir-vendeur/boutique' })
  })

  it('a session older than 24 hours (reauthentication_needed) → « Recevoir un nouveau lien »', async () => {
    h.updateUser.mockResolvedValue({ data: { user: null }, error: { message: 'x', code: 'reauthentication_needed', status: 400 } })
    expect(await completeAccount(VALID)).toEqual({ ok: false, outcome: { kind: 'new_link' } })
  })
})

describe('completeAccount — every RPC refusal comes back as a key', () => {
  it.each([
    ['email_link_required', { kind: 'new_link' }],
    ['password_required', { kind: 'new_link' }],
    ['session_unknown', { kind: 'new_link' }],
    ['too_young', { kind: 'field', field: 'dateOfBirth', key: 'signup.form.errors.tooYoung.consumer' }],
    ['terms_outdated', { kind: 'reload', key: 'completeAccount.errors.termsOutdated' }],
    ['unexpected', { kind: 'error', key: 'signup.form.errors.generic' }],
  ])('%s', async (hint, outcome) => {
    h.rpc.mockResolvedValue(rpcError(hint))
    const result = await completeAccount(VALID)
    expect(result).toEqual({ ok: false, outcome })
    expect(JSON.stringify(result)).not.toContain('refusé')
  })

  it('already_complete is a success (a double submit, or another tab finished it)', async () => {
    h.rpc.mockResolvedValue(rpcError('already_complete'))
    expect(await completeAccount(VALID)).toEqual({ ok: true, destination: '/devenir-vendeur/boutique' })
  })

  it('logs message, code, details and hint — never the raw error object', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    h.rpc.mockResolvedValue(rpcError('too_young'))
    await completeAccount(VALID)
    expect(log).toHaveBeenCalledWith('[completeAccount] complete_my_account error:', 'refusé (texte FR de la base)', '23514', null, 'too_young')
  })
})

describe('completeAccount — before any Auth call', () => {
  it('invalid fields come back as field keys and nothing is called', async () => {
    const result = await completeAccount({ ...VALID, dateOfBirth: '2015-01-01', termsAccepted: false })
    expect(result).toEqual({
      ok: false,
      fieldErrors: { dateOfBirth: 'signup.form.errors.tooYoung.consumer', terms: 'completeAccount.errors.termsRequired' },
    })
    expect(h.calls).toEqual([])
    expect(h.getUser).not.toHaveBeenCalled()
  })

  it('a malformed payload is the generic error', async () => {
    expect(await completeAccount({ fullName: 1 })).toEqual({ ok: false, outcome: { kind: 'error', key: 'signup.form.errors.generic' } })
    expect(h.calls).toEqual([])
  })

  it('no session → « Recevoir un nouveau lien », nothing else called', async () => {
    h.getUser.mockResolvedValue({ data: { user: null }, error: null })
    expect(await completeAccount(VALID)).toEqual({ ok: false, outcome: { kind: 'new_link' } })
    expect(h.calls).toEqual([])
  })
})
