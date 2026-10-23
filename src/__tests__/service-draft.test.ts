/**
 * H6 « Créer un service » — the pure draft model (src/lib/freelance/service-draft.ts): the step
 * gates « Suivant » checks (founder ruling D9), the resume rule (D7), skill id ⇄ label mapping (D1)
 * and the saved-row → form mapping that must survive a deleted or unknown category.
 * No Supabase, no DOM.
 */

import { describe, it, expect } from 'vitest'
import {
  DRAFT_LIMITS,
  DraftInputSchema,
  EMPTY_DRAFT,
  draftRowToForm,
  normalizeSkill,
  normalizeSkills,
  resumeStep,
  skillLabel,
  step1Errors,
  step1Passes,
  step2Errors,
  step2Passes,
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
const COMPLETE: DraftForm = { ...STEP1_OK, shortDescription: 'Boutique prête en 7 jours', description: 'x'.repeat(100) }

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

describe('resumeStep (founder ruling D7)', () => {
  it('opens a draft that fails step 1 on step 1', () => {
    expect(resumeStep({ ...STEP1_OK, skills: [] })).toBe(1)
  })
  it('opens a draft that passes step 1 on step 2', () => {
    expect(resumeStep(STEP1_OK)).toBe(2)
  })
  it('never lands past the last built step, even when every gate passes', () => {
    expect(resumeStep(COMPLETE)).toBe(2)
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
  }
  const slugs = new Map([
    ['uuid-sector', 'developpement-web-mobile'],
    ['uuid-sub', 'e-commerce'],
  ])

  it('maps uuids back to taxonomy slugs and nulls to empty strings', () => {
    expect(draftRowToForm(row, slugs)).toEqual({
      title: 'Mon service',
      sectorId: 'developpement-web-mobile',
      subcategoryId: 'e-commerce',
      skills: ['react', 'Tricot artisanal'],
      shortDescription: '',
      description: '',
    })
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
  })

  it('refuses a non-uuid draft id', () => {
    expect(DraftInputSchema.safeParse({ ...base, draftId: 'not-a-uuid' }).success).toBe(false)
  })
})
