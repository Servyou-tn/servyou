import { describe, it, expect, vi, beforeEach } from 'vitest'
import { DEFAULT_ORDERS_TAB, hasExplicitTab, parseOrdersParams } from './my-orders-params'

type Op = [string, ...unknown[]]
const state = vi.hoisted(() => ({
  ops: [] as Op[],
  result: { data: null as unknown, error: null as null | { message: string; code?: string; details?: string } },
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    from() {
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

const { getDefaultOrdersTab, pickDefaultOrdersTab } = await import('./my-orders')

beforeEach(() => {
  state.ops = []
  state.result = { data: null, error: null }
})

describe('pickDefaultOrdersTab — the tab of the most recent order', () => {
  it('only services → services', () => {
    expect(pickDefaultOrdersTab({ order_type: 'service' })).toBe('services')
  })
  it('only products → produits', () => {
    expect(pickDefaultOrdersTab({ order_type: 'product' })).toBe('produits')
  })
  it('no orders → produits (the frame)', () => {
    expect(pickDefaultOrdersTab(null)).toBe('produits')
    expect(pickDefaultOrdersTab(undefined)).toBe(DEFAULT_ORDERS_TAB)
  })
  it('an unexpected order_type falls back to the frame default rather than throwing', () => {
    expect(pickDefaultOrdersTab({ order_type: 'whatever' })).toBe('produits')
  })
})

describe('getDefaultOrdersTab', () => {
  it('asks for the buyer’s single newest order, newest first', async () => {
    state.result = { data: { order_type: 'service' }, error: null }
    expect(await getDefaultOrdersTab('me')).toBe('services')
    expect(state.ops).toEqual(
      expect.arrayContaining([
        ['eq', 'buyer_id', 'me'],
        ['order', 'created_at', { ascending: false }],
        ['limit', 1],
      ]),
    )
  })

  it('mixed → the NEWER one wins, whichever type it is', async () => {
    // The query returns the newest row, so the answer is that row's type: product newer than a service → produits…
    state.result = { data: { order_type: 'product' }, error: null }
    expect(await getDefaultOrdersTab('me')).toBe('produits')
    // …and a service newer than a product → services.
    state.result = { data: { order_type: 'service' }, error: null }
    expect(await getDefaultOrdersTab('me')).toBe('services')
  })

  it('no orders → produits', async () => {
    state.result = { data: null, error: null }
    expect(await getDefaultOrdersTab('me')).toBe('produits')
  })

  it('a failed read THROWS instead of silently answering Produits to a services buyer', async () => {
    state.result = { data: null, error: { message: 'boom', code: 'XX000' } }
    await expect(getDefaultOrdersTab('me')).rejects.toThrow(/default orders tab fetch failed/)
  })
})

describe('the page contract: explicit ?tab= wins, otherwise the fallback, and statut follows the resolved tab', () => {
  it('hasExplicitTab is true only for a real tab', () => {
    expect(hasExplicitTab({ tab: 'services' })).toBe(true)
    expect(hasExplicitTab({ tab: ['produits'] })).toBe(true)
    expect(hasExplicitTab({})).toBe(false)
    expect(hasExplicitTab({ tab: 'zzz' })).toBe(false)
  })

  it('an explicit tab is not overridden by the fallback', () => {
    expect(parseOrdersParams({ tab: 'produits' }, 'services').tab).toBe('produits')
    expect(parseOrdersParams({ tab: 'services' }, 'produits').tab).toBe('services')
  })

  it('a bookmarked ?statut= with no tab follows the smart default', () => {
    // `arrived` is valid on both tabs, `prepared` only on Produits.
    expect(parseOrdersParams({ statut: 'arrived' }, 'services')).toMatchObject({ tab: 'services', statut: 'arrived' })
    expect(parseOrdersParams({ statut: 'prepared' }, 'services')).toMatchObject({ tab: 'services', statut: 'all' })
    expect(parseOrdersParams({ statut: 'prepared' }, 'produits')).toMatchObject({ tab: 'produits', statut: 'prepared' })
  })

  it('without a fallback the frame default applies', () => {
    expect(parseOrdersParams({}).tab).toBe('produits')
  })
})
