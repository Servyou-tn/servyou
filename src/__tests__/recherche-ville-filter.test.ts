/**
 * /recherche « Ville » (PR-2b, founder ruling): products filter on the SHOP's city, services on the FREELANCER's city.
 *
 * The predicates live in search-marketplace.ts (applyProductFilters → `shops.city`, applyServiceFilters →
 * `freelancer_profiles.city`); /recherche now passes `?ville` through to them. A city is never a gate: with no ?ville
 * no city clause is added at all.
 *
 * Mock-only: a fake Supabase client holding an in-memory catalogue per table; `eq` on a dotted path filters through
 * the embed, the way PostgREST does on an `!inner` join.
 *
 * Run: npx vitest run src/__tests__/recherche-ville-filter.test.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

type Row = Record<string, unknown>

const product = (id: string, city: string | null): Row => ({
  id,
  title: `Coussin ${id}`,
  description: null,
  price_tnd: 45,
  created_at: '2026-10-01T10:00:00Z',
  category_id: '11111111-1111-4111-8111-111111111111',
  shops: { name: `Boutique ${id}`, city, admin_hidden_at: null },
  product_images: [],
  categories: { name_fr: 'Décoration', name_ar: 'ديكور' },
})

const service = (id: string, city: string | null): Row => ({
  id,
  title: `Service ${id}`,
  description: null,
  short_description: null,
  starting_price_tnd: 100,
  price_unit: null,
  delivery_time: null,
  tags: [],
  created_at: '2026-10-01T10:00:00Z',
  category_id: '11111111-1111-4111-8111-111111111111',
  subcategory_id: null,
  freelancer_profiles: { profile_id: `fp-${id}`, city, admin_hidden_at: null },
  categories: { name_fr: 'Secteur', name_ar: 'قطاع' },
})

const TABLES: Record<string, Row[]> = {
  products: [product('p1', 'Sfax'), product('p2', 'Tunis'), product('p3', null)],
  service_listings: [service('s1', 'Sfax'), service('s2', 'Sousse'), service('s3', null)],
}

const eqCalls: string[] = []

// `a.b` reads row.a.b — the embed path PostgREST resolves on the joined row.
const read = (row: Row, path: string): unknown =>
  path.split('.').reduce<unknown>((v, k) => (v && typeof v === 'object' ? (v as Row)[k] : undefined), row)

function makeBuilder(table: string) {
  const predicates: ((r: Row) => boolean)[] = []
  const b: Record<string, unknown> = {}
  const chain = () => b
  for (const m of ['select', 'is', 'limit', 'gte', 'lte', 'textSearch', 'in', 'or', 'order', 'range']) b[m] = chain
  b.eq = (col: string, value: unknown) => {
    eqCalls.push(`${table}:${col}=${String(value)}`)
    if (col.includes('.')) predicates.push((r) => read(r, col) === value)
    return b
  }
  b.then = (resolve: (v: { data: Row[]; error: null }) => unknown) =>
    resolve({ data: (TABLES[table] ?? []).filter((r) => predicates.every((p) => p(r))), error: null })
  return b
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ from: (table: string) => makeBuilder(table) }),
}))

import { searchMarketplace, parseSearchParams } from '@/lib/search/search-marketplace'

beforeEach(() => {
  eqCalls.length = 0
})

describe('parseSearchParams — ville', () => {
  it('reads ?ville, trimmed', () => {
    expect(parseSearchParams({ q: 'coussin', ville: '  Sfax ' }).ville).toBe('Sfax')
  })

  it('an empty or missing ?ville is no city filter (null)', () => {
    expect(parseSearchParams({ q: 'coussin', ville: '   ' }).ville).toBeNull()
    expect(parseSearchParams({ q: 'coussin' }).ville).toBeNull()
  })
})

describe('searchMarketplace — Ville on /recherche', () => {
  it('products: filters on the SHOP city', async () => {
    const out = await searchMarketplace(parseSearchParams({ ville: 'Sfax' }))
    expect(eqCalls).toContain('products:shops.city=Sfax')
    expect(out.products.map((p) => p.id)).toEqual(['p1'])
  })

  it('services: filters on the FREELANCER city', async () => {
    const out = await searchMarketplace(parseSearchParams({ type: 'service', ville: 'Sfax' }))
    expect(eqCalls).toContain('service_listings:freelancer_profiles.city=Sfax')
    expect(out.services.map((s) => s.id)).toEqual(['s1'])
  })

  it('a city with no listing on that side → zero, not « everything »', async () => {
    const out = await searchMarketplace(parseSearchParams({ ville: 'Sousse' }))
    expect(out.totalCount).toBe(0)
  })

  it('no ?ville → no city clause on either side, and listings with a blank city still appear', async () => {
    const products = await searchMarketplace(parseSearchParams({}))
    const services = await searchMarketplace(parseSearchParams({ type: 'service' }))
    expect(eqCalls.some((c) => c.includes('.city='))).toBe(false)
    expect(products.totalCount).toBe(3)
    expect(services.totalCount).toBe(3)
  })
})
