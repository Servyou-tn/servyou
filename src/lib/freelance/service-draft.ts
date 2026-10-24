import { z } from 'zod'
import type { Lang } from '@/lib/i18n'
import { findSkillByLabel, getSector, getSkill, getSubcategory } from '@/lib/taxonomy/service-categories'

// H6 « Créer un service » — the draft model shared by the page (resume), the autosave action and the
// client wizard. Pure: no Supabase, no React, so all three run the SAME gates.
//
// A draft is partial by design. Autosave writes it with status='draft' and never runs
// validateServiceInput (founder ruling, see saveServiceDraftAction); the only rules a draft obeys
// are the per-field caps below, which the inputs enforce anyway (maxLength) and the DB backs where
// it can (short_description <= 160, tags <= 10, deliverables <= 8, price_unit and delivery_mode
// CHECKs). The step gates are what « Suivant » checks.
//
// Measured limits: docs/design/h6-measurements.md (title counter 0/80, short 0/160, detailed
// 0/2000 with « Minimum 100 caractères », skills « Jusqu'à 5 », briefing counter 0/500). Title
// minimum 10 and skills minimum 1 are the PR-2 brief's; steps 3–4 follow the PR-3 rulings in
// docs/design/h6-pr3-deltas.md (D13–D22); step 5 (récapitulatif + publish) the PR-4 rulings in
// docs/design/h6-pr4-deltas.md (D23–D35). The same limits are the publish rules validateServiceInput
// and the DB gate (migration 20261024215730) check, and all three count lengths in code points
// (charCount, ruling D28).

export const SERVICE_WIZARD_STEPS = ['metier', 'description', 'tarif', 'prestation', 'publication'] as const
export type ServiceWizardStep = 1 | 2 | 3 | 4 | 5

/** Steps that exist in code — all five since PR-4. Resume never lands past it. */
export const BUILT_STEPS = 5

/**
 * Length in code points — what the DB's char_length counts — not UTF-16 units: an emoji is 1 here and 2
 * in `.length`. The step gates, validateServiceInput and the DB publish gate all count this way, so a
 * title that passes step 1 can't fail the publish (ruling D28). The inputs' native maxLength and their
 * counters still count UTF-16 units — stricter at the top end only, never at a minimum.
 */
export const charCount = (s: string): number => Array.from(s).length

/** service_listings.price_unit (CHECK, migration 20261024195134). « Par mois » replaces the
 *  frame's « Par projet » — founder ruling D13, a founder-approved Figma deviation. */
export const PRICE_UNITS = ['fixed', 'hour', 'day', 'month'] as const
export type PriceUnit = (typeof PRICE_UNITS)[number]

/** The two values H6 writes to service_listings.delivery_mode (ruling D15): « À distance » =
 *  remote, « Sur site possible » = hybrid (remote OR on-site). H6 never writes `onsite`. */
export const WIZARD_DELIVERY_MODES = ['remote', 'hybrid'] as const
export type WizardDeliveryMode = (typeof WIZARD_DELIVERY_MODES)[number]

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
  /** numeric(10,2) ceiling — the same bound validateServiceInput checks. */
  priceMax: 99_999_999.99,
  /** Raw price text as typed (« 99 999 999,99 » is 13). */
  priceTextMax: 20,
  /** Délai is free text (ruling D14). */
  deliveryTimeMax: 50,
  /** « Ce qui est inclus » — validateServiceInput's publish rule (ruling D16). */
  deliverablesMin: 3,
  deliverablesMax: 8,
  deliverableMin: 5,
  deliverableMax: 150,
  /** Raw textarea text; the element's maxLength, so an autosave is never refused for length. */
  deliverablesTextMax: 1500,
  /** The frame's counter (ruling D17) — stricter than the DB CHECK (1000). */
  briefingMax: 500,
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
  /** The price as typed (« 800 », « 1 200,50 ») — parsed only at save / gate time. */
  price: string
  priceUnit: PriceUnit
  deliveryTime: string
  /** « Ce qui est inclus » as typed, one item per line. Kept raw so blank lines survive typing;
   *  split into deliverables[] only at save / gate time. */
  deliverablesText: string
  deliveryMode: WizardDeliveryMode
  buyerBriefing: string
}

// Fixe + À distance are drawn selected and are saved from the first autosave on (ruling D22): what
// the control shows is what's stored.
export const EMPTY_DRAFT: DraftForm = {
  title: '',
  sectorId: '',
  subcategoryId: '',
  skills: [],
  shortDescription: '',
  description: '',
  price: '',
  priceUnit: 'fixed',
  deliveryTime: '',
  deliverablesText: '',
  deliveryMode: 'remote',
  buyerBriefing: '',
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
  price: z.string().max(DRAFT_LIMITS.priceTextMax),
  priceUnit: z.enum(PRICE_UNITS),
  deliveryTime: z.string().max(DRAFT_LIMITS.deliveryTimeMax),
  deliverablesText: z.string().max(DRAFT_LIMITS.deliverablesTextMax),
  deliveryMode: z.enum(WIZARD_DELIVERY_MODES),
  buyerBriefing: z.string().max(DRAFT_LIMITS.briefingMax),
})
export type DraftInput = z.infer<typeof DraftInputSchema>

// ── Price and « Ce qui est inclus » ───────────────────────────────────────────────────────────

/**
 * Typed price → TND, or null when it isn't a valid price (ruling D18). Accepts « 800 », « 800,50 »,
 * « 800.5 », « 1 200 » (any whitespace as a thousands separator — `\s` covers the U+00A0/U+202F that
 * fr-FR formatting emits); at most 2 decimals; > 0 and within numeric(10,2).
 */
export function parsePrice(text: string): number | null {
  const compact = text.replace(/\s/g, '')
  if (!/^\d+([.,]\d{1,2})?$/.test(compact)) return null
  const n = Number(compact.replace(',', '.'))
  if (!Number.isFinite(n) || n <= 0 || n > DRAFT_LIMITS.priceMax) return null
  return n
}

/** The textarea → its items: one per line, trimmed, blank lines dropped, de-duplicated
 *  case-insensitively (first casing kept), in order — validateServiceInput's normalization. Uncapped:
 *  the gate needs to see a 9th line to report it. */
export function splitDeliverables(text: string): string[] {
  const out: string[] = []
  for (const line of text.split(/\r?\n/)) {
    const item = line.trim()
    if (item && !out.some((o) => o.toLowerCase() === item.toLowerCase())) out.push(item)
  }
  return out
}

/** What a draft save writes: the first 8 items — past that the DB CHECK (cardinality ≤ 8) would
 *  refuse the whole autosave, title and description edits included. */
export const draftDeliverables = (text: string): string[] =>
  splitDeliverables(text).slice(0, DRAFT_LIMITS.deliverablesMax)

// ── Gates ─────────────────────────────────────────────────────────────────────────────────────
// Each returns i18n KEYS (never text) — the form resolves them at render, so an FR ⇄ AR switch
// re-translates a visible error (reference_i18n_store_keys_not_text).

export type FieldError = { key: string; vars?: Record<string, number> }
export type Step1Field = 'title' | 'sector' | 'subcategory' | 'skills'
export type Step2Field = 'shortDescription' | 'description'
export type Step3Field = 'price' | 'priceUnit' | 'deliveryTime'
export type Step4Field = 'deliverables' | 'deliveryMode' | 'buyerBriefing'

export function step1Errors(f: DraftForm): Partial<Record<Step1Field, FieldError>> {
  const errors: Partial<Record<Step1Field, FieldError>> = {}
  const title = f.title.trim()
  if (!title) errors.title = { key: 'service.wizard.error.title_required' }
  else if (charCount(title) < DRAFT_LIMITS.titleMin) errors.title = { key: 'service.wizard.error.title_min', vars: { min: DRAFT_LIMITS.titleMin } }
  else if (charCount(title) > DRAFT_LIMITS.titleMax) errors.title = { key: 'service.wizard.error.title_max', vars: { max: DRAFT_LIMITS.titleMax } }

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
  else if (charCount(short) > DRAFT_LIMITS.shortMax) errors.shortDescription = { key: 'service.wizard.error.short_max', vars: { max: DRAFT_LIMITS.shortMax } }

  const description = f.description.trim()
  if (charCount(description) < DRAFT_LIMITS.descriptionMin) {
    errors.description = { key: 'service.wizard.error.description_min', vars: { min: DRAFT_LIMITS.descriptionMin } }
  } else if (charCount(description) > DRAFT_LIMITS.descriptionMax) {
    errors.description = { key: 'service.wizard.error.description_max', vars: { max: DRAFT_LIMITS.descriptionMax } }
  }
  return errors
}

/** Step 3 « Tarif » (ruling D21): a valid price, a unit, and a délai within its cap (optional). */
export function step3Errors(f: DraftForm): Partial<Record<Step3Field, FieldError>> {
  const errors: Partial<Record<Step3Field, FieldError>> = {}
  if (!f.price.trim()) errors.price = { key: 'service.wizard.error.price_required' }
  else if (parsePrice(f.price) === null) errors.price = { key: 'service.wizard.error.price_invalid' }

  if (!(PRICE_UNITS as readonly string[]).includes(f.priceUnit)) errors.priceUnit = { key: 'service.wizard.error.unit_required' }

  if (charCount(f.deliveryTime.trim()) > DRAFT_LIMITS.deliveryTimeMax) {
    errors.deliveryTime = { key: 'service.wizard.error.delivery_time_max', vars: { max: DRAFT_LIMITS.deliveryTimeMax } }
  }
  return errors
}

/** Step 4 « Prestation »: 3–8 items of 5–150 characters (validateServiceInput's rule and order, so a
 *  wizard-passed draft passes « Publier »), a mode, and a briefing within its cap (optional). */
export function step4Errors(f: DraftForm): Partial<Record<Step4Field, FieldError>> {
  const errors: Partial<Record<Step4Field, FieldError>> = {}
  const items = splitDeliverables(f.deliverablesText)
  if (items.some((d) => charCount(d) < DRAFT_LIMITS.deliverableMin || charCount(d) > DRAFT_LIMITS.deliverableMax)) {
    errors.deliverables = {
      key: 'service.wizard.error.deliverable_length',
      vars: { min: DRAFT_LIMITS.deliverableMin, max: DRAFT_LIMITS.deliverableMax },
    }
  } else if (items.length < DRAFT_LIMITS.deliverablesMin) {
    errors.deliverables = { key: 'service.wizard.error.deliverables_min', vars: { min: DRAFT_LIMITS.deliverablesMin } }
  } else if (items.length > DRAFT_LIMITS.deliverablesMax) {
    errors.deliverables = { key: 'service.wizard.error.deliverables_max', vars: { max: DRAFT_LIMITS.deliverablesMax } }
  }

  if (!(WIZARD_DELIVERY_MODES as readonly string[]).includes(f.deliveryMode)) {
    errors.deliveryMode = { key: 'service.wizard.error.mode_required' }
  }

  if (charCount(f.buyerBriefing.trim()) > DRAFT_LIMITS.briefingMax) {
    errors.buyerBriefing = { key: 'service.wizard.error.briefing_max', vars: { max: DRAFT_LIMITS.briefingMax } }
  }
  return errors
}

export const step1Passes = (f: DraftForm): boolean => Object.keys(step1Errors(f)).length === 0
export const step2Passes = (f: DraftForm): boolean => Object.keys(step2Errors(f)).length === 0
export const step3Passes = (f: DraftForm): boolean => Object.keys(step3Errors(f)).length === 0
export const step4Passes = (f: DraftForm): boolean => Object.keys(step4Errors(f)).length === 0
/** Step 5 « Publication » has no fields: « Publier » needs steps 1–4 to pass. */
export const step5Passes = (f: DraftForm): boolean => step1Passes(f) && step2Passes(f) && step3Passes(f) && step4Passes(f)

const STEP_PASSES = [step1Passes, step2Passes, step3Passes, step4Passes, step5Passes] as const

/** The gate « Suivant » (steps 1–4) or « Publier » (step 5) checks. */
export const stepPasses = (step: ServiceWizardStep, f: DraftForm): boolean => STEP_PASSES[step - 1](f)

/** Every wizard field, by the step that edits it — where a publish refusal sends the freelancer. */
export type WizardField = Step1Field | Step2Field | Step3Field | Step4Field

export const FIELD_STEP: Record<WizardField, ServiceWizardStep> = {
  title: 1,
  sector: 1,
  subcategory: 1,
  skills: 1,
  shortDescription: 2,
  description: 2,
  price: 3,
  priceUnit: 3,
  deliveryTime: 3,
  deliverables: 4,
  deliveryMode: 4,
  buyerBriefing: 4,
}

/** The gate errors of one step (steps 1–4; step 5 has no fields of its own). */
export function stepErrors(step: ServiceWizardStep, f: DraftForm): Partial<Record<WizardField, FieldError>> {
  if (step === 1) return step1Errors(f)
  if (step === 2) return step2Errors(f)
  if (step === 3) return step3Errors(f)
  if (step === 4) return step4Errors(f)
  return {}
}

/**
 * Where a resumed draft opens (founder ruling D7): the first step whose gate the saved data does
 * NOT pass — or step 5, the récapitulatif, when steps 1–4 all pass.
 */
export function resumeStep(f: DraftForm): ServiceWizardStep {
  for (let step = 1; step < BUILT_STEPS; step++) {
    if (!STEP_PASSES[step - 1](f)) return step as ServiceWizardStep
  }
  return BUILT_STEPS
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

export type SkillLabelPair = { fr: string; ar: string }

/**
 * A stored tag → both labels, for a 'use client' consumer (ServiceListingCard) that picks by `lang`
 * itself: the server resolves the pair, so the taxonomy never ships in a listing grid's bundle (ruling
 * D31 — the same « both names travel » convention as the category label). Custom skills and legacy
 * free-text tags come back as typed, in both slots.
 */
export function skillLabelPair(value: string): SkillLabelPair {
  const skill = getSkill(value)
  return skill ? { fr: skill.labelFr, ar: skill.labelAr } : { fr: value, ar: value }
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
  /** numeric(10,2) — PostgREST sends a JSON number; a string is tolerated. */
  starting_price_tnd: number | string | null
  price_unit: string | null
  delivery_time: string | null
  deliverables: string[] | null
  delivery_mode: string | null
  buyer_briefing: string | null
}

/** The columns getResumableDraft selects — DraftRow, in the order Supabase is asked for them. */
export const DRAFT_ROW_COLUMNS =
  'id, title, category_id, subcategory_id, tags, short_description, description, starting_price_tnd, price_unit, delivery_time, deliverables, delivery_mode, buyer_briefing'

/**
 * A saved draft → the wizard's form. `slugById` maps the row's category uuids to their slugs.
 * A category deleted since the save arrives as NULL (FK ON DELETE SET NULL); a slug the TS taxonomy
 * doesn't know (e.g. the DB-only `maison`) or a pair that no longer matches reads as "not chosen" —
 * the draft resumes on step 1 instead of throwing (founder ruling D7).
 *
 * Steps 3–4: a NULL unit or mode (a PR-2 draft) reads as the drawn default, Fixe / À distance
 * (ruling D22). `onsite` is never written by H6; if one ever appears it reads as « Sur site possible »,
 * the nearest of the two choices. A price saved as NULL because it didn't parse comes back empty —
 * the typed text isn't kept (ruling D18).
 */
export function draftRowToForm(row: DraftRow, slugById: ReadonlyMap<string, string>): DraftForm {
  const sectorSlug = row.category_id ? slugById.get(row.category_id) ?? '' : ''
  const sectorId = getSector(sectorSlug) ? sectorSlug : ''
  const subSlug = row.subcategory_id ? slugById.get(row.subcategory_id) ?? '' : ''
  const subcategoryId = sectorId && getSubcategory(sectorId, subSlug) ? subSlug : ''
  const price = row.starting_price_tnd == null ? NaN : Number(row.starting_price_tnd)
  return {
    title: row.title ?? '',
    sectorId,
    subcategoryId,
    skills: (row.tags ?? []).filter((tag) => typeof tag === 'string' && tag.trim() !== '').slice(0, DRAFT_LIMITS.skillsMax),
    shortDescription: row.short_description ?? '',
    description: row.description ?? '',
    price: Number.isFinite(price) ? String(price) : '',
    priceUnit: (PRICE_UNITS as readonly string[]).includes(row.price_unit ?? '') ? (row.price_unit as PriceUnit) : 'fixed',
    deliveryTime: row.delivery_time ?? '',
    deliverablesText: (row.deliverables ?? []).join('\n'),
    deliveryMode: row.delivery_mode === 'hybrid' || row.delivery_mode === 'onsite' ? 'hybrid' : 'remote',
    buyerBriefing: row.buyer_briefing ?? '',
  }
}
