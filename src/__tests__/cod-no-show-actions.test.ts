/**
 * The COD no-show rule, app side (mocked; the live proof is cod-no-show-*-live.test.ts after the architect applies
 * db/migrations/PENDING_cod_no_show.sql). Covers:
 *   1. the pure helpers: isRefusable, refusalErrorKey, codAdminErrorKey, checkCodNote;
 *   2. every new i18n key exists in FR and AR, and in EN unless it is an admin key (admin stays French by convention);
 *   3. refuseDeliveryAction: seller only, from dispatched / in_delivery / arrived, product only, writes only granted
 *      columns with the reason's label as cancellation_reason, maps the DB refusals;
 *   4. codBlockedMessage: the date from get_my_cod_standing, a dateless fallback when it can't be read;
 *   5. createDispute: refusal_contested is buyer only, and the trigger's three hints map to their keys;
 *   6. liftCodBlock / voidRefusal: admin gate first, note checked, RPC errors mapped, no raw text.
 * Run by path: npx vitest run src/__tests__/cod-no-show-actions.test.ts
 */

import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'
import { isRefusable, refusalErrorKey, refusalReasonKey, REFUSAL_REASONS } from '@/lib/orders/refusal'
import { codAdminErrorKey, checkCodNote, COD_NOTE_MAX } from '@/lib/admin/cod-rpc-error'
import { fr } from '@/lib/i18n/fr'
import { ar } from '@/lib/i18n/ar'
import { en } from '@/lib/i18n/en'

// ── 1. Pure helpers ──────────────────────────────────────────────────────────────────────────────

describe('isRefusable', () => {
  it.each(['dispatched', 'in_delivery', 'arrived'] as const)('a product order in %s can be refused', (s) => {
    expect(isRefusable(s, 'product')).toBe(true)
  })
  it.each(['pending', 'accepted', 'prepared', 'received', 'cancelled'] as const)('a product order in %s cannot', (s) => {
    expect(isRefusable(s, 'product')).toBe(false)
  })
  it('a service order never can (products only, founder decision 2)', () => {
    expect(isRefusable('arrived', 'service')).toBe(false)
  })
})

describe('refusalErrorKey', () => {
  it('maps the marker guard’s two hints to the status message', () => {
    expect(refusalErrorKey({ code: '23514', hint: 'refusal_status' })).toBe('seller.orders.error_refusal_status')
    expect(refusalErrorKey({ code: '23514', hint: 'refusal_not_product' })).toBe('seller.orders.error_refusal_status')
  })
  it('maps the terminal lock (a concurrent change finished the order)', () => {
    expect(refusalErrorKey({ code: 'P0001', message: 'Cette commande est terminée et ne peut plus être modifiée.' }))
      .toBe('seller.orders.error_not_cancellable')
  })
  it.each([
    ['not the seller (42501)', { code: '42501', message: 'Seul le vendeur peut indiquer un refus de livraison.' }],
    ['the right hint on the wrong code', { code: 'P0001', hint: 'refusal_status' }],
    ['an outage', { code: '08006' }],
  ])('leaves %s generic', (_l, error) => {
    expect(refusalErrorKey(error)).toBe('common.error_generic')
  })
})

describe('codAdminErrorKey / checkCodNote', () => {
  it.each([
    ['note_required', 'admin.cod.error_note_required'],
    ['note_too_long', 'admin.cod.error_note_too_long'],
    ['cod_not_blocked', 'admin.cod.error_not_blocked'],
    ['not_a_refusal', 'admin.cod.error_not_a_refusal'],
    ['refusal_already_voided', 'admin.cod.error_already_voided'],
  ])('maps hint %s', (hint, key) => {
    expect(codAdminErrorKey({ code: '23514', hint })).toBe(key)
  })
  it('maps the admin gate and leaves anything else generic', () => {
    expect(codAdminErrorKey({ code: '42501' })).toBe('admin.users.error_forbidden')
    expect(codAdminErrorKey({ code: '23514', hint: 'toString' })).toBe('common.error_generic')
    expect(codAdminErrorKey({ code: 'P0001', hint: 'note_required' })).toBe('common.error_generic')
  })
  it('trims the note, refuses an empty or too long one', () => {
    expect(checkCodNote('  ok  ')).toEqual({ ok: true, note: 'ok' })
    expect(checkCodNote('   ')).toEqual({ ok: false, error: 'admin.cod.error_note_required' })
    expect(checkCodNote(42)).toEqual({ ok: false, error: 'admin.cod.error_note_required' })
    expect(checkCodNote('x'.repeat(COD_NOTE_MAX + 1))).toEqual({ ok: false, error: 'admin.cod.error_note_too_long' })
  })
})

// ── 2. i18n parity ───────────────────────────────────────────────────────────────────────────────

const NEW_KEYS = [
  ...REFUSAL_REASONS.map(refusalReasonKey),
  'demander.error.cod_open_order_cap', 'demander.error.cod_blocked', 'demander.error.cod_blocked_generic',
  'seller.orders.error_refusal_status',
  'dispute.error_contest_window_closed', 'dispute.error_contest_not_refusal', 'dispute.error_contest_buyer_only',
  'dispute.reason_refusal_contested',
  'admin.disputes.reason_refusal_contested',
  'admin.cod.error_note_required', 'admin.cod.error_note_too_long', 'admin.cod.error_not_blocked',
  'admin.cod.error_not_a_refusal', 'admin.cod.error_already_voided',
]

describe('the new keys', () => {
  it.each(NEW_KEYS)('%s is in FR and AR, and in EN unless admin', (key) => {
    const dicts = [fr, ar, en] as Record<string, string>[]
    expect(dicts[0][key], 'fr').toBeTruthy()
    expect(dicts[1][key], 'ar').toBeTruthy()
    if (!key.startsWith('admin.')) expect(dicts[2][key], 'en').toBeTruthy()
  })
  it('the block message takes the date in all three languages', () => {
    for (const d of [fr, ar, en] as Record<string, string>[]) expect(d['demander.error.cod_blocked']).toContain('{date}')
  })
})

// ── 3–6. Actions (mocked Supabase) ───────────────────────────────────────────────────────────────

const state = {
  user: null as { id: string } | null,
  order: null as Record<string, unknown> | null,
  updates: [] as Record<string, unknown>[],
  updateRows: [{ id: 'x' }] as { id: string }[],
  updateError: null as { message: string; code?: string; hint?: string } | null,
  inserts: [] as Record<string, unknown>[],
  insertError: null as { message: string; code?: string; hint?: string; details?: string } | null,
  rpcCalls: [] as { fn: string; args: unknown }[],
  rpcResult: { data: null as unknown, error: null as { message: string; code?: string; hint?: string } | null },
  admin: { ok: true } as { ok: true } | { ok: false; reason: string },
}

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/i18n/server', () => ({ getLang: async () => 'fr' }))
vi.mock('@/lib/security/turnstile', () => ({ verifyTurnstile: async () => ({ ok: true }) }))
vi.mock('@/lib/auth/require-admin', () => ({
  checkAdmin: async () => state.admin,
  adminRejectionError: (_reason: string, fallback: string) => fallback,
}))
vi.mock('@/lib/auth/auth-ban', () => ({ syncAuthBan: vi.fn(), isSuspensionAlreadyApplied: () => false }))

function fakeClient() {
  return {
    auth: { getUser: async () => ({ data: { user: state.user } }) },
    rpc: async (fn: string, args: unknown) => {
      state.rpcCalls.push({ fn, args })
      return state.rpcResult
    },
    from: () => {
      const q: Record<string, unknown> = {}
      q.select = () => q
      q.eq = () => q
      q.maybeSingle = async () => ({ data: state.order, error: null })
      q.update = (patch: Record<string, unknown>) => {
        state.updates.push(patch)
        return { eq: () => ({ select: async () => ({ data: state.updateError ? null : state.updateRows, error: state.updateError }) }) }
      }
      q.insert = (row: Record<string, unknown>) => {
        state.inserts.push(row)
        return { select: async () => ({ data: state.insertError ? null : [{ id: 'd-1' }], error: state.insertError }) }
      }
      return q
    },
  }
}
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => fakeClient() }))

const SELLER = 'seller-1'
const BUYER = 'buyer-1'
const ID = '11111111-1111-4111-8111-111111111111'
const BUYER_ID = '22222222-2222-4222-8222-222222222222'

// The action modules' first import is slow on a cold transform cache (tens of seconds on a 2-core PC): pay it once here.
beforeAll(async () => {
  await Promise.all([
    import('@/app/actions/orders'),
    import('@/app/actions/disputes'),
    import('@/app/admin/utilisateurs/actions'),
    import('@/app/admin/litiges/actions'),
    import('@/lib/orders/cod-standing'),
  ])
}, 180_000)

beforeEach(() => {
  state.user = { id: SELLER }
  state.order = { id: ID, seller_id: SELLER, buyer_id: BUYER, status: 'in_delivery', order_type: 'product' }
  state.updates = []
  state.updateRows = [{ id: ID }]
  state.updateError = null
  state.inserts = []
  state.insertError = null
  state.rpcCalls = []
  state.rpcResult = { data: null, error: null }
  state.admin = { ok: true }
})

describe('refuseDeliveryAction', () => {
  it('cancels as the seller with the refusal marker and the reason’s label, granted columns only', async () => {
    const { refuseDeliveryAction } = await import('@/app/actions/orders')
    const res = await refuseDeliveryAction({ orderId: ID, reason: 'not_collected' })
    expect(res.ok).toBe(true)
    expect(state.updates).toEqual([{
      status: 'cancelled', cancelled_by: 'seller', cancellation_reason: fr['common.refusal_reason_not_collected'],
      refusal_reason: 'not_collected',
    }])
  })

  it.each(['pending', 'accepted', 'prepared', 'received', 'cancelled'])('refuses from %s before any write', async (status) => {
    state.order = { ...state.order!, status }
    const { refuseDeliveryAction } = await import('@/app/actions/orders')
    const res = await refuseDeliveryAction({ orderId: ID, reason: 'refused_parcel' })
    expect(res).toEqual({ ok: false, error: fr['seller.orders.error_refusal_status'] })
    expect(state.updates).toEqual([])
  })

  it('refuses a service order', async () => {
    state.order = { ...state.order!, order_type: 'service', status: 'arrived' }
    const { refuseDeliveryAction } = await import('@/app/actions/orders')
    expect((await refuseDeliveryAction({ orderId: ID, reason: 'unreachable' })).ok).toBe(false)
    expect(state.updates).toEqual([])
  })

  it('refuses the buyer, with the generic answer and no write', async () => {
    state.user = { id: BUYER }
    const { refuseDeliveryAction } = await import('@/app/actions/orders')
    expect(await refuseDeliveryAction({ orderId: ID, reason: 'unreachable' }))
      .toEqual({ ok: false, error: fr['common.error_generic'] })
    expect(state.updates).toEqual([])
  })

  it('refuses an unknown reason and a malformed id before reading', async () => {
    const { refuseDeliveryAction } = await import('@/app/actions/orders')
    expect((await refuseDeliveryAction({ orderId: ID, reason: 'other' })).ok).toBe(false)
    expect((await refuseDeliveryAction({ orderId: 'nope', reason: 'unreachable' })).ok).toBe(false)
    expect(state.updates).toEqual([])
  })

  it('maps a DB refusal, and treats a zero-row update as a failure', async () => {
    const { refuseDeliveryAction } = await import('@/app/actions/orders')
    state.updateError = { message: 'x', code: '23514', hint: 'refusal_status' }
    expect(await refuseDeliveryAction({ orderId: ID, reason: 'unreachable' }))
      .toEqual({ ok: false, error: fr['seller.orders.error_refusal_status'] })
    state.updateError = null
    state.updateRows = []
    expect((await refuseDeliveryAction({ orderId: ID, reason: 'unreachable' })).ok).toBe(false)
  })
})

describe('codBlockedMessage', () => {
  it('puts the block’s end date (Africa/Tunis) in the message', async () => {
    const { codBlockedMessage } = await import('@/lib/orders/cod-standing')
    state.rpcResult = { data: [{ open_order_cap: true, blocked_until: '2026-12-14T23:30:00Z' }], error: null }
    const msg = await codBlockedMessage(fakeClient() as never, 'fr')
    expect(state.rpcCalls.map((c) => c.fn)).toEqual(['get_my_cod_standing'])
    // 23:30 UTC is already the 15th in Tunis (UTC+1).
    expect(msg).toContain('15 décembre 2026')
    expect(msg).not.toContain('{date}')
  })
  it('falls back to the dateless message when the standing can’t be read', async () => {
    const { codBlockedMessage } = await import('@/lib/orders/cod-standing')
    state.rpcResult = { data: null, error: { message: 'boom', code: '08006' } }
    expect(await codBlockedMessage(fakeClient() as never, 'fr')).toBe(fr['demander.error.cod_blocked_generic'])
    state.rpcResult = { data: [], error: null }
    expect(await codBlockedMessage(fakeClient() as never, 'fr')).toBe(fr['demander.error.cod_blocked_generic'])
  })
})

describe('createDispute — refusal_contested', () => {
  beforeEach(() => {
    state.user = { id: BUYER }
    state.order = { buyer_id: BUYER, seller_id: SELLER, status: 'cancelled', order_type: 'product' }
  })

  it('files the buyer’s contest', async () => {
    const { createDispute } = await import('@/app/actions/disputes')
    expect(await createDispute(ID, 'refusal_contested', '')).toEqual({ success: true, disputeId: 'd-1' })
    expect(state.inserts[0]).toMatchObject({ created_by_role: 'buyer', reason: 'refusal_contested' })
  })

  it('refuses the seller before the insert', async () => {
    state.user = { id: SELLER }
    const { createDispute } = await import('@/app/actions/disputes')
    expect(await createDispute(ID, 'refusal_contested', '')).toEqual({ success: false, error: 'dispute.error_contest_buyer_only' })
    expect(state.inserts).toEqual([])
  })

  it.each([
    ['contest_window_closed', 'dispute.error_contest_window_closed'],
    ['contest_not_refusal', 'dispute.error_contest_not_refusal'],
    ['contest_buyer_only', 'dispute.error_contest_buyer_only'],
  ])('maps the trigger hint %s', async (hint, key) => {
    state.insertError = { message: 'raw French text', code: '23514', hint }
    const { createDispute } = await import('@/app/actions/disputes')
    expect(await createDispute(ID, 'refusal_contested', '')).toEqual({ success: false, error: key })
  })
})

describe('liftCodBlock / voidRefusal', () => {
  it('lift: admin gate first, then the RPC with the trimmed note', async () => {
    const { liftCodBlock } = await import('@/app/admin/utilisateurs/actions')
    state.admin = { ok: false, reason: 'not_admin' }
    expect(await liftCodBlock(BUYER_ID, 'motif')).toEqual({ success: false, error: 'admin.users.error_forbidden' })
    expect(state.rpcCalls).toEqual([])
    state.admin = { ok: true }
    expect(await liftCodBlock(BUYER_ID, '  erreur de livraison  ')).toEqual({ success: true })
    expect(state.rpcCalls).toEqual([{ fn: 'admin_lift_cod_block', args: { p_buyer: BUYER_ID, p_note: 'erreur de livraison' } }])
  })

  it('lift: an empty note and a malformed id never reach the RPC; an RPC refusal is mapped', async () => {
    const { liftCodBlock } = await import('@/app/admin/utilisateurs/actions')
    expect(await liftCodBlock(BUYER_ID, '  ')).toEqual({ success: false, error: 'admin.cod.error_note_required' })
    expect((await liftCodBlock('nope', 'motif')).success).toBe(false)
    expect(state.rpcCalls).toEqual([])
    state.rpcResult = { data: null, error: { message: 'Ce compte n’est pas bloqué.', code: '23514', hint: 'cod_not_blocked' } }
    expect(await liftCodBlock(BUYER_ID, 'motif')).toEqual({ success: false, error: 'admin.cod.error_not_blocked' })
  })

  it('void: the RPC with the order and the note; refusals mapped', async () => {
    const { voidRefusal } = await import('@/app/admin/litiges/actions')
    expect(await voidRefusal(ID, 'livraison jamais tentée')).toEqual({ success: true })
    expect(state.rpcCalls).toEqual([{ fn: 'admin_void_refusal', args: { p_order: ID, p_note: 'livraison jamais tentée' } }])
    state.rpcResult = { data: null, error: { message: 'x', code: '23514', hint: 'refusal_already_voided' } }
    expect(await voidRefusal(ID, 'motif')).toEqual({ success: false, error: 'admin.cod.error_already_voided' })
    expect((await voidRefusal(ID, 'motif', 'not-a-uuid')).success).toBe(false)
  })
})
