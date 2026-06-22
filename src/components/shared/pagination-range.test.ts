/**
 * Unit tests for the numbered-pagination window builder. The visual spec (from the brief):
 *   current 5 / 47 → [‹] [1] [...] [4] [5] [6] [...] [47] [›]
 *   current 1 / 47 → [1] [2] [3] [...] [47]
 *   current 4 / 7  → [1] [2] [3] [4] [5] [6] [7]   (no ellipsis when short)
 *
 * Run: npx vitest run src/components/shared/pagination-range.test.ts
 */

import { describe, it, expect } from 'vitest'
import { paginationRange } from './pagination-range'

describe('paginationRange (desktop window, neighbors=1)', () => {
  it('shows first, ±1 around current, and last with ellipses on both sides (mid range)', () => {
    expect(paginationRange(5, 47, 1)).toEqual([1, 'ellipsis', 4, 5, 6, 'ellipsis', 47])
  })

  it('extends the run at the start edge (no leading ellipsis)', () => {
    expect(paginationRange(1, 47, 1)).toEqual([1, 2, 3, 'ellipsis', 47])
  })

  it('extends the run at the end edge (no trailing ellipsis)', () => {
    expect(paginationRange(47, 47, 1)).toEqual([1, 'ellipsis', 45, 46, 47])
  })

  it('renders every page when the range is short enough (no ellipsis)', () => {
    expect(paginationRange(4, 7, 1)).toEqual([1, 2, 3, 4, 5, 6, 7])
  })

  it('renders the lone in-between page instead of an ellipsis when the gap is exactly one', () => {
    // 1 … (gap of just page 4) … window — the 4 is shown, not collapsed to "…"
    expect(paginationRange(2, 5, 1)).toEqual([1, 2, 3, 4, 5])
  })

  it('clamps an out-of-range current page into [1, total]', () => {
    expect(paginationRange(99, 3, 1)).toEqual([1, 2, 3])
    expect(paginationRange(0, 3, 1)).toEqual([1, 2, 3])
  })
})

describe('paginationRange (mobile window, neighbors=0)', () => {
  it('shows only first / current / last with ellipses between', () => {
    expect(paginationRange(5, 47, 0)).toEqual([1, 'ellipsis', 5, 'ellipsis', 47])
  })

  it('collapses to first + last when current is the first page', () => {
    expect(paginationRange(1, 47, 0)).toEqual([1, 'ellipsis', 47])
  })

  it('renders consecutive pages without ellipsis when short', () => {
    expect(paginationRange(2, 3, 0)).toEqual([1, 2, 3])
  })
})
