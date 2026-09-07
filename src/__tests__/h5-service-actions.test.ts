/**
 * Mocked unit tests for src/app/actions/services.ts — the actions themselves, not the DB behaviour
 * they wrap (that's h5-service-status-cascade.test.ts and h5-service-delete-orders-gate.test.ts,
 * live). Mirrors seller-orders.test.ts's mocking shape: a fake createClient() with just enough
 * chainable surface for each action's own code path, so ownership resolution, error-message
 * mapping, and the revalidatePath fan-out are all pinned without touching a real database.
 *
 * Run: npx vitest run src/__tests__/h5-service-actions.test.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

const state = {
  user: null as { id: string } | null,
  freelancerProfileId: null as string | null,
  freelancerProfileError: null as { message: string; code?: string; details?: string } | null,
  updateResult: { data: null as { id: string } | null, error: null as { message: string; code?: string } | null },
  orderCount: 0,
  orderCountError: null as { message: string; code?: string } | null,
  deleteResult: { data: null as { id: string } | null, error: null as { message: string; code?: string } | null },
}

const revalidateCalls: string[] = []

vi.mock('next/cache', () => ({ revalidatePath: (p: string) => revalidateCalls.push(p) }))
vi.mock('@/lib/i18n/server', () => ({ getLang: async () => 'fr' }))

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: state.user } }) },
    from: (table: string) => {
      if (table === 'freelancer_profiles') {
        const q: Record<string, unknown> = {}
        q.select = () => q
        q.eq = () => q
        q.maybeSingle = async () =>
          state.freelancerProfileError
            ? { data: null, error: state.freelancerProfileError }
            : { data: state.freelancerProfileId ? { id: state.freelancerProfileId } : null, error: null }
        return q
      }
      if (table === 'service_listings') {
        function chain(result: () => typeof state.updateResult): Record<string, unknown> {
          const c: Record<string, unknown> = {}
          c.eq = () => c
          c.select = () => c
          c.maybeSingle = async () => result()
          return c
        }
        return {
          update: () => chain(() => state.updateResult),
          delete: () => chain(() => state.deleteResult),
        }
      }
      if (table === 'orders') {
        // deleteServiceAction's own pre-check: `.select('id', {count,head:true}).eq(...)`,
        // awaited directly (no .maybeSingle()) — `.eq()` must resolve to `{ count, error }` itself.
        return {
          select: () => ({
            eq: async () => ({ count: state.orderCount, error: state.orderCountError }),
          }),
        }
      }
      throw new Error(`unexpected table in mock: ${table}`)
    },
  }),
}))

vi.mock('@/lib/freelancer/owner-profile', () => ({
  resolveOwnedFreelancerProfileId: async () => {
    if (state.freelancerProfileError) return { ok: false, reason: 'query_failed' }
    if (!state.freelancerProfileId) return { ok: false, reason: 'no_profile' }
    return { ok: true, freelancerProfileId: state.freelancerProfileId }
  },
}))

const OWNER = 'owner-1'
const SERVICE_ID = '11111111-1111-4111-8111-111111111111'
const FP_ID = '22222222-2222-4222-8222-222222222222'

beforeEach(() => {
  state.user = { id: OWNER }
  state.freelancerProfileId = FP_ID
  state.freelancerProfileError = null
  state.updateResult = { data: { id: SERVICE_ID }, error: null }
  state.orderCount = 0
  state.orderCountError = null
  state.deleteResult = { data: { id: SERVICE_ID }, error: null }
  revalidateCalls.length = 0
})

describe('toggleServiceStatusAction', () => {
  it('rejects invalid input before touching auth or the DB', async () => {
    const { toggleServiceStatusAction } = await import('@/app/actions/services')
    const res = await toggleServiceStatusAction({ serviceId: 'not-a-uuid', nextStatus: 'active' })
    expect(res.ok).toBe(false)
  })

  it('rejects an unauthenticated caller', async () => {
    state.user = null
    const { toggleServiceStatusAction } = await import('@/app/actions/services')
    const res = await toggleServiceStatusAction({ serviceId: SERVICE_ID, nextStatus: 'hidden' })
    expect(res.ok).toBe(false)
  })

  it('a freelancer with no freelancer_profiles row gets a generic error, not a crash', async () => {
    state.freelancerProfileId = null
    const { toggleServiceStatusAction } = await import('@/app/actions/services')
    const res = await toggleServiceStatusAction({ serviceId: SERVICE_ID, nextStatus: 'hidden' })
    expect(res.ok).toBe(false)
  })

  it('a successful toggle revalidates /mes-services, /tableau-de-bord, /marche/services AND /freelance/[id]', async () => {
    const { toggleServiceStatusAction } = await import('@/app/actions/services')
    const res = await toggleServiceStatusAction({ serviceId: SERVICE_ID, nextStatus: 'hidden' })
    expect(res.ok).toBe(true)
    expect(revalidateCalls).toEqual(
      expect.arrayContaining(['/mes-services', '/tableau-de-bord', '/marche/services', `/freelance/${FP_ID}`]),
    )
  })

  it('maps the admin-moderation-lock DB error to the moderation banner string, not a raw exception', async () => {
    state.updateResult = { data: null, error: { message: 'Cannot change status of admin-moderated content; contact support' } }
    const { toggleServiceStatusAction } = await import('@/app/actions/services')
    const res = await toggleServiceStatusAction({ serviceId: SERVICE_ID, nextStatus: 'active' })
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.error).toContain('modération')
  })

  it('zero rows updated (RLS scoped it away — not this freelancer\'s service) is a generic error', async () => {
    state.updateResult = { data: null, error: null }
    const { toggleServiceStatusAction } = await import('@/app/actions/services')
    const res = await toggleServiceStatusAction({ serviceId: SERVICE_ID, nextStatus: 'active' })
    expect(res.ok).toBe(false)
  })
})

describe('deleteServiceAction', () => {
  it('rejects invalid input', async () => {
    const { deleteServiceAction } = await import('@/app/actions/services')
    const res = await deleteServiceAction({ serviceId: 'nope' })
    expect(res.ok).toBe(false)
  })

  it('blocks the delete BEFORE attempting it when the service has any order', async () => {
    state.orderCount = 1
    const { deleteServiceAction } = await import('@/app/actions/services')
    const res = await deleteServiceAction({ serviceId: SERVICE_ID })
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.error).toMatch(/commandes/)
  })

  it('a zero-order service deletes and revalidates every surface including /freelance/[id]', async () => {
    state.orderCount = 0
    const { deleteServiceAction } = await import('@/app/actions/services')
    const res = await deleteServiceAction({ serviceId: SERVICE_ID })
    expect(res.ok).toBe(true)
    expect(revalidateCalls).toContain(`/freelance/${FP_ID}`)
  })

  it('a 42501 on the delete itself (TOCTOU race) is reported as "has orders", not a raw 500', async () => {
    state.orderCount = 0 // pre-check passed...
    state.deleteResult = { data: null, error: { message: 'Order identity columns cannot be modified', code: '42501' } }
    const { deleteServiceAction } = await import('@/app/actions/services')
    const res = await deleteServiceAction({ serviceId: SERVICE_ID })
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.error).toMatch(/commandes/)
  })
})
