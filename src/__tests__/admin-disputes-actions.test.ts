/**
 * Unit tests for the admin disputes server actions (claimDispute, resolveDispute,
 * dismissDispute). Mirrors admin-reports-actions.test.ts.
 *
 * These cover the action-level error-handling logic, NOT the database — the Supabase
 * client is mocked. DB enforcement is covered by the disputes CHECK constraints
 * (disputes_terminal_requires_admin_note, disputes_outcome_only_when_resolved) existing
 * in production (mirrored in db/migrations, PR-P1).
 *
 * The key behavior under test is the rowcount guard: PostgREST returns
 * { data: [], error: null } when an UPDATE matches zero rows (RLS-blocked caller,
 * already-claimed/closed dispute, double-submit). The action must treat that empty
 * result as failure, not phantom success. resolveDispute additionally validates the
 * outcome and the note BEFORE any DB call.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mutable mock state + chainable Supabase query builder, hoisted so vi.mock can use it.
const h = vi.hoisted(() => {
  const state: {
    result: { data: unknown; error: unknown }
    rpcResult: { data: unknown; error: unknown }
  } = {
    result: { data: [{ id: 'd1' }], error: null },
    rpcResult: { data: 'audit-id', error: null },
  }
  // The action chains .from().update().eq().eq()/.in().select(); only .select() resolves.
  const chain: Record<string, unknown> = {}
  chain.update = vi.fn(() => chain)
  chain.eq = vi.fn(() => chain)
  chain.in = vi.fn(() => chain)
  chain.select = vi.fn(() => Promise.resolve(state.result))
  const from = vi.fn(() => chain)
  // log_admin_action is invoked via supabase.rpc(...) after a successful update.
  const rpc = vi.fn(() => Promise.resolve(state.rpcResult))
  const revalidatePath = vi.fn()
  return { state, chain, from, rpc, revalidatePath }
})

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({ from: h.from, rpc: h.rpc })),
}))

vi.mock('next/cache', () => ({
  revalidatePath: h.revalidatePath,
}))

import { claimDispute, resolveDispute, dismissDispute } from '@/app/admin/litiges/actions'

beforeEach(() => {
  h.state.result = { data: [{ id: 'd1' }], error: null }
  h.state.rpcResult = { data: 'audit-id', error: null }
  h.revalidatePath.mockClear()
  h.from.mockClear()
  h.rpc.mockClear()
})

describe('claimDispute', () => {
  it('returns no-row when the update matches zero rows (already claimed / RLS-blocked)', async () => {
    h.state.result = { data: [], error: null }
    const res = await claimDispute('d1')
    expect(res).toEqual({ success: false, error: 'admin.disputes.error_claim_no_row' })
  })

  it('succeeds and revalidates when a row is updated', async () => {
    h.state.result = { data: [{ id: 'd1' }], error: null }
    const res = await claimDispute('d1')
    expect(res).toEqual({ success: true })
    expect(h.revalidatePath).toHaveBeenCalledWith('/admin/litiges')
    expect(h.revalidatePath).toHaveBeenCalledWith('/admin/litiges/d1')
  })

  it('writes a claim_dispute audit log entry on success', async () => {
    h.state.result = { data: [{ id: 'd1' }], error: null }
    await claimDispute('d1')
    expect(h.rpc).toHaveBeenCalledWith('log_admin_action', {
      p_action: 'claim_dispute',
      p_target_type: 'dispute',
      p_target_id: 'd1',
      p_before_state: { status: 'open' },
      p_after_state: { status: 'under_review' },
    })
  })
})

describe('resolveDispute', () => {
  it('rejects an empty admin_note without touching the database', async () => {
    const res = await resolveDispute('d1', 'sided_buyer', '')
    expect(res).toEqual({ success: false, error: 'admin.disputes.note_required' })
    expect(h.from).not.toHaveBeenCalled()
  })

  it('rejects a whitespace-only admin_note', async () => {
    const res = await resolveDispute('d1', 'sided_buyer', '   \n\t  ')
    expect(res).toEqual({ success: false, error: 'admin.disputes.note_required' })
    expect(h.from).not.toHaveBeenCalled()
  })

  it('rejects a missing outcome (valid note) without touching the database', async () => {
    const res = await resolveDispute('d1', '', 'Décision rendue après examen des preuves.')
    expect(res).toEqual({ success: false, error: 'admin.disputes.outcome_required' })
    expect(h.from).not.toHaveBeenCalled()
  })

  it('rejects an invalid outcome value without touching the database', async () => {
    const res = await resolveDispute('d1', 'sided_nobody', 'Décision rendue après examen des preuves.')
    expect(res).toEqual({ success: false, error: 'admin.disputes.outcome_required' })
    expect(h.from).not.toHaveBeenCalled()
  })

  it('returns no-row when the update matches zero rows (already closed / RLS-blocked)', async () => {
    h.state.result = { data: [], error: null }
    const res = await resolveDispute('d1', 'compromise', 'Compromis proposé aux deux parties.')
    expect(res).toEqual({ success: false, error: 'admin.disputes.error_resolve_no_row' })
  })

  it('succeeds and revalidates with a valid outcome + note', async () => {
    h.state.result = { data: [{ id: 'd1' }], error: null }
    const res = await resolveDispute('d1', 'sided_seller', 'Preuve de livraison fournie.')
    expect(res).toEqual({ success: true })
    expect(h.revalidatePath).toHaveBeenCalledWith('/admin/litiges')
    expect(h.revalidatePath).toHaveBeenCalledWith('/admin/litiges/d1')
  })

  it('writes a resolve_dispute audit log entry with the outcome + note on success', async () => {
    h.state.result = { data: [{ id: 'd1' }], error: null }
    await resolveDispute('d1', 'sided_seller', 'Preuve de livraison fournie.')
    expect(h.rpc).toHaveBeenCalledWith('log_admin_action', {
      p_action: 'resolve_dispute',
      p_target_type: 'dispute',
      p_target_id: 'd1',
      p_after_state: { status: 'resolved', outcome: 'sided_seller' },
      p_note: 'Preuve de livraison fournie.',
    })
  })
})

describe('dismissDispute', () => {
  it('rejects an empty admin_note without touching the database', async () => {
    const res = await dismissDispute('d1', '')
    expect(res).toEqual({ success: false, error: 'admin.disputes.dismiss_note_required' })
    expect(h.from).not.toHaveBeenCalled()
  })

  it('rejects a whitespace-only admin_note', async () => {
    const res = await dismissDispute('d1', '   \n\t  ')
    expect(res).toEqual({ success: false, error: 'admin.disputes.dismiss_note_required' })
    expect(h.from).not.toHaveBeenCalled()
  })

  it('returns no-row when the dispute is already terminal (resolved/dismissed)', async () => {
    h.state.result = { data: [], error: null }
    const res = await dismissDispute('d1', 'Litige infondé, aucune action.')
    expect(res).toEqual({ success: false, error: 'admin.disputes.error_dismiss_no_row' })
  })

  it('succeeds and revalidates when a row is updated', async () => {
    h.state.result = { data: [{ id: 'd1' }], error: null }
    const res = await dismissDispute('d1', 'Litige infondé, aucune action prise.')
    expect(res).toEqual({ success: true })
    expect(h.revalidatePath).toHaveBeenCalledWith('/admin/litiges')
    expect(h.revalidatePath).toHaveBeenCalledWith('/admin/litiges/d1')
  })

  it('writes a dismiss_dispute audit log entry with the note on success', async () => {
    h.state.result = { data: [{ id: 'd1' }], error: null }
    await dismissDispute('d1', 'Litige infondé, aucune action prise.')
    expect(h.rpc).toHaveBeenCalledWith('log_admin_action', {
      p_action: 'dismiss_dispute',
      p_target_type: 'dispute',
      p_target_id: 'd1',
      p_after_state: { status: 'dismissed' },
      p_note: 'Litige infondé, aucune action prise.',
    })
  })
})
