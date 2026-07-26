/**
 * Unit tests for the pure /recherche search helpers — the genuinely testable business
 * logic behind the page: how the URL is parsed, how results are ranked + sorted, how
 * pages are sliced, and when the prompt vs. results vs. empty views show. (The DB-level
 * filters — q ILIKE, category/city/price WHERE clauses — are verified by manual
 * click-through, per CLAUDE.md's may-skip "UI rendering" + the data-layer being thin
 * PostgREST.)
 *
 * Run: npx vitest run src/lib/search/search-params.test.ts
 */

import { describe, it, expect } from 'vitest'
import {
  compareRanked,
  ilikePattern,
  otherType,
  paginate,
  parseSearchParams,
  pickCategoryIds,
  scoreListing,
  stripAccents,
  type Ranked,
} from './search-params'

describe('parseSearchParams', () => {
  it('applies defaults when params are absent', () => {
    const p = parseSearchParams({})
    expect(p).toEqual({
      q: '',
      type: 'product',
      categorie: [],
      ville: null,
      prixMin: null,
      prixMax: null,
      tri: 'pertinence',
      page: 1,
    })
  })

  it('accepts the French alias produit AND English product as product; service as service', () => {
    expect(parseSearchParams({ type: 'produit' }).type).toBe('product')
    expect(parseSearchParams({ type: 'product' }).type).toBe('product')
    expect(parseSearchParams({ type: 'service' }).type).toBe('service')
    expect(parseSearchParams({ type: 'garbage' }).type).toBe('product')
  })

  it('parses multi-value categorie (comma-joined and repeated)', () => {
    expect(parseSearchParams({ categorie: 'mode,tech' }).categorie).toEqual(['mode', 'tech'])
    expect(parseSearchParams({ categorie: ['mode', 'tech'] }).categorie).toEqual(['mode', 'tech'])
    // blanks are dropped
    expect(parseSearchParams({ categorie: 'mode,,' }).categorie).toEqual(['mode'])
  })

  it('normalizes ville to a trimmed city name, or null when absent/blank', () => {
    expect(parseSearchParams({ ville: 'Sfax' }).ville).toBe('Sfax')
    expect(parseSearchParams({ ville: '  Ben Arous  ' }).ville).toBe('Ben Arous')
    // Blank/whitespace-only must collapse to null, not '' — an empty string would be applied
    // as a real .eq('city', '') predicate and silently return zero results.
    expect(parseSearchParams({ ville: '' }).ville).toBeNull()
    expect(parseSearchParams({ ville: '   ' }).ville).toBeNull()
    expect(parseSearchParams({}).ville).toBeNull()
  })

  it('parses prix bounds and clamps page to >= 1', () => {
    const p = parseSearchParams({ prix_min: '10', prix_max: '50', page: '3' })
    expect(p.prixMin).toBe(10)
    expect(p.prixMax).toBe(50)
    expect(p.page).toBe(3)
    expect(parseSearchParams({ page: '0' }).page).toBe(1)
    expect(parseSearchParams({ page: '-5' }).page).toBe(1)
    expect(parseSearchParams({ page: 'abc' }).page).toBe(1)
    expect(parseSearchParams({ prix_min: '' }).prixMin).toBeNull()
  })

  it('falls back to pertinence for an unknown sort', () => {
    expect(parseSearchParams({ tri: 'prix_asc' }).tri).toBe('prix_asc')
    expect(parseSearchParams({ tri: 'nope' }).tri).toBe('pertinence')
  })
})

describe('scoreListing', () => {
  it('weights a title match (2) above a description-only match (1), above none (0)', () => {
    expect(scoreListing('Sac à main', 'cuir', 'sac')).toBe(2)
    expect(scoreListing('Cartable', 'un beau sac', 'sac')).toBe(1)
    expect(scoreListing('Cartable', 'en cuir', 'sac')).toBe(0)
    // hit in both fields sums
    expect(scoreListing('Sac', 'petit sac', 'sac')).toBe(3)
  })

  it('is case-insensitive and 0 for an empty term', () => {
    expect(scoreListing('SAC', null, 'sac')).toBe(2)
    expect(scoreListing('Sac', 'sac', '')).toBe(0)
  })

  it('is accent-insensitive on both sides (matches FTS recall)', () => {
    // accented field, plain query
    expect(scoreListing('Crème hydratante', null, 'creme')).toBe(2)
    // plain field, accented query
    expect(scoreListing('Creme', null, 'crème')).toBe(2)
    expect(scoreListing('Réparation', 'écran cassé', 'ecran')).toBe(1)
  })
})

describe('stripAccents', () => {
  it('folds Latin diacritics to their base letters', () => {
    expect(stripAccents('é')).toBe('e')
    expect(stripAccents('Téléphone')).toBe('Telephone')
    expect(stripAccents('çà')).toBe('ca')
  })

  it('leaves unaccented text untouched and handles the empty string', () => {
    expect(stripAccents('iphone')).toBe('iphone')
    expect(stripAccents('')).toBe('')
  })

  it('passes non-Latin scripts (Arabic) through without throwing', () => {
    const arabic = 'تصميم شعار'
    expect(() => stripAccents(arabic)).not.toThrow()
    expect(stripAccents(arabic)).toBe(arabic)
  })
})

describe('compareRanked (sort comparator)', () => {
  const mk = (score: number, price: number | null, createdAt: string): Ranked => ({
    score,
    price,
    createdAt,
  })

  it('pertinence: higher score first, newest breaks ties', () => {
    const items = [
      mk(1, 10, '2026-01-01'),
      mk(3, 99, '2026-01-01'),
      mk(3, 5, '2026-02-01'),
    ]
    const sorted = [...items].sort((a, b) => compareRanked(a, b, 'pertinence'))
    expect(sorted.map((i) => i.score)).toEqual([3, 3, 1])
    // tie on score 3 → newer createdAt first
    expect(sorted[0].createdAt).toBe('2026-02-01')
  })

  it('prix_asc / prix_desc order by price with nulls always last', () => {
    const items = [mk(0, 30, 'x'), mk(0, null, 'x'), mk(0, 10, 'x')]
    expect([...items].sort((a, b) => compareRanked(a, b, 'prix_asc')).map((i) => i.price)).toEqual([
      10, 30, null,
    ])
    expect([...items].sort((a, b) => compareRanked(a, b, 'prix_desc')).map((i) => i.price)).toEqual([
      30, 10, null,
    ])
  })

  it('recent: newest createdAt first', () => {
    const items = [mk(0, 0, '2026-01-01'), mk(0, 0, '2026-03-01'), mk(0, 0, '2026-02-01')]
    expect(
      [...items].sort((a, b) => compareRanked(a, b, 'recent')).map((i) => i.createdAt),
    ).toEqual(['2026-03-01', '2026-02-01', '2026-01-01'])
  })
})

describe('paginate', () => {
  it('computes total pages and slice bounds for a middle page', () => {
    const { totalPages, safePage, start, end } = paginate(45, 2, 20)
    expect(totalPages).toBe(3)
    expect(safePage).toBe(2)
    expect(start).toBe(20)
    expect(end).toBe(40)
  })

  it('clamps an out-of-range page into the valid range', () => {
    expect(paginate(45, 99, 20).safePage).toBe(3)
    expect(paginate(45, 0, 20).safePage).toBe(1)
  })

  it('always reports at least one page, even for zero results', () => {
    const { totalPages, safePage } = paginate(0, 1, 20)
    expect(totalPages).toBe(1)
    expect(safePage).toBe(1)
  })
})

describe('pickCategoryIds', () => {
  it('uses an explicit categoryId directly (the /categories/[slug] path)', () => {
    expect(pickCategoryIds('cat-uuid', null)).toEqual(['cat-uuid'])
  })

  it('lets an explicit categoryId win over slug-resolved ids', () => {
    expect(pickCategoryIds('cat-uuid', ['slug-a', 'slug-b'])).toEqual(['cat-uuid'])
  })

  it('falls back to slug-resolved ids when no categoryId (the /recherche path)', () => {
    expect(pickCategoryIds(null, ['slug-a'])).toEqual(['slug-a'])
    expect(pickCategoryIds(undefined, null)).toBeNull()
    // empty slug-resolution (filter given but matched nothing) is preserved → zero results
    expect(pickCategoryIds(undefined, [])).toEqual([])
  })
})

describe('otherType', () => {
  it('toggles product ↔ service', () => {
    expect(otherType('product')).toBe('service')
    expect(otherType('service')).toBe('product')
  })
})

describe('ilikePattern', () => {
  it('wraps a clean term in % wildcards', () => {
    expect(ilikePattern('sac')).toBe('%sac%')
  })

  it('strips characters that would break the PostgREST or() grammar', () => {
    // commas/parens would split or() filters; % _ * \ would be unintended wildcards
    expect(ilikePattern('a,b(c)')).toBe('%a b c%')
    expect(ilikePattern('50%_off')).toBe('%50 off%')
  })

  it('returns null when nothing usable remains', () => {
    expect(ilikePattern('   ')).toBeNull()
    expect(ilikePattern('%%')).toBeNull()
  })
})
