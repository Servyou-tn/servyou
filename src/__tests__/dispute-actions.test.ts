/**
 * Unit tests for the party-facing createDispute server action.
 *
 * The Supabase client is mocked — these cover the action's validation + role-inference
 * logic, NOT the database. DB enforcement (RLS party/role match, the partial unique
 * index disputes_one_active_per_order, disputes_other_requires_description) lives in
 * production and is mirrored in db/migrations (PR-P1).
 *
 * createDispute touches two tables: it reads `orders` (select->eq->maybeSingle) to infer
 * the caller's role, then inserts into `disputes` (insert->select). The mock routes
 * `from('orders')` and `from('disputes')` to separate chains. Pure-validation paths
 * (bad reason, missing description) must return BEFORE any client call.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'

const h = vi.hoisted(() => {
  const state: {
    user: { id: string } | null
    order: Record<string, unknown> | null
    insertResult: { data: unknown; error: unknown }
  } = {
    user: { id: 'u_buyer' },
    order: { buyer_id: 'u_buyer', seller_id: 'u_seller', status: 'accepted', order_type: 'product' },
    insertResult: { data: [{ id: 'd_new' }], error: null },
  }

  const ordersChain: Record<string, unknown> = {}
  ordersChain.select = vi.fn(() => ordersChain)
  ordersChain.eq = vi.fn(() => ordersChain)
  ordersChain.maybeSingle = vi.fn(() => Promise.resolve({ data: state.order, error: null }))

  const disputesChain: Record<string, unknown> = {}
  disputesChain.insert = vi.fn(() => disputesChain)
  disputesChain.select = vi.fn(() => Promise.resolve(state.insertResult))

  const from = vi.fn((table: string) => (table === 'orders' ? ordersChain : disputesChain))
  const getUser = vi.fn(() => Promise.resolve({ data: { user: state.user }, error: null }))
  const revalidatePath = vi.fn()
  return { state, from, getUser, revalidatePath, ordersChain, disputesChain }
})

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({ from: h.from, auth: { getUser: h.getUser } })),
}))

vi.mock('next/cache', () => ({ revalidatePath: h.revalidatePath }))

import { createDispute } from '@/app/actions/disputes'

const insertFn = h.disputesChain.insert as ReturnType<typeof vi.fn>

beforeEach(() => {
  h.state.user = { id: 'u_buyer' }
  h.state.order = { buyer_id: 'u_buyer', seller_id: 'u_seller', status: 'accepted', order_type: 'product' }
  h.state.insertResult = { data: [{ id: 'd_new' }], error: null }
  vi.clearAllMocks()
})

describe('createDispute — reason validation', () => {
  it('rejects an unknown reason without touching the database', async () => {
    const res = await createDispute('o1', 'banana', '')
    expect(res).toEqual({ success: false, error: 'dispute.error_reason_required' })
    expect(h.from).not.toHaveBeenCalled()
  })

  it('accepts every valid reason (description supplied for "other")', async () => {
    const reasons = ['not_delivered', 'wrong_item', 'damaged', 'payment_refused', 'buyer_unreachable', 'other']
    for (const reason of reasons) {
      const res = await createDispute('o1', reason, reason === 'other' ? 'Détails du litige.' : '')
      expect(res).toEqual({ success: true, disputeId: 'd_new' })
    }
  })
})

describe('createDispute — description required for "other"', () => {
  it('rejects an empty description without touching the database', async () => {
    const res = await createDispute('o1', 'other', '')
    expect(res).toEqual({ success: false, error: 'dispute.error_description_required' })
    expect(h.from).not.toHaveBeenCalled()
  })

  it('rejects a whitespace-only description', async () => {
    const res = await createDispute('o1', 'other', '   \n\t ')
    expect(res).toEqual({ success: false, error: 'dispute.error_description_required' })
    expect(h.from).not.toHaveBeenCalled()
  })

  it('accepts a non-empty description', async () => {
    const res = await createDispute('o1', 'other', 'Le vendeur ne répond pas.')
    expect(res).toEqual({ success: true, disputeId: 'd_new' })
  })
})

describe('createDispute — role inference', () => {
  it('infers buyer when auth.uid matches order.buyer_id', async () => {
    h.state.user = { id: 'u_buyer' }
    const res = await createDispute('o1', 'not_delivered', '')
    expect(res).toEqual({ success: true, disputeId: 'd_new' })
    expect(h.revalidatePath).toHaveBeenCalledWith('/demande/confirmation/o1')
  })

  it('infers seller when auth.uid matches order.seller_id', async () => {
    h.state.user = { id: 'u_seller' }
    const res = await createDispute('o1', 'buyer_unreachable', '')
    expect(res).toEqual({ success: true, disputeId: 'd_new' })
    expect(h.revalidatePath).toHaveBeenCalledWith('/ma-boutique/commandes')
  })

  it('rejects a caller who is neither party, without inserting', async () => {
    h.state.user = { id: 'u_stranger' }
    const res = await createDispute('o1', 'not_delivered', '')
    expect(res).toEqual({ success: false, error: 'dispute.error_not_authorized' })
    expect(insertFn).not.toHaveBeenCalled()
  })
})

describe('createDispute — order eligibility', () => {
  it('rejects when the order is still pending, without inserting', async () => {
    h.state.order = { buyer_id: 'u_buyer', seller_id: 'u_seller', status: 'pending', order_type: 'product' }
    const res = await createDispute('o1', 'not_delivered', '')
    expect(res).toEqual({ success: false, error: 'dispute.error_order_not_eligible' })
    expect(insertFn).not.toHaveBeenCalled()
  })

  it('rejects when the order is not found / not readable', async () => {
    h.state.order = null
    const res = await createDispute('o1', 'not_delivered', '')
    expect(res).toEqual({ success: false, error: 'dispute.error_order_not_eligible' })
    expect(insertFn).not.toHaveBeenCalled()
  })
})

describe('createDispute — insert outcomes', () => {
  it('maps a unique violation (23505) to already_active', async () => {
    h.state.insertResult = { data: null, error: { code: '23505', message: 'duplicate key' } }
    const res = await createDispute('o1', 'damaged', '')
    expect(res).toEqual({ success: false, error: 'dispute.error_already_active' })
  })

  it('maps any other insert error to generic', async () => {
    h.state.insertResult = { data: null, error: { code: '42501', message: 'rls' } }
    const res = await createDispute('o1', 'damaged', '')
    expect(res).toEqual({ success: false, error: 'dispute.error_generic' })
  })

  it('returns the new dispute id on success', async () => {
    h.state.insertResult = { data: [{ id: 'd_123' }], error: null }
    const res = await createDispute('o1', 'wrong_item', '')
    expect(res).toEqual({ success: true, disputeId: 'd_123' })
  })
})
