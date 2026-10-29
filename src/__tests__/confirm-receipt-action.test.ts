/**
 * confirmReceiptAction (src/app/actions/orders.ts) — pre-launch audit pass 2: the buyer's receipt confirmation moved
 * from two browser-side writes onto a server action. Mocked Supabase. Pins:
 *   • Zod first; the caller must be the order's BUYER and the order 'arrived' — otherwise nothing is written;
 *   • the write is exactly { status: 'received' } on that id (never received_at: the database stamps it — H8 PR-2);
 *   • a DB refusal answers the generic error, never the raw trigger text.
 * Run by path.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const h = vi.hoisted(() => ({
  user: { id: 'buyer-1' } as { id: string } | null,
  order: null as Record<string, unknown> | null,
  updates: [] as Record<string, unknown>[],
  eqs: [] as unknown[][],
  updateError: null as { message: string; code: string } | null,
  revalidated: [] as string[],
}))

vi.mock('next/cache', () => ({ revalidatePath: (p: string) => h.revalidated.push(p) }))
vi.mock('@/lib/i18n/server', () => ({ getLang: async () => 'fr' }))
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: h.user } }) },
    from: () => {
      const q: Record<string, unknown> = {}
      q.select = () => q
      q.eq = () => q
      q.maybeSingle = async () => ({ data: h.order, error: null })
      q.update = (patch: Record<string, unknown>) => {
        h.updates.push(patch)
        return {
          eq: async (...args: unknown[]) => {
            h.eqs.push(args)
            return { error: h.updateError }
          },
        }
      }
      return q
    },
  }),
}))

import { t } from '@/lib/i18n'
import { confirmReceiptAction } from '@/app/actions/orders'

const ID = '11111111-1111-4111-8111-111111111111'
const GENERIC = { ok: false, error: t('common.error_generic', 'fr') }

let log: ReturnType<typeof vi.spyOn>
beforeEach(() => {
  h.user = { id: 'buyer-1' }
  h.order = { id: ID, buyer_id: 'buyer-1', status: 'arrived' }
  h.updates = []
  h.eqs = []
  h.updateError = null
  h.revalidated = []
  log = vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => log.mockRestore())

describe('confirmReceiptAction', () => {
  it('writes exactly { status: received } on that order and revalidates the buyer pages', async () => {
    expect(await confirmReceiptAction({ orderId: ID })).toEqual({ ok: true })
    expect(h.updates).toEqual([{ status: 'received' }])
    expect(h.updates[0]).not.toHaveProperty('received_at')
    expect(h.eqs).toEqual([['id', ID]])
    expect(h.revalidated).toEqual(['/mes-commandes', `/mes-commandes/${ID}`])
  })

  it.each([
    ['a non-uuid id', { orderId: 'nope' }],
    ['a missing id', {}],
    ['a non-object', 'nope'],
  ])('rejects %s before any write', async (_label, input) => {
    expect(await confirmReceiptAction(input)).toEqual(GENERIC)
    expect(h.updates).toEqual([])
  })

  it('refuses a logged-out caller, the seller, a stranger, and a missing order — nothing written', async () => {
    h.user = null
    expect(await confirmReceiptAction({ orderId: ID })).toEqual(GENERIC)
    h.user = { id: 'seller-1' }
    expect(await confirmReceiptAction({ orderId: ID })).toEqual(GENERIC)
    h.user = { id: 'stranger' }
    expect(await confirmReceiptAction({ orderId: ID })).toEqual(GENERIC)
    h.user = { id: 'buyer-1' }
    h.order = null
    expect(await confirmReceiptAction({ orderId: ID })).toEqual(GENERIC)
    expect(h.updates).toEqual([])
  })

  it('refuses an order that has not arrived yet (or is already terminal) — nothing written', async () => {
    for (const status of ['pending', 'accepted', 'in_delivery', 'cancelled']) {
      h.order = { id: ID, buyer_id: 'buyer-1', status }
      expect(await confirmReceiptAction({ orderId: ID }), status).toEqual(GENERIC)
    }
    expect(h.updates).toEqual([])
  })

  it('an order already received (double submit / stale tab) answers ok and writes nothing', async () => {
    h.order = { id: ID, buyer_id: 'buyer-1', status: 'received' }
    expect(await confirmReceiptAction({ orderId: ID })).toEqual({ ok: true })
    expect(h.updates).toEqual([])
  })

  it('a DB refusal answers the generic error, never the trigger text', async () => {
    h.updateError = { message: "La réception ne peut être confirmée qu'après l'arrivée.", code: 'P0001' }
    const res = await confirmReceiptAction({ orderId: ID })
    expect(res).toEqual(GENERIC)
    expect(JSON.stringify(res)).not.toContain('réception ne peut')
  })
})
