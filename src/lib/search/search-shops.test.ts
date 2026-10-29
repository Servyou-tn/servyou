import { describe, it, expect, vi, beforeEach } from 'vitest'

// searchShops — mocked Supabase: which filters reach the query, how the page is cut, and that the count and the page share them.
type Call = [string, ...unknown[]]
const state = { calls: [] as Call[][], count: 0, ids: [] as string[], countError: null as { message: string } | null }

function builder(kind: 'count' | 'page') {
  const calls: Call[] = []
  state.calls.push(calls)
  const b: Record<string, unknown> = {}
  for (const m of ['select', 'is', 'ilike', 'eq', 'in', 'order', 'range']) {
    b[m] = (...args: unknown[]) => {
      calls.push([m, ...args])
      return b
    }
  }
  b.then = (resolve: (v: unknown) => unknown) =>
    resolve(
      kind === 'count'
        ? { count: state.count, error: state.countError }
        : { data: state.ids.map((id) => ({ id })), count: state.count, error: null },
    )
  return b
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    // the first from() of a search is the count query (head), the second the page
    from: () => builder(state.calls.length === 0 ? 'count' : 'page'),
  }),
}))
const getShopCards = vi.fn(async (ids: string[]) => ids.map((id) => ({ id })))
vi.mock('@/lib/marche/shop-cards', () => ({ getShopCards: (ids: string[]) => getShopCards(ids) }))

import { parseShopSort, searchShops, SHOP_PER_PAGE } from './search-shops'

const base = { q: '', categorie: [] as string[], ville: null as string | null, tri: 'recent' as const, page: 1 }

beforeEach(() => {
  state.calls = []
  state.count = 0
  state.ids = []
  state.countError = null
  getShopCards.mockClear()
})

describe('parseShopSort', () => {
  it('only `nom` is a shop sort; anything else (even the products lens prix_asc) is newest first', () => {
    expect(parseShopSort('nom')).toBe('nom')
    expect(parseShopSort(['nom', 'x'])).toBe('nom')
    for (const v of [undefined, '', 'recent', 'prix_asc', 'pertinence', 'NOM']) expect(parseShopSort(v)).toBe('recent')
  })
})

describe('searchShops', () => {
  it('lists only PUBLIC shops (admin_hidden_at IS NULL) — on the count AND on the page', async () => {
    state.count = 2
    state.ids = ['a', 'b']
    await searchShops(base)
    for (const calls of state.calls) expect(calls).toContainEqual(['is', 'admin_hidden_at', null])
  })

  it('an empty result is {0 shops, page 1} and never runs the page query or the card loader', async () => {
    state.count = 0
    const r = await searchShops({ ...base, page: 7 })
    expect(r).toMatchObject({ shops: [], totalCount: 0, page: 1, totalPages: 1 })
    expect(state.calls).toHaveLength(1) // only the count query ran
    expect(getShopCards).not.toHaveBeenCalled()
  })

  it('applies name / city / category to the count and the page alike, via bound filters', async () => {
    state.count = 1
    state.ids = ['a']
    await searchShops({ ...base, q: 'olive', ville: 'Sousse', categorie: ['artisanat'] })
    for (const calls of state.calls) {
      expect(calls).toContainEqual(['ilike', 'name', '%olive%'])
      expect(calls).toContainEqual(['eq', 'city', 'Sousse'])
      expect(calls).toContainEqual(['in', 'shop_categories.categories.slug', ['artisanat']])
    }
    // the category filter switches the select to the inner-joined embed
    expect(state.calls[1].find((c) => c[0] === 'select')?.[1]).toContain('shop_categories!inner')
  })

  it('drops a malformed category slug instead of sending it to PostgREST', async () => {
    state.count = 1
    state.ids = ['a']
    await searchShops({ ...base, categorie: ['a"b', 'ok-slug'] })
    expect(state.calls[1]).toContainEqual(['in', 'shop_categories.categories.slug', ['ok-slug']])
  })

  it('sorts newest first by default and by name for `nom`, with an id tiebreak, and cuts the requested range', async () => {
    state.count = 20
    state.ids = ['a']
    await searchShops({ ...base, page: 2 })
    expect(state.calls[1]).toContainEqual(['order', 'created_at', { ascending: false }])
    expect(state.calls[1]).toContainEqual(['order', 'id', { ascending: true }])
    expect(state.calls[1]).toContainEqual(['range', SHOP_PER_PAGE, SHOP_PER_PAGE * 2 - 1])

    state.calls = []
    await searchShops({ ...base, tri: 'nom' })
    expect(state.calls[1]).toContainEqual(['order', 'name', { ascending: true }])
  })

  it('clamps an out-of-range page to the last one instead of a 416', async () => {
    state.count = 7 // 2 pages of 6
    state.ids = ['a']
    const r = await searchShops({ ...base, page: 99 })
    expect(r.page).toBe(2)
    expect(r.totalPages).toBe(2)
    expect(state.calls[1]).toContainEqual(['range', 6, 11])
  })

  it('hands the page ids — de-duplicated, in order — to the card loader', async () => {
    state.count = 3
    state.ids = ['a', 'b', 'a', 'c']
    const r = await searchShops(base)
    expect(getShopCards).toHaveBeenCalledWith(['a', 'b', 'c'])
    expect(r.shops.map((s) => (s as { id: string }).id)).toEqual(['a', 'b', 'c'])
  })

  it('a failed count THROWS (the page turns it into an error state, never « aucune boutique »)', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    state.countError = { message: 'boom' }
    await expect(searchShops(base)).rejects.toThrow(/search-shops count/)
  })
})
