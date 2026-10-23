import { z } from 'zod'
import type { Lang } from '@/lib/i18n'
import { findSkillByLabel, getSector, getSkill, getSubcategory } from '@/lib/taxonomy/service-categories'

// H6 « Créer un service » — the draft model shared by the page (resume), the autosave action and the
// client wizard. Pure: no Supabase, no React, so all three run the SAME gates.
//
// A draft is partial by design. Autosave writes it with status='draft' and never runs
// validateServiceInput (founder ruling, see saveServiceDraftAction); the only rules a draft obeys
// are the per-field caps below, which the inputs enforce anyway (maxLength) and the DB backs where
// it can (short_description <= 160, tags <= 10). The step gates are what « Suivant » checks.
//
// Measured limits: docs/design/h6-measurements.md (title counter 0/80, short 0/160, detailed
// 0/2000 with « Minimum 100 caractères », skills « Jusqu'à 5 »). Title minimum 10 and skills
// minimum 1 are the PR-2 brief's.

export const SERVICE_WIZARD_STEPS = ['metier', 'description', 'tarif', 'prestation', 'publication'] as const
export type ServiceWizardStep = 1 | 2

/** Steps that exist in code. PR-3 raises this to 4, PR-4 to 5 — resume never lands past it. */
export const BUILT_STEPS = 2

export const DRAFT_LIMITS = {
  titleMin: 10,
  titleMax: 80,
  shortMax: 160,
  descriptionMin: 100,
  descriptionMax: 2000,
  skillsMin: 1,
  skillsMax: 5,
  /** A typed, add-your-own skill. Not in any frame; long enough for « Google Analytics 4 ». */
  skillMax: 50,
} as const

export type DraftForm = {
  title: string
  /** TS taxonomy sector slug, '' when not chosen. */
  sectorId: string
  /** TS taxonomy subcategory slug, '' when not chosen. */
  subcategoryId: string
  /** Pool skill ids and custom skills as typed. */
  skills: string[]
  shortDescription: string
  description: string
}

export const EMPTY_DRAFT: DraftForm = {
  title: '',
  sectorId: '',
  subcategoryId: '',
  skills: [],
  shortDescription: '',
  description: '',
}

/** What the autosave action accepts. Caps only — a draft is allowed to be incomplete. */
export const DraftInputSchema = z.object({
  draftId: z.string().uuid().nullable(),
  title: z.string().trim().min(1).max(DRAFT_LIMITS.titleMax),
  sectorId: z.string().max(100),
  subcategoryId: z.string().max(100),
  skills: z.array(z.string().trim().min(1).max(DRAFT_LIMITS.skillMax)).max(DRAFT_LIMITS.skillsMax),
  shortDescription: z.string().max(DRAFT_LIMITS.shortMax),
  description: z.string().max(DRAFT_LIMITS.descriptionMax),
})
export type DraftInput = z.infer<typeof DraftInputSchema>

// ── Gates ─────────────────────────────────────────────────────────────────────────────────────
// Each returns i18n KEYS (never text) — the form resolves them at render, so an FR ⇄ AR switch
// re-translates a visible error (reference_i18n_store_keys_not_text).

export type FieldError = { key: string; vars?: Record<string, number> }
export type Step1Field = 'title' | 'sector' | 'subcategory' | 'skills'
export type Step2Field = 'shortDescription' | 'description'

export function step1Errors(f: DraftForm): Partial<Record<Step1Field, FieldError>> {
  const errors: Partial<Record<Step1Field, FieldError>> = {}
  const title = f.title.trim()
  if (!title) errors.title = { key: 'service.wizard.error.title_required' }
  else if (title.length < DRAFT_LIMITS.titleMin) errors.title = { key: 'service.wizard.error.title_min', vars: { min: DRAFT_LIMITS.titleMin } }
  else if (title.length > DRAFT_LIMITS.titleMax) errors.title = { key: 'service.wizard.error.title_max', vars: { max: DRAFT_LIMITS.titleMax } }

  if (!getSector(f.sectorId)) errors.sector = { key: 'service.wizard.error.category_required' }
  if (!getSubcategory(f.sectorId, f.subcategoryId)) errors.subcategory = { key: 'service.wizard.error.subcategory_required' }

  if (f.skills.length < DRAFT_LIMITS.skillsMin) errors.skills = { key: 'service.wizard.error.skills_required' }
  else if (f.skills.length > DRAFT_LIMITS.skillsMax) errors.skills = { key: 'service.wizard.error.skills_max', vars: { max: DRAFT_LIMITS.skillsMax } }
  return errors
}

export function step2Errors(f: DraftForm): Partial<Record<Step2Field, FieldError>> {
  const errors: Partial<Record<Step2Field, FieldError>> = {}
  const short = f.shortDescription.trim()
  if (!short) errors.shortDescription = { key: 'service.wizard.error.short_required' }
  else if (short.length > DRAFT_LIMITS.shortMax) errors.shortDescription = { key: 'service.wizard.error.short_max', vars: { max: DRAFT_LIMITS.shortMax } }

  const description = f.description.trim()
  if (description.length < DRAFT_LIMITS.descriptionMin) {
    errors.description = { key: 'service.wizard.error.description_min', vars: { min: DRAFT_LIMITS.descriptionMin } }
  } else if (description.length > DRAFT_LIMITS.descriptionMax) {
    errors.description = { key: 'service.wizard.error.description_max', vars: { max: DRAFT_LIMITS.descriptionMax } }
  }
  return errors
}

export const step1Passes = (f: DraftForm): boolean => Object.keys(step1Errors(f)).length === 0
export const step2Passes = (f: DraftForm): boolean => Object.keys(step2Errors(f)).length === 0

/**
 * Where a resumed draft opens (founder ruling D7): the first step whose gate the saved data does
 * NOT pass, capped at the last step that exists in code.
 */
export function resumeStep(f: DraftForm): ServiceWizardStep {
  if (!step1Passes(f)) return 1
  return Math.min(2, BUILT_STEPS) as ServiceWizardStep
}

// ── Skills ────────────────────────────────────────────────────────────────────────────────────

/** Typed text → the value stored in `tags`: kept as is when it already is a pool id; a pool
 *  skill's id when the text is one of its labels (French or Arabic, case-insensitive, the active
 *  sector's pool first); otherwise the trimmed text itself (a custom skill). */
export function normalizeSkill(text: string, sectorId?: string): string {
  const trimmed = text.trim()
  if (getSkill(trimmed)) return trimmed
  return findSkillByLabel(trimmed, sectorId)?.id ?? trimmed
}

/** A stored tag → what the freelancer sees: the pool label in their language, or the custom text. */
export function skillLabel(value: string, lang: Lang): string {
  const skill = getSkill(value)
  if (!skill) return value
  return lang === 'ar' ? skill.labelAr : skill.labelFr
}

/** Normalizes, drops blanks, de-duplicates case-insensitively, keeps order, caps at skillsMax. */
export function normalizeSkills(values: string[], sectorId?: string): string[] {
  const out: string[] = []
  for (const v of values) {
    const n = normalizeSkill(v, sectorId)
    if (!n || out.some((o) => o.toLowerCase() === n.toLowerCase())) continue
    out.push(n)
    if (out.length === DRAFT_LIMITS.skillsMax) break
  }
  return out
}

// ── Row ↔ form ────────────────────────────────────────────────────────────────────────────────

export type DraftRow = {
  id: string
  title: string
  category_id: string | null
  subcategory_id: string | null
  tags: string[] | null
  short_description: string | null
  description: string | null
}

/**
 * A saved draft → the wizard's form. `slugById` maps the row's category uuids to their slugs.
 * A category deleted since the save arrives as NULL (FK ON DELETE SET NULL); a slug the TS taxonomy
 * doesn't know (e.g. the DB-only `maison`) or a pair that no longer matches reads as "not chosen" —
 * the draft resumes on step 1 instead of throwing (founder ruling D7).
 */
export function draftRowToForm(row: DraftRow, slugById: ReadonlyMap<string, string>): DraftForm {
  const sectorSlug = row.category_id ? slugById.get(row.category_id) ?? '' : ''
  const sectorId = getSector(sectorSlug) ? sectorSlug : ''
  const subSlug = row.subcategory_id ? slugById.get(row.subcategory_id) ?? '' : ''
  const subcategoryId = sectorId && getSubcategory(sectorId, subSlug) ? subSlug : ''
  return {
    title: row.title ?? '',
    sectorId,
    subcategoryId,
    skills: (row.tags ?? []).filter((tag) => typeof tag === 'string' && tag.trim() !== '').slice(0, DRAFT_LIMITS.skillsMax),
    shortDescription: row.short_description ?? '',
    description: row.description ?? '',
  }
}
