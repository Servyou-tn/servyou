/**
 * Unit tests for the usage-based category scoping. The taxonomy is unified (no `type`
 * column), so a browse engine's filter is the set of categories that actually carry an
 * active listing of that engine's type — derived here from the active rows.
 *
 * Run: npx vitest run src/lib/marche/category-scope.test.ts
 */

import { describe, it, expect } from 'vitest'
import { distinctActiveCategoryIds } from './category-scope'

describe('distinctActiveCategoryIds', () => {
  it('returns the unique non-null category ids', () => {
    const ids = distinctActiveCategoryIds([
      { category_id: 'a' },
      { category_id: 'b' },
      { category_id: 'a' },
    ])
    expect(ids.sort()).toEqual(['a', 'b'])
  })

  it('drops rows with a null category id', () => {
    const ids = distinctActiveCategoryIds([
      { category_id: 'a' },
      { category_id: null },
      { category_id: null },
    ])
    expect(ids).toEqual(['a'])
  })

  it('returns [] for no rows', () => {
    expect(distinctActiveCategoryIds([])).toEqual([])
  })

  it('preserves first-seen order', () => {
    const ids = distinctActiveCategoryIds([
      { category_id: 'z' },
      { category_id: 'm' },
      { category_id: 'z' },
      { category_id: 'a' },
    ])
    expect(ids).toEqual(['z', 'm', 'a'])
  })
})
