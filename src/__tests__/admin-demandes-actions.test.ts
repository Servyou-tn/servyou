/**
 * Unit tests for the admin « Demandes » server actions (src/app/admin/demandes/actions.ts) and their input / error
 * contract (src/lib/admin/requests.ts). Supabase is mocked at the rpc() / from() level and the service-role erasure
 * (finishAccountErasure) is mocked: this covers the actions' validation, admin gate, error mapping and — the part that
 * matters — the approve → erase ordering and its retry path. The RPCs themselves and the real erasure (auth, Storage)
 * are proven live in admin-requests-live.test.ts.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'

const REQ = '11111111-1111-4111-8111-111111111111'
const USER = '22222222-2222-4222-8222-222222222222'
const OTHER = '33333333-3333-4333-8333-333333333333'
const TOMBSTONE = `supprime-${USER}@deleted.servyou.invalid`

type RpcResult = { data: unknown; error: { code?: string; message: string; details?: string | null } | null }

const h = vi.hoisted(() => {
  const state = {
    rpc: {} as Record<string, RpcResult>,
    request: { data: null as unknown, error: null as unknown },
  }
  const rpc = vi.fn((name: string) => Promise.resolve(state.rpc[name] ?? { data: null, error: null }))
  const maybeSingle = vi.fn(() => Promise.resolve(state.request))
  const eq = vi.fn(() => ({ maybeSingle }))
  const select = vi.fn(() => ({ eq }))
  const from = vi.fn(() => ({ select }))
  const revalidatePath = vi.fn()
  return { state, rpc, from, revalidatePath }
})

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn(async () => ({ rpc: h.rpc, from: h.from })) }))
vi.mock('next/cache', () => ({ revalidatePath: h.revalidatePath }))

const guard = vi.hoisted(() => ({ checkAdmin: vi.fn() }))
vi.mock('@/lib/auth/require-admin', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/auth/require-admin')>()),
  checkAdmin: guard.checkAdmin,
}))

// Only finishAccountErasure is mocked; tombstoneEmail stays the real formula the action checks the RPC result against.
const erasure = vi.hoisted(() => ({ finishAccountErasure: vi.fn() }))
vi.mock('@/lib/admin/account-erasure', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/admin/account-erasure')>()),
  finishAccountErasure: erasure.finishAccountErasure,
}))

import {
  approveDeletionRequest,
  rejectDeletionRequest,
  completeDataExport,
  rejectDataExport,
  markContactMessageHandled,
} from '@/app/admin/demandes/actions'
import { REQUEST_ERROR, requestRpcErrorKey } from '@/lib/admin/requests'
import { productImagePath } from '@/lib/admin/account-erasure'

const APPROVED: RpcResult = { data: { status: 'approved', user_id: USER, tombstone_email: TOMBSTONE, counts: {} }, error: null }
const ALREADY = { code: '23514', message: 'Cette demande a déjà été traitée.' }
const rpcNames = () => h.rpc.mock.calls.map((c) => c[0])

beforeEach(() => {
  h.state.rpc = {}
  h.state.request = { data: null, error: null }
  h.rpc.mockClear()
  h.from.mockClear()
  h.revalidatePath.mockClear()
  guard.checkAdmin.mockReset()
  guard.checkAdmin.mockResolvedValue({ ok: true, userId: 'admin-1' })
  erasure.finishAccountErasure.mockReset()
  erasure.finishAccountErasure.mockResolvedValue({ ok: true, filesRemoved: 3, imageRowsRemoved: 1 })
})

describe('input + admin gate (every action)', () => {
  const actions = [
    ['approveDeletionRequest', () => approveDeletionRequest('nope')],
    ['rejectDeletionRequest', () => rejectDeletionRequest('nope', 'motif')],
    ['completeDataExport', () => completeDataExport('nope')],
    ['rejectDataExport', () => rejectDataExport('nope', 'motif')],
    ['markContactMessageHandled', () => markContactMessageHandled('nope')],
  ] as const

  it.each(actions)('%s: a malformed id runs nothing', async (_, call) => {
    expect(await call()).toEqual({ success: false, error: REQUEST_ERROR.generic })
    expect(guard.checkAdmin).not.toHaveBeenCalled()
    expect(h.rpc).not.toHaveBeenCalled()
  })

  it('a note over 500 characters runs nothing', async () => {
    expect(await approveDeletionRequest(REQ, 'n'.repeat(501))).toEqual({ success: false, error: REQUEST_ERROR.noteTooLong })
    expect(await markContactMessageHandled(REQ, 'n'.repeat(501))).toEqual({ success: false, error: REQUEST_ERROR.noteTooLong })
    expect(h.rpc).not.toHaveBeenCalled()
  })

  it('a refusal without a note (missing, empty, blank) runs nothing', async () => {
    for (const note of [undefined, '', '   ']) {
      expect(await rejectDeletionRequest(REQ, note)).toEqual({ success: false, error: REQUEST_ERROR.noteRequired })
      expect(await rejectDataExport(REQ, note)).toEqual({ success: false, error: REQUEST_ERROR.noteRequired })
    }
    expect(guard.checkAdmin).not.toHaveBeenCalled()
  })

  it('a non-admin is refused before any RPC; a failed lookup reads as the generic error', async () => {
    guard.checkAdmin.mockResolvedValue({ ok: false, reason: 'forbidden' })
    expect(await approveDeletionRequest(REQ)).toEqual({ success: false, error: REQUEST_ERROR.forbidden })
    guard.checkAdmin.mockResolvedValue({ ok: false, reason: 'unauthenticated' })
    expect(await completeDataExport(REQ)).toEqual({ success: false, error: REQUEST_ERROR.forbidden })
    guard.checkAdmin.mockResolvedValue({ ok: false, reason: 'query_failed' })
    expect(await markContactMessageHandled(REQ)).toEqual({ success: false, error: REQUEST_ERROR.generic })
    expect(h.rpc).not.toHaveBeenCalled()
    expect(erasure.finishAccountErasure).not.toHaveBeenCalled()
  })
})

describe('approveDeletionRequest', () => {
  it('approve → erase the RPC’s user → completion audit row', async () => {
    h.state.rpc.admin_process_deletion_request = APPROVED
    expect(await approveDeletionRequest(REQ, '  confirmé  ')).toEqual({ success: true })
    expect(h.rpc).toHaveBeenNthCalledWith(1, 'admin_process_deletion_request', { p_request_id: REQ, p_decision: 'approve', p_note: 'confirmé' })
    expect(erasure.finishAccountErasure).toHaveBeenCalledWith(USER)
    expect(h.rpc).toHaveBeenNthCalledWith(2, 'log_admin_action', {
      p_action: 'complete_account_erasure',
      p_target_type: 'user',
      p_target_id: USER,
      p_after_state: { request_id: REQ, auth: 'banned', files_removed: 3, image_rows_removed: 1 },
    })
    expect(h.revalidatePath).toHaveBeenCalledWith('/admin/demandes')
  })

  it('an empty note is sent as no note', async () => {
    h.state.rpc.admin_process_deletion_request = APPROVED
    await approveDeletionRequest(REQ, '   ')
    expect(h.rpc).toHaveBeenNthCalledWith(1, 'admin_process_deletion_request', { p_request_id: REQ, p_decision: 'approve', p_note: undefined })
  })

  it.each([
    ['open orders', { code: '23514', message: 'Ce compte a encore 2 commande(s) en cours : elles doivent être terminées ou annulées avant la suppression.' }, REQUEST_ERROR.openOrders],
    ['own account', { code: '42501', message: 'Vous ne pouvez pas traiter la suppression de votre propre compte.' }, REQUEST_ERROR.selfAccount],
    ['admin account', { code: '42501', message: 'Un compte administrateur ne peut pas être supprimé ici.' }, REQUEST_ERROR.adminAccount],
    ['not admin', { code: '42501', message: 'Accès réservé aux administrateurs.' }, REQUEST_ERROR.forbidden],
    ['unknown request', { code: 'P0002', message: 'Demande introuvable.' }, REQUEST_ERROR.notFound],
    ['anything else', { code: 'XX000', message: 'boom' }, REQUEST_ERROR.generic],
  ])('a refused approval (%s) maps its key and erases nothing', async (_, error, key) => {
    h.state.rpc.admin_process_deletion_request = { data: null, error }
    expect(await approveDeletionRequest(REQ)).toEqual({ success: false, error: key })
    expect(erasure.finishAccountErasure).not.toHaveBeenCalled()
    expect(h.from).not.toHaveBeenCalled()
  })

  it('retry: an already-APPROVED request only finishes the erasure, for the request’s own user', async () => {
    h.state.rpc.admin_process_deletion_request = { data: null, error: ALREADY }
    h.state.request = { data: { status: 'approved', user_id: OTHER }, error: null }
    expect(await approveDeletionRequest(REQ)).toEqual({ success: true })
    expect(h.from).toHaveBeenCalledWith('deletion_requests')
    expect(erasure.finishAccountErasure).toHaveBeenCalledWith(OTHER)
  })

  it('retry: an already-REJECTED request erases nothing', async () => {
    h.state.rpc.admin_process_deletion_request = { data: null, error: ALREADY }
    h.state.request = { data: { status: 'rejected', user_id: OTHER }, error: null }
    expect(await approveDeletionRequest(REQ)).toEqual({ success: false, error: REQUEST_ERROR.alreadyProcessed })
    expect(erasure.finishAccountErasure).not.toHaveBeenCalled()
  })

  it('retry: a failed request lookup erases nothing', async () => {
    h.state.rpc.admin_process_deletion_request = { data: null, error: ALREADY }
    h.state.request = { data: null, error: { message: 'down', code: '08006' } }
    expect(await approveDeletionRequest(REQ)).toEqual({ success: false, error: REQUEST_ERROR.alreadyProcessed })
    expect(erasure.finishAccountErasure).not.toHaveBeenCalled()
  })

  it('an unexpected RPC result (tombstone e-mail ≠ the user’s) erases nothing and reports « approved, incomplete »', async () => {
    h.state.rpc.admin_process_deletion_request = { data: { status: 'approved', user_id: USER, tombstone_email: 'someone@example.com' }, error: null }
    expect(await approveDeletionRequest(REQ)).toEqual({ success: false, error: REQUEST_ERROR.erasureIncomplete, approved: true })
    expect(erasure.finishAccountErasure).not.toHaveBeenCalled()
  })

  it('a partial erasure reports « approved, incomplete » and writes no completion row', async () => {
    h.state.rpc.admin_process_deletion_request = APPROVED
    erasure.finishAccountErasure.mockResolvedValue({ ok: false, step: 'files', reason: 'failed' })
    expect(await approveDeletionRequest(REQ)).toEqual({ success: false, error: REQUEST_ERROR.erasureIncomplete, approved: true })
    expect(rpcNames()).toEqual(['admin_process_deletion_request'])
  })

  it('a failed completion audit row does not fail a finished deletion', async () => {
    h.state.rpc.admin_process_deletion_request = APPROVED
    h.state.rpc.log_admin_action = { data: null, error: { message: 'audit down', code: '08006' } }
    expect(await approveDeletionRequest(REQ)).toEqual({ success: true })
  })
})

describe('reject / export / contact', () => {
  it('rejectDeletionRequest sends the trimmed note and never erases', async () => {
    expect(await rejectDeletionRequest(REQ, '  doublon  ')).toEqual({ success: true })
    expect(h.rpc).toHaveBeenCalledWith('admin_process_deletion_request', { p_request_id: REQ, p_decision: 'reject', p_note: 'doublon' })
    expect(erasure.finishAccountErasure).not.toHaveBeenCalled()
    h.state.rpc.admin_process_deletion_request = { data: null, error: ALREADY }
    expect(await rejectDeletionRequest(REQ, 'doublon')).toEqual({ success: false, error: REQUEST_ERROR.alreadyProcessed })
  })

  it('completeDataExport / rejectDataExport pass the decision', async () => {
    expect(await completeDataExport(REQ)).toEqual({ success: true })
    expect(h.rpc).toHaveBeenLastCalledWith('admin_process_data_export', { p_export_id: REQ, p_decision: 'completed', p_note: undefined })
    expect(await rejectDataExport(REQ, 'compte inconnu')).toEqual({ success: true })
    expect(h.rpc).toHaveBeenLastCalledWith('admin_process_data_export', { p_export_id: REQ, p_decision: 'rejected', p_note: 'compte inconnu' })
    h.state.rpc.admin_process_data_export = { data: null, error: ALREADY }
    expect(await completeDataExport(REQ)).toEqual({ success: false, error: REQUEST_ERROR.alreadyProcessed })
  })

  it('markContactMessageHandled maps « already handled » and « not found »', async () => {
    expect(await markContactMessageHandled(REQ, 'répondu')).toEqual({ success: true })
    expect(h.rpc).toHaveBeenLastCalledWith('admin_mark_contact_message_handled', { p_message_id: REQ, p_note: 'répondu' })
    h.state.rpc.admin_mark_contact_message_handled = { data: null, error: { code: '23514', message: 'Ce message est déjà traité.' } }
    expect(await markContactMessageHandled(REQ)).toEqual({ success: false, error: REQUEST_ERROR.alreadyHandled })
    h.state.rpc.admin_mark_contact_message_handled = { data: null, error: { code: 'P0002', message: 'Message introuvable.' } }
    expect(await markContactMessageHandled(REQ)).toEqual({ success: false, error: REQUEST_ERROR.notFound })
  })
})

describe('helpers', () => {
  it('requestRpcErrorKey matches whole messages, never substrings', () => {
    expect(requestRpcErrorKey({ code: '23514', message: 'Cette demande a déjà été traitée. (x)' })).toBe(REQUEST_ERROR.generic)
    expect(requestRpcErrorKey({ code: '23514', message: 'Indiquez le motif du refus.' })).toBe(REQUEST_ERROR.noteRequired)
  })

  it('productImagePath reads the product-images object path from a public URL', () => {
    expect(productImagePath('https://x.supabase.co/storage/v1/object/public/product-images/s1/p1/a.webp')).toBe('s1/p1/a.webp')
    expect(productImagePath('https://x.supabase.co/storage/v1/object/public/product-images/s1/p1/a.webp?v=2')).toBe('s1/p1/a.webp')
    expect(productImagePath('https://x.supabase.co/storage/v1/object/public/avatars/u/a.webp')).toBeNull()
  })
})
