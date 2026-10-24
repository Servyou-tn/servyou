/**
 * H6 silent resume — getResumableDraft (src/lib/freelance/service-draft-query.ts), Supabase mocked.
 * Founder ruling D7: newest draft, first step it doesn't pass; more than one draft is logged; a
 * failed query throws (never read as "no draft", which would let the first autosave insert a
 * duplicate); a deleted category resumes on step 1 without throwing.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getResumableDraft } from '@/lib/freelance/service-draft-query'

type Result = { data: unknown; error: unknown }

function client(drafts: Result, categories: Result = { data: [], error: null }) {
  const calls: Array<[string, string, unknown[]]> = []
  const builder = (table: string) => {
    const b: Record<string, unknown> = {}
    for (const op of ['select', 'eq', 'in', 'order', 'limit']) {
      b[op] = (...args: unknown[]) => {
        calls.push([table, op, args])
        return b
      }
    }
    b.then = (resolve: (v: unknown) => void) => Promise.resolve(table === 'categories' ? categories : drafts).then(resolve)
    return b
  }
  return { supabase: { from: builder } as unknown as SupabaseClient, calls }
}

const ROW = {
  id: 'd-new',
  title: 'Je crée votre boutique',
  category_id: 'uuid-sector',
  subcategory_id: 'uuid-sub',
  tags: ['react'],
  short_description: null,
  description: null,
  starting_price_tnd: null,
  price_unit: null,
  delivery_time: null,
  deliverables: [],
  delivery_mode: null,
  buyer_briefing: null,
}
const CATS = {
  data: [
    { id: 'uuid-sector', slug: 'developpement-web-mobile' },
    { id: 'uuid-sub', slug: 'e-commerce' },
  ],
  error: null,
}

let warn: ReturnType<typeof vi.spyOn>
let error: ReturnType<typeof vi.spyOn>
beforeEach(() => {
  warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
  error = vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => {
  warn.mockRestore()
  error.mockRestore()
})

describe('getResumableDraft', () => {
  it('returns null when the freelancer has no draft', async () => {
    const { supabase } = client({ data: [], error: null })
    expect(await getResumableDraft(supabase, 'fp-1')).toBeNull()
  })

  it("queries only this freelancer's drafts, newest first", async () => {
    const { supabase, calls } = client({ data: [ROW], error: null }, CATS)
    await getResumableDraft(supabase, 'fp-1')
    expect(calls).toContainEqual(['service_listings', 'eq', ['freelancer_profile_id', 'fp-1']])
    expect(calls).toContainEqual(['service_listings', 'eq', ['status', 'draft']])
    expect(calls).toContainEqual(['service_listings', 'order', ['updated_at', { ascending: false }]])
  })

  it('resumes a step-1-complete draft on step 2 with slugs mapped back', async () => {
    const { supabase } = client({ data: [ROW], error: null }, CATS)
    const draft = await getResumableDraft(supabase, 'fp-1')
    expect(draft).toMatchObject({
      id: 'd-new',
      step: 2,
      form: { sectorId: 'developpement-web-mobile', subcategoryId: 'e-commerce', skills: ['react'] },
    })
  })

  it('selects the step 3–4 columns and resumes a step-2-complete draft on step 3', async () => {
    const { supabase, calls } = client(
      { data: [{ ...ROW, short_description: 'Boutique prête', description: 'x'.repeat(100) }], error: null },
      CATS,
    )
    const draft = await getResumableDraft(supabase, 'fp-1')
    const select = calls.find(([table, op]) => table === 'service_listings' && op === 'select')
    for (const column of ['starting_price_tnd', 'price_unit', 'delivery_time', 'deliverables', 'delivery_mode', 'buyer_briefing']) {
      expect(String(select?.[2][0])).toContain(column)
    }
    expect(draft).toMatchObject({ step: 3, form: { priceUnit: 'fixed', deliveryMode: 'remote' } })
  })

  it('takes the newest of two drafts and logs both ids', async () => {
    const { supabase } = client({ data: [ROW, { ...ROW, id: 'd-old' }], error: null }, CATS)
    const draft = await getResumableDraft(supabase, 'fp-1')
    expect(draft?.id).toBe('d-new')
    expect(warn).toHaveBeenCalledTimes(1)
    expect(String(warn.mock.calls[0][0])).toContain('d-new')
    expect(String(warn.mock.calls[0][0])).toContain('d-old')
  })

  it('resumes on step 1 when the category was deleted since the save (FK set it NULL)', async () => {
    const { supabase, calls } = client({ data: [{ ...ROW, category_id: null, subcategory_id: null }], error: null })
    const draft = await getResumableDraft(supabase, 'fp-1')
    expect(draft).toMatchObject({ step: 1, form: { sectorId: '', subcategoryId: '' } })
    expect(calls.some(([table]) => table === 'categories')).toBe(false)
  })

  it('throws when the draft query fails — never reads it as "no draft"', async () => {
    const { supabase } = client({ data: null, error: { message: 'boom', code: 'XX000', details: null } })
    await expect(getResumableDraft(supabase, 'fp-1')).rejects.toThrow('service draft fetch failed')
  })

  it('throws when the category lookup fails', async () => {
    const { supabase } = client({ data: [ROW], error: null }, { data: null, error: { message: 'boom', code: 'XX000', details: null } })
    await expect(getResumableDraft(supabase, 'fp-1')).rejects.toThrow('service draft category lookup failed')
  })
})
