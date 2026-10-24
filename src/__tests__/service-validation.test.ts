/**
 * Pure validation of a publishable service (src/lib/freelance/service-validation.ts) — the G4 publish
 * rules (H6 PR-4, docs/design/h6-pr4-deltas.md §2). This is the must-test layer per CLAUDE.md
 * (data-write input validation + normalization): « Publier mon service » runs it on the draft re-read
 * from the DB, and the DB gate (migration 20261024215730) enforces the same rules — so it is also pinned
 * against the wizard's step gates, field for field, including the code-point counting (ruling D28).
 * Framework-free, no DB.
 *
 * Run: npx vitest run src/__tests__/service-validation.test.ts
 */

import { describe, it, expect } from 'vitest'
import { validateServiceInput, type ServiceInput } from '@/lib/freelance/service-validation'
import { EMPTY_DRAFT, step5Passes, type DraftForm } from '@/lib/freelance/service-draft'

const DESCRIPTION = 'Je conçois votre boutique en ligne complète, du catalogue au paiement à la livraison, prête à vendre.'

function valid(over: Partial<ServiceInput> = {}): ServiceInput {
  return {
    title: 'Je crée votre boutique en ligne',
    categoryId: 'cat-123',
    subcategoryId: 'sub-456',
    shortDescription: 'Boutique en ligne complète, prête en 7 jours',
    description: DESCRIPTION,
    startingPrice: '150',
    priceUnit: 'fixed',
    deliveryTime: '3 jours',
    deliveryMode: 'remote',
    status: 'active',
    deliverables: ['Logo en PNG haute résolution', 'Fichier source vectoriel', '3 propositions initiales'],
    revisions: '2',
    tags: ['next-js', 'Google Analytics 4'],
    buyerBriefing: '',
    ...over,
  }
}

const errorOf = (over: Partial<ServiceInput>, field: string) => {
  const r = validateServiceInput(valid(over))
  return r.ok ? null : (r.errors as Record<string, string>)[field] ?? null
}

describe('validateServiceInput — valid input', () => {
  it('accepts a complete input and maps it to DB values', () => {
    const r = validateServiceInput(valid())
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.value).toEqual({
        title: 'Je crée votre boutique en ligne',
        category_id: 'cat-123',
        subcategory_id: 'sub-456',
        short_description: 'Boutique en ligne complète, prête en 7 jours',
        description: DESCRIPTION,
        starting_price_tnd: 150,
        price_unit: 'fixed',
        delivery_time: '3 jours',
        delivery_mode: 'remote',
        status: 'active',
        deliverables: ['Logo en PNG haute résolution', 'Fichier source vectoriel', '3 propositions initiales'],
        revisions_count: 2,
        tags: ['next-js', 'Google Analytics 4'],
        buyer_briefing: null,
      })
    }
  })

  it('trims text fields and rounds the price to 2 decimals', () => {
    const r = validateServiceInput(valid({ title: '  Je crée votre boutique  ', startingPrice: '10.999' }))
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.value.title).toBe('Je crée votre boutique')
      expect(r.value.starting_price_tnd).toBe(11)
    }
  })

  it('accepts the DB numeric as text (the publish path passes String(starting_price_tnd))', () => {
    const r = validateServiceInput(valid({ startingPrice: '1200.5' }))
    expect(r.ok && r.value.starting_price_tnd).toBe(1200.5)
  })
})

describe('validateServiceInput — status is a real field, not a default branch', () => {
  it('accepts active and hidden', () => {
    expect((() => { const r = validateServiceInput(valid({ status: 'active' })); return r.ok && r.value.status })())
      .toBe('active')
    expect((() => { const r = validateServiceInput(valid({ status: 'hidden' })); return r.ok && r.value.status })())
      .toBe('hidden')
  })

  it('rejects an unrecognized status instead of silently coercing it to active', () => {
    expect(errorOf({ status: 'whatever' }, 'status')).toBe('freelance.services.form.error.status_invalid')
  })

  it('rejects "draft" explicitly — only H6\'s autosave may ever set it, never a validated path', () => {
    expect(errorOf({ status: 'draft' }, 'status')).toBe('freelance.services.form.error.status_invalid')
  })

  it('rejects an empty status', () => {
    expect(errorOf({ status: '' }, 'status')).toBe('freelance.services.form.error.status_invalid')
  })
})

describe('validateServiceInput — G4 field rules', () => {
  it('title: required, 10–80', () => {
    expect(errorOf({ title: '   ' }, 'title')).toBe('freelance.services.form.error.required')
    expect(errorOf({ title: 'x'.repeat(9) }, 'title')).toBe('freelance.services.form.error.title_too_short')
    expect(errorOf({ title: 'x'.repeat(10) }, 'title')).toBeNull()
    expect(errorOf({ title: 'x'.repeat(80) }, 'title')).toBeNull()
    expect(errorOf({ title: 'x'.repeat(81) }, 'title')).toBe('freelance.services.form.error.title_too_long')
  })

  it('sector AND subcategory are required', () => {
    expect(errorOf({ categoryId: '' }, 'category')).toBe('freelance.services.form.error.required')
    expect(errorOf({ subcategoryId: '  ' }, 'subcategory')).toBe('freelance.services.form.error.required')
  })

  it('short description: required, ≤ 160', () => {
    expect(errorOf({ shortDescription: '' }, 'shortDescription')).toBe('freelance.services.form.error.required')
    expect(errorOf({ shortDescription: 'x'.repeat(160) }, 'shortDescription')).toBeNull()
    expect(errorOf({ shortDescription: 'x'.repeat(161) }, 'shortDescription')).toBe(
      'freelance.services.form.error.short_description_too_long',
    )
  })

  it('detailed description: required, 100–2000', () => {
    expect(errorOf({ description: '' }, 'description')).toBe('freelance.services.form.error.required')
    expect(errorOf({ description: 'x'.repeat(99) }, 'description')).toBe('freelance.services.form.error.description_too_short')
    expect(errorOf({ description: 'x'.repeat(100) }, 'description')).toBeNull()
    expect(errorOf({ description: 'x'.repeat(2001) }, 'description')).toBe('freelance.services.form.error.description_too_long')
  })

  it('price: required, > 0, within numeric(10,2)', () => {
    expect(errorOf({ startingPrice: '' }, 'price')).toBe('freelance.services.form.error.required')
    expect(errorOf({ startingPrice: '0' }, 'price')).toBe('freelance.services.form.error.price_invalid')
    expect(errorOf({ startingPrice: '-5' }, 'price')).toBe('freelance.services.form.error.price_invalid')
    expect(errorOf({ startingPrice: '100000000' }, 'price')).toBe('freelance.services.form.error.price_invalid')
  })

  it('unit: one of fixed / hour / day / month (ruling D13)', () => {
    for (const unit of ['fixed', 'hour', 'day', 'month']) expect(errorOf({ priceUnit: unit }, 'priceUnit')).toBeNull()
    expect(errorOf({ priceUnit: '' }, 'priceUnit')).toBe('freelance.services.form.error.required')
    expect(errorOf({ priceUnit: 'project' }, 'priceUnit')).toBe('freelance.services.form.error.required')
  })

  it('délai: optional (empty → NULL), ≤ 50', () => {
    const r = validateServiceInput(valid({ deliveryTime: '   ' }))
    expect(r.ok && r.value.delivery_time).toBe(null)
    expect(errorOf({ deliveryTime: 'x'.repeat(51) }, 'delivery')).toBe('freelance.services.form.error.delivery_too_long')
  })

  it('mode: remote / onsite / hybrid (the DB CHECK), required', () => {
    for (const mode of ['remote', 'onsite', 'hybrid']) expect(errorOf({ deliveryMode: mode }, 'deliveryMode')).toBeNull()
    expect(errorOf({ deliveryMode: '' }, 'deliveryMode')).toBe('freelance.services.form.error.required')
  })
})

describe('validateServiceInput — deliverables (« Ce qui est inclus »)', () => {
  it('trims, drops empties, and dedupes case-insensitively', () => {
    const r = validateServiceInput(valid({ deliverables: ['  Alpha file  ', '', 'alpha file', 'Beta export', 'Gamma assets'] }))
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.value.deliverables).toEqual(['Alpha file', 'Beta export', 'Gamma assets'])
  })

  it('flags fewer than 3 and more than 8', () => {
    expect(errorOf({ deliverables: ['Only one item here', ''] }, 'deliverables')).toBe(
      'freelance.services.form.deliverables.errors.min',
    )
    const nine = Array.from({ length: 9 }, (_, i) => `Deliverable number ${i}`)
    expect(errorOf({ deliverables: nine }, 'deliverables')).toBe('freelance.services.form.deliverables.errors.max')
  })

  it('flags an item outside 5–150 chars', () => {
    expect(errorOf({ deliverables: ['abc', 'Beta export here', 'Gamma assets here'] }, 'deliverables')).toBe(
      'freelance.services.form.deliverables.errors.length',
    )
    expect(errorOf({ deliverables: ['x'.repeat(151), 'Beta export here', 'Gamma assets here'] }, 'deliverables')).toBe(
      'freelance.services.form.deliverables.errors.length',
    )
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
      expect(errorOf({ revisions: bad }, 'revisions')).toBe('freelance.services.form.revisions.errors.range')
    }
  })
})

describe('validateServiceInput — tags (« Compétences »: pool ids and custom skills, H6 ruling D1)', () => {
  it('keeps case and any text, trims, drops blanks, dedupes case-insensitively', () => {
    const r = validateServiceInput(valid({ tags: ['  Google Analytics 4 ', 'google analytics 4', 'next-js', ' '] }))
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.value.tags).toEqual(['Google Analytics 4', 'next-js'])
  })

  it('accepts 1 and 5, flags 0 and 6', () => {
    expect(errorOf({ tags: ['react'] }, 'tags')).toBeNull()
    expect(errorOf({ tags: ['a', 'b', 'c', 'd', 'e'] }, 'tags')).toBeNull()
    expect(errorOf({ tags: [] }, 'tags')).toBe('freelance.services.form.tags.errors.min')
    expect(errorOf({ tags: ['a', 'b', 'c', 'd', 'e', 'f'] }, 'tags')).toBe('freelance.services.form.tags.errors.max')
  })

  it('flags a skill over 50 characters', () => {
    expect(errorOf({ tags: ['x'.repeat(51)] }, 'tags')).toBe('freelance.services.form.tags.errors.format')
    expect(errorOf({ tags: ['x'.repeat(50)] }, 'tags')).toBeNull()
  })
})

describe('validateServiceInput — buyer briefing', () => {
  it('treats empty as null and trims when present', () => {
    expect((() => { const r = validateServiceInput(valid({ buyerBriefing: '   ' })); return r.ok && r.value.buyer_briefing })()).toBe(null)
    const r = validateServiceInput(valid({ buyerBriefing: '  Bring your brand guide.  ' }))
    expect(r.ok && r.value.buyer_briefing).toBe('Bring your brand guide.')
  })

  it('flags over 1000 chars (the DB CHECK; H6 caps itself at 500)', () => {
    expect(errorOf({ buyerBriefing: 'x'.repeat(1001) }, 'briefing')).toBe('freelance.services.form.briefing.errors.max')
  })
})

describe('validateServiceInput — lengths are code points, like the DB char_length (ruling D28)', () => {
  it('counts an emoji once: 5 emoji + 5 letters is a 10-character title', () => {
    const title = '😀😀😀😀😀 abcd' // 10 code points, 15 UTF-16 units
    expect(Array.from(title).length).toBe(10)
    expect(errorOf({ title }, 'title')).toBeNull()
    expect(errorOf({ title: '😀😀😀😀😀😀😀😀😀' }, 'title')).toBe('freelance.services.form.error.title_too_short') // 9 cp, 18 units
  })

  it('80 emoji is within the title cap (160 UTF-16 units)', () => {
    expect(errorOf({ title: '😀'.repeat(80) }, 'title')).toBeNull()
  })
})

describe('validateServiceInput — multi-error', () => {
  it('collects every empty field at once (délai, briefing and revisions stay valid when empty)', () => {
    const r = validateServiceInput({
      title: '', categoryId: '', subcategoryId: '', shortDescription: '', description: '', startingPrice: '',
      priceUnit: '', deliveryTime: '', deliveryMode: '', status: '', deliverables: [], revisions: '', tags: [],
      buyerBriefing: '',
    })
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(Object.keys(r.errors).sort()).toEqual(
        ['category', 'deliverables', 'deliveryMode', 'description', 'price', 'priceUnit', 'shortDescription', 'status', 'subcategory', 'tags', 'title'],
      )
    }
  })
})

// ── The wizard's step gates and this validator are two copies of one rule set (the DB is the third).
// A form that passes steps 1–4 must pass the publish, and a form one gate refuses must be refused here
// too — otherwise the récap would flag a row whose step shows no error, or « Publier » would be enabled
// for a draft the server then refuses. Mapped the way publishServiceDraftAction maps a saved row.

const COMPLETE: DraftForm = {
  ...EMPTY_DRAFT,
  title: 'Je crée votre boutique en ligne',
  sectorId: 'developpement-web-mobile',
  subcategoryId: 'e-commerce',
  skills: ['react', 'Google Analytics 4'],
  shortDescription: 'Boutique en ligne complète, prête en 7 jours',
  description: DESCRIPTION,
  price: '800',
  priceUnit: 'month',
  deliveryTime: '',
  deliverablesText: 'Design de la boutique\nCatalogue de 20 produits\nFormation de 1 heure',
  deliveryMode: 'hybrid',
  buyerBriefing: '',
}

function asInput(f: DraftForm): ServiceInput {
  return valid({
    title: f.title,
    categoryId: f.sectorId,
    subcategoryId: f.subcategoryId,
    tags: f.skills,
    shortDescription: f.shortDescription,
    description: f.description,
    startingPrice: f.price,
    priceUnit: f.priceUnit,
    deliveryTime: f.deliveryTime,
    deliverables: f.deliverablesText.split('\n'),
    deliveryMode: f.deliveryMode,
    buyerBriefing: f.buyerBriefing,
  })
}

describe('step gates ⇔ validateServiceInput', () => {
  const cases: [string, Partial<DraftForm>][] = [
    ['complete', {}],
    ['title 9', { title: 'x'.repeat(9) }],
    ['title 10', { title: 'x'.repeat(10) }],
    ['title 80', { title: 'x'.repeat(80) }],
    ['title of 10 code points with emoji', { title: '😀😀😀😀😀 abcd' }],
    ['title of 9 emoji (18 UTF-16 units)', { title: '😀'.repeat(9) }],
    ['no skill', { skills: [] }],
    ['5 skills', { skills: ['a', 'b', 'c', 'd', 'e'] }],
    ['short description empty', { shortDescription: '  ' }],
    ['short description 160', { shortDescription: 'x'.repeat(160) }],
    ['description 99', { description: 'x'.repeat(99) }],
    ['description of 100 emoji', { description: '😀'.repeat(100) }],
    ['description of 99 emoji', { description: '😀'.repeat(99) }],
    ['price empty', { price: '' }],
    ['price 0', { price: '0' }],
    ['délai 50', { deliveryTime: 'x'.repeat(50) }],
    ['2 deliverables', { deliverablesText: 'Design de la boutique\nCatalogue complet' }],
    ['a 4-char deliverable', { deliverablesText: 'Logo\nCatalogue complet\nFormation incluse' }],
    ['8 deliverables', { deliverablesText: Array.from({ length: 8 }, (_, i) => `Élément numéro ${i}`).join('\n') }],
    ['briefing 500', { buyerBriefing: 'x'.repeat(500) }],
  ]

  for (const [name, patch] of cases) {
    it(name, () => {
      const form = { ...COMPLETE, ...patch }
      expect(validateServiceInput(asInput(form)).ok).toBe(step5Passes(form))
    })
  }
})
