/**
 * /categories/<subcategory> showed 0 services.
 *
 * A service_listings row carries TWO category pointers: `category_id` = its SECTOR, `subcategory_id` = the leaf
 * the freelancer picked. The category-scoped query matched `category_id` only, so a subcategory page (whose id
 * lives in `subcategory_id`) never found anything. Fixed in search-marketplace.ts's applyServiceFilters via
 * serviceCategoryOrClause.
 *
 * Mock-only: a fake Supabase client holding an in-memory catalogue, with just enough of PostgREST's `in` / `or`
 * semantics to evaluate the real filter string the production code builds.
 *
 * Run: npx vitest run src/__tests__/service-subcategory-scope.test.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

const SECTOR = '11111111-1111-4111-8111-111111111111'
const OTHER_SECTOR = '22222222-2222-4222-8222-222222222222'
const LEAF_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const LEAF_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
const LEAF_C = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'

type Row = {
  id: string
  title: string
  description: string | null
  short_description: string | null
  starting_price_tnd: number
  price_unit: string | null
  delivery_time: string | null
  tags: string[]
  created_at: string
  category_id: string
  subcategory_id: string | null
  freelancer_profiles: { profile_id: string; city: string | null; admin_hidden_at: null }
  categories: { name_fr: string; name_ar: string }
}

function row(id: string, categoryId: string, subcategoryId: string | null): Row {
  return {
    id,
    title: `Service ${id}`,
    description: null,
    short_description: null,
    starting_price_tnd: 100,
    price_unit: null,
    delivery_time: null,
    tags: [],
    created_at: '2026-10-01T10:00:00Z',
    category_id: categoryId,
    subcategory_id: subcategoryId,
    freelancer_profiles: { profile_id: 'p1', city: 'Tunis', admin_hidden_at: null },
    categories: { name_fr: 'Secteur', name_ar: 'قطاع' },
  }
}

// Three active services: two filed under SECTOR (leaves A and B), one under another sector (leaf C).
const CATALOGUE: Row[] = [row('s1', SECTOR, LEAF_A), row('s2', SECTOR, LEAF_B), row('s3', OTHER_SECTOR, LEAF_C)]

const filtersApplied: string[] = []

// `col.in.(a,b)` → the set of ids; the production code only ever builds this shape.
function parseIn(clause: string): { col: string; ids: string[] } {
  const m = /^(\w+)\.in\.\((.*)\)$/.exec(clause)
  if (!m) throw new Error(`unsupported clause in test fake: ${clause}`)
  return { col: m[1], ids: m[2] === '' ? [] : m[2].split(',') }
}

type Predicate = (r: Row) => boolean

function makeBuilder(table: string) {
  const predicates: Predicate[] = []
  const b: Record<string, unknown> = {}
  const chain = () => b
  for (const m of ['select', 'eq', 'is', 'limit', 'gte', 'lte', 'textSearch']) b[m] = chain
  b.in = (col: string, ids: readonly string[]) => {
    filtersApplied.push(`in:${col}:${ids.join(',')}`)
    predicates.push((r) => ids.includes(String((r as unknown as Record<string, unknown>)[col])))
    return b
  }
  b.or = (clause: string) => {
    filtersApplied.push(`or:${clause}`)
    // top-level commas separate the branches; each branch is `col.in.(ids)` whose own commas sit inside parens
    const branches = clause.split(/,(?![^()]*\))/).map(parseIn)
    predicates.push((r) =>
      branches.some(({ col, ids }) => ids.includes(String((r as unknown as Record<string, unknown>)[col]))),
    )
    return b
  }
  b.then = (resolve: (v: { data: unknown[]; error: null }) => unknown) => {
    const data = table === 'service_listings' ? CATALOGUE.filter((r) => predicates.every((p) => p(r))) : []
    return resolve({ data, error: null })
  }
  return b
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ from: (table: string) => makeBuilder(table) }),
}))

import { searchMarketplace, parseSearchParams } from '@/lib/search/search-marketplace'
import { serviceCategoryOrClause } from '@/lib/search/search-params'

const serviceParams = () => parseSearchParams({ type: 'service' })

beforeEach(() => {
  filtersApplied.length = 0
})

describe('serviceCategoryOrClause', () => {
  it('matches the id against BOTH category_id and subcategory_id', () => {
    expect(serviceCategoryOrClause([LEAF_A])).toBe(`category_id.in.(${LEAF_A}),subcategory_id.in.(${LEAF_A})`)
  })

  it('carries several ids in both branches', () => {
    expect(serviceCategoryOrClause([SECTOR, LEAF_A])).toBe(
      `category_id.in.(${SECTOR},${LEAF_A}),subcategory_id.in.(${SECTOR},${LEAF_A})`,
    )
  })

  it('returns null — match NOTHING — when there is no valid id', () => {
    expect(serviceCategoryOrClause([])).toBeNull()
    expect(serviceCategoryOrClause(['not-a-uuid'])).toBeNull()
  })

  it('never lets a non-UUID reach the filter string (no clause injection)', () => {
    const clause = serviceCategoryOrClause([LEAF_A, 'x),status.eq.hidden,(y', ''])
    expect(clause).toBe(`category_id.in.(${LEAF_A}),subcategory_id.in.(${LEAF_A})`)
    expect(clause).not.toContain('hidden')
  })
})

describe('searchMarketplace — services scoped to a category', () => {
  it('a SUBCATEGORY id finds the services filed under that leaf (was 0)', async () => {
    const out = await searchMarketplace(serviceParams(), { categoryId: LEAF_A })
    expect(out.totalCount).toBe(1)
    expect(out.services.map((s) => s.id)).toEqual(['s1'])
  })

  it('a different leaf finds only its own service', async () => {
    const out = await searchMarketplace(serviceParams(), { categoryId: LEAF_C })
    expect(out.services.map((s) => s.id)).toEqual(['s3'])
  })

  it('a SECTOR id still finds every service filed under it, whatever the leaf (unchanged)', async () => {
    const out = await searchMarketplace(serviceParams(), { categoryId: SECTOR })
    expect(out.services.map((s) => s.id).sort()).toEqual(['s1', 's2'])
  })

  it('a leaf of another sector does not leak across', async () => {
    const out = await searchMarketplace(serviceParams(), { categoryId: LEAF_B })
    expect(out.services.map((s) => s.id)).toEqual(['s2'])
  })

  it('an id no service uses → zero, not "everything"', async () => {
    const out = await searchMarketplace(serviceParams(), { categoryId: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd' })
    expect(out.totalCount).toBe(0)
  })

  it('a non-UUID category id matches nothing (empty in), never drops the scope', async () => {
    const out = await searchMarketplace(serviceParams(), { categoryId: 'garbage' })
    expect(out.totalCount).toBe(0)
    expect(filtersApplied).toContain('in:category_id:')
  })

  it('builds the OR clause (not the old category_id-only in) for a scoped query', async () => {
    await searchMarketplace(serviceParams(), { categoryId: LEAF_A })
    expect(filtersApplied).toContain(`or:category_id.in.(${LEAF_A}),subcategory_id.in.(${LEAF_A})`)
    expect(filtersApplied.some((f) => f.startsWith('in:category_id:'))).toBe(false)
  })

  it('no category → no category filter at all', async () => {
    const out = await searchMarketplace(serviceParams())
    expect(out.totalCount).toBe(3)
    // (the freelancer-name lookup on public_profiles also uses `in`; only the category scope is asserted absent)
    expect(filtersApplied.filter((f) => f.startsWith('or:') || f.startsWith('in:category_id'))).toEqual([])
  })
})
