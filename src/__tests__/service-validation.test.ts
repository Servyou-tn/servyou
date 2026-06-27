/**
 * Pure validation for the add/edit service form (src/lib/freelance/service-validation.ts). This is
 * the must-test layer per CLAUDE.md (data-write input validation + normalization): the server action
 * and the form both run it. Covers the original fields and PR-F2.3's world-class fields
 * (deliverables, revisions, tags, buyer briefing) — including the normalization (trim / lowercase /
 * dedupe / drop-empty) the form relies on. Framework-free, no DB.
 *
 * Run: npx vitest run src/__tests__/service-validation.test.ts
 */

import { describe, it, expect } from 'vitest'
import { validateServiceInput, type ServiceInput } from '@/lib/freelance/service-validation'

function valid(over: Partial<ServiceInput> = {}): ServiceInput {
  return {
    title: 'Logo design',
    categoryId: 'cat-123',
    description: 'A clean, memorable logo for your brand.',
    startingPrice: '150',
    deliveryTime: '3 jours',
    status: 'active',
    deliverables: ['Logo en PNG haute résolution', 'Fichier source vectoriel', '3 propositions initiales'],
    revisions: '2',
    tags: ['photo', 'ecommerce', 'retouche'],
    buyerBriefing: '',
    ...over,
  }
}

describe('validateServiceInput — valid input', () => {
  it('accepts a complete input and maps to DB values', () => {
    const r = validateServiceInput(valid())
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.value).toEqual({
        title: 'Logo design',
        category_id: 'cat-123',
        description: 'A clean, memorable logo for your brand.',
        starting_price_tnd: 150,
        delivery_time: '3 jours',
        status: 'active',
        deliverables: ['Logo en PNG haute résolution', 'Fichier source vectoriel', '3 propositions initiales'],
        revisions_count: 2,
        tags: ['photo', 'ecommerce', 'retouche'],
        buyer_briefing: null,
      })
    }
  })

  it('trims/rounds and normalizes status', () => {
    const r = validateServiceInput(valid({ title: '  Logo  ', startingPrice: '10.999', status: 'whatever' }))
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.value.title).toBe('Logo')
      expect(r.value.starting_price_tnd).toBe(11)
      expect(r.value.status).toBe('active')
    }
  })
})

describe('validateServiceInput — original-field errors', () => {
  it('flags missing/too-long/invalid base fields', () => {
    expect((() => { const r = validateServiceInput(valid({ title: '   ' })); return !r.ok && r.errors.title })())
      .toBe('freelance.services.form.error.required')
    expect((() => { const r = validateServiceInput(valid({ title: 'x'.repeat(101) })); return !r.ok && r.errors.title })())
      .toBe('freelance.services.form.error.title_too_long')
    expect((() => { const r = validateServiceInput(valid({ categoryId: '' })); return !r.ok && r.errors.category })())
      .toBe('freelance.services.form.error.required')
    expect((() => { const r = validateServiceInput(valid({ startingPrice: '-5' })); return !r.ok && r.errors.price })())
      .toBe('freelance.services.form.error.price_invalid')
    expect((() => { const r = validateServiceInput(valid({ startingPrice: '100000000' })); return !r.ok && r.errors.price })())
      .toBe('freelance.services.form.error.price_invalid')
    expect((() => { const r = validateServiceInput(valid({ deliveryTime: '' })); return !r.ok && r.errors.delivery })())
      .toBe('freelance.services.form.error.required')
  })
})

describe('validateServiceInput — deliverables', () => {
  it('trims, drops empties, and dedupes case-insensitively', () => {
    const r = validateServiceInput(valid({ deliverables: ['  Alpha file  ', '', 'alpha file', 'Beta export', 'Gamma assets'] }))
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.value.deliverables).toEqual(['Alpha file', 'Beta export', 'Gamma assets'])
  })

  it('flags fewer than 3 (the backfilled-rows nudge)', () => {
    const r = validateServiceInput(valid({ deliverables: ['Only one item here', ''] }))
    expect(!r.ok && r.errors.deliverables).toBe('freelance.services.form.deliverables.errors.min')
  })

  it('flags more than 8', () => {
    const nine = Array.from({ length: 9 }, (_, i) => `Deliverable number ${i}`)
    const r = validateServiceInput(valid({ deliverables: nine }))
    expect(!r.ok && r.errors.deliverables).toBe('freelance.services.form.deliverables.errors.max')
  })

  it('flags an item outside 5–150 chars', () => {
    const short = validateServiceInput(valid({ deliverables: ['abc', 'Beta export here', 'Gamma assets here'] }))
    expect(!short.ok && short.errors.deliverables).toBe('freelance.services.form.deliverables.errors.length')
    const long = validateServiceInput(valid({ deliverables: ['x'.repeat(151), 'Beta export here', 'Gamma assets here'] }))
    expect(!long.ok && long.errors.deliverables).toBe('freelance.services.form.deliverables.errors.length')
  })
})

describe('validateServiceInput — revisions', () => {
  it('defaults to 1 when empty, accepts 0 and 10', () => {
    expect((() => { const r = validateServiceInput(valid({ revisions: '' })); return r.ok && r.value.revisions_count })()).toBe(1)
    expect((() => { const r = validateServiceInput(valid({ revisions: '0' })); return r.ok && r.value.revisions_count })()).toBe(0)
    expect((() => { const r = validateServiceInput(valid({ revisions: '10' })); return r.ok && r.value.revisions_count })()).toBe(10)
  })

  it('rejects out-of-range and non-integers', () => {
    for (const bad of ['11', '-1', '2.5', 'abc']) {
      const r = validateServiceInput(valid({ revisions: bad }))
      expect(!r.ok && r.errors.revisions).toBe('freelance.services.form.revisions.errors.range')
    }
  })
})

describe('validateServiceInput — tags', () => {
  it('lowercases, trims, and dedupes', () => {
    const r = validateServiceInput(valid({ tags: ['  Photo ', 'PHOTO', 'ecommerce', 'retouche'] }))
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.value.tags).toEqual(['photo', 'ecommerce', 'retouche'])
  })

  it('flags fewer than 3 and more than 5', () => {
    expect((() => { const r = validateServiceInput(valid({ tags: ['a1', 'b2'] })); return !r.ok && r.errors.tags })())
      .toBe('freelance.services.form.tags.errors.min')
    expect((() => { const r = validateServiceInput(valid({ tags: ['t1', 't2', 't3', 't4', 't5', 't6'] })); return !r.ok && r.errors.tags })())
      .toBe('freelance.services.form.tags.errors.max')
  })

  it('flags a tag with spaces or special characters', () => {
    const r = validateServiceInput(valid({ tags: ['bad tag', 'ecommerce', 'retouche'] }))
    expect(!r.ok && r.errors.tags).toBe('freelance.services.form.tags.errors.format')
    const bang = validateServiceInput(valid({ tags: ['photo!', 'ecommerce', 'retouche'] }))
    expect(!bang.ok && bang.errors.tags).toBe('freelance.services.form.tags.errors.format')
  })
})

describe('validateServiceInput — buyer briefing', () => {
  it('treats empty as null and trims when present', () => {
    expect((() => { const r = validateServiceInput(valid({ buyerBriefing: '   ' })); return r.ok && r.value.buyer_briefing })()).toBe(null)
    const r = validateServiceInput(valid({ buyerBriefing: '  Bring your brand guide.  ' }))
    expect(r.ok && r.value.buyer_briefing).toBe('Bring your brand guide.')
  })

  it('flags over 1000 chars', () => {
    const r = validateServiceInput(valid({ buyerBriefing: 'x'.repeat(1001) }))
    expect(!r.ok && r.errors.briefing).toBe('freelance.services.form.briefing.errors.max')
  })
})

describe('validateServiceInput — multi-error', () => {
  it('collects every empty/short field at once (briefing + revisions stay valid when empty)', () => {
    const r = validateServiceInput({
      title: '', categoryId: '', description: '', startingPrice: '', deliveryTime: '',
      status: '', deliverables: [], revisions: '', tags: [], buyerBriefing: '',
    })
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(Object.keys(r.errors).sort()).toEqual(
        ['category', 'deliverables', 'delivery', 'description', 'price', 'tags', 'title'],
      )
    }
  })
})
