import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { MyOrdersQuery } from './my-orders-params'

type Op = [string, ...unknown[]]
const state = vi.hoisted(() => ({
  ops: [] as Op[],
  table: '' as string,
  result: { data: [] as unknown[], error: null as null | { message: string; code?: string; details?: string } },
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    from(table: string) {
      state.table = table
      const q: unknown = new Proxy(
        {},
        {
          get(_t, prop: string) {
            if (prop === 'then') return (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) => Promise.resolve(state.result).then(res, rej)
            return (...args: unknown[]) => {
              state.ops.push([prop, ...args])
              return q
            }
          },
        },
      )
      return q
    },
  }),
}))

const { getMyProductOrders, pageMyProductOrders, toMyProductOrder } = await import('./my-orders')

const query = (patch: Partial<MyOrdersQuery> = {}): MyOrdersQuery => ({ tab: 'produits', q: '', statut: 'all', tri: 'recent', page: 1, ...patch })

const row = (over: Record<string, unknown> = {}) => ({
  id: 'o1',
  status: 'pending',
  created_at: '2026-10-20T10:00:00Z',
  received_at: null,
  cancelled_by: null,
  cancellation_reason: null,
  seller_id: 'shop-owner',
  quantity: 2,
  unit_price_tnd: 100,
  item_title: 'Casque Sony',
  delivery_fee_tnd: 7,
  products: {
    title: 'Casque (live title)',
    price_tnd: 90,
    shops: { name: 'ElectroPro' },
    product_images: [
      { image_url: 'https://x/2.webp', display_order: 2 },
      { image_url: 'https://x/1.webp', display_order: 1 },
    ],
  },
  ...over,
})

describe('toMyProductOrder', () => {
  it('total = snapshot unit × quantity + delivery fee; the snapshot beats the live price and title', () => {
    const o = toMyProductOrder(row() as never)
    expect(o.total).toBe(207)
    expect(o.title).toBe('Casque Sony')
    expect(o.shopName).toBe('ElectroPro')
    expect(o.imageUrl).toBe('https://x/1.webp') // lowest display_order
  })
  it('falls back to the live product for a pre-snapshot order; a zero fee / zero price is a value, not missing', () => {
    const o = toMyProductOrder(row({ unit_price_tnd: null, item_title: null, delivery_fee_tnd: null }) as never)
    expect(o.total).toBe(180)
    expect(o.title).toBe('Casque (live title)')
    expect(toMyProductOrder(row({ unit_price_tnd: 0, delivery_fee_tnd: 0 }) as never).total).toBe(0)
  })
  it('an unreadable product (RLS / removed) keeps the order visible with no shop, image or live price', () => {
    const o = toMyProductOrder(row({ products: null, unit_price_tnd: null }) as never)
    expect(o).toMatchObject({ shopName: null, imageUrl: null, total: null, title: 'Casque Sony' })
  })
  it('accepts numeric strings from PostgREST', () => {
    expect(toMyProductOrder(row({ unit_price_tnd: '49.90', delivery_fee_tnd: '7.00', quantity: 1 }) as never).total).toBeCloseTo(56.9)
  })
})

describe('pageMyProductOrders', () => {
  const orders = [
    toMyProductOrder(row({ id: 'a', item_title: 'Écran', created_at: '2026-10-01T00:00:00Z', unit_price_tnd: 300, quantity: 1, delivery_fee_tnd: 0 }) as never),
    toMyProductOrder(
      row({
        id: 'b',
        item_title: 'Souris',
        created_at: '2026-10-03T00:00:00Z',
        unit_price_tnd: 20,
        quantity: 1,
        delivery_fee_tnd: 0,
        products: { title: 'x', price_tnd: 1, shops: { name: 'Beauté Store' }, product_images: [] },
      }) as never,
    ),
    toMyProductOrder(row({ id: 'c', item_title: 'Clavier', created_at: '2026-10-02T00:00:00Z', unit_price_tnd: null, products: null }) as never),
  ]
  it('newest first by default, oldest first on « ancien »', () => {
    expect(pageMyProductOrders(orders, query()).orders.map((o) => o.id)).toEqual(['b', 'c', 'a'])
    expect(pageMyProductOrders(orders, query({ tri: 'ancien' })).orders.map((o) => o.id)).toEqual(['a', 'c', 'b'])
  })
  it('an order with no known price sorts last in BOTH price directions', () => {
    expect(pageMyProductOrders(orders, query({ tri: 'prix_asc' })).orders.map((o) => o.id)).toEqual(['b', 'a', 'c'])
    expect(pageMyProductOrders(orders, query({ tri: 'prix_desc' })).orders.map((o) => o.id)).toEqual(['a', 'b', 'c'])
  })
  it('search matches the title or the SHOP, accent- and case-insensitive', () => {
    expect(pageMyProductOrders(orders, query({ q: 'ecran' })).orders.map((o) => o.id)).toEqual(['a'])
    expect(pageMyProductOrders(orders, query({ q: 'BEAUTE' })).orders.map((o) => o.id)).toEqual(['b'])
    expect(pageMyProductOrders(orders, query({ q: 'zzz' })).totalCount).toBe(0)
  })
  it('pages at 10 and clamps a stale page', () => {
    const many = Array.from({ length: 23 }, (_, i) =>
      toMyProductOrder(row({ id: `o${i}`, created_at: `2026-10-${String(i + 1).padStart(2, '0')}T00:00:00Z` }) as never),
    )
    const p3 = pageMyProductOrders(many, query({ page: 3 }))
    expect(p3.orders).toHaveLength(3)
    expect(p3.totalPages).toBe(3)
    expect(pageMyProductOrders(many, query({ page: 99 })).page).toBe(3)
  })
})

describe('getMyProductOrders', () => {
  beforeEach(() => {
    state.ops = []
    state.result = { data: [row()], error: null }
  })
  it('asks for the buyer PRODUCT orders only, and narrows by status in SQL', async () => {
    const res = await getMyProductOrders('me', query({ statut: 'prepared' }))
    expect(state.table).toBe('orders')
    expect(state.ops).toEqual(expect.arrayContaining([['eq', 'buyer_id', 'me'], ['eq', 'order_type', 'product'], ['eq', 'status', 'prepared']]))
    expect(res.orders).toHaveLength(1)
  })
  it('no status predicate for « all »', async () => {
    await getMyProductOrders('me', query())
    expect(state.ops.some(([n, k]) => n === 'eq' && k === 'status')).toBe(false)
  })
  it('a failed read THROWS — never an empty list that reads as « no orders »', async () => {
    state.result = { data: [], error: { message: 'boom', code: 'XX000' } }
    await expect(getMyProductOrders('me', query())).rejects.toThrow(/product orders fetch failed/)
  })
})
