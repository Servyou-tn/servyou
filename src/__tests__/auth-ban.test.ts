/**
 * Unit tests for src/lib/auth/auth-ban.ts — the auth half of a suspension.
 *
 * The service-role client is mocked at auth.admin.updateUserById; these pin the ban durations, the
 * error mapping (a GoTrue 404 user_not_found is told apart from every other failure, because the
 * actions fall back to the RPC's own error on it), that a transport throw never escapes, and which
 * RPC messages count as "already applied". GoTrue's real behaviour (refused sign-in / refresh /
 * getUser, idempotence, token lifetime) is proven live in suspension-enforcement.test.ts.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'

const h = vi.hoisted(() => ({ updateUserById: vi.fn() }))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({ auth: { admin: { updateUserById: h.updateUserById } } }),
}))

import { setAuthBan, isSuspensionAlreadyApplied, SUSPENSION_BAN_DURATION } from '@/lib/auth/auth-ban'

beforeEach(() => {
  h.updateUserById.mockReset()
  h.updateUserById.mockResolvedValue({ data: { user: {} }, error: null })
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
  it.each([
    ['User not found or already suspended', true, true],
    ['User not found or not currently suspended', false, true],
    // The wrong direction never counts.
    ['User not found or already suspended', false, false],
    ['User not found or not currently suspended', true, false],
    // No other raise ever reaches the ban.
    ['Admins cannot suspend themselves', true, false],
    ['Forbidden: admin access required', true, false],
    ['Forbidden: admin access required', false, false],
    ['A suspension reason is required', true, false],
  ] as const)('%s (suspend=%s) → %s', (message, suspend, expected) => {
    expect(isSuspensionAlreadyApplied(message, suspend)).toBe(expected)
  })
})
