/**
 * getSellerOrderDetail (src/lib/marche/seller-order-detail.ts), Supabase mocked.
 *   • an invalid uuid lands as 22P02 and stays « not found » (null) — G9 relies on it;
 *   • ANY OTHER failed query THROWS for every caller (loader-error-surfacing plan; before it, only `strict` — H8's
 *     detail page — did), so a timeout never reads as a permanent 404 for the freelancer's own order. `strict` is
 *     now redundant and kept only so that caller compiles;
 *   • a missing row and someone else's order are null, and price_unit is read from the listing.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'

const h = vi.hoisted(() => ({
  result: { data: null as unknown, error: null as unknown },
  profile: { data: { full_name: 'Ahmed', city: 'Tunis' } as unknown, error: null as unknown },
  selects: [] as string[],
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    from: (table: string) => {
      const b: Record<string, unknown> = {}
      b.select = (cols: string) => {
        if (table === 'orders') h.selects.push(cols)
        return b
      }
      b.eq = () => b
      b.order = () => b
      b.maybeSingle = async () => (table === 'orders' ? h.result : h.profile)
      return b
    },
  }),
}))
vi.mock('react', async (orig) => ({ ...(await orig<typeof import('react')>()), cache: <F,>(fn: F) => fn }))

import { getSellerOrderDetail } from '@/lib/marche/seller-order-detail'

const ROW = {
  id: 'o-1',
  status: 'accepted',
  order_type: 'service',
  created_at: '2026-10-15T09:00:00Z',
  received_at: null,
  cancelled_at: null,
  cancelled_by: null,
  cancellation_reason: null,
  quantity: 1,
  buyer_id: 'b-1',
  seller_id: 'seller-1',
  delivery_name: null,
  delivery_address: null,
  delivery_phone: null,
  buyer_note: 'Un logo.\n\n[Délai: 2 semaines]\n[Budget: 400 TND]',
  item_title: 'Logo',
  unit_price_tnd: '50.00',
  delivery_fee_tnd: null,
  carrier: null,
  tracking_number: null,
  order_events: [],
  products: null,
  service_listings: { title: 'Logo', starting_price_tnd: '50.00', price_unit: 'hour' },
}

beforeEach(() => {
  h.result = { data: ROW, error: null }
  h.selects = []
})

describe('getSellerOrderDetail', () => {
  it('returns null for an invalid uuid (G9: 22P02 is a graceful not-found)', async () => {
    h.result = { data: null, error: { message: 'invalid input syntax for type uuid', code: '22P02', details: null } }
    expect(await getSellerOrderDetail('x', 'seller-1')).toBeNull()
    expect(await getSellerOrderDetail('x', 'seller-1', true)).toBeNull()
  })

  it('THROWS on any other failed query — an outage is not a 404, strict or not', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    h.result = { data: null, error: { message: 'timeout', code: '57014', details: null } }
    await expect(getSellerOrderDetail('o-1', 'seller-1', true)).rejects.toThrow('seller-order-detail: timeout')
    await expect(getSellerOrderDetail('o-1', 'seller-1')).rejects.toThrow('seller-order-detail: timeout')
    log.mockRestore()
  })

  it('is null for a missing row and for another seller\'s order, strict or not', async () => {
    h.result = { data: null, error: null }
    expect(await getSellerOrderDetail('o-1', 'seller-1', true)).toBeNull()
    h.result = { data: ROW, error: null }
    expect(await getSellerOrderDetail('o-1', 'someone-else', true)).toBeNull()
  })

  it('reads the listing\'s price_unit and parses the buyer\'s brief', async () => {
    const order = await getSellerOrderDetail('o-1', 'seller-1', true)
    expect(h.selects[0]).toContain('price_unit')
    expect(order).toMatchObject({
      priceUnit: 'hour',
      unitPrice: 50,
      serviceBrief: { description: 'Un logo.', timeframe: '2 semaines', budget: '400' },
    })
  })
})
