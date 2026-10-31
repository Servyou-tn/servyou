import { describe, it, expect, vi, beforeEach } from 'vitest'

// searchFreelancers — mocked Supabase. The mock answers per TABLE and applies `.in('id', …)` to the profile rows, so a profile only comes back
// when the service set asked for it; it records the calls so the visibility filters can be asserted. It cannot prove RLS.
type Call = [string, ...unknown[]]
type Result = { data?: Record<string, unknown>[]; error?: { message: string } | null }
const state = {
  calls: {} as Record<string, Call[]>,
  results: {} as Record<string, Result>,
}

function builder(table: string) {
  const calls = (state.calls[table] ??= [])
  const mine: Call[] = []
  const b: Record<string, unknown> = {}
  for (const m of ['select', 'eq', 'is', 'in', 'or', 'gte', 'lte', 'order', 'range', 'limit']) {
    b[m] = (...args: unknown[]) => {
      const call: Call = [m, ...args]
      calls.push(call)
      mine.push(call)
      return b
    }
  }
  b.then = (resolve: (v: unknown) => unknown) => {
    const res = state.results[table] ?? {}
    let data = res.data ?? []
    // `.in('id', …)` on the profiles table narrows to the asked ids, like the database would.
    const inId = mine.find((c) => c[0] === 'in' && c[1] === 'id')
    if (table === 'freelancer_profiles' && inId) data = data.filter((r) => (inId[2] as string[]).includes(r.id as string))
    const range = mine.find((c) => c[0] === 'range')
    if (range) data = data.slice(range[1] as number, (range[2] as number) + 1)
    resolve({ data, error: res.error ?? null })
  }
  return b
}

vi.mock('@/lib/supabase/server', () => ({ createClient: async () => ({ from: (t: string) => builder(t) }) }))
const getFreelancerCards = vi.fn(async (ids: string[]) => ids.map((id) => ({ id })))
vi.mock('@/lib/marche/freelancer-cards', () => ({ getFreelancerCards: (ids: string[]) => getFreelancerCards(ids) }))

import {
  chunk,
  FREELANCER_PER_PAGE,
  matchesFreelancerQuery,
  pageAll,
  parseFreelancerSort,
  searchFreelancers,
  sortCandidates,
} from './search-freelancers'

const base = {
  q: '',
  categorie: [] as string[],
  ville: null as string | null,
  prixMin: null as number | null,
  prixMax: null as number | null,
  tri: 'recent' as 'recent' | 'prix_asc' | 'prix_desc',
  page: 1,
}
const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const profile = (n: number, extra: Record<string, unknown> = {}) => ({
  id: `f${n}`,
  profile_id: `p${n}`,
  headline: null,
  city: null,
  created_at: `2026-10-${String(10 + n).padStart(2, '0')}T00:00:00Z`,
  ...extra,
})
/** The services the database returns: one row per active visible service. */
const withServices = (...ns: number[]) => {
  state.results.service_listings = { data: ns.map((n) => ({ freelancer_profile_id: `f${n}`, starting_price_tnd: null })) }
}
/** [freelancer n, starting price] pairs — one row per service. */
const withPricedServices = (...rows: [number, number | string | null][]) => {
  state.results.service_listings = { data: rows.map(([n, price]) => ({ freelancer_profile_id: `f${n}`, starting_price_tnd: price })) }
}
const has = (table: string, ...call: unknown[]) =>
  (state.calls[table] ?? []).some((c) => c.length === call.length && c.every((v, i) => v === call[i]))

beforeEach(() => {
  state.calls = {}
  state.results = {}
  getFreelancerCards.mockClear()
})

describe('parseFreelancerSort', () => {
  it('knows the three services sorts and reads anything else as newest first', () => {
    expect(parseFreelancerSort('prix_asc')).toBe('prix_asc')
    expect(parseFreelancerSort(['prix_desc', 'x'])).toBe('prix_desc')
    expect(parseFreelancerSort('recent')).toBe('recent')
    expect(parseFreelancerSort('pertinence')).toBe('recent')
    expect(parseFreelancerSort('nom')).toBe('recent')
    expect(parseFreelancerSort(undefined)).toBe('recent')
  })
})

describe('matchesFreelancerQuery', () => {
  const hay = { name: 'Yassine Ben Ali', headline: 'Développeur Full Stack', skills: ['React', 'Node.js'] }
  it('matches the name, the headline or a skill, accent- and case-insensitively', () => {
    expect(matchesFreelancerQuery('yassine', hay)).toBe(true)
    expect(matchesFreelancerQuery('DEVELOPPEUR', hay)).toBe(true)
    expect(matchesFreelancerQuery('node', hay)).toBe(true)
  })
  it('needs every word to be found somewhere, and an empty term matches all', () => {
    expect(matchesFreelancerQuery('yassine react', hay)).toBe(true)
    expect(matchesFreelancerQuery('yassine python', hay)).toBe(false)
    expect(matchesFreelancerQuery('   ', hay)).toBe(true)
  })
  it('tolerates a missing name and headline', () => {
    expect(matchesFreelancerQuery('react', { name: '', headline: null, skills: ['React'] })).toBe(true)
    expect(matchesFreelancerQuery('react', { name: '', headline: null, skills: [] })).toBe(false)
  })
})

describe('sortCandidates / chunk / pageAll', () => {
  const rows = [profile(1), profile(3), profile(2)]
  it('newest first by default, without mutating the input', () => {
    expect(sortCandidates(rows, 'recent', () => null).map((r) => r.id)).toEqual(['f3', 'f2', 'f1'])
    expect(rows.map((r) => r.id)).toEqual(['f1', 'f3', 'f2'])
  })
  it('by lowest starting price, ascending or descending; a freelancer with no price goes last either way; ties fall back to newest', () => {
    const price: Record<string, number | null> = { f1: 80, f2: null, f3: 80 }
    expect(sortCandidates(rows, 'prix_asc', (id) => price[id]).map((r) => r.id)).toEqual(['f3', 'f1', 'f2'])
    expect(sortCandidates(rows, 'prix_desc', (id) => price[id]).map((r) => r.id)).toEqual(['f3', 'f1', 'f2'])
    price.f1 = 50
    expect(sortCandidates(rows, 'prix_asc', (id) => price[id]).map((r) => r.id)).toEqual(['f1', 'f3', 'f2'])
    expect(sortCandidates(rows, 'prix_desc', (id) => price[id]).map((r) => r.id)).toEqual(['f3', 'f1', 'f2'])
  })
  it('chunk keeps every item, in order, in lists no longer than the size', () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]])
    expect(chunk([], 3)).toEqual([])
  })
  it('pageAll keeps reading while a page is full — PostgREST answers 1000 rows with no error — and stops at a short page', async () => {
    const all = Array.from({ length: 2300 }, (_, i) => i)
    const reads: [number, number][] = []
    const out = await pageAll<number>(async (from, to) => {
      reads.push([from, to])
      return { data: all.slice(from, to + 1), error: null }
    }, 'test')
    expect(out).toHaveLength(2300)
    expect(reads).toEqual([[0, 999], [1000, 1999], [2000, 2999]])
  })
  it('pageAll throws on an error instead of returning what it had', async () => {
    await expect(pageAll(async () => ({ data: null, error: { message: 'boom' } }), 'test')).rejects.toThrow()
  })
})

describe('searchFreelancers', () => {
  it('asks only for published, non-moderated profiles, and only for services that are active and not hidden', async () => {
    withServices(1)
    state.results.freelancer_profiles = { data: [profile(1)] }
    await searchFreelancers(base)
    expect(has('freelancer_profiles', 'eq', 'is_published', true)).toBe(true)
    expect(has('freelancer_profiles', 'is', 'admin_hidden_at', null)).toBe(true)
    expect(has('service_listings', 'eq', 'status', 'active')).toBe(true)
    expect(has('service_listings', 'is', 'admin_hidden_at', null)).toBe(true)
  })

  it('a published profile whose only services are hidden (no visible active service) is not listed', async () => {
    withServices(1) // f2 has no visible active service
    state.results.freelancer_profiles = { data: [profile(1), profile(2)] }
    const r = await searchFreelancers(base)
    expect(r.freelancers.map((f) => f.id)).toEqual(['f1'])
  })

  it('returns an empty first page when nobody has a visible service, without decorating anything', async () => {
    const r = await searchFreelancers(base)
    expect(r).toMatchObject({ freelancers: [], totalCount: 0, page: 1, totalPages: 1, perPage: FREELANCER_PER_PAGE })
    expect(getFreelancerCards).not.toHaveBeenCalled()
  })

  it('cuts pages of 8 in newest-first order and clamps an out-of-range page', async () => {
    const ns = Array.from({ length: 11 }, (_, i) => i + 1)
    withServices(...ns)
    state.results.freelancer_profiles = { data: ns.map((n) => profile(n)) }
    const first = await searchFreelancers(base)
    expect(first).toMatchObject({ totalCount: 11, page: 1, totalPages: 2 })
    expect(first.freelancers.map((f) => f.id)).toEqual(['f11', 'f10', 'f9', 'f8', 'f7', 'f6', 'f5', 'f4'])
    const last = await searchFreelancers({ ...base, page: 99 })
    expect(last.page).toBe(2)
    expect(last.freelancers.map((f) => f.id)).toEqual(['f3', 'f2', 'f1'])
  })

  it('looks profiles up in short id chunks, so a long list never overflows the URL — and loses nobody', async () => {
    const ns = Array.from({ length: 200 }, (_, i) => i + 1)
    withServices(...ns)
    state.results.freelancer_profiles = { data: ns.map((n) => profile(n)) }
    const r = await searchFreelancers(base)
    expect(r.totalCount).toBe(200)
    const sizes = (state.calls.freelancer_profiles ?? []).filter((c) => c[0] === 'in' && c[1] === 'id').map((c) => (c[2] as string[]).length)
    expect(sizes).toEqual([80, 80, 40])
  })

  it('filters by city on the TRIMMED value, so a listed city never returns nothing because of a stray space', async () => {
    withServices(1, 2, 3)
    state.results.freelancer_profiles = { data: [profile(1, { city: 'Sfax ' }), profile(2, { city: 'Tunis' }), profile(3, { city: null })] }
    const r = await searchFreelancers({ ...base, ville: 'Sfax' })
    expect(r.freelancers.map((f) => f.id)).toEqual(['f1'])
  })

  it('a sector narrows the service set to its category or sub-category, active and visible only', async () => {
    state.results.categories = { data: [{ id: uuid(7) }] }
    withServices(2)
    state.results.freelancer_profiles = { data: [profile(1), profile(2), profile(3)] }
    const r = await searchFreelancers({ ...base, categorie: ['design-graphique-logo'] })
    expect(r.freelancers.map((f) => f.id)).toEqual(['f2'])
    expect(has('service_listings', 'or', `category_id.in.(${uuid(7)}),subcategory_id.in.(${uuid(7)})`)).toBe(true)
    expect(has('service_listings', 'eq', 'status', 'active')).toBe(true)
  })

  it('a malformed, unknown or unserved sector matches nothing — it never reads as « no filter »', async () => {
    withServices(1)
    state.results.freelancer_profiles = { data: [profile(1)] }
    expect((await searchFreelancers({ ...base, categorie: ['BAD slug!'] })).totalCount).toBe(0)
    state.results.categories = { data: [] }
    expect((await searchFreelancers({ ...base, categorie: ['no-such-sector'] })).totalCount).toBe(0)
    state.results.categories = { data: [{ id: uuid(1) }] }
    state.results.service_listings = { data: [] }
    expect((await searchFreelancers({ ...base, categorie: ['design-graphique-logo'] })).totalCount).toBe(0)
  })

  it('a query matches the name, the headline or a skill', async () => {
    withServices(1, 2, 3)
    state.results.freelancer_profiles = { data: [profile(1, { headline: 'Designer' }), profile(2), profile(3)] }
    state.results.public_profiles = { data: [{ id: 'p1', full_name: 'Aya' }, { id: 'p2', full_name: 'Sami Trabelsi' }, { id: 'p3', full_name: 'Nour' }] }
    state.results.freelancer_skills = { data: [{ freelancer_profile_id: 'f3', skill: 'Trabelsi-script' }] }
    const r = await searchFreelancers({ ...base, q: 'trabelsi' })
    expect(r.freelancers.map((f) => f.id).sort()).toEqual(['f2', 'f3'])
    const byHeadline = await searchFreelancers({ ...base, q: 'designer' })
    expect(byHeadline.freelancers.map((f) => f.id)).toEqual(['f1'])
  })

  it('a query of only stripped characters filters nothing and fetches no names', async () => {
    withServices(1, 2)
    state.results.freelancer_profiles = { data: [profile(1), profile(2)] }
    const r = await searchFreelancers({ ...base, q: '%%_*' })
    expect(r.totalCount).toBe(2)
    expect(state.calls.public_profiles).toBeUndefined()
  })

  it('the price range is applied to the SAME services as the sector: active, visible, starting price inside [min, max]', async () => {
    state.results.categories = { data: [{ id: uuid(7) }] }
    withPricedServices([1, 50])
    state.results.freelancer_profiles = { data: [profile(1)] }
    await searchFreelancers({ ...base, categorie: ['design-graphique-logo'], prixMin: 40, prixMax: 90 })
    expect(has('service_listings', 'gte', 'starting_price_tnd', 40)).toBe(true)
    expect(has('service_listings', 'lte', 'starting_price_tnd', 90)).toBe(true)
    expect(has('service_listings', 'or', `category_id.in.(${uuid(7)}),subcategory_id.in.(${uuid(7)})`)).toBe(true)
    expect(has('service_listings', 'eq', 'status', 'active')).toBe(true)
  })

  it('no price range adds no price filter', async () => {
    withPricedServices([1, 50])
    state.results.freelancer_profiles = { data: [profile(1)] }
    await searchFreelancers(base)
    expect((state.calls.service_listings ?? []).some((c) => c[0] === 'gte' || c[0] === 'lte')).toBe(false)
  })

  it('sorts by each freelancer\'s LOWEST starting price (numeric strings included), unpriced last', async () => {
    withPricedServices([1, 120], [1, '45.50'], [2, 60], [3, null])
    state.results.freelancer_profiles = { data: [profile(1), profile(2), profile(3)] }
    const asc = await searchFreelancers({ ...base, tri: 'prix_asc' })
    expect(asc.freelancers.map((f) => f.id)).toEqual(['f1', 'f2', 'f3'])
    const desc = await searchFreelancers({ ...base, tri: 'prix_desc' })
    expect(desc.freelancers.map((f) => f.id)).toEqual(['f2', 'f1', 'f3'])
  })

  it('a sort by price fetches no names', async () => {
    withPricedServices([1, 10], [2, 20])
    state.results.freelancer_profiles = { data: [profile(1), profile(2)] }
    await searchFreelancers({ ...base, tri: 'prix_asc' })
    expect(state.calls.public_profiles).toBeUndefined()
  })

  it('throws when ANY lookup fails — a failed query is not « no freelance »', async () => {
    const ok = { service_listings: { data: [{ freelancer_profile_id: 'f1' }] }, freelancer_profiles: { data: [profile(1)] } }
    const boom = { error: { message: 'boom' } }
    state.results = { ...ok, service_listings: boom }
    await expect(searchFreelancers(base)).rejects.toThrow()
    state.results = { ...ok, freelancer_profiles: boom }
    await expect(searchFreelancers(base)).rejects.toThrow()
    state.results = { ...ok, public_profiles: boom }
    await expect(searchFreelancers({ ...base, q: 'x' })).rejects.toThrow()
    state.results = { ...ok, freelancer_skills: boom, public_profiles: { data: [{ id: 'p1', full_name: 'x' }] } }
    await expect(searchFreelancers({ ...base, q: 'x' })).rejects.toThrow()
    state.results = { categories: boom }
    await expect(searchFreelancers({ ...base, categorie: ['design-graphique-logo'] })).rejects.toThrow()
  })
})
