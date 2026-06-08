/**
 * Unit tests for the admin reports queue server actions (claimReport, resolveReport).
 *
 * These cover the action-level error-handling logic, NOT the database — the Supabase
 * client is mocked. DB enforcement is covered by the reports_resolved_requires_admin_note
 * CHECK constraint existing in production (mirrored in db/migrations).
 *
 * The key behavior under test is the rowcount guard: PostgREST returns
 * { data: [], error: null } when an UPDATE matches zero rows (RLS-blocked caller,
 * already-claimed/resolved report, double-submit). The action must treat that empty
 * result as failure, not phantom success.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mutable mock state + chainable Supabase query builder, hoisted so vi.mock can use it.
const h = vi.hoisted(() => {
  const state: {
    result: { data: unknown; error: unknown }
    rpcResult: { data: unknown; error: unknown }
  } = {
    result: { data: [{ id: 'r1' }], error: null },
    rpcResult: { data: 'audit-id', error: null },
  }
  // The action chains .from().update().eq().eq()/.in().select(); only .select()
  // resolves. Every other step returns the chain.
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

import { claimReport, resolveReport, dismissReport } from '@/app/admin/signalements/actions'

beforeEach(() => {
  h.state.result = { data: [{ id: 'r1' }], error: null }
  h.state.rpcResult = { data: 'audit-id', error: null }
  h.revalidatePath.mockClear()
  h.from.mockClear()
  h.rpc.mockClear()
})

describe('resolveReport', () => {
  it('rejects an empty admin_note without touching the database', async () => {
    const res = await resolveReport('r1', '')
    expect(res).toEqual({ success: false, error: 'admin.reports.admin_note_required' })
    expect(h.from).not.toHaveBeenCalled()
  })

  it('rejects a whitespace-only admin_note', async () => {
    const res = await resolveReport('r1', '   \n\t  ')
    expect(res).toEqual({ success: false, error: 'admin.reports.admin_note_required' })
    expect(h.from).not.toHaveBeenCalled()
  })

  it('returns not-actionable when the update matches zero rows (RLS-blocked / already resolved)', async () => {
    h.state.result = { data: [], error: null }
    const res = await resolveReport('r1', 'Spam confirmé, contenu retiré.')
    expect(res).toEqual({ success: false, error: 'admin.reports.error_not_actionable' })
  })

  it('succeeds and revalidates when a row is updated', async () => {
    h.state.result = { data: [{ id: 'r1' }], error: null }
    const res = await resolveReport('r1', 'Spam confirmé.')
    expect(res).toEqual({ success: true })
    expect(h.revalidatePath).toHaveBeenCalledWith('/admin/signalements')
    expect(h.revalidatePath).toHaveBeenCalledWith('/admin/signalements/r1')
  })

  it('writes a resolve_report audit log entry with the note on success', async () => {
    h.state.result = { data: [{ id: 'r1' }], error: null }
    await resolveReport('r1', 'Spam confirmé.')
    expect(h.rpc).toHaveBeenCalledWith('log_admin_action', {
      p_action: 'resolve_report',
      p_target_type: 'report',
      p_target_id: 'r1',
      p_after_state: { status: 'resolved' },
      p_note: 'Spam confirmé.',
    })
  })

  // The genuinely new behavioral contract: report actions are bare UPDATEs that
  // have already committed before the (separate-round-trip) audit log runs, so a
  // failed audit write must NOT downgrade a succeeded action to a failure. This
  // is the assertion the happy-path mocks can't make for us.
  it('still returns success when the audit log RPC fails (best-effort logging)', async () => {
    h.state.result = { data: [{ id: 'r1' }], error: null }
    h.state.rpcResult = { data: null, error: { message: 'audit insert failed' } }
    const res = await resolveReport('r1', 'Spam confirmé.')
    expect(res).toEqual({ success: true })
  })
})

describe('claimReport', () => {
  it('returns already-claimed when the update matches zero rows', async () => {
    h.state.result = { data: [], error: null }
    const res = await claimReport('r1')
    expect(res).toEqual({ success: false, error: 'admin.reports.error_already_claimed' })
  })

  it('succeeds and revalidates when a row is updated', async () => {
    h.state.result = { data: [{ id: 'r1' }], error: null }
    const res = await claimReport('r1')
    expect(res).toEqual({ success: true })
    expect(h.revalidatePath).toHaveBeenCalledWith('/admin/signalements')
    expect(h.revalidatePath).toHaveBeenCalledWith('/admin/signalements/r1')
  })

  it('writes a claim_report audit log entry on success', async () => {
    h.state.result = { data: [{ id: 'r1' }], error: null }
    await claimReport('r1')
    expect(h.rpc).toHaveBeenCalledWith('log_admin_action', {
      p_action: 'claim_report',
      p_target_type: 'report',
      p_target_id: 'r1',
      p_before_state: { status: 'open' },
      p_after_state: { status: 'under_review' },
    })
  })
})

describe('dismissReport', () => {
  it('rejects an empty admin_note without touching the database', async () => {
    const res = await dismissReport('r1', '')
    expect(res).toEqual({ success: false, error: 'admin.reports.dismiss_note_required' })
    expect(h.from).not.toHaveBeenCalled()
  })

  it('rejects a whitespace-only admin_note', async () => {
    const res = await dismissReport('r1', '   \n\t  ')
    expect(res).toEqual({ success: false, error: 'admin.reports.dismiss_note_required' })
    expect(h.from).not.toHaveBeenCalled()
  })

  it('returns the no-row error when the report is already terminal (resolved/dismissed)', async () => {
    h.state.result = { data: [], error: null }
    const res = await dismissReport('r1', 'Signalement infondé.')
    expect(res).toEqual({ success: false, error: 'admin.reports.error_dismiss_no_row' })
  })

  it('succeeds and revalidates when a row is updated', async () => {
    h.state.result = { data: [{ id: 'r1' }], error: null }
    const res = await dismissReport('r1', 'Signalement infondé, aucune action.')
    expect(res).toEqual({ success: true })
    expect(h.revalidatePath).toHaveBeenCalledWith('/admin/signalements')
    expect(h.revalidatePath).toHaveBeenCalledWith('/admin/signalements/r1')
  })

  it('writes a dismiss_report audit log entry with the note on success', async () => {
    h.state.result = { data: [{ id: 'r1' }], error: null }
    await dismissReport('r1', 'Signalement infondé, aucune action.')
    expect(h.rpc).toHaveBeenCalledWith('log_admin_action', {
      p_action: 'dismiss_report',
      p_target_type: 'report',
      p_target_id: 'r1',
      p_after_state: { status: 'dismissed' },
      p_note: 'Signalement infondé, aucune action.',
    })
  })
})
