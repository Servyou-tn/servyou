/**
 * Unit tests for the in-place content moderation server actions (hideContent,
 * unhideContent) that live in src/app/admin/signalements/actions.ts.
 *
 * The Supabase client is mocked at the rpc() level — these cover the actions'
 * validation + error-translation logic, NOT the database. The real enforcement
 * (admin gate, reason-required, idempotent state checks, target_type dispatch) lives
 * in the admin_hide_content / admin_unhide_content SECURITY DEFINER functions, which
 * RAISE EXCEPTION on every failure mode; the actions map those messages to friendly
 * i18n keys.
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

import { hideContent, unhideContent } from '@/app/admin/signalements/actions'

beforeEach(() => {
  h.state.result = { data: null, error: null }
  h.rpc.mockClear()
  h.revalidatePath.mockClear()
})

describe('hideContent', () => {
  it('rejects an empty reason without calling the database', async () => {
    const res = await hideContent('product', 'p1', '', 'r1')
    expect(res).toEqual({ success: false, error: 'admin.moderation.hide_reason_required' })
    expect(h.rpc).not.toHaveBeenCalled()
  })

  it('rejects a whitespace-only reason', async () => {
    const res = await hideContent('product', 'p1', '   \n\t ', 'r1')
    expect(res).toEqual({ success: false, error: 'admin.moderation.hide_reason_required' })
    expect(h.rpc).not.toHaveBeenCalled()
  })

  it('surfaces the already-moderated error from the function RAISE', async () => {
    h.state.result = { data: null, error: { message: 'Product not found or already moderated' } }
    const res = await hideContent('product', 'p1', 'Contrefaçon manifeste.', 'r1')
    expect(res).toEqual({ success: false, error: 'admin.moderation.error_already_moderated' })
  })

  it('surfaces the unsupported-type error from the function RAISE', async () => {
    h.state.result = { data: null, error: { message: 'Unsupported target_type for moderation: shop' } }
    const res = await hideContent('product', 'p1', 'Raison.', 'r1')
    expect(res).toEqual({ success: false, error: 'admin.moderation.error_unsupported_type' })
  })

  it('passes a trimmed reason, succeeds, and revalidates', async () => {
    h.state.result = { data: null, error: null }
    const res = await hideContent('service', 's1', '  Service frauduleux.  ', 'r1')
    expect(res).toEqual({ success: true })
    expect(h.rpc).toHaveBeenCalledWith('admin_hide_content', {
      target_type: 'service',
      target_id: 's1',
      reason: 'Service frauduleux.',
    })
    expect(h.revalidatePath).toHaveBeenCalledWith('/admin/signalements/r1')
  })
})

describe('unhideContent', () => {
  it('surfaces the not-moderated error from the function RAISE', async () => {
    h.state.result = { data: null, error: { message: 'Product not found or not currently moderated' } }
    const res = await unhideContent('product', 'p1', 'r1')
    expect(res).toEqual({ success: false, error: 'admin.moderation.error_not_moderated' })
  })

  it('succeeds and revalidates', async () => {
    h.state.result = { data: null, error: null }
    const res = await unhideContent('product', 'p1', 'r1')
    expect(res).toEqual({ success: true })
    expect(h.rpc).toHaveBeenCalledWith('admin_unhide_content', { target_type: 'product', target_id: 'p1' })
    expect(h.revalidatePath).toHaveBeenCalledWith('/admin/signalements/r1')
  })
})

// PR-N: the three new target types share the same action code path; only the union
// widened and the DB dispatches on target_type. These confirm the widened types reach
// the RPC and that the new branches' RAISE messages still map via substring.
describe('moderation of shops, freelancer profiles, and job posts (PR-N)', () => {
  const cases = [
    { type: 'shop', alreadyMsg: 'Shop not found or already moderated', notMsg: 'Shop not found or not currently moderated' },
    { type: 'freelancer_profile', alreadyMsg: 'Freelancer profile not found or already moderated', notMsg: 'Freelancer profile not found or not currently moderated' },
    { type: 'job_post', alreadyMsg: 'Job post not found or already moderated', notMsg: 'Job post not found or not currently moderated' },
  ] as const

  for (const c of cases) {
    it(`hideContent(${c.type}) succeeds and calls admin_hide_content with the target_type`, async () => {
      h.state.result = { data: null, error: null }
      const res = await hideContent(c.type, 'tid', 'Raison valide.', 'r1')
      expect(res).toEqual({ success: true })
      expect(h.rpc).toHaveBeenCalledWith('admin_hide_content', { target_type: c.type, target_id: 'tid', reason: 'Raison valide.' })
    })

    it(`unhideContent(${c.type}) succeeds and calls admin_unhide_content with the target_type`, async () => {
      h.state.result = { data: null, error: null }
      const res = await unhideContent(c.type, 'tid', 'r1')
      expect(res).toEqual({ success: true })
      expect(h.rpc).toHaveBeenCalledWith('admin_unhide_content', { target_type: c.type, target_id: 'tid' })
    })

    it(`hideContent(${c.type}) maps its already-moderated RAISE to error_already_moderated`, async () => {
      h.state.result = { data: null, error: { message: c.alreadyMsg } }
      const res = await hideContent(c.type, 'tid', 'Raison.', 'r1')
      expect(res).toEqual({ success: false, error: 'admin.moderation.error_already_moderated' })
    })

    it(`unhideContent(${c.type}) maps its not-moderated RAISE to error_not_moderated`, async () => {
      h.state.result = { data: null, error: { message: c.notMsg } }
      const res = await unhideContent(c.type, 'tid', 'r1')
      expect(res).toEqual({ success: false, error: 'admin.moderation.error_not_moderated' })
    })
  }
})
