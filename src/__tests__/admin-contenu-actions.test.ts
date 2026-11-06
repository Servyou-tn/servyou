/**
 * Unit tests for the admin « Contenu » hide / unhide actions (src/app/admin/contenu/actions.ts): input validation, the
 * admin gate running before any RPC, the RPC arguments, and the RAISE → i18n key mapping. Supabase and checkAdmin are
 * mocked; the SECURITY DEFINER functions themselves are covered by the existing moderation live tests.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

const ID = '11111111-1111-4111-8111-111111111111'

const h = vi.hoisted(() => {
  const state = { rpc: { data: null as unknown, error: null as { message: string; code?: string; details?: string } | null } }
  const rpc = vi.fn(() => Promise.resolve(state.rpc))
  const revalidatePath = vi.fn()
  const checkAdmin = vi.fn()
  return { state, rpc, revalidatePath, checkAdmin }
})
vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn(async () => ({ rpc: h.rpc })) }))
vi.mock('next/cache', () => ({ revalidatePath: h.revalidatePath }))
vi.mock('@/lib/auth/require-admin', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/auth/require-admin')>()),
  checkAdmin: h.checkAdmin,
}))

const { hideContentItem, unhideContentItem } = await import('@/app/admin/contenu/actions')

beforeEach(() => {
  vi.clearAllMocks()
  h.state.rpc = { data: null, error: null }
  h.checkAdmin.mockResolvedValue({ ok: true, userId: 'admin' })
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('hideContentItem', () => {
  it('hides through admin_hide_content with the trimmed reason, then revalidates', async () => {
    expect(await hideContentItem('product', ID, '  Arnaque avérée  ')).toEqual({ success: true })
    expect(h.rpc).toHaveBeenCalledWith('admin_hide_content', { target_type: 'product', target_id: ID, reason: 'Arnaque avérée' })
    expect(h.revalidatePath).toHaveBeenCalledWith('/admin/contenu')
  })
  it('rejects bad input before the admin check or any RPC', async () => {
    expect(await hideContentItem('user', ID, 'x')).toEqual({ success: false, error: 'common.error_generic' })
    expect(await hideContentItem('product', 'not-a-uuid', 'x')).toEqual({ success: false, error: 'common.error_generic' })
    expect(await hideContentItem('product', ID, '   ')).toEqual({ success: false, error: 'admin.moderation.hide_reason_required' })
    expect(await hideContentItem('product', ID, 'x'.repeat(2001))).toEqual({ success: false, error: 'admin.note_too_long' })
    expect(h.checkAdmin).not.toHaveBeenCalled()
    expect(h.rpc).not.toHaveBeenCalled()
  })
  it('a non-admin never reaches the RPC', async () => {
    h.checkAdmin.mockResolvedValue({ ok: false, reason: 'forbidden' })
    expect(await hideContentItem('service', ID, 'raison')).toEqual({ success: false, error: 'admin.moderation.error_forbidden' })
    h.checkAdmin.mockResolvedValue({ ok: false, reason: 'query_failed' })
    expect(await hideContentItem('service', ID, 'raison')).toEqual({ success: false, error: 'common.error_generic' })
    expect(h.rpc).not.toHaveBeenCalled()
  })
  it('maps the function RAISEs to keys and does not revalidate on failure', async () => {
    h.state.rpc = { data: null, error: { message: 'Content already moderated', code: 'P0001' } }
    expect(await hideContentItem('shop', ID, 'raison')).toEqual({ success: false, error: 'admin.moderation.error_already_moderated' })
    h.state.rpc = { data: null, error: { message: 'boom', code: 'XX000' } }
    expect(await hideContentItem('shop', ID, 'raison')).toEqual({ success: false, error: 'common.error_generic' })
    expect(h.revalidatePath).not.toHaveBeenCalled()
  })
})

describe('unhideContentItem', () => {
  it('restores through admin_unhide_content', async () => {
    expect(await unhideContentItem('job_post', ID)).toEqual({ success: true })
    expect(h.rpc).toHaveBeenCalledWith('admin_unhide_content', { target_type: 'job_post', target_id: ID })
  })
  it('gates and maps errors the same way', async () => {
    expect(await unhideContentItem('product', 'x')).toEqual({ success: false, error: 'common.error_generic' })
    h.checkAdmin.mockResolvedValue({ ok: false, reason: 'unauthenticated' })
    expect(await unhideContentItem('product', ID)).toEqual({ success: false, error: 'admin.moderation.error_forbidden' })
    expect(h.rpc).not.toHaveBeenCalled()
    h.checkAdmin.mockResolvedValue({ ok: true, userId: 'admin' })
    h.state.rpc = { data: null, error: { message: 'Content not currently moderated' } }
    expect(await unhideContentItem('product', ID)).toEqual({ success: false, error: 'admin.moderation.error_not_moderated' })
  })
})
