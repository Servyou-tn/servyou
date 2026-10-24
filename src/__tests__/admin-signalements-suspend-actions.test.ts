/**
 * Unit tests for the report-local user-suspension server actions
 * (suspendReportedUser, unsuspendReportedUser) in /admin/signalements.
 *
 * These mirror admin-users-actions.test.ts: the Supabase client is mocked at the
 * rpc() level, so they cover the actions' validation + error-translation +
 * revalidation logic, NOT the database. Real enforcement lives in the
 * admin_suspend_user / admin_unsuspend_user SECURITY DEFINER functions (which RAISE
 * on every failure mode). The only behavioural difference from the utilisateurs
 * actions is that these revalidate the report detail page too. Like those actions, each
 * Zod-validates the target id and syncs the auth ban from the committed suspended_at
 * after the database step (syncAuthBan, mocked; same retry rules).
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'

const U1 = '11111111-1111-4111-8111-111111111111'
const ME = '22222222-2222-4222-8222-222222222222'
const GHOST = '33333333-3333-4333-8333-333333333333'

const ALREADY_SUSPENDED = { code: 'P0001', message: 'User not found or already suspended' }
const NOT_SUSPENDED = { code: 'P0001', message: 'User not found or not currently suspended' }

const h = vi.hoisted(() => {
  const state: { result: { data: unknown; error: { code?: string; message: string } | null } } = {
    result: { data: null, error: null },
  }
  const rpc = vi.fn(() => Promise.resolve(state.result))
  const revalidatePath = vi.fn()
  return { state, rpc, revalidatePath }
})

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({ rpc: h.rpc })),
}))

vi.mock('next/cache', () => ({
  revalidatePath: h.revalidatePath,
}))

// checkAdmin (src/lib/auth/require-admin.ts) runs first in every admin action. Mocked to an admin
// by default so the tests below exercise the action logic itself; the 'admin gate' block flips it.
const guard = vi.hoisted(() => ({ checkAdmin: vi.fn() }))
// Only checkAdmin is mocked; adminRejectionError stays the real helper, so the query_failed →
// generic-error mapping below is the production one.
vi.mock('@/lib/auth/require-admin', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/auth/require-admin')>()),
  checkAdmin: guard.checkAdmin,
}))

// Only syncAuthBan is mocked; isSuspensionAlreadyApplied stays real.
const ban = vi.hoisted(() => ({ syncAuthBan: vi.fn() }))
vi.mock('@/lib/auth/auth-ban', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/auth/auth-ban')>()),
  syncAuthBan: ban.syncAuthBan,
}))

import { suspendReportedUser, unsuspendReportedUser } from '@/app/admin/signalements/actions'

beforeEach(() => {
  guard.checkAdmin.mockReset()
  guard.checkAdmin.mockResolvedValue({ ok: true, userId: 'admin-1' })
  ban.syncAuthBan.mockReset()
})

beforeEach(() => {
  h.state.result = { data: null, error: null }
  h.rpc.mockClear()
  h.revalidatePath.mockClear()
})

describe('suspendReportedUser', () => {
  beforeEach(() => ban.syncAuthBan.mockResolvedValue({ ok: true, suspended: true }))

  it('refuses a malformed id before touching the guard, the database or the ban', async () => {
    const res = await suspendReportedUser('x User not found or already suspended', 'Spam répété.', 'r1')
    expect(res).toEqual({ success: false, error: 'common.error_generic' })
    expect(guard.checkAdmin).not.toHaveBeenCalled()
    expect(h.rpc).not.toHaveBeenCalled()
    expect(ban.syncAuthBan).not.toHaveBeenCalled()
  })

  it('rejects an empty reason without calling the database', async () => {
    const res = await suspendReportedUser(U1, '   \n\t ', 'r1')
    expect(res).toEqual({ success: false, error: 'admin.users.suspend_reason_required' })
    expect(h.rpc).not.toHaveBeenCalled()
  })

  it('surfaces the self-suspend error from the function RAISE — and never bans the admin', async () => {
    h.state.result = { data: null, error: { code: 'P0001', message: 'Admins cannot suspend themselves' } }
    const res = await suspendReportedUser(ME, 'Comportement abusif.', 'r1')
    expect(res).toEqual({ success: false, error: 'admin.users.error_self_suspend' })
    expect(ban.syncAuthBan).not.toHaveBeenCalled()
  })

  it('surfaces the forbidden error from the function RAISE, without a ban', async () => {
    h.state.result = { data: null, error: { code: 'P0001', message: 'Forbidden: admin access required' } }
    const res = await suspendReportedUser(U1, 'Spam répété.', 'r1')
    expect(res).toEqual({ success: false, error: 'admin.users.error_forbidden' })
    expect(ban.syncAuthBan).not.toHaveBeenCalled()
  })

  it('passes a trimmed reason, syncs the ban AFTER the database write, and revalidates the report + user pages', async () => {
    const res = await suspendReportedUser(U1, '  Abus signalé.  ', 'r1')
    expect(res).toEqual({ success: true })
    expect(h.rpc).toHaveBeenCalledWith('admin_suspend_user', {
      target_user_id: U1,
      reason: 'Abus signalé.',
    })
    expect(ban.syncAuthBan).toHaveBeenCalledWith(U1)
    expect(h.rpc.mock.invocationCallOrder[0]).toBeLessThan(ban.syncAuthBan.mock.invocationCallOrder[0])
    expect(h.revalidatePath).toHaveBeenCalledWith('/admin/signalements/r1')
    expect(h.revalidatePath).toHaveBeenCalledWith('/admin/utilisateurs/' + U1)
  })

  it('reports a failed ban without revalidating, so the form stays up for a retry', async () => {
    ban.syncAuthBan.mockResolvedValue({ ok: false, reason: 'failed' })
    const res = await suspendReportedUser(U1, 'Spam répété.', 'r1')
    expect(res).toEqual({ success: false, error: 'admin.users.error_ban_failed' })
    expect(h.revalidatePath).not.toHaveBeenCalled()
  })

  it('retry: "already suspended" syncs the ban again and succeeds', async () => {
    h.state.result = { data: null, error: ALREADY_SUSPENDED }
    const res = await suspendReportedUser(U1, 'Spam répété.', 'r1')
    expect(res).toEqual({ success: true })
    expect(ban.syncAuthBan).toHaveBeenCalledWith(U1)
  })

  it('an unknown id reports not found', async () => {
    h.state.result = { data: null, error: ALREADY_SUSPENDED }
    ban.syncAuthBan.mockResolvedValue({ ok: false, reason: 'not_found' })
    const res = await suspendReportedUser(GHOST, 'Spam répété.', 'r1')
    expect(res).toEqual({ success: false, error: 'admin.users.error_not_found' })
  })

  it('a concurrent unsuspend that won: the admin is told the account is not suspended', async () => {
    ban.syncAuthBan.mockResolvedValue({ ok: true, suspended: false })
    const res = await suspendReportedUser(U1, 'Spam répété.', 'r1')
    expect(res).toEqual({ success: false, error: 'admin.users.error_not_suspended' })
    expect(h.revalidatePath).toHaveBeenCalledWith('/admin/signalements/r1')
  })
})

describe('unsuspendReportedUser', () => {
  beforeEach(() => ban.syncAuthBan.mockResolvedValue({ ok: true, suspended: false }))

  it('refuses a malformed id before anything runs', async () => {
    const res = await unsuspendReportedUser('u1', 'r1')
    expect(res).toEqual({ success: false, error: 'common.error_generic' })
    expect(h.rpc).not.toHaveBeenCalled()
    expect(ban.syncAuthBan).not.toHaveBeenCalled()
  })

  it('syncs the ban AFTER the database write and revalidates the report + user pages', async () => {
    const res = await unsuspendReportedUser(U1, 'r1')
    expect(res).toEqual({ success: true })
    expect(h.rpc).toHaveBeenCalledWith('admin_unsuspend_user', { target_user_id: U1 })
    expect(ban.syncAuthBan).toHaveBeenCalledWith(U1)
    expect(h.rpc.mock.invocationCallOrder[0]).toBeLessThan(ban.syncAuthBan.mock.invocationCallOrder[0])
    expect(h.revalidatePath).toHaveBeenCalledWith('/admin/signalements/r1')
    expect(h.revalidatePath).toHaveBeenCalledWith('/admin/utilisateurs/' + U1)
  })

  it('retry: "not currently suspended" syncs the ban again and succeeds', async () => {
    h.state.result = { data: null, error: NOT_SUSPENDED }
    const res = await unsuspendReportedUser(U1, 'r1')
    expect(res).toEqual({ success: true })
    expect(ban.syncAuthBan).toHaveBeenCalledWith(U1)
  })

  it('an unknown id reports not found', async () => {
    h.state.result = { data: null, error: NOT_SUSPENDED }
    ban.syncAuthBan.mockResolvedValue({ ok: false, reason: 'not_found' })
    const res = await unsuspendReportedUser(GHOST, 'r1')
    expect(res).toEqual({ success: false, error: 'admin.users.error_not_found' })
  })

  it('reports a failed unban without revalidating', async () => {
    ban.syncAuthBan.mockResolvedValue({ ok: false, reason: 'failed' })
    const res = await unsuspendReportedUser(U1, 'r1')
    expect(res).toEqual({ success: false, error: 'admin.users.error_unban_failed' })
    expect(h.revalidatePath).not.toHaveBeenCalled()
  })

  it('a concurrent suspend that won: the admin is told the account is suspended', async () => {
    ban.syncAuthBan.mockResolvedValue({ ok: true, suspended: true })
    const res = await unsuspendReportedUser(U1, 'r1')
    expect(res).toEqual({ success: false, error: 'admin.users.error_already_suspended' })
  })
})

describe('admin gate (checkAdmin runs first)', () => {
  it('suspendReportedUser rejects a non-admin before touching the database', async () => {
    guard.checkAdmin.mockResolvedValue({ ok: false, reason: 'forbidden' })
    const res = await suspendReportedUser(U1, 'Spam répété.', 'r1')
    expect(res).toEqual({ success: false, error: 'admin.users.error_forbidden' })
    expect(h.rpc).not.toHaveBeenCalled()
    expect(ban.syncAuthBan).not.toHaveBeenCalled()
    expect(h.revalidatePath).not.toHaveBeenCalled()
  })

  it('unsuspendReportedUser rejects a non-admin before touching the database', async () => {
    guard.checkAdmin.mockResolvedValue({ ok: false, reason: 'forbidden' })
    const res = await unsuspendReportedUser(U1, 'r1')
    expect(res).toEqual({ success: false, error: 'admin.users.error_forbidden' })
    expect(h.rpc).not.toHaveBeenCalled()
    expect(ban.syncAuthBan).not.toHaveBeenCalled()
    expect(h.revalidatePath).not.toHaveBeenCalled()
  })

  // A failed lookup is an outage, not a denial (adminRejectionError): it fails closed with the
  // generic error rather than 'Accès non autorisé.'; a logged-out caller still gets the forbidden key.
  it.each([
    ['unauthenticated', 'admin.users.error_forbidden'],
    ['query_failed', 'common.error_generic'],
  ] as const)(
    'suspendReportedUser also fails closed when the check returns %s (→ %s)',
    async (reason, error) => {
      guard.checkAdmin.mockResolvedValue({ ok: false, reason })
      const res = await suspendReportedUser(U1, 'Spam répété.', 'r1')
      expect(res).toEqual({ success: false, error })
      expect(h.rpc).not.toHaveBeenCalled()
      expect(h.revalidatePath).not.toHaveBeenCalled()
    },
  )
})
