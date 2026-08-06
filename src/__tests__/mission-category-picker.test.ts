/**
 * Unit tests for getCategories() — the /mes-missions/nouvelle category picker.
 *
 * The Supabase client is mocked at the query-builder level: these cover WHICH ROWS THE PICKER
 * ASKS FOR, not the database. The data itself is enforced by `categories.kind` (NOT NULL, CHECK
 * product|service|both — migration 20260804132447).
 *
 * Why this file exists at all. Before `kind`, this picker rendered all 14 categories and a
 * consumer could file a freelance mission under "Électronique" or "Beauté & Soins". That shipped
 * and stayed live because nothing asserted what the picker offered — verified by loading the page
 * and parsing its <option> elements: 14 before the fix, 9 after.
 *
 * The regression these tests are really aimed at is narrower than "does it filter". It is someone
 * later simplifying `.in('kind', ['service','both'])` to `.eq('kind','service')`, which reads as
 * equivalent and silently drops `maison` — the one row carrying 'both'. That change would look
 * correct in review, break nothing loudly, and quietly remove a category from the picker.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'

const h = vi.hoisted(() => {
  const calls: { in: [string, string[]][]; select: string[]; order: string[] } = {
    in: [],
    select: [],
    order: [],
  }
  const state: { result: { data: unknown; error: { message: string; code?: string } | null } } = {
    result: { data: [], error: null },
  }
  // Chainable builder that records what was asked for and resolves like PostgREST.
  const builder: Record<string, unknown> = {}
  builder.select = vi.fn((cols: string) => (h_push('select', cols), builder))
  builder.in = vi.fn((col: string, vals: string[]) => (calls.in.push([col, vals]), builder))
  builder.order = vi.fn((col: string) => (calls.order.push(col), Promise.resolve(state.result)))
  function h_push(k: 'select' | 'order', v: string) {
    calls[k].push(v)
  }
  const from = vi.fn(() => builder)
  return { calls, state, from, builder }
})

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({ from: h.from })),
}))

import { getCategories } from '@/lib/marche/my-data'

beforeEach(() => {
  h.calls.in.length = 0
  h.calls.select.length = 0
  h.calls.order.length = 0
  h.state.result = { data: [], error: null }
  h.from.mockClear()
})

describe('getCategories — the mission picker is service-side', () => {
  it('filters on kind, and asks the categories table for it', async () => {
    await getCategories()
    expect(h.from).toHaveBeenCalledWith('categories')
    expect(h.calls.in).toHaveLength(1)
    expect(h.calls.in[0][0]).toBe('kind')
  })

  it("INCLUDES 'both' — a mission picker that only asks for 'service' silently drops maison", async () => {
    await getCategories()
    const [, values] = h.calls.in[0]
    expect(values).toContain('both')
    expect(values).toContain('service')
  })

  it("never asks for 'product' — that is the defect this fix closed", async () => {
    await getCategories()
    const [, values] = h.calls.in[0]
    expect(values).not.toContain('product')
  })

  it('passes rows through unchanged when the query succeeds', async () => {
    h.state.result = {
      data: [
        { id: 'c1', name_fr: 'Développement' },
        { id: 'c2', name_fr: 'Maison' },
      ],
      error: null,
    }
    await expect(getCategories()).resolves.toEqual([
      { id: 'c1', name_fr: 'Développement' },
      { id: 'c2', name_fr: 'Maison' },
    ])
  })

  it('returns an empty list rather than throwing when the query errors', async () => {
    h.state.result = { data: null, error: { message: 'boom', code: '42703' } }
    await expect(getCategories()).resolves.toEqual([])
  })
})
