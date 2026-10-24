/**
 * Unit tests for the admin user-management server actions (suspendUser, unsuspendUser).
 *
 * The Supabase client is mocked at the rpc() level — these cover the actions'
 * validation + error-translation logic, NOT the database. The real enforcement
 * (admin gate, self-suspend block, reason-required, idempotent state checks) lives
 * in the admin_suspend_user / admin_unsuspend_user SECURITY DEFINER functions, which
 * RAISE EXCEPTION on every failure mode; the actions map those messages to friendly
 * i18n keys.
 *
 * After the database step each action mirrors the new state as a Supabase Auth ban
 * (setAuthBan, mocked here): database first, then ban; a raise means no ban — except
 * "already suspended" / "not currently suspended", which on a retry means an earlier
 * attempt's database write landed, so the (idempotent) ban is applied again. The ban's
 * live behaviour is proven in suspension-enforcement.test.ts; the session sign-out in
 * middleware-suspension.test.ts.
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

// The auth ban (src/lib/auth/auth-ban.ts) is service-role; only setAuthBan is mocked —
// isSuspensionAlreadyApplied stays real, so the retry branch is the production one.
const ban = vi.hoisted(() => ({ setAuthBan: vi.fn() }))
vi.mock('@/lib/auth/auth-ban', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/auth/auth-ban')>()),
  setAuthBan: ban.setAuthBan,
}))

import { suspendUser, unsuspendUser } from '@/app/admin/utilisateurs/actions'

beforeEach(() => {
  guard.checkAdmin.mockReset()
  guard.checkAdmin.mockResolvedValue({ ok: true, userId: 'admin-1' })
  ban.setAuthBan.mockReset()
  ban.setAuthBan.mockResolvedValue({ ok: true })
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

  it('surfaces the self-suspend error from the function RAISE — and never bans the admin', async () => {
    h.state.result = { data: null, error: { message: 'Admins cannot suspend themselves' } }
    const res = await suspendUser('me', 'Comportement abusif.')
    expect(res).toEqual({ success: false, error: 'admin.users.error_self_suspend' })
    expect(ban.setAuthBan).not.toHaveBeenCalled()
  })

  it('surfaces the forbidden error from the function RAISE, without a ban', async () => {
    h.state.result = { data: null, error: { message: 'Forbidden: admin access required' } }
    const res = await suspendUser('u1', 'Raison.')
    expect(res).toEqual({ success: false, error: 'admin.users.error_forbidden' })
    expect(ban.setAuthBan).not.toHaveBeenCalled()
  })

  it('surfaces the reason-required error from the function RAISE, without a ban', async () => {
    h.state.result = { data: null, error: { message: 'A suspension reason is required' } }
    const res = await suspendUser('u1', 'Raison.')
    expect(res).toEqual({ success: false, error: 'admin.users.suspend_reason_required' })
    expect(ban.setAuthBan).not.toHaveBeenCalled()
  })

  it('passes a trimmed reason, bans AFTER the database write, succeeds, and revalidates', async () => {
    h.state.result = { data: null, error: null }
    const res = await suspendUser('u1', '  Comportement abusif signalé.  ')
    expect(res).toEqual({ success: true })
    expect(h.rpc).toHaveBeenCalledWith('admin_suspend_user', {
      target_user_id: 'u1',
      reason: 'Comportement abusif signalé.',
    })
    expect(ban.setAuthBan).toHaveBeenCalledWith('u1', true)
    expect(h.rpc.mock.invocationCallOrder[0]).toBeLessThan(ban.setAuthBan.mock.invocationCallOrder[0])
    expect(h.revalidatePath).toHaveBeenCalledWith('/admin/utilisateurs')
    expect(h.revalidatePath).toHaveBeenCalledWith('/admin/utilisateurs/u1')
  })

  it('reports a failed ban without revalidating, so the form stays up for a retry', async () => {
    ban.setAuthBan.mockResolvedValue({ ok: false, reason: 'failed' })
    const res = await suspendUser('u1', 'Spam répété.')
    expect(res).toEqual({ success: false, error: 'admin.users.error_ban_failed' })
    expect(h.revalidatePath).not.toHaveBeenCalled()
  })

  it('retry: "already suspended" re-applies the ban and succeeds', async () => {
    h.state.result = { data: null, error: { message: 'User not found or already suspended' } }
    const res = await suspendUser('u1', 'Spam répété.')
    expect(res).toEqual({ success: true })
    expect(ban.setAuthBan).toHaveBeenCalledWith('u1', true)
    expect(h.revalidatePath).toHaveBeenCalledWith('/admin/utilisateurs/u1')
  })

  it('retry whose ban fails again still reports the ban failure', async () => {
    h.state.result = { data: null, error: { message: 'User not found or already suspended' } }
    ban.setAuthBan.mockResolvedValue({ ok: false, reason: 'failed' })
    const res = await suspendUser('u1', 'Spam répété.')
    expect(res).toEqual({ success: false, error: 'admin.users.error_ban_failed' })
  })

  it('an unknown id ("not found or already suspended" + no auth user) keeps the function error', async () => {
    h.state.result = { data: null, error: { message: 'User not found or already suspended' } }
    ban.setAuthBan.mockResolvedValue({ ok: false, reason: 'not_found' })
    const res = await suspendUser('ghost', 'Spam répété.')
    expect(res).toEqual({ success: false, error: 'admin.users.error_already_suspended' })
    expect(h.revalidatePath).not.toHaveBeenCalled()
  })
})

describe('unsuspendUser', () => {
  it('lifts the ban AFTER the database write, succeeds, and revalidates', async () => {
    h.state.result = { data: null, error: null }
    const res = await unsuspendUser('u1')
    expect(res).toEqual({ success: true })
    expect(h.rpc).toHaveBeenCalledWith('admin_unsuspend_user', { target_user_id: 'u1' })
    expect(ban.setAuthBan).toHaveBeenCalledWith('u1', false)
    expect(h.rpc.mock.invocationCallOrder[0]).toBeLessThan(ban.setAuthBan.mock.invocationCallOrder[0])
    expect(h.revalidatePath).toHaveBeenCalledWith('/admin/utilisateurs')
    expect(h.revalidatePath).toHaveBeenCalledWith('/admin/utilisateurs/u1')
  })

  it('retry: "not currently suspended" lifts the ban again and succeeds', async () => {
    h.state.result = { data: null, error: { message: 'User not found or not currently suspended' } }
    const res = await unsuspendUser('u1')
    expect(res).toEqual({ success: true })
    expect(ban.setAuthBan).toHaveBeenCalledWith('u1', false)
  })

  it('an unknown id keeps the function error', async () => {
    h.state.result = { data: null, error: { message: 'User not found or not currently suspended' } }
    ban.setAuthBan.mockResolvedValue({ ok: false, reason: 'not_found' })
    const res = await unsuspendUser('ghost')
    expect(res).toEqual({ success: false, error: 'admin.users.error_not_suspended' })
  })

  it('reports a failed unban without revalidating', async () => {
    ban.setAuthBan.mockResolvedValue({ ok: false, reason: 'failed' })
    const res = await unsuspendUser('u1')
    expect(res).toEqual({ success: false, error: 'admin.users.error_unban_failed' })
    expect(h.revalidatePath).not.toHaveBeenCalled()
  })

  it('surfaces the forbidden error from the function RAISE, without touching the ban', async () => {
    h.state.result = { data: null, error: { message: 'Forbidden: admin access required' } }
    const res = await unsuspendUser('u1')
    expect(res).toEqual({ success: false, error: 'admin.users.error_forbidden' })
    expect(ban.setAuthBan).not.toHaveBeenCalled()
  })
})

describe('admin gate (checkAdmin runs first)', () => {
  it('suspendUser rejects a non-admin before touching the database or the ban', async () => {
    guard.checkAdmin.mockResolvedValue({ ok: false, reason: 'forbidden' })
    const res = await suspendUser('u1', 'Spam répété.')
    expect(res).toEqual({ success: false, error: 'admin.users.error_forbidden' })
    expect(h.rpc).not.toHaveBeenCalled()
    expect(ban.setAuthBan).not.toHaveBeenCalled()
    expect(h.revalidatePath).not.toHaveBeenCalled()
  })

  it('unsuspendUser rejects a non-admin before touching the database or the ban', async () => {
    guard.checkAdmin.mockResolvedValue({ ok: false, reason: 'forbidden' })
    const res = await unsuspendUser('u1')
    expect(res).toEqual({ success: false, error: 'admin.users.error_forbidden' })
    expect(h.rpc).not.toHaveBeenCalled()
    expect(ban.setAuthBan).not.toHaveBeenCalled()
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
