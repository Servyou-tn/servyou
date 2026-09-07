/**
 * Unit tests for getCategories() — the /mes-annonces/nouvelle category picker.
 *
 * The Supabase client is mocked at the query-builder level: these cover WHICH ROWS THE PICKER
 * ASKS FOR, not the database. The data itself is enforced by `categories.kind` (NOT NULL, CHECK
 * product|service|both — migration 20260804132447).
 *
 * Why this file exists at all. Before `kind`, this picker rendered all 14 categories and a
 * consumer could file an annonce under "Électronique" or "Beauté & Soins". That shipped
 * and stayed live because nothing asserted what the picker offered — verified by loading the page
 * and parsing its <option> elements: 14 before the fix, 9 after.
 *
 * The regression these tests are really aimed at is narrower than "does it filter". It is someone
 * later simplifying `.in('kind', ['service','both'])` to `.eq('kind','service')`, which reads as
 * equivalent and silently drops `maison` — the one row carrying 'both'. That change would look
 * correct in review, break nothing loudly, and quietly remove a category from the picker.
 *
 * `.is('parent_id', null)` (added 2026-09-07, 13-sector taxonomy cutover) is chained in the mock
 * below but NOT asserted on by any test here — a real gap, logged in docs/follow-ups.md under
 * "tests that pass while the feature is broken". Because the builder is a hand-rolled mock, adding
 * the real `.is()` call to my-data.ts required teaching the mock a new method just to keep the
 * chain from throwing; nothing here would have caught it being OMITTED. The picker went from
 * ~9 options (the 8 old service categories + `maison`) to 105 (13 sectors + 91 subcategories +
 * `maison`) the moment the categories table stopped being flat, and this suite stayed green
 * throughout — the same shape of blind spot the file's own history warns about, just one clause
 * over.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'

const h = vi.hoisted(() => {
  const calls: { in: [string, string[]][]; select: string[]; order: string[]; is: [string, unknown][] } = {
    in: [],
    select: [],
    order: [],
    is: [],
  }
  const state: { result: { data: unknown; error: { message: string; code?: string } | null } } = {
    result: { data: [], error: null },
  }
  // Chainable builder that records what was asked for and resolves like PostgREST.
  const builder: Record<string, unknown> = {}
  builder.select = vi.fn((cols: string) => (h_push('select', cols), builder))
  builder.in = vi.fn((col: string, vals: string[]) => (calls.in.push([col, vals]), builder))
  // `.is()` is chained but NOT asserted on below — see the file-header note: this mock proves the
  // real risk (someone weakening `.in()`), not every clause. That gap is deliberate and logged in
  // docs/follow-ups.md, not accidental.
  builder.is = vi.fn((col: string, val: unknown) => (calls.is.push([col, val]), builder))
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
  h.calls.is.length = 0
  h.state.result = { data: [], error: null }
  h.from.mockClear()
})

describe('getCategories — the annonce picker is service-side', () => {
  it('filters on kind, and asks the categories table for it', async () => {
    await getCategories()
    expect(h.from).toHaveBeenCalledWith('categories')
    expect(h.calls.in).toHaveLength(1)
    expect(h.calls.in[0][0]).toBe('kind')
  })

  it("INCLUDES 'both' — an annonce picker that only asks for 'service' silently drops maison", async () => {
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
