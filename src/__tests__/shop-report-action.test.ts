/**
 * Unit tests for createShopReportAction — the first consumer-facing report-creation
 * surface in the app (D3's "Signaler cette boutique"). The Supabase client is mocked —
 * these cover validation + the auth backstop, NOT the database. RLS enforcement
 * ("Reporter creates own report", with_check reporter_id = auth.uid()) lives in
 * production and was verified live against the real DB during D3's build.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'

const h = vi.hoisted(() => {
  const state: {
    user: { id: string } | null
    insertResult: { error: unknown }
    lastInsert: Record<string, unknown> | null
  } = {
    user: { id: 'u_buyer' },
    insertResult: { error: null },
    lastInsert: null,
  }

  const reportsChain: Record<string, unknown> = {}
  reportsChain.insert = vi.fn((row: Record<string, unknown>) => {
    state.lastInsert = row
    return Promise.resolve(state.insertResult)
  })

  const from = vi.fn(() => reportsChain)
  const getUser = vi.fn(() => Promise.resolve({ data: { user: state.user }, error: null }))
  return { state, from, getUser, reportsChain }
})

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({ from: h.from, auth: { getUser: h.getUser } })),
}))

vi.mock('@/lib/i18n/server', () => ({ getLang: vi.fn(async () => 'fr') }))

import { createShopReportAction } from '@/app/boutique/[id]/actions'
import { t } from '@/lib/i18n'

const insertFn = h.reportsChain.insert as ReturnType<typeof vi.fn>
const SHOP_ID = '11111111-1111-4111-8111-111111111111'
// createShopReportAction translates server-side and returns the rendered string (unlike
// dispute actions, which return the i18n key for the client to translate) — assert against
// the real French string via t(), not a hardcoded literal.
const GENERIC_ERROR = t('common.error_generic', 'fr')

beforeEach(() => {
  h.state.user = { id: 'u_buyer' }
  h.state.insertResult = { error: null }
  h.state.lastInsert = null
  vi.clearAllMocks()
})

describe('createShopReportAction — validation', () => {
  it('rejects a malformed shopId without touching the database', async () => {
    const res = await createShopReportAction({ shopId: 'not-a-uuid', reason: 'other' })
    expect(res).toEqual({ ok: false, error: GENERIC_ERROR })
    expect(h.from).not.toHaveBeenCalled()
  })

  it('rejects an unknown reason without touching the database', async () => {
    const res = await createShopReportAction({ shopId: SHOP_ID, reason: 'wrong_category' })
    expect(res).toEqual({ ok: false, error: GENERIC_ERROR })
    expect(h.from).not.toHaveBeenCalled()
  })

  it('accepts every valid reason', async () => {
    for (const reason of ['fake_scam', 'offensive', 'other']) {
      const res = await createShopReportAction({ shopId: SHOP_ID, reason })
      expect(res).toEqual({ ok: true })
    }
  })

  it('trims description and stores null for whitespace-only input', async () => {
    await createShopReportAction({ shopId: SHOP_ID, reason: 'other', description: '   \n\t ' })
    expect(h.state.lastInsert).toMatchObject({ description: null })
  })
})

describe('createShopReportAction — auth backstop', () => {
  it('rejects a logged-out caller without inserting', async () => {
    h.state.user = null
    const res = await createShopReportAction({ shopId: SHOP_ID, reason: 'fake_scam' })
    expect(res).toEqual({ ok: false, error: GENERIC_ERROR })
    expect(insertFn).not.toHaveBeenCalled()
  })
})

describe('createShopReportAction — insert shape', () => {
  it('writes target_type "shop" and reporter_id from the session, not the input', async () => {
    await createShopReportAction({ shopId: SHOP_ID, reason: 'offensive', description: 'Faux produits.' })
    expect(h.state.lastInsert).toEqual({
      reporter_id: 'u_buyer',
      target_type: 'shop',
      target_id: SHOP_ID,
      reason: 'offensive',
      description: 'Faux produits.',
    })
  })

  it('maps an insert error to the generic message', async () => {
    h.state.insertResult = { error: { message: 'rls', code: '42501', details: '' } }
    const res = await createShopReportAction({ shopId: SHOP_ID, reason: 'other' })
    expect(res).toEqual({ ok: false, error: GENERIC_ERROR })
  })
})
