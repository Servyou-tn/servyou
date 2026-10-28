/**
 * src/lib/images/upload-guard.ts — the two S-3 guards every upload action relies on once its bytes go through
 * the service role. isCallerActive must fail CLOSED: an RPC error, NULL or false all mean « not active », so a
 * suspended account (or a broken check) can never reach the service-role upload. uploadBucket must hand out
 * the service-role client's bucket, never the session's.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

const admin = vi.hoisted(() => ({ from: vi.fn((bucket: string) => ({ bucket, via: 'service_role' })) }))
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: () => ({ storage: { from: admin.from } }) }))

import { callerActivity, isCallerActive, uploadBucket } from '@/lib/images/upload-guard'

type RpcResult = { data: unknown; error: { message: string; code?: string; details?: string } | null }
const session = (result: RpcResult) =>
  ({ rpc: vi.fn(async () => result) }) as unknown as Parameters<typeof isCallerActive>[0]

beforeEach(() => {
  admin.from.mockClear()
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('isCallerActive — fails closed', () => {
  it('true only when is_active_user() answers true', async () => {
    const client = session({ data: true, error: null })
    expect(await isCallerActive(client)).toBe(true)
    expect((client as unknown as { rpc: ReturnType<typeof vi.fn> }).rpc).toHaveBeenCalledWith('is_active_user')
  })

  it.each([
    ['false (suspended)', { data: false, error: null }],
    ['null', { data: null, error: null }],
    ['an RPC error', { data: null, error: { message: 'permission denied for function is_active_user', code: '42501' } }],
    ['a non-boolean truthy value', { data: 'true', error: null }],
  ] as const)('%s → not active', async (_label, result) => {
    expect(await isCallerActive(session(result as RpcResult))).toBe(false)
  })
})

// Loader-error-surfacing PR-2: the tri-state behind isCallerActive, so a caller can tell a failed check
// (generic error) from a suspended account. Swapping 'error' and 'inactive' must fail here.
describe('callerActivity — tri-state', () => {
  it.each([
    ['true', { data: true, error: null }, 'active'],
    ['false (suspended)', { data: false, error: null }, 'inactive'],
    ['null', { data: null, error: null }, 'inactive'],
    ['a non-boolean truthy value', { data: 'true', error: null }, 'inactive'],
    ['an RPC error', { data: null, error: { message: 'timeout', code: '57014' } }, 'error'],
  ] as const)('%s → %s', async (_label, result, expected) => {
    expect(await callerActivity(session(result as RpcResult))).toBe(expected)
  })
})

describe('uploadBucket', () => {
  it("returns the service-role client's bucket", () => {
    expect(uploadBucket('avatars')).toEqual({ bucket: 'avatars', via: 'service_role' })
    expect(admin.from).toHaveBeenCalledWith('avatars')
  })
})
