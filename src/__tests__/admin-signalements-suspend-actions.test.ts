/**
 * Unit tests for the report-local user-suspension server actions
 * (suspendReportedUser, unsuspendReportedUser) in /admin/signalements.
 *
 * These mirror admin-users-actions.test.ts: the Supabase client is mocked at the
 * rpc() level, so they cover the actions' validation + error-translation +
 * revalidation logic, NOT the database. Real enforcement lives in the
 * admin_suspend_user / admin_unsuspend_user SECURITY DEFINER functions (which RAISE
 * on every failure mode). The only behavioural difference from the utilisateurs
 * actions is that these revalidate the report detail page too.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'

const h = vi.hoisted(() => {
  const state: { result: { data: unknown; error: { message: string } | null } } = {
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

import { suspendReportedUser, unsuspendReportedUser } from '@/app/admin/signalements/actions'

beforeEach(() => {
  guard.checkAdmin.mockReset()
  guard.checkAdmin.mockResolvedValue({ ok: true, userId: 'admin-1' })
})

beforeEach(() => {
  h.state.result = { data: null, error: null }
  h.rpc.mockClear()
  h.revalidatePath.mockClear()
})

describe('suspendReportedUser', () => {
  it('rejects an empty reason without calling the database', async () => {
    const res = await suspendReportedUser('u1', '   \n\t ', 'r1')
    expect(res).toEqual({ success: false, error: 'admin.users.suspend_reason_required' })
    expect(h.rpc).not.toHaveBeenCalled()
  })

  it('surfaces the self-suspend error from the function RAISE', async () => {
    h.state.result = { data: null, error: { message: 'Admins cannot suspend themselves' } }
    const res = await suspendReportedUser('me', 'Comportement abusif.', 'r1')
    expect(res).toEqual({ success: false, error: 'admin.users.error_self_suspend' })
  })

  it('surfaces the already-suspended error from the function RAISE', async () => {
    h.state.result = { data: null, error: { message: 'User not found or already suspended' } }
    const res = await suspendReportedUser('u1', 'Spam répété.', 'r1')
    expect(res).toEqual({ success: false, error: 'admin.users.error_already_suspended' })
  })

  it('passes a trimmed reason, succeeds, and revalidates the report + user pages', async () => {
    const res = await suspendReportedUser('u1', '  Abus signalé.  ', 'r1')
    expect(res).toEqual({ success: true })
    expect(h.rpc).toHaveBeenCalledWith('admin_suspend_user', {
      target_user_id: 'u1',
      reason: 'Abus signalé.',
    })
    expect(h.revalidatePath).toHaveBeenCalledWith('/admin/signalements/r1')
    expect(h.revalidatePath).toHaveBeenCalledWith('/admin/utilisateurs/u1')
  })
})

describe('unsuspendReportedUser', () => {
  it('surfaces the not-suspended error from the function RAISE', async () => {
    h.state.result = { data: null, error: { message: 'User not found or not currently suspended' } }
    const res = await unsuspendReportedUser('u1', 'r1')
    expect(res).toEqual({ success: false, error: 'admin.users.error_not_suspended' })
  })

  it('succeeds and revalidates the report + user pages', async () => {
    const res = await unsuspendReportedUser('u1', 'r1')
    expect(res).toEqual({ success: true })
    expect(h.rpc).toHaveBeenCalledWith('admin_unsuspend_user', { target_user_id: 'u1' })
    expect(h.revalidatePath).toHaveBeenCalledWith('/admin/signalements/r1')
    expect(h.revalidatePath).toHaveBeenCalledWith('/admin/utilisateurs/u1')
  })
})

describe('admin gate (checkAdmin runs first)', () => {
  it('suspendReportedUser rejects a non-admin before touching the database', async () => {
    guard.checkAdmin.mockResolvedValue({ ok: false, reason: 'forbidden' })
    const res = await suspendReportedUser('u1', 'Spam répété.', 'r1')
    expect(res).toEqual({ success: false, error: 'admin.users.error_forbidden' })
    expect(h.rpc).not.toHaveBeenCalled()
    expect(h.revalidatePath).not.toHaveBeenCalled()
  })

  it('unsuspendReportedUser rejects a non-admin before touching the database', async () => {
    guard.checkAdmin.mockResolvedValue({ ok: false, reason: 'forbidden' })
    const res = await unsuspendReportedUser('u1', 'r1')
    expect(res).toEqual({ success: false, error: 'admin.users.error_forbidden' })
    expect(h.rpc).not.toHaveBeenCalled()
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
      const res = await suspendReportedUser('u1', 'Spam répété.', 'r1')
      expect(res).toEqual({ success: false, error })
      expect(h.rpc).not.toHaveBeenCalled()
      expect(h.revalidatePath).not.toHaveBeenCalled()
    },
  )
})
