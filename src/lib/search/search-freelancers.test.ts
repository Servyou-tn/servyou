import { describe, it, expect, vi, beforeEach } from 'vitest'

// searchFreelancers — mocked Supabase: only PUBLISHED, non-moderated profiles are asked for; the sector / city / query / sort filters do what
// they say; a failed lookup throws instead of reading as « no freelance ».
type Call = [string, ...unknown[]]
type Result = { data?: unknown; error?: { message: string } | null }
const state = {
  calls: {} as Record<string, Call[]>,
  results: {} as Record<string, Result>,
}

function builder(table: string) {
  const calls = (state.calls[table] ??= [])
  const b: Record<string, unknown> = {}
  for (const m of ['select', 'eq', 'is', 'in', 'or', 'order', 'limit']) {
    b[m] = (...args: unknown[]) => {
      calls.push([m, ...args])
      return b
    }
  }
  b.then = (resolve: (v: unknown) => unknown) => resolve({ data: [], error: null, ...state.results[table] })
  return b
}

vi.mock('@/lib/supabase/server', () => ({ createClient: async () => ({ from: (t: string) => builder(t) }) }))
const getFreelancerCards = vi.fn(async (ids: string[]) => ids.map((id) => ({ id })))
vi.mock('@/lib/marche/freelancer-cards', () => ({ getFreelancerCards: (ids: string[]) => getFreelancerCards(ids) }))

import {
  chunk,
  FREELANCER_PER_PAGE,
  matchesFreelancerQuery,
  parseFreelancerSort,
  searchFreelancers,
  sortCandidates,
} from './search-freelancers'

const base = { q: '', categorie: [] as string[], ville: null as string | null, tri: 'recent' as const, page: 1 }
const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const profile = (n: number, extra: Record<string, unknown> = {}) => ({
  id: `f${n}`,
  profile_id: `p${n}`,
  headline: null,
  created_at: `2026-10-${String(10 + n).padStart(2, '0')}T00:00:00Z`,
  ...extra,
})
const has = (table: string, ...call: unknown[]) =>
  (state.calls[table] ?? []).some((c) => c.length === call.length && c.every((v, i) => v === call[i]))

beforeEach(() => {
  state.calls = {}
  state.results = {}
  getFreelancerCards.mockClear()
})

describe('parseFreelancerSort', () => {
  it('only « nom » is not the default', () => {
    expect(parseFreelancerSort('nom')).toBe('nom')
    expect(parseFreelancerSort(['nom', 'x'])).toBe('nom')
    expect(parseFreelancerSort('prix_asc')).toBe('recent')
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

describe('sortCandidates / chunk', () => {
  const rows = [profile(1), profile(3), profile(2)]
  it('newest first by default, without mutating the input', () => {
    expect(sortCandidates(rows, 'recent', () => '').map((r) => r.id)).toEqual(['f3', 'f2', 'f1'])
    expect(rows.map((r) => r.id)).toEqual(['f1', 'f3', 'f2'])
  })
  it('A→Z by name in French collation, ties broken by id', () => {
    const names: Record<string, string> = { p1: 'Zied', p2: 'Élodie', p3: 'Adam' }
    expect(sortCandidates(rows, 'nom', (p) => names[p]).map((r) => r.id)).toEqual(['f3', 'f2', 'f1'])
  })
  it('chunk keeps every item, in order, in lists no longer than the size', () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]])
    expect(chunk([], 3)).toEqual([])
  })
})

describe('searchFreelancers', () => {
  it('asks only for published, non-moderated profiles — never the owner / buyer rows RLS would also let through', async () => {
    state.results.freelancer_profiles = { data: [profile(1)] }
    await searchFreelancers(base)
    expect(has('freelancer_profiles', 'eq', 'is_published', true)).toBe(true)
    expect(has('freelancer_profiles', 'is', 'admin_hidden_at', null)).toBe(true)
  })

  it('returns an empty first page when nobody is published, without decorating anything', async () => {
    const r = await searchFreelancers(base)
    expect(r).toMatchObject({ freelancers: [], totalCount: 0, page: 1, totalPages: 1, perPage: FREELANCER_PER_PAGE })
    expect(getFreelancerCards).not.toHaveBeenCalled()
  })

  it('cuts pages of 8 in newest-first order and clamps an out-of-range page', async () => {
    state.results.freelancer_profiles = { data: Array.from({ length: 11 }, (_, i) => profile(i + 1)) }
    const first = await searchFreelancers(base)
    expect(first).toMatchObject({ totalCount: 11, page: 1, totalPages: 2 })
    expect(first.freelancers.map((f) => f.id)).toEqual(['f11', 'f10', 'f9', 'f8', 'f7', 'f6', 'f5', 'f4'])
    const last = await searchFreelancers({ ...base, page: 99 })
    expect(last.page).toBe(2)
    expect(last.freelancers.map((f) => f.id)).toEqual(['f3', 'f2', 'f1'])
  })

  it('filters by city in the query', async () => {
    state.results.freelancer_profiles = { data: [profile(1)] }
    await searchFreelancers({ ...base, ville: 'Sfax' })
    expect(has('freelancer_profiles', 'eq', 'city', 'Sfax')).toBe(true)
  })

  it('a sector keeps only the freelancers with an ACTIVE, visible service filed under it', async () => {
    state.results.categories = { data: [{ id: uuid(7) }] }
    state.results.service_listings = { data: [{ freelancer_profile_id: 'f2' }] }
    state.results.freelancer_profiles = { data: [profile(1), profile(2), profile(3)] }
    const r = await searchFreelancers({ ...base, categorie: ['design-graphique-logo'] })
    expect(r.freelancers.map((f) => f.id)).toEqual(['f2'])
    expect(has('service_listings', 'eq', 'status', 'active')).toBe(true)
    expect(has('service_listings', 'is', 'admin_hidden_at', null)).toBe(true)
    expect(has('service_listings', 'or', `category_id.in.(${uuid(7)}),subcategory_id.in.(${uuid(7)})`)).toBe(true)
  })

  it('a malformed, unknown or unserved sector matches nothing — it never reads as « no filter »', async () => {
    state.results.freelancer_profiles = { data: [profile(1)] }
    expect((await searchFreelancers({ ...base, categorie: ['BAD slug!'] })).totalCount).toBe(0)
    state.results.categories = { data: [] }
    expect((await searchFreelancers({ ...base, categorie: ['no-such-sector'] })).totalCount).toBe(0)
    state.results.categories = { data: [{ id: uuid(1) }] }
    state.results.service_listings = { data: [] }
    expect((await searchFreelancers({ ...base, categorie: ['design-graphique-logo'] })).totalCount).toBe(0)
  })

  it('a query matches the name, the headline or a skill', async () => {
    state.results.freelancer_profiles = {
      data: [profile(1, { headline: 'Designer' }), profile(2), profile(3)],
    }
    state.results.public_profiles = { data: [{ id: 'p1', full_name: 'Aya' }, { id: 'p2', full_name: 'Sami Trabelsi' }, { id: 'p3', full_name: 'Nour' }] }
    state.results.freelancer_skills = { data: [{ freelancer_profile_id: 'f3', skill: 'Trabelsi-script' }] }
    const r = await searchFreelancers({ ...base, q: 'trabelsi' })
    expect(r.freelancers.map((f) => f.id).sort()).toEqual(['f2', 'f3'])
    const byHeadline = await searchFreelancers({ ...base, q: 'designer' })
    expect(byHeadline.freelancers.map((f) => f.id)).toEqual(['f1'])
  })

  it('a query of only stripped characters filters nothing and fetches no names', async () => {
    state.results.freelancer_profiles = { data: [profile(1), profile(2)] }
    const r = await searchFreelancers({ ...base, q: '%%_*' })
    expect(r.totalCount).toBe(2)
    expect(state.calls.public_profiles).toBeUndefined()
  })

  it('A→Z fetches the names and sorts by them', async () => {
    state.results.freelancer_profiles = { data: [profile(1), profile(2)] }
    state.results.public_profiles = { data: [{ id: 'p1', full_name: 'Zied' }, { id: 'p2', full_name: 'Adam' }] }
    const r = await searchFreelancers({ ...base, tri: 'nom' })
    expect(r.freelancers.map((f) => f.id)).toEqual(['f2', 'f1'])
  })

  it('throws when a lookup fails — a failed query is not « no freelance »', async () => {
    state.results.freelancer_profiles = { error: { message: 'boom' } }
    await expect(searchFreelancers(base)).rejects.toThrow()
    state.results = { freelancer_profiles: { data: [profile(1)] }, public_profiles: { error: { message: 'boom' } } }
    await expect(searchFreelancers({ ...base, q: 'x' })).rejects.toThrow()
    state.results = { categories: { error: { message: 'boom' } } }
    await expect(searchFreelancers({ ...base, categorie: ['design-graphique-logo'] })).rejects.toThrow()
  })
})
