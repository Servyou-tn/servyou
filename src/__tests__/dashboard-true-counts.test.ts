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

const h = vi.hoisted(() => ({
  orders: [] as Record<string, unknown>[],
  // Per-table result overrides (orders → h.orders, anything unset → empty list).
  tables: {} as Record<string, { data: unknown; error: unknown }>,
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    from: (table: string) => {
      const result = h.tables[table] ?? (table === 'orders' ? { data: h.orders, error: null } : { data: [], error: null })
      const q: Record<string, unknown> = {}
      for (const op of ['select', 'eq', 'in', 'order', 'limit']) q[op] = () => q
      q.then = (resolve: (v: unknown) => void) => resolve(result)
      return q
    },
  }),
}))
vi.mock('@/lib/supabase/query-error', () => ({ reportQueryError: vi.fn() }))

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

describe('getFreelancerDashboard — Écosystème wiring (#19)', () => {
  const order = (id: string, status: string, buyer: string) => ({
    id, status, buyer_id: buyer, created_at: '2026-10-01T00:00:00Z', item_title: 'S', service_listings: { title: 'S' }, order_events: [],
  })

  it('a new freelancer (no service orders) gets 0 / 0 — not the platform totals', async () => {
    h.orders = []
    h.tables = {}
    const { getFreelancerDashboard } = await import('@/lib/marche/freelancer-dashboard')
    const data = await getFreelancerDashboard('free-new', null, null)
    expect(data.ecosystem).toEqual({ consumers: 0, shops: 0 })
  })

  it("counts this freelancer's own buyers, split by the buyer's account type", async () => {
    h.orders = [order('o1', 'received', 'c1'), order('o2', 'pending', 's1'), order('o3', 'cancelled', 'c2')]
    h.tables = {
      public_profiles: {
        data: [
          { id: 'c1', full_name: 'C1', seller_type: null },
          { id: 's1', full_name: 'S1', seller_type: 'shop_owner' },
          { id: 'c2', full_name: 'C2', seller_type: null },
        ],
        error: null,
      },
    }
    const { getFreelancerDashboard } = await import('@/lib/marche/freelancer-dashboard')
    const data = await getFreelancerDashboard('free-1', null, null)
    expect(data.ecosystem).toEqual({ consumers: 1, shops: 1 })
  })

  it('a failed buyer-profile read throws — the dashboard never renders a wrong count', async () => {
    h.orders = [order('o1', 'received', 'c1')]
    h.tables = { public_profiles: { data: null, error: { message: 'boom', code: 'XX000' } } }
    const { getFreelancerDashboard } = await import('@/lib/marche/freelancer-dashboard')
    await expect(getFreelancerDashboard('free-2', null, null)).rejects.toThrow(/buyer profiles fetch failed/)
  })
})

describe('hasAtMostTwoDecimals (#31)', () => {
  it('accepts up to two decimals, refuses more', async () => {
    const { hasAtMostTwoDecimals } = await import('@/lib/products/price')
    expect(['10', '10.5', '10.50', ' 7 '].map(hasAtMostTwoDecimals)).toEqual([true, true, true, true])
    expect(['12.345', 'abc', '', '-3'].map(hasAtMostTwoDecimals)).toEqual([false, false, false, false])
  })
})
