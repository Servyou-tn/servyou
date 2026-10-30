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
    // The target lookup (shops by id, the reporter's session): found by default.
    target: { data: { id: string } | null; error: unknown }
  } = {
    user: { id: 'u_buyer' },
    insertResult: { error: null },
    lastInsert: null,
    target: { data: { id: 'shop' }, error: null },
  }

  const reportsChain: Record<string, unknown> = {}
  reportsChain.insert = vi.fn((row: Record<string, unknown>) => {
    state.lastInsert = row
    return Promise.resolve(state.insertResult)
  })

  const shopsChain: Record<string, unknown> = {}
  shopsChain.select = vi.fn(() => shopsChain)
  shopsChain.eq = vi.fn(() => shopsChain)
  shopsChain.maybeSingle = vi.fn(() => Promise.resolve(state.target))

  const from = vi.fn((table: string) => (table === 'shops' ? shopsChain : reportsChain))
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
  h.state.target = { data: { id: 'shop' }, error: null }
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

describe('createShopReportAction — anti-abuse refusals (reports anti-abuse migration)', () => {
  it('a second open report on the same shop: « Vous avez déjà signalé ce contenu »', async () => {
    h.state.insertResult = {
      error: { code: '23505', message: 'duplicate key value violates unique constraint "reports_one_open_per_reporter_target"' },
    }
    const res = await createShopReportAction({ shopId: SHOP_ID, reason: 'other' })
    expect(res).toEqual({ ok: false, error: t('report.already_reported', 'fr') })
  })

  it('the 11th report in 24 h: the rate-limit message', async () => {
    h.state.insertResult = { error: { code: '23514', message: 'Vous avez atteint…', hint: 'rate_limited' } }
    const res = await createShopReportAction({ shopId: SHOP_ID, reason: 'other' })
    expect(res).toEqual({ ok: false, error: t('report.rate_limited', 'fr') })
  })
})

// Audit pass 2 « Logged »: a made-up shop id must not fill the admin queue with « cible introuvable » rows.
describe('createShopReportAction — the target must exist and be visible to the reporter', () => {
  it('refuses an unknown (or hidden) shop without inserting a report', async () => {
    h.state.target = { data: null, error: null }
    expect(await createShopReportAction({ shopId: SHOP_ID, reason: 'other' })).toEqual({ ok: false, error: GENERIC_ERROR })
    expect(h.from).toHaveBeenCalledWith('shops')
    expect(insertFn).not.toHaveBeenCalled()
  })

  it('a failed lookup is the generic error, never an insert', async () => {
    h.state.target = { data: null, error: { message: 'boom', code: 'XX000' } }
    expect(await createShopReportAction({ shopId: SHOP_ID, reason: 'other' })).toEqual({ ok: false, error: GENERIC_ERROR })
    expect(insertFn).not.toHaveBeenCalled()
  })

  it('looks the shop up by the validated id before inserting', async () => {
    expect(await createShopReportAction({ shopId: SHOP_ID, reason: 'other' })).toEqual({ ok: true })
    expect(h.from.mock.calls.map((c) => c[0])).toEqual(['shops', 'reports'])
  })
})
