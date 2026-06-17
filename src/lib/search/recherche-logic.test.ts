/**
 * Unit tests for the /recherche decision helpers: the no-query landing block vs. running a
 * search, and the "weak result" threshold behind the cross-side nudge.
 *
 * Run: npx vitest run src/lib/search/recherche-logic.test.ts
 */

import { describe, it, expect } from 'vitest'
import type { SearchParams } from './search-params'
import {
  isWeakResult,
  searchHasFilters,
  shouldShowSearchLanding,
  WEAK_RESULT_MAX,
} from './recherche-logic'

function params(overrides: Partial<SearchParams> = {}): SearchParams {
  return {
    q: '',
    type: 'product',
    categorie: [],
    ville: [],
    prixMin: null,
    prixMax: null,
    tri: 'pertinence',
    page: 1,
    ...overrides,
  }
}

describe('shouldShowSearchLanding', () => {
  it('is true for a bare /recherche (no query, no filters)', () => {
    expect(shouldShowSearchLanding(params())).toBe(true)
  })

  it('is false once a query is typed', () => {
    expect(shouldShowSearchLanding(params({ q: 'logo' }))).toBe(false)
  })

  it('is false when a filter is active even without a query', () => {
    expect(shouldShowSearchLanding(params({ categorie: ['mode'] }))).toBe(false)
    expect(shouldShowSearchLanding(params({ ville: ['Tunis'] }))).toBe(false)
    expect(shouldShowSearchLanding(params({ prixMin: 10 }))).toBe(false)
    expect(shouldShowSearchLanding(params({ prixMax: 10 }))).toBe(false)
  })
})

describe('searchHasFilters', () => {
  it('detects each refinement independently', () => {
    expect(searchHasFilters(params())).toBe(false)
    expect(searchHasFilters(params({ categorie: ['x'] }))).toBe(true)
    expect(searchHasFilters(params({ ville: ['Sfax'] }))).toBe(true)
    expect(searchHasFilters(params({ prixMin: 5 }))).toBe(true)
    expect(searchHasFilters(params({ prixMax: 5 }))).toBe(true)
  })
})

describe('isWeakResult', () => {
  it('flags 1..3 as weak', () => {
    expect(isWeakResult(1)).toBe(true)
    expect(isWeakResult(3)).toBe(true)
  })

  it('does not flag 0 (that is the empty state) or 4+', () => {
    expect(isWeakResult(0)).toBe(false)
    expect(isWeakResult(WEAK_RESULT_MAX)).toBe(false)
    expect(isWeakResult(20)).toBe(false)
  })
})
