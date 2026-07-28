/**
 * G8 — seller inbox: the tab partition, the wait-time rule, and the cancellation write path.
 *
 * The transition map itself is pinned in seller-dashboard.test.ts, which now points at the
 * consolidated `@/lib/types/order-status`. What is new here:
 *   1. `nextSellerStatus` must STOP at `arrived`. The consolidation swapped an if-ladder for the
 *      lifecycle arrays, and `nextStatus('arrived')` legitimately returns `received` — which is
 *      BUYER-only in the trigger. If the wrapper is ever dropped, G8 renders a button the
 *      database refuses. This is the exact regression the consolidation could have introduced.
 *   2. `statusesForTab` partitions the inbox; a status silently missing from every tab is
 *      invisible to the seller.
 *   3. `cancelOrderAction` — first write path that both parties will share.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { nextSellerStatus, nextStatus, isCancellable } from '@/lib/types/order-status'
import { statusesForTab, ORDER_TABS, DEFAULT_ORDER_TAB } from '@/lib/marche/seller-orders'
import { statusPillFor } from '@/lib/orders/order-status'

// ── 1. The consolidation must not have widened the seller's chain ────────────────────────────

describe('nextSellerStatus vs nextStatus — the buyer-only boundary', () => {
  it('nextStatus DOES return received from arrived (the raw lifecycle)', () => {
    expect(nextStatus('arrived', 'product')).toBe('received')
    expect(nextStatus('arrived', 'service')).toBe('received')
  })

  it('nextSellerStatus does NOT — `received` is the buyer’s move alone', () => {
    expect(nextSellerStatus('arrived', 'product')).toBeNull()
    expect(nextSellerStatus('arrived', 'service')).toBeNull()
  })

  it('agrees with nextStatus everywhere else on the product chain', () => {
    for (const s of ['pending', 'accepted', 'prepared', 'dispatched', 'in_delivery'] as const) {
      expect(nextSellerStatus(s, 'product')).toBe(nextStatus(s, 'product'))
    }
  })

  it('agrees with nextStatus everywhere else on the service chain', () => {
    for (const s of ['pending', 'accepted'] as const) {
      expect(nextSellerStatus(s, 'service')).toBe(nextStatus(s, 'service'))
    }
  })
})

// ── 2. Tab partition ──────────────────────────────────────────────────────────────────────────

describe('statusesForTab', () => {
  it('"à traiter" is exactly the seller-actionable set', () => {
    expect(statusesForTab('a_traiter')).toEqual(['pending', 'accepted', 'prepared', 'dispatched'])
  })

  it('every actionable status has a seller-owned next hop — the tab cannot lie', () => {
    for (const s of statusesForTab('a_traiter')!) {
      expect(nextSellerStatus(s, 'product'), `${s} should be advanceable`).not.toBeNull()
    }
  })

  it('"all" applies no status predicate', () => {
    expect(statusesForTab('all')).toBeNull()
  })

  it('matches the Figma 5-tab set, in frame order', () => {
    expect([...ORDER_TABS]).toEqual(['all', 'a_traiter', 'in_delivery', 'done', 'cancelled'])
  })

  it('lands on À traiter, not Toutes — the approved divergence from the frame', () => {
    // The frame's ACTIVE tab is `all`; an inbox that opens on an undifferentiated list does not
    // answer "what needs me?". Pinned so the divergence is deliberate rather than drift.
    expect(DEFAULT_ORDER_TAB).toBe('a_traiter')
    expect(ORDER_TABS[0]).toBe('all')
  })

  it('every DB status is reachable from at least one tab', () => {
    const covered = new Set<string>()
    for (const tab of ORDER_TABS) {
      const list = statusesForTab(tab)
      if (list) list.forEach((s) => covered.add(s))
    }
    // 'refused' is a pill variant in Figma but not a value check_order_status_transition can
    // produce, so it is deliberately absent from the DB set below.
    for (const s of [
      'pending', 'accepted', 'prepared', 'dispatched', 'in_delivery', 'arrived', 'received', 'cancelled',
    ]) {
      expect(covered.has(s), `${s} is not in any tab`).toBe(true)
    }
  })

  it('terminal statuses are not cancellable', () => {
    expect(isCancellable('received')).toBe(false)
    expect(isCancellable('cancelled')).toBe(false)
    expect(isCancellable('arrived')).toBe(true)
  })
})

// ── 3. cancelOrderAction ──────────────────────────────────────────────────────────────────────

const state = {
  user: null as { id: string } | null,
  order: null as Record<string, unknown> | null,
  updates: [] as Record<string, unknown>[],
  updateError: null as { message: string } | null,
}

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/i18n/server', () => ({ getLang: async () => 'fr' }))
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: state.user } }) },
    from: () => {
      const q: Record<string, unknown> = {}
      q.select = () => q
      q.eq = () => q
      q.maybeSingle = async () => ({ data: state.order, error: null })
      q.update = (patch: Record<string, unknown>) => {
        state.updates.push(patch)
        return { eq: async () => ({ error: state.updateError }) }
      }
      return q
    },
  }),
}))

const SELLER = 'seller-1'
const BUYER = 'buyer-1'
const ID = '11111111-1111-4111-8111-111111111111'

beforeEach(() => {
  state.user = { id: SELLER }
  state.order = { id: ID, seller_id: SELLER, buyer_id: BUYER, status: 'pending', order_type: 'product' }
  state.updates = []
  state.updateError = null
})

describe('cancelOrderAction', () => {
  it('cancels pre-pivot without a reason, stamping cancelled_by from the caller’s side', async () => {
    const { cancelOrderAction } = await import('@/app/actions/orders')
    const res = await cancelOrderAction({ orderId: ID })
    expect(res.ok).toBe(true)
    expect(state.updates[0]).toMatchObject({ status: 'cancelled', cancelled_by: 'seller' })
  })

  it('derives cancelled_by = buyer when the caller is the buyer', async () => {
    state.user = { id: BUYER }
    const { cancelOrderAction } = await import('@/app/actions/orders')
    await cancelOrderAction({ orderId: ID })
    expect(state.updates[0]).toMatchObject({ cancelled_by: 'buyer' })
  })

  it('REFUSES post-pivot cancellation with no reason, before touching the DB', async () => {
    state.order = { ...state.order!, status: 'dispatched' }
    const { cancelOrderAction } = await import('@/app/actions/orders')
    const res = await cancelOrderAction({ orderId: ID })
    expect(res.ok).toBe(false)
    expect(state.updates).toEqual([])
  })

  it('accepts post-pivot cancellation when a reason is supplied', async () => {
    state.order = { ...state.order!, status: 'dispatched' }
    const { cancelOrderAction } = await import('@/app/actions/orders')
    const res = await cancelOrderAction({ orderId: ID, reason: 'Adresse introuvable' })
    expect(res.ok).toBe(true)
    expect(state.updates[0]).toMatchObject({ cancellation_reason: 'Adresse introuvable' })
  })

  it('treats a whitespace-only reason as absent', async () => {
    state.order = { ...state.order!, status: 'arrived', order_type: 'service' }
    const { cancelOrderAction } = await import('@/app/actions/orders')
    const res = await cancelOrderAction({ orderId: ID, reason: '   ' })
    expect(res.ok).toBe(false)
    expect(state.updates).toEqual([])
  })

  it('refuses a terminal order', async () => {
    state.order = { ...state.order!, status: 'received' }
    const { cancelOrderAction } = await import('@/app/actions/orders')
    const res = await cancelOrderAction({ orderId: ID })
    expect(res.ok).toBe(false)
    expect(state.updates).toEqual([])
  })

  it('refuses a caller who is neither buyer nor seller, without confirming the id exists', async () => {
    state.user = { id: 'stranger' }
    const { cancelOrderAction } = await import('@/app/actions/orders')
    const res = await cancelOrderAction({ orderId: ID })
    expect(res.ok).toBe(false)
    expect(state.updates).toEqual([])
    if (!res.ok) expect(res.error).toBe('Une erreur est survenue. Veuillez réessayer.')
  })

  it('rejects a non-uuid id and an over-long reason before any DB call', async () => {
    const { cancelOrderAction } = await import('@/app/actions/orders')
    expect((await cancelOrderAction({ orderId: 'nope' })).ok).toBe(false)
    expect((await cancelOrderAction({ orderId: ID, reason: 'x'.repeat(501) })).ok).toBe(false)
    expect(state.updates).toEqual([])
  })

  it('rejects an unknown revalidate path rather than passing it through', async () => {
    const { cancelOrderAction } = await import('@/app/actions/orders')
    const res = await cancelOrderAction({ orderId: ID, revalidate: '/evil' })
    expect(res.ok).toBe(false)
    expect(state.updates).toEqual([])
  })
})

// ── 4. Status pill coverage — the G8 delta S5 regression guard ────────────────────────────────

describe('statusPillFor', () => {
  // The bug this pins: STATUS_PILL was E3's SERVICE map (5 keys), and G8 pointed a seller's
  // PRODUCT inbox at it, so prepared/dispatched/in_delivery rendered NO pill at all — three of
  // the seven seller states silently blank on screen while the build stayed green.
  it.each([
    'pending', 'accepted', 'prepared', 'dispatched', 'in_delivery', 'arrived', 'received', 'cancelled',
  ])('resolves a pill for %s on a product order', (status) => {
    const got = statusPillFor(status, 'product')
    expect(got, `${status} has no pill`).toBeDefined()
    expect(got!.pill).toBeTruthy()
    expect(got!.labelKey).toMatch(/^common\.status_/)
  })

  it('labels `arrived` per order type — a parcel arrives, work is delivered', () => {
    expect(statusPillFor('arrived', 'product')!.labelKey).toBe('common.status_arrived')
    expect(statusPillFor('arrived', 'service')!.labelKey).toBe('common.status_arrived_service')
  })

  it('defaults to the service label so E3 call sites keep their exact wording', () => {
    expect(statusPillFor('arrived')!.labelKey).toBe('common.status_arrived_service')
  })

  it('returns undefined for a status that is not a lifecycle value', () => {
    expect(statusPillFor('not_a_status', 'product')).toBeUndefined()
  })
})
