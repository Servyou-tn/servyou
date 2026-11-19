import { describe, it, expect, vi, beforeEach } from 'vitest'

// loadBellFeed — mocked Supabase (the RLS that limits a reader to their own rows is proven live by
// bell-notifications-live.test.ts, DB-1). Records the query chains and checks: the reader's own rows, newest first,
// 20 at most, the order embedded; the unread count as a head count over read_at IS NULL, of the kinds the map knows only
// (founder, #401 D8); a failed read is reported and is never an empty list.

type Call = [string, ...unknown[]]
const state = {
  chains: [] as Call[][],
  list: { data: [] as unknown[] | null, error: null as { message: string; code?: string; details?: string } | null },
  count: { count: 0 as number | null, error: null as { message: string; code?: string; details?: string } | null },
}

// One query chain. Which result it resolves to is decided by the chain ITSELF (a head count is the unread count), not by
// the order the loader builds them in.
function chain(): Record<string, unknown> {
  const calls: Call[] = []
  state.chains.push(calls)
  const proxy: Record<string, unknown> = {}
  for (const m of ['select', 'eq', 'is', 'in', 'order', 'limit']) {
    proxy[m] = (...args: unknown[]) => {
      calls.push([m, ...args])
      return proxy
    }
  }
  const isCount = () => calls.some(([m, , opts]) => m === 'select' && (opts as { head?: boolean } | undefined)?.head === true)
  proxy.then = (resolve: (v: unknown) => void) => resolve(isCount() ? state.count : state.list)
  return proxy
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    from: (table: string) => {
      expect(table).toBe('notifications')
      return chain()
    },
  }),
}))
const reported = vi.hoisted(() => [] as [string, unknown][])
vi.mock('@/lib/supabase/query-error', () => ({
  reportQueryError: (where: string, err: unknown) => reported.push([where, err]),
}))

import { loadBellFeed } from './bell-feed'
import { BELL_LIMIT } from './bell'
import { BELL_KINDS } from './bell-kinds'

const READER = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const SELLER = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
const ORDER = 'c0ffee00-0000-4000-8000-000000000001'

const rowFor = (id: string, over: Record<string, unknown> = {}) => ({
  id,
  kind: 'order_status_changed',
  from_status: 'pending',
  to_status: 'accepted',
  created_at: '2026-11-18T10:00:00Z',
  read_at: null,
  order: { id: ORDER, buyer_id: READER, seller_id: SELLER, order_type: 'service', item_title: 'Logo', refusal_reason: null },
  ...over,
})

beforeEach(() => {
  state.chains = []
  state.list = { data: [], error: null }
  state.count = { count: 0, error: null }
  reported.length = 0
})

describe('loadBellFeed — the server query', () => {
  it('reads the reader’s rows newest first, 20 at most, with the order; and the unread count as a head count', async () => {
    await loadBellFeed(READER)
    expect(state.chains).toHaveLength(2)
    const isHead = (c: Call[]) => c.some(([m, , o]) => m === 'select' && (o as { head?: boolean } | undefined)?.head === true)
    const list = state.chains.find((c) => !isHead(c))!
    const count = state.chains.find(isHead)!
    expect(list[0][0]).toBe('select')
    expect(String(list[0][1])).toContain('order:orders(id, buyer_id, seller_id, order_type, item_title, refusal_reason)')
    expect(list).toContainEqual(['eq', 'recipient_id', READER])
    expect(list).toContainEqual(['order', 'created_at', { ascending: false }])
    expect(list).toContainEqual(['limit', BELL_LIMIT])
    expect(BELL_LIMIT).toBe(20)
    expect(count).toEqual([
      ['select', 'id', { count: 'exact', head: true }],
      ['eq', 'recipient_id', READER],
      ['is', 'read_at', null],
      ['in', 'kind', ['order_created', 'order_status_changed']],
    ])
  })

  it('the unread count counts only the kinds the map knows — every one of them, read off the map (#401 D8)', async () => {
    await loadBellFeed(READER)
    const isHead = (c: Call[]) => c.some(([m, , o]) => m === 'select' && (o as { head?: boolean } | undefined)?.head === true)
    const kindFilters = state.chains.find(isHead)!.filter(([m]) => m === 'in')
    expect(kindFilters).toHaveLength(1)
    expect(kindFilters[0][1]).toBe('kind')
    expect([...(kindFilters[0][2] as string[])].sort()).toEqual(Object.keys(BELL_KINDS).sort())
  })

  it('the list is NOT filtered by kind: an unmapped kind must still reach the loader, to be reported', async () => {
    await loadBellFeed(READER)
    const isHead = (c: Call[]) => c.some(([m, , o]) => m === 'select' && (o as { head?: boolean } | undefined)?.head === true)
    expect(state.chains.find((c) => !isHead(c))!.some(([m]) => m === 'in')).toBe(false)
  })

  it('maps the rows to items through their kind (sentence, icon, tone, link for the reader’s side) and returns the server count', async () => {
    state.list.data = [rowFor('n-1'), rowFor('n-2', { read_at: '2026-11-18T11:00:00Z' })]
    state.count.count = 31
    const feed = await loadBellFeed(READER)
    expect(feed).toMatchObject({
      ok: true,
      unreadCount: 31,
      items: [
        {
          id: 'n-1',
          kind: 'order_status_changed',
          icon: 'circle-check',
          tone: 'success',
          sentence: { key: 'buyerOrder.event.accepted_freelancer' },
          href: `/mes-commandes/${ORDER}`,
          title: 'Logo',
          unread: true,
        },
        { id: 'n-2', unread: false },
      ],
    })
  })

  it('drops a row whose order it cannot read, without failing the rest — and reports it (the badge would disagree)', async () => {
    state.list.data = [rowFor('n-1', { order: null }), rowFor('n-2')]
    state.count.count = 2
    const feed = await loadBellFeed(READER)
    expect(feed.ok && feed.items.map((i) => i.id)).toEqual(['n-2'])
    expect(reported.map(([where]) => where)).toEqual(['bell rows'])
  })

  it('drops a row of a kind this version does not map, and reports it (the count already leaves that kind out)', async () => {
    state.list.data = [rowFor('n-1', { kind: 'proposal_received' }), rowFor('n-2')]
    state.count.count = 2
    const feed = await loadBellFeed(READER)
    expect(feed.ok && feed.items.map((i) => i.id)).toEqual(['n-2'])
    expect(reported.map(([where]) => where)).toEqual(['bell rows'])
  })

  it('a clean read reports nothing', async () => {
    state.list.data = [rowFor('n-1')]
    state.count.count = 1
    await loadBellFeed(READER)
    expect(reported).toEqual([])
  })

  it('a failed list read is reported and is NOT an empty list', async () => {
    state.list = { data: null, error: { message: 'permission denied', code: '42501' } }
    expect(await loadBellFeed(READER)).toEqual({ ok: false })
    expect(reported[0][0]).toBe('bell list')
  })

  it('a failed count is reported and is NOT a « 0 »', async () => {
    state.list.data = [rowFor('n-1')]
    state.count = { count: null, error: { message: 'timeout', code: '57014' } }
    expect(await loadBellFeed(READER)).toEqual({ ok: false })
    expect(reported[0][0]).toBe('bell unread count')
  })
})
