/**
 * H8 — getEngagements (src/lib/marche/engagements-query.ts), Supabase mocked.
 *   • scoped to the caller's orders (seller_id) AND to service orders;
 *   • the category embed carries the FK hint (service_listings has two FKs to categories — an unhinted embed is
 *     PGRST201 and, uncaught, an empty list);
 *   • a failed query THROWS — never « you have no engagements »;
 *   • client identity (name, city, avatar, seller_type) comes from public_profiles, and a missing profile
 *     degrades to an unnamed consumer instead of dropping the row;
 *   • snapshot-first title and price; the buyer's requested timeframe is parsed from the brief.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'

const h = vi.hoisted(() => {
  type Call = { table: string; op: string; args: unknown[] }
  const state = {
    orders: { data: [] as unknown, error: null as unknown },
    profiles: { data: [] as unknown, error: null as unknown },
    calls: [] as Call[],
  }
  function builder(table: string) {
    const b: Record<string, unknown> = {}
    const result = () => (table === 'orders' ? state.orders : state.profiles)
    for (const op of ['select', 'eq', 'order', 'in']) {
      b[op] = (...args: unknown[]) => {
        state.calls.push({ table, op, args })
        return b
      }
    }
    b.then = (resolve: (v: unknown) => unknown) => Promise.resolve(result()).then(resolve)
    return b
  }
  const createClient = vi.fn(async () => ({ from: (table: string) => builder(table) }))
  return { state, createClient }
})

vi.mock('@/lib/supabase/server', () => ({ createClient: h.createClient }))
vi.mock('react', async (orig) => ({ ...(await orig<typeof import('react')>()), cache: <F,>(fn: F) => fn }))

import { getEngagements } from '@/lib/marche/engagements-query'

const OPTS = { tab: 'all' as const, q: '', sort: 'recent' as const, page: 1 }
const calls = (table: string, op: string) => h.state.calls.filter((c) => c.table === table && c.op === op)

const ROW = {
  id: 'o-1',
  status: 'pending',
  created_at: '2026-10-20T09:00:00Z',
  received_at: null,
  cancelled_at: null,
  cancellation_reason: null,
  buyer_id: 'b-1',
  buyer_note: 'Je veux un logo moderne.\n\n[Délai: 2 semaines]\n[Budget: 400 TND]',
  item_title: 'Création de logo professionnel',
  unit_price_tnd: '300.00',
  service_listings: { title: 'Titre actuel', starting_price_tnd: '250.00', categories: { slug: 'design-graphique-logo' } },
}

beforeEach(() => {
  h.state.orders = { data: [ROW], error: null }
  h.state.profiles = {
    data: [{ id: 'b-1', full_name: 'Ahmed B.', city: 'Tunis', avatar_url: 'https://x/a.jpg', seller_type: 'shop_owner' }],
    error: null,
  }
  h.state.calls = []
})

describe('getEngagements', () => {
  it('reads only the caller\'s SERVICE orders', async () => {
    await getEngagements('user-1', OPTS)
    expect(calls('orders', 'eq').map((c) => c.args)).toEqual([
      ['seller_id', 'user-1'],
      ['order_type', 'service'],
    ])
  })

  it('embeds the category through the FK hint', async () => {
    await getEngagements('user-1', OPTS)
    const select = calls('orders', 'select')[0].args[0] as string
    expect(select).toContain('categories!service_listings_category_id_fkey')
  })

  it('throws on a failed orders query instead of returning an empty list', async () => {
    h.state.orders = { data: null, error: { message: 'boom', code: 'XX000', details: null } }
    await expect(getEngagements('user-1', OPTS)).rejects.toThrow('engagements fetch failed')
  })

  it('maps a row: frozen title and price, category slug, client identity, requested timeframe', async () => {
    const page = await getEngagements('user-1', OPTS)
    expect(page.engagements).toEqual([
      {
        id: 'o-1',
        status: 'pending',
        title: 'Création de logo professionnel',
        categorySlug: 'design-graphique-logo',
        clientId: 'b-1',
        clientName: 'Ahmed B.',
        clientCity: 'Tunis',
        clientAvatarUrl: 'https://x/a.jpg',
        clientType: 'shop',
        createdAt: '2026-10-20T09:00:00Z',
        receivedAt: null,
        cancelledAt: null,
        cancellationReason: null,
        startingPrice: 300,
        requestedTimeframe: '2 semaines',
      },
    ])
    expect(page.stats).toEqual({ inProgress: 0, toHandle: 1, done: 0, total: 1 })
  })

  it('falls back to the live listing title for a pre-snapshot order, and tolerates a deleted listing', async () => {
    h.state.orders = {
      data: [
        { ...ROW, id: 'o-2', item_title: null, unit_price_tnd: null },
        { ...ROW, id: 'o-3', item_title: null, unit_price_tnd: null, service_listings: null },
      ],
      error: null,
    }
    const { engagements } = await getEngagements('user-1', OPTS)
    const byId = Object.fromEntries(engagements.map((e) => [e.id, e]))
    // no snapshot → the live listing's starting price; no listing either → no price
    expect(byId['o-2']).toMatchObject({ title: 'Titre actuel', startingPrice: 250 })
    expect(byId['o-3']).toMatchObject({ title: '', categorySlug: null, startingPrice: null })
  })

  it('keeps a row whose buyer profile is missing, as an unnamed consumer', async () => {
    h.state.profiles = { data: [], error: null }
    const { engagements } = await getEngagements('user-1', OPTS)
    expect(engagements[0]).toMatchObject({ clientName: '', clientAvatarUrl: null, clientType: 'consumer' })
  })

  it('does not query profiles when there are no orders', async () => {
    h.state.orders = { data: [], error: null }
    const page = await getEngagements('user-1', OPTS)
    expect(page.engagements).toEqual([])
    expect(calls('public_profiles', 'select')).toHaveLength(0)
  })

  it('takes a single embed object or an array (PostgREST returns either)', async () => {
    h.state.orders = {
      data: [{ ...ROW, service_listings: [{ title: 'T', starting_price_tnd: null, categories: [{ slug: 'traduction' }] }] }],
      error: null,
    }
    const { engagements } = await getEngagements('user-1', OPTS)
    expect(engagements[0].categorySlug).toBe('traduction')
  })
})
