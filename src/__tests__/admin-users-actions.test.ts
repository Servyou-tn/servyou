/**
 * Unit tests for the admin user-management server actions (suspendUser, unsuspendUser).
 *
 * The Supabase client is mocked at the rpc() level — these cover the actions'
 * validation + error-translation logic, NOT the database. The real enforcement
 * (admin gate, self-suspend block, reason-required, idempotent state checks) lives
 * in the admin_suspend_user / admin_unsuspend_user SECURITY DEFINER functions, which
 * RAISE EXCEPTION on every failure mode; the actions map those messages to friendly
 * i18n keys. Platform-wide signout of a suspended user is enforced in middleware.ts
 * and is verified by a real round-trip, not here.
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

import { suspendUser, unsuspendUser } from '@/app/admin/utilisateurs/actions'

beforeEach(() => {
  guard.checkAdmin.mockReset()
  guard.checkAdmin.mockResolvedValue({ ok: true, userId: 'admin-1' })
})

beforeEach(() => {
  h.state.result = { data: null, error: null }
  h.rpc.mockClear()
  h.revalidatePath.mockClear()
})

describe('suspendUser', () => {
  it('rejects an empty reason without calling the database', async () => {
    const res = await suspendUser('u1', '')
    expect(res).toEqual({ success: false, error: 'admin.users.suspend_reason_required' })
    expect(h.rpc).not.toHaveBeenCalled()
  })

  it('rejects a whitespace-only reason', async () => {
    const res = await suspendUser('u1', '   \n\t ')
    expect(res).toEqual({ success: false, error: 'admin.users.suspend_reason_required' })
    expect(h.rpc).not.toHaveBeenCalled()
  })

  it('surfaces the self-suspend error from the function RAISE', async () => {
    h.state.result = { data: null, error: { message: 'Admins cannot suspend themselves' } }
    const res = await suspendUser('me', 'Comportement abusif.')
    expect(res).toEqual({ success: false, error: 'admin.users.error_self_suspend' })
  })

  it('surfaces the already-suspended error from the function RAISE', async () => {
    h.state.result = { data: null, error: { message: 'User not found or already suspended' } }
    const res = await suspendUser('u1', 'Spam répété.')
    expect(res).toEqual({ success: false, error: 'admin.users.error_already_suspended' })
  })

  it('surfaces the forbidden error from the function RAISE', async () => {
    h.state.result = { data: null, error: { message: 'Forbidden: admin access required' } }
    const res = await suspendUser('u1', 'Raison.')
    expect(res).toEqual({ success: false, error: 'admin.users.error_forbidden' })
  })

  it('passes a trimmed reason, succeeds, and revalidates', async () => {
    h.state.result = { data: null, error: null }
    const res = await suspendUser('u1', '  Comportement abusif signalé.  ')
    expect(res).toEqual({ success: true })
    expect(h.rpc).toHaveBeenCalledWith('admin_suspend_user', {
      target_user_id: 'u1',
      reason: 'Comportement abusif signalé.',
    })
    expect(h.revalidatePath).toHaveBeenCalledWith('/admin/utilisateurs')
    expect(h.revalidatePath).toHaveBeenCalledWith('/admin/utilisateurs/u1')
  })
})

describe('unsuspendUser', () => {
  it('surfaces the not-suspended error from the function RAISE', async () => {
    h.state.result = { data: null, error: { message: 'User not found or not currently suspended' } }
    const res = await unsuspendUser('u1')
    expect(res).toEqual({ success: false, error: 'admin.users.error_not_suspended' })
  })

  it('succeeds and revalidates', async () => {
    h.state.result = { data: null, error: null }
    const res = await unsuspendUser('u1')
    expect(res).toEqual({ success: true })
    expect(h.rpc).toHaveBeenCalledWith('admin_unsuspend_user', { target_user_id: 'u1' })
    expect(h.revalidatePath).toHaveBeenCalledWith('/admin/utilisateurs')
    expect(h.revalidatePath).toHaveBeenCalledWith('/admin/utilisateurs/u1')
  })
})

describe('admin gate (checkAdmin runs first)', () => {
  it('suspendUser rejects a non-admin before touching the database', async () => {
    guard.checkAdmin.mockResolvedValue({ ok: false, reason: 'forbidden' })
    const res = await suspendUser('u1', 'Spam répété.')
    expect(res).toEqual({ success: false, error: 'admin.users.error_forbidden' })
    expect(h.rpc).not.toHaveBeenCalled()
    expect(h.revalidatePath).not.toHaveBeenCalled()
  })

  it('unsuspendUser rejects a non-admin before touching the database', async () => {
    guard.checkAdmin.mockResolvedValue({ ok: false, reason: 'forbidden' })
    const res = await unsuspendUser('u1')
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
    'suspendUser also fails closed when the check returns %s (→ %s)',
    async (reason, error) => {
      guard.checkAdmin.mockResolvedValue({ ok: false, reason })
      const res = await suspendUser('u1', 'Spam répété.')
      expect(res).toEqual({ success: false, error })
      expect(h.rpc).not.toHaveBeenCalled()
      expect(h.revalidatePath).not.toHaveBeenCalled()
    },
  )
})
