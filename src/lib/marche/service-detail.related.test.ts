import { beforeEach, describe, expect, it, vi } from 'vitest'

// getRelatedServices (D2): the freelancer's OTHER services are the whole list when there are any (kind 'freelancer'); otherwise category, then newest
// (kind 'similar'). A fake client answers each query by the filters it carries — no database.

type Filter = [string, unknown]
const h = vi.hoisted(() => ({ queries: [] as { filters: [string, unknown][] }[], rows: new Map<string, unknown[]>() }))

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    from(table: string) {
      const q = { filters: [] as Filter[] }
      const chain: Record<string, unknown> = {}
      for (const m of ['select', 'neq', 'order', 'limit', 'in']) chain[m] = () => chain
      chain.is = (col: string, val: unknown) => (q.filters.push([`is:${col}`, val]), chain)
      chain.eq = (col: string, val: unknown) => (q.filters.push([col, val]), chain)
      chain.then = (resolve: (v: unknown) => unknown) => {
        if (table === 'service_listings') h.queries.push(q)
        const key = table === 'public_profiles' ? 'public_profiles' : (q.filters.find(([c]) => c === 'freelancer_profile_id' || c === 'category_id')?.[0] ?? 'newest')
        return Promise.resolve({ data: h.rows.get(key as string) ?? [], error: null }).then(resolve)
      }
      return chain
    },
  }),
}))

import { getRelatedServices, RELATED_LIMIT } from './service-detail'

const row = (id: string) => ({
  id, title: id, description: null, short_description: null, starting_price_tnd: 100, price_unit: null, delivery_time: null,
  categories: { name_fr: 'Cat' }, freelancer_profiles: { profile_id: 'p1', city: 'Tunis' },
})
const ids = (r: { items: { id: string }[] }) => r.items.map((i) => i.id)
const opts = { serviceId: 's0', freelancerProfileId: 'fp-1', categoryId: 'cat-1' }

beforeEach(() => {
  h.queries.length = 0
  h.rows.clear()
  h.rows.set('public_profiles', [{ id: 'p1', full_name: 'Aya' }])
})

describe('getRelatedServices', () => {
  it('the freelancer’s other services ARE the list when they have any — not topped up with other people’s', async () => {
    h.rows.set('freelancer_profile_id', [row('o1')])
    h.rows.set('category_id', [row('c1'), row('c2')])
    const r = await getRelatedServices(opts)
    expect(r.kind).toBe('freelancer')
    expect(ids(r)).toEqual(['o1'])
    expect(h.queries.some((q) => q.filters.some(([c]) => c === 'category_id'))).toBe(false) // no category query at all
  })

  it('no other service of theirs → « similar »: category first, then the newest to fill', async () => {
    h.rows.set('category_id', [row('c1')])
    h.rows.set('newest', [row('n1'), row('c1'), row('n2'), row('n3')])
    const r = await getRelatedServices(opts)
    expect(r.kind).toBe('similar')
    expect(ids(r)).toEqual(['c1', 'n1', 'n2'])
    expect(r.items).toHaveLength(RELATED_LIMIT)
  })

  it('an anonymous freelancer id / category still returns the newest — never empty', async () => {
    h.rows.set('newest', [row('n1')])
    const r = await getRelatedServices({ serviceId: 's0', freelancerProfileId: null, categoryId: null })
    expect(r).toMatchObject({ kind: 'similar' })
    expect(ids(r)).toEqual(['n1'])
  })

  it('EVERY tier — the freelancer’s own included — is active-only and hides moderated rows and moderated freelancers', async () => {
    h.rows.set('newest', [row('n1')])
    await getRelatedServices(opts) // own (empty) → category (empty) → newest: all three tiers run
    expect(h.queries).toHaveLength(3)
    for (const q of h.queries) {
      expect(q.filters).toContainEqual(['status', 'active'])
      expect(q.filters).toContainEqual(['is:admin_hidden_at', null])
      expect(q.filters).toContainEqual(['is:freelancer_profiles.admin_hidden_at', null])
    }
  })

  it('the own-services tier hides moderated rows too (a hidden own service never turns the heading on)', async () => {
    h.rows.set('freelancer_profile_id', [row('o1')])
    await getRelatedServices(opts)
    expect(h.queries).toHaveLength(1)
    expect(h.queries[0].filters).toContainEqual(['freelancer_profile_id', 'fp-1'])
    expect(h.queries[0].filters).toContainEqual(['is:admin_hidden_at', null])
    expect(h.queries[0].filters).toContainEqual(['is:freelancer_profiles.admin_hidden_at', null])
  })

  it('names the cards’ freelancer from public_profiles', async () => {
    h.rows.set('freelancer_profile_id', [row('o1')])
    const r = await getRelatedServices(opts)
    expect(r.items[0].freelancer.full_name).toBe('Aya')
  })
})
