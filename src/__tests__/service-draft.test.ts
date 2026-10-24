/**
 * H6 « Créer un service » — the pure draft model (src/lib/freelance/service-draft.ts): the step
 * gates « Suivant » checks (founder rulings D9, D21), the resume rule (D7), skill id ⇄ label mapping
 * (D1), the price parser (D18), the « Ce qui est inclus » split (D16) and the saved-row → form mapping
 * that must survive a deleted or unknown category and a PR-2 draft with no step-3/4 data (D22).
 * No Supabase, no DOM.
 */

import { describe, it, expect } from 'vitest'
import {
  BUILT_STEPS,
  DRAFT_LIMITS,
  DraftInputSchema,
  EMPTY_DRAFT,
  draftDeliverables,
  draftRowToForm,
  normalizeSkill,
  normalizeSkills,
  parsePrice,
  resumeStep,
  skillLabel,
  splitDeliverables,
  step1Errors,
  step1Passes,
  step2Errors,
  step2Passes,
  step3Errors,
  step3Passes,
  step4Errors,
  step4Passes,
  type DraftForm,
  type DraftRow,
} from '@/lib/freelance/service-draft'

const STEP1_OK: DraftForm = {
  ...EMPTY_DRAFT,
  title: 'Je crée votre boutique',
  sectorId: 'developpement-web-mobile',
  subcategoryId: 'e-commerce',
  skills: ['react'],
}
const STEP2_OK: DraftForm = { ...STEP1_OK, shortDescription: 'Boutique prête en 7 jours', description: 'x'.repeat(100) }
const STEP3_OK: DraftForm = { ...STEP2_OK, price: '800' }
const COMPLETE: DraftForm = { ...STEP3_OK, deliverablesText: 'Design UI iOS/Android\n3 écrans\nFichiers sources' }

describe('step 1 gate', () => {
  it('passes with a 10–80 char title, a valid sector/subcategory pair and 1–5 skills', () => {
    expect(step1Passes(STEP1_OK)).toBe(true)
  })

  it('reports each missing field as an i18n key, never text', () => {
    expect(step1Errors(EMPTY_DRAFT)).toEqual({
      title: { key: 'service.wizard.error.title_required' },
      sector: { key: 'service.wizard.error.category_required' },
      subcategory: { key: 'service.wizard.error.subcategory_required' },
      skills: { key: 'service.wizard.error.skills_required' },
    })
  })

  it('measures the title trimmed: 9 visible chars fail, 10 pass', () => {
    expect(step1Errors({ ...STEP1_OK, title: '  123456789  ' }).title).toEqual({
      key: 'service.wizard.error.title_min',
      vars: { min: 10 },
    })
    expect(step1Errors({ ...STEP1_OK, title: '1234567890' }).title).toBeUndefined()
  })

  it('rejects a subcategory that belongs to another sector', () => {
    expect(step1Errors({ ...STEP1_OK, subcategoryId: 'logo-identite-visuelle' }).subcategory).toBeDefined()
  })

  it('rejects the DB-only `maison` sector (not in the TS taxonomy)', () => {
    expect(step1Errors({ ...STEP1_OK, sectorId: 'maison', subcategoryId: '' }).sector).toBeDefined()
  })

  it('caps skills at 5', () => {
    expect(step1Errors({ ...STEP1_OK, skills: ['a', 'b', 'c', 'd', 'e', 'f'] }).skills?.key).toBe('service.wizard.error.skills_max')
  })
})

describe('step 2 gate', () => {
  it('needs a non-empty short description and a 100–2000 char detailed one', () => {
    expect(step2Passes(COMPLETE)).toBe(true)
    expect(step2Errors({ ...COMPLETE, shortDescription: '   ' }).shortDescription?.key).toBe('service.wizard.error.short_required')
    expect(step2Errors({ ...COMPLETE, description: 'x'.repeat(99) }).description).toEqual({
      key: 'service.wizard.error.description_min',
      vars: { min: 100 },
    })
  })
})

describe('parsePrice (ruling D18)', () => {
  it('reads FR and EN decimals, and spaces (incl. U+00A0 / U+202F) as thousands separators', () => {
    expect(parsePrice('800')).toBe(800)
    expect(parsePrice(' 800,50 ')).toBe(800.5)
    expect(parsePrice('800.5')).toBe(800.5)
    expect(parsePrice('1 200')).toBe(1200)
    expect(parsePrice('1 200,75')).toBe(1200.75)
    expect(parsePrice('1 200')).toBe(1200)
  })

  it('refuses anything that is not a positive amount with at most 2 decimals, within numeric(10,2)', () => {
    for (const bad of ['', '   ', '0', '0,00', '-5', '800,505', '8e2', '1.200,50', 'abc', '800 TND', '100000000']) {
      expect(parsePrice(bad), bad).toBeNull()
    }
    expect(parsePrice('99999999,99')).toBe(DRAFT_LIMITS.priceMax)
  })
})

describe('« Ce qui est inclus » split (ruling D16)', () => {
  it('one item per line: trimmed, blank lines dropped, duplicates (any case) dropped, order kept', () => {
    expect(splitDeliverables('  Logo HD \n\n\r\nlogo hd\nFichiers sources\n   \n')).toEqual(['Logo HD', 'Fichiers sources'])
  })

  it('a draft save keeps the first 8 (DB CHECK cardinality <= 8); the split itself is uncapped', () => {
    const nine = Array.from({ length: 9 }, (_, i) => `Élément ${i + 1}`).join('\n')
    expect(splitDeliverables(nine)).toHaveLength(9)
    expect(draftDeliverables(nine)).toEqual(Array.from({ length: 8 }, (_, i) => `Élément ${i + 1}`))
  })
})

describe('step 3 gate « Tarif »', () => {
  it('passes with a valid price; the unit is preselected (D22) and the délai is optional', () => {
    expect(step3Passes(STEP3_OK)).toBe(true)
    expect(step3Passes({ ...STEP3_OK, deliveryTime: '5-7 jours' })).toBe(true)
  })

  it('reports a missing, then an unparseable price, as keys', () => {
    expect(step3Errors(STEP2_OK).price).toEqual({ key: 'service.wizard.error.price_required' })
    expect(step3Errors({ ...STEP2_OK, price: '800,505' }).price).toEqual({ key: 'service.wizard.error.price_invalid' })
    expect(step3Errors({ ...STEP2_OK, price: '0' }).price).toEqual({ key: 'service.wizard.error.price_invalid' })
  })

  it('caps the délai at 50 characters, trimmed', () => {
    expect(step3Errors({ ...STEP3_OK, deliveryTime: `  ${'x'.repeat(50)}  ` }).deliveryTime).toBeUndefined()
    expect(step3Errors({ ...STEP3_OK, deliveryTime: 'x'.repeat(51) }).deliveryTime).toEqual({
      key: 'service.wizard.error.delivery_time_max',
      vars: { max: 50 },
    })
  })

  it('refuses a unit outside the four ruled values (« Par projet » is not one of them)', () => {
    expect(step3Errors({ ...STEP3_OK, priceUnit: 'project' as DraftForm['priceUnit'] }).priceUnit).toEqual({
      key: 'service.wizard.error.unit_required',
    })
  })
})

describe('step 4 gate « Prestation » — validateServiceInput\'s deliverables rule', () => {
  it('passes with 3 items of 5–150 chars; the mode is preselected (D22) and the briefing optional', () => {
    expect(step4Passes(COMPLETE)).toBe(true)
  })

  it('needs at least 3 distinct items', () => {
    expect(step4Errors({ ...COMPLETE, deliverablesText: 'Design UI\ndesign ui\n\nFichiers sources' }).deliverables).toEqual({
      key: 'service.wizard.error.deliverables_min',
      vars: { min: 3 },
    })
    expect(step4Errors(STEP3_OK).deliverables?.key).toBe('service.wizard.error.deliverables_min')
  })

  it('checks each item is 5–150 chars before counting (the validator\'s order)', () => {
    expect(step4Errors({ ...COMPLETE, deliverablesText: 'Logo' }).deliverables).toEqual({
      key: 'service.wizard.error.deliverable_length',
      vars: { min: 5, max: 150 },
    })
    expect(step4Errors({ ...COMPLETE, deliverablesText: `${COMPLETE.deliverablesText}\n${'x'.repeat(151)}` }).deliverables?.key).toBe(
      'service.wizard.error.deliverable_length',
    )
  })

  it('refuses a 9th item', () => {
    const nine = Array.from({ length: 9 }, (_, i) => `Élément ${i + 1}`).join('\n')
    expect(step4Errors({ ...COMPLETE, deliverablesText: nine }).deliverables).toEqual({
      key: 'service.wizard.error.deliverables_max',
      vars: { max: 8 },
    })
  })

  it('refuses `onsite` (H6 writes remote or hybrid only) and a briefing past 500', () => {
    expect(step4Errors({ ...COMPLETE, deliveryMode: 'onsite' as DraftForm['deliveryMode'] }).deliveryMode?.key).toBe(
      'service.wizard.error.mode_required',
    )
    expect(step4Errors({ ...COMPLETE, buyerBriefing: 'x'.repeat(501) }).buyerBriefing).toEqual({
      key: 'service.wizard.error.briefing_max',
      vars: { max: 500 },
    })
  })
})

describe('resumeStep (founder ruling D7)', () => {
  it('opens a draft that fails step 1 on step 1', () => {
    expect(resumeStep({ ...STEP1_OK, skills: [] })).toBe(1)
  })
  it('opens a draft that passes step 1 on step 2', () => {
    expect(resumeStep(STEP1_OK)).toBe(2)
  })
  it('opens a draft that passes steps 1–2 on step 3, and 1–3 on step 4', () => {
    expect(resumeStep(STEP2_OK)).toBe(3)
    expect(resumeStep(STEP3_OK)).toBe(4)
  })
  it('never lands past the last built step (4), even when every gate passes', () => {
    expect(BUILT_STEPS).toBe(4)
    expect(resumeStep(COMPLETE)).toBe(4)
  })
})

describe('skills (founder ruling D1)', () => {
  it('stores a typed pool label as its id, in French or Arabic, any case', () => {
    expect(normalizeSkill('React')).toBe('react')
    expect(normalizeSkill('  next.JS ')).toBe('next-js')
    expect(normalizeSkill('شعار')).toBe('logo')
  })

  it('keeps an existing pool id as is (the server re-normalizes what the client already mapped)', () => {
    expect(normalizeSkill('next-js')).toBe('next-js')
    expect(normalizeSkill('identite-de-marque')).toBe('identite-de-marque')
  })

  it('resolves a label two skills share from the active sector first', () => {
    expect(normalizeSkill('الكتابة الإعلانية', 'redaction-contenu')).toBe('copywriting')
    expect(normalizeSkill('الكتابة الإعلانية', 'marketing-digital')).toBe('copywriting-publicitaire')
  })

  it('stores a custom skill as typed (trimmed)', () => {
    expect(normalizeSkill('  Tricot artisanal ')).toBe('Tricot artisanal')
  })

  it('resolves an id from ANY sector pool, in the viewer language', () => {
    // `logo` lives in design-graphique-logo's pool; resolution does not depend on the active sector.
    expect(skillLabel('logo', 'fr')).toBe('logo')
    expect(skillLabel('logo', 'ar')).toBe('شعار')
    expect(skillLabel('identite-de-marque', 'ar')).toBe('هوية العلامة التجارية')
  })

  it('shows a custom skill as stored', () => {
    expect(skillLabel('Tricot artisanal', 'ar')).toBe('Tricot artisanal')
  })

  it('normalizeSkills drops duplicates (label vs id), blanks, and anything past 5', () => {
    expect(normalizeSkills(['React', 'react', ' ', 'Next.js', 'Vue', 'PHP', 'Laravel', 'Git'])).toEqual([
      'react',
      'next-js',
      'vue',
      'php',
      'laravel',
    ])
  })
})

describe('draftRowToForm', () => {
  const row: DraftRow = {
    id: 'd1',
    title: 'Mon service',
    category_id: 'uuid-sector',
    subcategory_id: 'uuid-sub',
    tags: ['react', 'Tricot artisanal'],
    short_description: null,
    description: null,
    starting_price_tnd: null,
    price_unit: null,
    delivery_time: null,
    deliverables: [],
    delivery_mode: null,
    buyer_briefing: null,
  }
  const slugs = new Map([
    ['uuid-sector', 'developpement-web-mobile'],
    ['uuid-sub', 'e-commerce'],
  ])

  it('maps uuids back to taxonomy slugs, nulls to empty strings, and a PR-2 draft to the drawn defaults', () => {
    expect(draftRowToForm(row, slugs)).toEqual({
      title: 'Mon service',
      sectorId: 'developpement-web-mobile',
      subcategoryId: 'e-commerce',
      skills: ['react', 'Tricot artisanal'],
      shortDescription: '',
      description: '',
      price: '',
      priceUnit: 'fixed',
      deliveryTime: '',
      deliverablesText: '',
      deliveryMode: 'remote',
      buyerBriefing: '',
    })
  })

  it('maps the step 3–4 columns back: price as text, deliverables one per line', () => {
    const form = draftRowToForm(
      {
        ...row,
        starting_price_tnd: 800.5,
        price_unit: 'month',
        delivery_time: '2 semaines',
        deliverables: ['Logo HD', 'Charte'],
        delivery_mode: 'hybrid',
        buyer_briefing: 'Votre logo',
      },
      slugs,
    )
    expect(form).toMatchObject({
      price: '800.5',
      priceUnit: 'month',
      deliveryTime: '2 semaines',
      deliverablesText: 'Logo HD\nCharte',
      deliveryMode: 'hybrid',
      buyerBriefing: 'Votre logo',
    })
    expect(draftRowToForm({ ...row, starting_price_tnd: '120.00' }, slugs).price).toBe('120')
  })

  it('reads an unknown unit as Fixe and `onsite` as « Sur site possible » (hybrid)', () => {
    expect(draftRowToForm({ ...row, price_unit: 'project' }, slugs).priceUnit).toBe('fixed')
    expect(draftRowToForm({ ...row, delivery_mode: 'onsite' }, slugs).deliveryMode).toBe('hybrid')
  })

  it('reads a deleted category (NULL after ON DELETE SET NULL) as not chosen', () => {
    const form = draftRowToForm({ ...row, category_id: null, subcategory_id: null }, slugs)
    expect(form.sectorId).toBe('')
    expect(form.subcategoryId).toBe('')
    expect(resumeStep(form)).toBe(1)
  })

  it('reads a slug the TS taxonomy does not know (e.g. `maison`) as not chosen', () => {
    const form = draftRowToForm(row, new Map([['uuid-sector', 'maison'], ['uuid-sub', 'e-commerce']]))
    expect(form.sectorId).toBe('')
    expect(form.subcategoryId).toBe('')
  })

  it('drops a subcategory that no longer matches its sector, keeps the sector', () => {
    const form = draftRowToForm(row, new Map([['uuid-sector', 'design-graphique-logo'], ['uuid-sub', 'e-commerce']]))
    expect(form.sectorId).toBe('design-graphique-logo')
    expect(form.subcategoryId).toBe('')
  })
})

describe('DraftInputSchema (autosave caps only)', () => {
  const base = { draftId: null, ...EMPTY_DRAFT, title: 'x' }

  it('accepts a partial draft — only a non-empty title is required', () => {
    expect(DraftInputSchema.safeParse(base).success).toBe(true)
  })

  it('refuses an empty title (service_listings.title is NOT NULL)', () => {
    expect(DraftInputSchema.safeParse({ ...base, title: '   ' }).success).toBe(false)
  })

  it('refuses values past the measured caps', () => {
    expect(DraftInputSchema.safeParse({ ...base, title: 'x'.repeat(DRAFT_LIMITS.titleMax + 1) }).success).toBe(false)
    expect(DraftInputSchema.safeParse({ ...base, shortDescription: 'x'.repeat(161) }).success).toBe(false)
    expect(DraftInputSchema.safeParse({ ...base, description: 'x'.repeat(2001) }).success).toBe(false)
    expect(DraftInputSchema.safeParse({ ...base, skills: ['a', 'b', 'c', 'd', 'e', 'f'] }).success).toBe(false)
    expect(DraftInputSchema.safeParse({ ...base, price: '1'.repeat(21) }).success).toBe(false)
    expect(DraftInputSchema.safeParse({ ...base, deliveryTime: 'x'.repeat(51) }).success).toBe(false)
    expect(DraftInputSchema.safeParse({ ...base, deliverablesText: 'x'.repeat(1501) }).success).toBe(false)
    expect(DraftInputSchema.safeParse({ ...base, buyerBriefing: 'x'.repeat(501) }).success).toBe(false)
  })

  it('accepts an unparseable price (saved as NULL, reported by the step-3 gate)', () => {
    expect(DraftInputSchema.safeParse({ ...base, price: 'abc' }).success).toBe(true)
  })

  it('accepts only the 4 ruled units and the 2 wizard modes', () => {
    for (const priceUnit of ['fixed', 'hour', 'day', 'month']) {
      expect(DraftInputSchema.safeParse({ ...base, priceUnit }).success).toBe(true)
    }
    expect(DraftInputSchema.safeParse({ ...base, priceUnit: 'project' }).success).toBe(false)
    expect(DraftInputSchema.safeParse({ ...base, deliveryMode: 'hybrid' }).success).toBe(true)
    expect(DraftInputSchema.safeParse({ ...base, deliveryMode: 'onsite' }).success).toBe(false)
  })

  it('refuses a non-uuid draft id', () => {
    expect(DraftInputSchema.safeParse({ ...base, draftId: 'not-a-uuid' }).success).toBe(false)
  })
})
