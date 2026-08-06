/**
 * Unit tests for `getProductCategories()` — the G6 « Ajouter un produit » category picker.
 *
 * The exact mirror of `mission-category-picker.test.ts`, and for the same reason. `categories` is
 * ONE FLAT TABLE shared by products, service_listings, job_posts and shop_categories; `kind`
 * (migration 20260804132447) is the only thing separating them. Without the filter this picker
 * would offer a shop owner "Montage Vidéo" and "Développement" for a physical product — the mirror
 * image of the defect PR #112 closed on the mission side.
 *
 * The regression these are really aimed at is narrower than "does it filter". It is someone later
 * simplifying `.in('kind', ['product','both'])` to `.eq('kind','product')`, which reads as
 * equivalent and silently drops `maison` — the one row carrying 'both'. That change would look
 * correct in review and quietly remove a category from the picker.
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
  const builder: Record<string, unknown> = {}
  builder.select = vi.fn((cols: string) => (calls.select.push(cols), builder))
  builder.in = vi.fn((col: string, vals: string[]) => (calls.in.push([col, vals]), builder))
  builder.order = vi.fn((col: string) => (calls.order.push(col), Promise.resolve(state.result)))
  const from = vi.fn(() => builder)
  return { calls, state, from }
})

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({ from: h.from })),
}))

import { getProductCategories } from '@/lib/marche/product-categories'

beforeEach(() => {
  h.calls.in.length = 0
  h.calls.select.length = 0
  h.calls.order.length = 0
  h.state.result = { data: [], error: null }
  h.from.mockClear()
})

describe('getProductCategories — the product picker is product-side', () => {
  it('filters on kind, and asks the categories table for it', async () => {
    await getProductCategories()
    expect(h.from).toHaveBeenCalledWith('categories')
    expect(h.calls.in).toHaveLength(1)
    expect(h.calls.in[0][0]).toBe('kind')
  })

  it("INCLUDES 'both' — a product picker that only asks for 'product' silently drops maison", async () => {
    await getProductCategories()
    const [, values] = h.calls.in[0]
    expect(values).toContain('both')
    expect(values).toContain('product')
  })

  it("never asks for 'service' — that is the defect this filter exists to prevent", async () => {
    await getProductCategories()
    const [, values] = h.calls.in[0]
    expect(values).not.toContain('service')
  })

  it('selects name_ar as well as name_fr — the form is FR + AR at parity', async () => {
    // Dropping name_ar from the select is a silent regression: the option would fall back to the
    // French name and the Arabic form would render French categories with no error anywhere.
    await getProductCategories()
    expect(h.calls.select[0]).toContain('name_ar')
    expect(h.calls.select[0]).toContain('name_fr')
  })

  it('returns an empty list rather than throwing when the query errors', async () => {
    h.state.result = { data: null, error: { message: 'boom', code: '42703' } }
    await expect(getProductCategories()).resolves.toEqual([])
  })
})
