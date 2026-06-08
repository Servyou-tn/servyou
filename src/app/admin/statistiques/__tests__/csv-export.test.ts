/**
 * Unit tests for the completed-orders CSV export server action.
 *
 * Mocks the Supabase server client (auth.getUser + from('profiles') for the admin
 * gate + from('orders') for the data). The action's real logic under test is the
 * admin gate, the CSV header/row generation + date formatting, and the empty-vs-
 * populated filename. The orders ordering (received_at desc) is done by the query,
 * so these confirm the action preserves the returned order, not the DB sort itself.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'

const h = vi.hoisted(() => {
  const state: {
    user: { id: string } | null
    isAdmin: boolean | null
    orders: { data: Array<{ id: string; order_type: string; received_at: string | null }>; error: unknown }
  } = {
    user: { id: 'admin-1' },
    isAdmin: true,
    orders: { data: [], error: null },
  }

  function makeBuilder(table: string) {
    const builder: Record<string, unknown> = {
      select: () => builder,
      eq: () => builder,
      gte: () => builder,
      order: () => builder,
      single: () =>
        Promise.resolve(
          table === 'profiles'
            ? { data: state.isAdmin === null ? null : { is_admin: state.isAdmin }, error: null }
            : { data: null, error: null },
        ),
      // Make the builder awaitable for the orders query (which ends in .order()).
      then: (resolve: (v: unknown) => void) =>
        Promise.resolve(table === 'orders' ? state.orders : { data: null, error: null }).then(resolve),
    }
    return builder
  }

  const createClient = vi.fn(async () => ({
    auth: { getUser: async () => ({ data: { user: state.user } }) },
    from: (table: string) => makeBuilder(table),
  }))

  return { state, createClient }
})

vi.mock('@/lib/supabase/server', () => ({ createClient: h.createClient }))

import { generateCompletedOrdersCsv } from '@/app/admin/statistiques/actions'

beforeEach(() => {
  h.state.user = { id: 'admin-1' }
  h.state.isAdmin = true
  h.state.orders = { data: [], error: null }
})

describe('generateCompletedOrdersCsv', () => {
  it('returns a header-only CSV and an empty-marker filename when there are no completed orders', async () => {
    h.state.orders = { data: [], error: null }
    const res = await generateCompletedOrdersCsv()
    if ('error' in res) throw new Error('expected success')
    expect(res.csv).toBe('order_id,order_type,received_at_date')
    expect(res.filename).toMatch(/^servyou-commandes-terminees-vide-\d{4}-\d{2}-\d{2}\.csv$/)
  })

  it('emits a header + one data row with the received_at formatted as YYYY-MM-DD', async () => {
    h.state.orders = { data: [{ id: 'o1', order_type: 'product', received_at: '2026-06-01T10:30:00.000Z' }], error: null }
    const res = await generateCompletedOrdersCsv()
    if ('error' in res) throw new Error('expected success')
    expect(res.csv).toBe('order_id,order_type,received_at_date\no1,product,2026-06-01')
    expect(res.filename).toMatch(/^servyou-commandes-terminees-\d{4}-\d{2}-\d{2}\.csv$/)
    expect(res.filename).not.toMatch(/vide/)
  })

  it('preserves the returned (received_at desc) order across multiple rows', async () => {
    h.state.orders = {
      data: [
        { id: 'o2', order_type: 'service', received_at: '2026-06-05T08:00:00.000Z' },
        { id: 'o1', order_type: 'product', received_at: '2026-06-01T08:00:00.000Z' },
      ],
      error: null,
    }
    const res = await generateCompletedOrdersCsv()
    if ('error' in res) throw new Error('expected success')
    expect(res.csv).toBe(
      'order_id,order_type,received_at_date\no2,service,2026-06-05\no1,product,2026-06-01',
    )
  })

  it('returns { error: forbidden } for a non-admin caller without reading orders', async () => {
    h.state.isAdmin = false
    const res = await generateCompletedOrdersCsv()
    expect(res).toEqual({ error: 'forbidden' })
  })

  it('returns { error: forbidden } when there is no authenticated user', async () => {
    h.state.user = null
    const res = await generateCompletedOrdersCsv()
    expect(res).toEqual({ error: 'forbidden' })
  })
})
