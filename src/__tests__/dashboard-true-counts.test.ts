/**
 * Walk 2026-11-02 — the two dashboards show the seller's OWN, consistent numbers:
 *   #19 freelancer « Écosystème »: distinct buyers of THIS freelancer's non-cancelled service orders (shops = buyers
 *       whose account is a shop owner, consumers = every other buyer) — it used to count every consumer profile and
 *       every shop on the platform, so a brand-new freelancer read « 4 consommateurs / 1 boutique »;
 *   #5  seller « Commandes à traiter » = the « À traiter maintenant » list's length (it counted « pending » only).
 * Pure helper + getSellerDashboard with Supabase mocked.
 */
import { describe, it, expect, vi } from 'vitest'
import { ecosystemCounts } from '@/lib/marche/freelancer-dashboard'

const h = vi.hoisted(() => ({ orders: [] as Record<string, unknown>[] }))

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    from: (table: string) => {
      const result =
        table === 'orders' ? { data: h.orders, error: null } : { data: [], error: null }
      const q: Record<string, unknown> = {}
      for (const op of ['select', 'eq', 'in', 'order']) q[op] = () => q
      q.then = (resolve: (v: unknown) => void) => resolve(result)
      return q
    },
  }),
}))

describe('ecosystemCounts (#19)', () => {
  it('a brand-new freelancer with no orders sees 0 and 0', () => {
    expect(ecosystemCounts([], new Map())).toEqual({ consumers: 0, shops: 0 })
  })

  it('counts DISTINCT buyers, splits shop owners out, and ignores cancelled requests', () => {
    const orders = [
      { status: 'received', buyer_id: 'c1' },
      { status: 'pending', buyer_id: 'c1' },
      { status: 'accepted', buyer_id: 's1' },
      { status: 'cancelled', buyer_id: 'c2' },
      { status: 'arrived', buyer_id: 'f1' },
    ]
    const types = new Map<string, string | null>([
      ['c1', null],
      ['s1', 'shop_owner'],
      ['c2', null],
      ['f1', 'freelancer'],
    ])
    // c1 once, f1 (a freelancer buying) with the consumers, s1 as the shop; c2 only cancelled → not counted.
    expect(ecosystemCounts(orders, types)).toEqual({ consumers: 2, shops: 1 })
  })

  it('a buyer whose profile was not returned still counts — as a consumer, never as a shop', () => {
    expect(ecosystemCounts([{ status: 'received', buyer_id: 'x' }], new Map())).toEqual({ consumers: 1, shops: 0 })
  })
})

describe('getSellerDashboard — « Commandes à traiter » = « À traiter maintenant » (#5)', () => {
  it('the tile counts every actionable status, exactly like the list (3 pending + 1 prepared = 4)', async () => {
    const at = (d: number) => new Date(Date.UTC(2026, 9, d)).toISOString()
    h.orders = [
      { id: 'o1', status: 'pending', order_type: 'product', created_at: at(1), buyer_id: 'b', quantity: 1, item_title: 'A', unit_price_tnd: 10 },
      { id: 'o2', status: 'pending', order_type: 'product', created_at: at(2), buyer_id: 'b', quantity: 1, item_title: 'B', unit_price_tnd: 10 },
      { id: 'o3', status: 'pending', order_type: 'product', created_at: at(3), buyer_id: 'b', quantity: 1, item_title: 'C', unit_price_tnd: 10 },
      { id: 'o4', status: 'prepared', order_type: 'product', created_at: at(4), buyer_id: 'b', quantity: 1, item_title: 'D', unit_price_tnd: 10 },
      { id: 'o5', status: 'received', order_type: 'product', created_at: at(5), buyer_id: 'b', quantity: 1, item_title: 'E', unit_price_tnd: 10 },
      { id: 'o6', status: 'cancelled', order_type: 'product', created_at: at(6), buyer_id: 'b', quantity: 1, item_title: 'F', unit_price_tnd: 10 },
    ]
    const { getSellerDashboard } = await import('@/lib/marche/seller-dashboard')
    const data = await getSellerDashboard('seller-1', null)
    expect(data.actionable.map((o) => o.id)).toEqual(['o1', 'o2', 'o3', 'o4'])
    expect(data.pendingCount).toBe(4)
    expect(data.pendingCount).toBe(data.actionable.length)
  })
})
