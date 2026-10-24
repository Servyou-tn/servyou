// Pure validation of a publishable service — the G4 publish rules (H6 PR-4, docs/design/h6-pr4-deltas.md
// §2). Its first production caller is « Publier mon service » (publishServiceDraftAction), which runs it on
// the draft re-read from the DB; H7's edit form will be the second. The DB enforces the SAME rules when a
// row leaves draft (trigger trg_service_publish_requirements, migration 20261024215730 —
// service_listing_publish_problems() is the SQL copy: change both together). These are app-layer checks
// returning i18n error keys, and they ALSO normalize (trim / dedupe / drop-empty) — kept here, in the pure
// function, so normalization is testable and identical wherever it runs. Collects per-field errors so a
// caller can flag every invalid field at once.
//
// Lengths are counted in code points (charCount), like the DB's char_length — not UTF-16 units — so an
// emoji counts once on both sides of the publish (ruling D28). The limits are the wizard's DRAFT_LIMITS:
// one set of numbers for the step gates, this function and the SQL.

import { DRAFT_LIMITS, PRICE_UNITS, charCount, type PriceUnit } from './service-draft'

export type ServiceField =
  | 'title'
  | 'category'
  | 'subcategory'
  | 'tags'
  | 'shortDescription'
  | 'description'
  | 'price'
  | 'priceUnit'
  | 'delivery'
  | 'deliverables'
  | 'deliveryMode'
  | 'revisions'
  | 'briefing'
  | 'status'

export type ServiceInput = {
  title: string
  categoryId: string
  subcategoryId: string
  description: string
  shortDescription: string
  startingPrice: string // raw string (a typed value, or the DB numeric as text)
  priceUnit: string
  deliveryTime: string
  deliveryMode: string
  status: string // 'active' | 'hidden'
  deliverables: string[] // raw rows
  revisions: string // raw string from the stepper
  tags: string[] // pool skill ids and custom skills
  buyerBriefing: string // raw textarea
}

export type ServiceDeliveryMode = 'remote' | 'onsite' | 'hybrid'

export type ServiceValues = {
  title: string
  category_id: string
  subcategory_id: string
  description: string
  short_description: string
  starting_price_tnd: number
  price_unit: PriceUnit
  delivery_time: string | null
  delivery_mode: ServiceDeliveryMode
  status: 'active' | 'hidden'
  deliverables: string[]
  revisions_count: number
  tags: string[]
  buyer_briefing: string | null
}

export type ServiceValidation =
  | { ok: true; value: ServiceValues }
  | { ok: false; errors: Partial<Record<ServiceField, string>> }

// numeric(10,2) ceiling — 8 integer digits + 2 decimals (money is numeric(10,2) TND per CLAUDE.md).
const PRICE_MAX = DRAFT_LIMITS.priceMax
const REVISIONS_MIN = 0
const REVISIONS_MAX = 10
// The DB CHECK on buyer_briefing. H6's own cap (500, ruling D17) is stricter, so a wizard draft always
// passes; H7 may draw 1000.
const BRIEFING_MAX = 1000
const DELIVERY_MODES: readonly string[] = ['remote', 'onsite', 'hybrid']

const ERR = {
  required: 'freelance.services.form.error.required',
  titleTooShort: 'freelance.services.form.error.title_too_short',
  titleTooLong: 'freelance.services.form.error.title_too_long',
  shortTooLong: 'freelance.services.form.error.short_description_too_long',
  descriptionTooShort: 'freelance.services.form.error.description_too_short',
  descriptionTooLong: 'freelance.services.form.error.description_too_long',
  priceInvalid: 'freelance.services.form.error.price_invalid',
  deliveryTooLong: 'freelance.services.form.error.delivery_too_long',
  deliverablesMin: 'freelance.services.form.deliverables.errors.min',
  deliverablesMax: 'freelance.services.form.deliverables.errors.max',
  deliverablesLength: 'freelance.services.form.deliverables.errors.length',
  revisionsRange: 'freelance.services.form.revisions.errors.range',
  tagsMin: 'freelance.services.form.tags.errors.min',
  tagsMax: 'freelance.services.form.tags.errors.max',
  tagsFormat: 'freelance.services.form.tags.errors.format',
  briefingMax: 'freelance.services.form.briefing.errors.max',
  // This function only ever validates a live or paused service — 'draft' is set exclusively by H6
  // (the service-creation wizard's autosave), never through a validated path. An unrecognized status
  // (including 'draft') is a real validation error here, not a value to silently coerce: the same
  // coercion class as the pre-fix `input.status === 'hidden' ? 'hidden' : 'active'` line below used
  // to be — a function with no awareness of a new status must not default to the one that publishes.
  statusInvalid: 'freelance.services.form.error.status_invalid',
} as const

// Dedupe case-insensitively, preserving the first occurrence's casing.
function dedupeCI(arr: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const x of arr) {
    const k = x.toLowerCase()
    if (!seen.has(k)) {
      seen.add(k)
      out.push(x)
    }
  }
  return out
}

export function validateServiceInput(input: ServiceInput): ServiceValidation {
  const errors: Partial<Record<ServiceField, string>> = {}

  const title = input.title.trim()
  if (!title) errors.title = ERR.required
  else if (charCount(title) < DRAFT_LIMITS.titleMin) errors.title = ERR.titleTooShort
  else if (charCount(title) > DRAFT_LIMITS.titleMax) errors.title = ERR.titleTooLong

  const categoryId = input.categoryId.trim()
  if (!categoryId) errors.category = ERR.required
  const subcategoryId = input.subcategoryId.trim()
  if (!subcategoryId) errors.subcategory = ERR.required

  const shortDescription = input.shortDescription.trim()
  if (!shortDescription) errors.shortDescription = ERR.required
  else if (charCount(shortDescription) > DRAFT_LIMITS.shortMax) errors.shortDescription = ERR.shortTooLong

  const description = input.description.trim()
  if (!description) errors.description = ERR.required
  else if (charCount(description) < DRAFT_LIMITS.descriptionMin) errors.description = ERR.descriptionTooShort
  else if (charCount(description) > DRAFT_LIMITS.descriptionMax) errors.description = ERR.descriptionTooLong

  // Round to the column's 2 decimals (a typed "10.999" otherwise rounds to 11.00 in the DB), then
  // bound-check: > 0 (the wizard's rule and the DB gate's) and within numeric(10,2).
  let priceValue = 0
  const priceStr = input.startingPrice.trim()
  if (!priceStr) {
    errors.price = ERR.required
  } else {
    const n = Number(priceStr)
    const rounded = Math.round(n * 100) / 100
    if (!Number.isFinite(n) || rounded <= 0 || rounded > PRICE_MAX) errors.price = ERR.priceInvalid
    else priceValue = rounded
  }

  const priceUnit = (PRICE_UNITS as readonly string[]).includes(input.priceUnit) ? (input.priceUnit as PriceUnit) : null
  if (!priceUnit) errors.priceUnit = ERR.required

  // Délai — optional (frame: « Optionnel »); free text within its cap (ruling D14).
  const deliveryTime = input.deliveryTime.trim()
  if (charCount(deliveryTime) > DRAFT_LIMITS.deliveryTimeMax) errors.delivery = ERR.deliveryTooLong

  const deliveryMode = DELIVERY_MODES.includes(input.deliveryMode) ? (input.deliveryMode as ServiceDeliveryMode) : null
  if (!deliveryMode) errors.deliveryMode = ERR.required

  // Status — a real field, not a default branch. Anything other than exactly 'active' or 'hidden'
  // (including 'draft', which this function must never set) is a validation error.
  let status: 'active' | 'hidden' = 'active'
  if (input.status === 'active' || input.status === 'hidden') {
    status = input.status
  } else {
    errors.status = ERR.statusInvalid
  }

  // Deliverables — trim each, drop empties, dedupe; then count + per-item length.
  const deliverables = dedupeCI(input.deliverables.map((d) => d.trim()).filter(Boolean))
  if (
    deliverables.some(
      (d) => charCount(d) < DRAFT_LIMITS.deliverableMin || charCount(d) > DRAFT_LIMITS.deliverableMax,
    )
  ) {
    errors.deliverables = ERR.deliverablesLength
  } else if (deliverables.length < DRAFT_LIMITS.deliverablesMin) {
    errors.deliverables = ERR.deliverablesMin
  } else if (deliverables.length > DRAFT_LIMITS.deliverablesMax) {
    errors.deliverables = ERR.deliverablesMax
  }

  // Revisions — optional input defaults to 1; otherwise an integer in [0, 10].
  let revisionsCount = 1
  const revRaw = input.revisions.trim()
  if (revRaw !== '') {
    const n = Number(revRaw)
    if (!Number.isInteger(n) || n < REVISIONS_MIN || n > REVISIONS_MAX) errors.revisions = ERR.revisionsRange
    else revisionsCount = n
  }

  // Tags (« Compétences ») — pool skill ids AND custom skills as typed (H6 ruling D1), so case is kept
  // and any text is allowed: trim, drop blanks, dedupe case-insensitively; then 1–5, each ≤ 50.
  const tags = dedupeCI(input.tags.map((tg) => tg.trim()).filter(Boolean))
  if (tags.some((tg) => charCount(tg) > DRAFT_LIMITS.skillMax)) {
    errors.tags = ERR.tagsFormat
  } else if (tags.length < DRAFT_LIMITS.skillsMin) {
    errors.tags = ERR.tagsMin
  } else if (tags.length > DRAFT_LIMITS.skillsMax) {
    errors.tags = ERR.tagsMax
  }

  // Buyer briefing — optional; trimmed; max length when present.
  let buyerBriefing: string | null = null
  const briefingTrimmed = input.buyerBriefing.trim()
  if (briefingTrimmed !== '') {
    if (charCount(briefingTrimmed) > BRIEFING_MAX) errors.briefing = ERR.briefingMax
    else buyerBriefing = briefingTrimmed
  }

  if (Object.keys(errors).length > 0 || !priceUnit || !deliveryMode) return { ok: false, errors }

  return {
    ok: true,
    value: {
      title,
      category_id: categoryId,
      subcategory_id: subcategoryId,
      description,
      short_description: shortDescription,
      starting_price_tnd: priceValue,
      price_unit: priceUnit,
      delivery_time: deliveryTime || null,
      delivery_mode: deliveryMode,
      status,
      deliverables,
      revisions_count: revisionsCount,
      tags,
      buyer_briefing: buyerBriefing,
    },
  }
}
