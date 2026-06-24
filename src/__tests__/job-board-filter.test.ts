/**
 * Pure job-board logic (src/lib/freelance/job-board-filter.ts): URL-param whitelisting and the
 * in-app budget/skills filter + sort + pagination. This is the business-rule logic behind /emplois
 * (a must-test category per CLAUDE.md), kept framework-free so it runs without a DB or React — the
 * same posture as marche-routing.test.ts / search-url.test.ts. The category/city/posted-within
 * filters run in PostgREST and are verified at runtime instead.
 *
 * Run: npx vitest run src/__tests__/job-board-filter.test.ts
 */

import { describe, it, expect } from 'vitest'
import {
  parseJobBoardParams,
  selectJobPosts,
  type JobBoardParams,
  type JobPostRow,
} from '@/lib/freelance/job-board-filter'

const PAGE_SIZE = 20

function baseParams(over: Partial<JobBoardParams> = {}): JobBoardParams {
  return {
    page: 1,
    pageSize: PAGE_SIZE,
    categories: [],
    minBudget: null,
    maxBudget: null,
    cities: [],
    skills: [],
    postedWithinDays: null,
    sort: 'newest',
    ...over,
  }
}

function post(over: Partial<JobPostRow> & { id: string }): JobPostRow {
  return {
    title: 'Mission',
    descriptionPreview: null,
    budgetMin: null,
    budgetMax: null,
    categoryName: null,
    city: null,
    isRemote: false,
    deadline: null,
    skills: [],
    createdAt: '2026-06-01T00:00:00Z',
    ...over,
  }
}

describe('parseJobBoardParams', () => {
  it('returns safe defaults for empty params', () => {
    expect(parseJobBoardParams({}, PAGE_SIZE)).toEqual({
      page: 1,
      pageSize: PAGE_SIZE,
      categories: [],
      minBudget: null,
      maxBudget: null,
      cities: [],
      skills: [],
      postedWithinDays: null,
      sort: 'newest',
    })
  })

  it('parses comma-separated lists and numeric budgets', () => {
    const p = parseJobBoardParams(
      { categories: 'design,dev', cities: 'Tunis,Sfax', skills: 'react,figma', minBudget: '100', maxBudget: '500' },
      PAGE_SIZE,
    )
    expect(p.categories).toEqual(['design', 'dev'])
    expect(p.cities).toEqual(['Tunis', 'Sfax'])
    expect(p.skills).toEqual(['react', 'figma'])
    expect(p.minBudget).toBe(100)
    expect(p.maxBudget).toBe(500)
  })

  it('whitelists sort — unknown values fall back to newest', () => {
    expect(parseJobBoardParams({ sort: 'highest_budget' }, PAGE_SIZE).sort).toBe('highest_budget')
    expect(parseJobBoardParams({ sort: 'fewest_responses' }, PAGE_SIZE).sort).toBe('newest')
    expect(parseJobBoardParams({ sort: 'garbage' }, PAGE_SIZE).sort).toBe('newest')
  })

  it('whitelists postedWithin to 1/7/30, else null', () => {
    expect(parseJobBoardParams({ postedWithin: '7' }, PAGE_SIZE).postedWithinDays).toBe(7)
    expect(parseJobBoardParams({ postedWithin: '99' }, PAGE_SIZE).postedWithinDays).toBeNull()
    expect(parseJobBoardParams({ postedWithin: 'abc' }, PAGE_SIZE).postedWithinDays).toBeNull()
  })

  it('rejects non-numeric budgets and guards the page number', () => {
    expect(parseJobBoardParams({ minBudget: 'abc' }, PAGE_SIZE).minBudget).toBeNull()
    expect(parseJobBoardParams({ page: '3' }, PAGE_SIZE).page).toBe(3)
    expect(parseJobBoardParams({ page: '0' }, PAGE_SIZE).page).toBe(1)
    expect(parseJobBoardParams({ page: '-2' }, PAGE_SIZE).page).toBe(1)
  })

  it('takes the first value when a param repeats', () => {
    expect(parseJobBoardParams({ sort: ['highest_budget', 'newest'] }, PAGE_SIZE).sort).toBe('highest_budget')
  })
})

describe('selectJobPosts', () => {
  const a = post({ id: 'a', budgetMin: 100, budgetMax: 200, createdAt: '2026-06-01T00:00:00Z', skills: ['react'] })
  const b = post({ id: 'b', budgetMin: 300, budgetMax: 500, createdAt: '2026-06-03T00:00:00Z', skills: ['figma'] })
  const c = post({ id: 'c', budgetMin: 400, budgetMax: 800, createdAt: '2026-06-02T00:00:00Z', skills: [] })
  const all = [a, b, c]

  it('newest sorts by created_at descending', () => {
    const { items, total } = selectJobPosts(all, baseParams())
    expect(items.map((p) => p.id)).toEqual(['b', 'c', 'a'])
    expect(total).toBe(3)
  })

  it('highest_budget sorts by COALESCE(max, min) descending', () => {
    const { items } = selectJobPosts(all, baseParams({ sort: 'highest_budget' }))
    expect(items.map((p) => p.id)).toEqual(['c', 'b', 'a']) // 800, 500, 200
  })

  it('minBudget keeps posts whose effective max ≥ the floor', () => {
    const { items, total } = selectJobPosts(all, baseParams({ minBudget: 400 }))
    expect(items.map((p) => p.id).sort()).toEqual(['b', 'c'])
    expect(total).toBe(2)
  })

  it('maxBudget keeps posts whose effective min ≤ the ceiling', () => {
    const { items } = selectJobPosts(all, baseParams({ maxBudget: 150 }))
    expect(items.map((p) => p.id)).toEqual(['a'])
  })

  it('excludes a budgetless post once any budget bound is set', () => {
    const none = post({ id: 'n', createdAt: '2026-06-05T00:00:00Z' })
    const { items } = selectJobPosts([none, a], baseParams({ minBudget: 50 }))
    expect(items.map((p) => p.id)).toEqual(['a'])
  })

  it('skills filter matches ANY selected skill, case-insensitively', () => {
    const { items } = selectJobPosts(all, baseParams({ skills: ['REACT'] }))
    expect(items.map((p) => p.id)).toEqual(['a'])
  })

  it('paginates while reporting the full matching total', () => {
    const { items, total } = selectJobPosts(all, baseParams({ pageSize: 2, page: 2 }))
    expect(total).toBe(3)
    expect(items).toHaveLength(1) // page 2 of 3 results at size 2
  })
})
