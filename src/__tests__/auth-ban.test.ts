/**
 * Unit tests for src/lib/auth/auth-ban.ts — the auth half of a suspension.
 *
 * The service-role client is mocked at auth.admin.updateUserById and the profiles lookup; these pin
 * the ban durations, the error mapping (a GoTrue 404 user_not_found is told apart from every other
 * failure), that a transport throw never escapes, that syncAuthBan sets the ban from the COMMITTED
 * suspended_at (never from intent), and which RPC errors count as "already applied". GoTrue's real
 * behaviour (refused sign-in / refresh / getUser, idempotence, token lifetime) and the live sync are
 * proven in suspension-enforcement.test.ts.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'

const h = vi.hoisted(() => ({ updateUserById: vi.fn(), maybeSingle: vi.fn(), eq: vi.fn() }))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    auth: { admin: { updateUserById: h.updateUserById } },
    from: () => ({
      select: () => ({
        eq: (...args: unknown[]) => {
          h.eq(...args)
          return { maybeSingle: h.maybeSingle }
        },
      }),
    }),
  }),
}))

import { setAuthBan, syncAuthBan, isSuspensionAlreadyApplied, SUSPENSION_BAN_DURATION } from '@/lib/auth/auth-ban'

beforeEach(() => {
  h.updateUserById.mockReset()
  h.updateUserById.mockResolvedValue({ data: { user: {} }, error: null })
  h.maybeSingle.mockReset()
  h.eq.mockReset()
})

describe('syncAuthBan — the ban follows the committed suspended_at', () => {
  it('bans a suspended account and says so', async () => {
    h.maybeSingle.mockResolvedValue({ data: { suspended_at: '2026-10-24T19:00:00Z' }, error: null })
    expect(await syncAuthBan('u1')).toEqual({ ok: true, suspended: true })
    expect(h.eq).toHaveBeenCalledWith('id', 'u1')
    expect(h.updateUserById).toHaveBeenCalledWith('u1', { ban_duration: '876000h' })
  })

  it('lifts the ban on an active account and says so', async () => {
    h.maybeSingle.mockResolvedValue({ data: { suspended_at: null }, error: null })
    expect(await syncAuthBan('u1')).toEqual({ ok: true, suspended: false })
    expect(h.updateUserById).toHaveBeenCalledWith('u1', { ban_duration: 'none' })
  })

  it('reports a missing profile as not_found without touching GoTrue', async () => {
    h.maybeSingle.mockResolvedValue({ data: null, error: null })
    expect(await syncAuthBan('ghost')).toEqual({ ok: false, reason: 'not_found' })
    expect(h.updateUserById).not.toHaveBeenCalled()
  })

  it('fails without touching GoTrue when the lookup errors, logging the fields', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    h.maybeSingle.mockResolvedValue({ data: null, error: { message: 'timeout', code: '57014', details: null } })
    expect(await syncAuthBan('u1')).toEqual({ ok: false, reason: 'failed' })
    expect(h.updateUserById).not.toHaveBeenCalled()
    expect(log).toHaveBeenCalledWith('[syncAuthBan] suspended_at lookup failed for u1:', 'timeout', '57014', null)
    log.mockRestore()
  })

  it('passes a GoTrue failure through', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    h.maybeSingle.mockResolvedValue({ data: { suspended_at: '2026-10-24T19:00:00Z' }, error: null })
    h.updateUserById.mockResolvedValue({ data: { user: null }, error: { message: 'upstream', status: 500, code: 'unexpected_failure' } })
    expect(await syncAuthBan('u1')).toEqual({ ok: false, reason: 'failed' })
    log.mockRestore()
  })
})

describe('setAuthBan', () => {
  it('bans for 100 years (GoTrue has no permanent ban)', async () => {
    expect(SUSPENSION_BAN_DURATION).toBe('876000h')
    expect(await setAuthBan('u1', true)).toEqual({ ok: true })
    expect(h.updateUserById).toHaveBeenCalledWith('u1', { ban_duration: '876000h' })
  })

  it("lifts the ban with GoTrue's 'none'", async () => {
    expect(await setAuthBan('u1', false)).toEqual({ ok: true })
    expect(h.updateUserById).toHaveBeenCalledWith('u1', { ban_duration: 'none' })
  })

  it('reports an unknown auth user as not_found', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    h.updateUserById.mockResolvedValue({ data: { user: null }, error: { message: 'User not found', status: 404, code: 'user_not_found' } })
    expect(await setAuthBan('ghost', true)).toEqual({ ok: false, reason: 'not_found' })
    expect(log).toHaveBeenCalledWith('[setAuthBan] ban failed for ghost:', 'User not found', 404, 'user_not_found')
    log.mockRestore()
  })

  it('reports any other error as failed', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    h.updateUserById.mockResolvedValue({ data: { user: null }, error: { message: 'upstream', status: 500, code: 'unexpected_failure' } })
    expect(await setAuthBan('u1', false)).toEqual({ ok: false, reason: 'failed' })
    log.mockRestore()
  })

  it('turns a transport throw into failed, logging only its message', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    h.updateUserById.mockRejectedValue(new Error('fetch failed'))
    expect(await setAuthBan('u1', true)).toEqual({ ok: false, reason: 'failed' })
    expect(log).toHaveBeenCalledWith('[setAuthBan] ban threw for u1:', 'fetch failed')
    log.mockRestore()
  })
})

describe('isSuspensionAlreadyApplied', () => {
  const p0001 = (message: string) => ({ code: 'P0001', message })
  it.each([
    [p0001('User not found or already suspended'), true, true],
    [p0001('User not found or not currently suspended'), false, true],
    // The wrong direction never counts.
    [p0001('User not found or already suspended'), false, false],
    [p0001('User not found or not currently suspended'), true, false],
    // No other raise ever reaches the ban.
    [p0001('Admins cannot suspend themselves'), true, false],
    [p0001('Forbidden: admin access required'), true, false],
    [p0001('Forbidden: admin access required'), false, false],
    [p0001('A suspension reason is required'), true, false],
    // Matched whole: a 22P02 echoing the raw input, or the right text under another code, never counts.
    [{ code: '22P02', message: 'invalid input syntax for type uuid: "x User not found or already suspended"' }, true, false],
    [{ code: 'XX000', message: 'User not found or already suspended' }, true, false],
    [{ message: 'User not found or already suspended' }, true, false],
  ] as const)('%o (suspend=%s) → %s', (rpcError, suspend, expected) => {
    expect(isSuspensionAlreadyApplied(rpcError, suspend)).toBe(expected)
  })
})
