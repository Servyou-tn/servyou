// Pure decision helpers for the /recherche search engine: when to show the no-query
// landing block vs. run a search, and when a result set is thin enough to nudge the user
// to the other side of the Produits/Services toggle. Kept dependency-free so they are
// unit-tested directly (see recherche-logic.test.ts).

import type { SearchParams } from './search-params'

// A result set with 1..(WEAK_RESULT_MAX-1) matches is "weak": we still show what we have,
// but add a one-line helper suggesting the other side.
export const WEAK_RESULT_MAX = 4

/** Any category / city / price refinement active (the query `q` is tracked separately). */
export function searchHasFilters(p: SearchParams): boolean {
  return (
    p.categorie.length > 0 ||
    p.ville.length > 0 ||
    p.prixMin != null ||
    p.prixMax != null
  )
}

/**
 * Bare /recherche — no query AND no filters — shows the landing block (two CTAs to the
 * marketplaces), NOT a browse grid: /marche/produits and /marche/services own browse-by-
 * default now. As soon as a query or a filter is active, a real search runs instead.
 */
export function shouldShowSearchLanding(p: SearchParams): boolean {
  return p.q === '' && !searchHasFilters(p)
}

/** 1..3 results: show them, but suggest flipping the toggle. 0 is handled by the empty state. */
export function isWeakResult(count: number): boolean {
  return count > 0 && count < WEAK_RESULT_MAX
}
