// Pure validation for the add/edit service form. Extracted from the form + server action so the
// rules are unit-tested and shared by both (the same posture as marche/job-post-validation.ts). The
// DB (RLS + CHECK constraints) is the real guard; these are app-layer checks returning i18n error
// keys, and they ALSO normalize (trim / lowercase / dedupe / drop-empty) — kept here, in the pure
// function, so normalization is testable and identical on the client and the server (the action is
// directly invokable, so a client-side cap isn't a guarantee). Collects per-field errors so the form
// can show inline messages under every invalid field at once.

export type ServiceField =
  | 'title'
  | 'category'
  | 'description'
  | 'price'
  | 'delivery'
  | 'deliverables'
  | 'revisions'
  | 'tags'
  | 'briefing'

export type ServiceInput = {
  title: string
  categoryId: string
  description: string
  startingPrice: string // raw string from the number input
  deliveryTime: string
  status: string // 'active' | 'hidden'
  deliverables: string[] // raw rows from the repeatable list
  revisions: string // raw string from the stepper
  tags: string[] // raw chips
  buyerBriefing: string // raw textarea
}

export type ServiceValues = {
  title: string
  category_id: string
  description: string
  starting_price_tnd: number
  delivery_time: string
  status: 'active' | 'hidden'
  deliverables: string[]
  revisions_count: number
  tags: string[]
  buyer_briefing: string | null
}

export type ServiceValidation =
  | { ok: true; value: ServiceValues }
  | { ok: false; errors: Partial<Record<ServiceField, string>> }

const TITLE_MAX = 100
const DESCRIPTION_MAX = 2000
// numeric(10,2) ceiling — 8 integer digits + 2 decimals (money is numeric(10,2) TND per CLAUDE.md).
const PRICE_MAX = 99_999_999.99
const DELIVERABLE_MIN_LEN = 5
const DELIVERABLE_MAX_LEN = 150
const DELIVERABLES_MIN = 3
const DELIVERABLES_MAX = 8
const REVISIONS_MIN = 0
const REVISIONS_MAX = 10
const TAGS_MIN = 3
const TAGS_MAX = 5
const TAG_RE = /^[a-z0-9-]{2,30}$/
const BRIEFING_MAX = 1000

const ERR = {
  required: 'freelance.services.form.error.required',
  titleTooLong: 'freelance.services.form.error.title_too_long',
  descriptionTooLong: 'freelance.services.form.error.description_too_long',
  priceInvalid: 'freelance.services.form.error.price_invalid',
  deliverablesMin: 'freelance.services.form.deliverables.errors.min',
  deliverablesMax: 'freelance.services.form.deliverables.errors.max',
  deliverablesLength: 'freelance.services.form.deliverables.errors.length',
  revisionsRange: 'freelance.services.form.revisions.errors.range',
  tagsMin: 'freelance.services.form.tags.errors.min',
  tagsMax: 'freelance.services.form.tags.errors.max',
  tagsFormat: 'freelance.services.form.tags.errors.format',
  briefingMax: 'freelance.services.form.briefing.errors.max',
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
  else if (title.length > TITLE_MAX) errors.title = ERR.titleTooLong

  const categoryId = input.categoryId.trim()
  if (!categoryId) errors.category = ERR.required

  const description = input.description.trim()
  if (!description) errors.description = ERR.required
  else if (description.length > DESCRIPTION_MAX) errors.description = ERR.descriptionTooLong

  // Round to the column's 2 decimals (a typed "10.999" otherwise rounds to 11.00 in the DB), then
  // bound-check against the numeric(10,2) ceiling.
  let priceValue = 0
  const priceStr = input.startingPrice.trim()
  if (!priceStr) {
    errors.price = ERR.required
  } else {
    const n = Number(priceStr)
    const rounded = Math.round(n * 100) / 100
    if (!Number.isFinite(n) || rounded < 0 || rounded > PRICE_MAX) errors.price = ERR.priceInvalid
    else priceValue = rounded
  }

  const deliveryTime = input.deliveryTime.trim()
  if (!deliveryTime) errors.delivery = ERR.required

  // Deliverables — trim each, drop empties, dedupe; then count + per-item length.
  const deliverables = dedupeCI(input.deliverables.map((d) => d.trim()).filter(Boolean))
  if (deliverables.some((d) => d.length < DELIVERABLE_MIN_LEN || d.length > DELIVERABLE_MAX_LEN)) {
    errors.deliverables = ERR.deliverablesLength
  } else if (deliverables.length < DELIVERABLES_MIN) {
    errors.deliverables = ERR.deliverablesMin
  } else if (deliverables.length > DELIVERABLES_MAX) {
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

  // Tags — trim, lowercase, dedupe; then per-tag format + count.
  const tags = dedupeCI(input.tags.map((tg) => tg.trim().toLowerCase()).filter(Boolean))
  if (tags.some((tg) => !TAG_RE.test(tg))) {
    errors.tags = ERR.tagsFormat
  } else if (tags.length < TAGS_MIN) {
    errors.tags = ERR.tagsMin
  } else if (tags.length > TAGS_MAX) {
    errors.tags = ERR.tagsMax
  }

  // Buyer briefing — optional; trimmed; max length when present.
  let buyerBriefing: string | null = null
  const briefingTrimmed = input.buyerBriefing.trim()
  if (briefingTrimmed !== '') {
    if (briefingTrimmed.length > BRIEFING_MAX) errors.briefing = ERR.briefingMax
    else buyerBriefing = briefingTrimmed
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors }

  const status: 'active' | 'hidden' = input.status === 'hidden' ? 'hidden' : 'active'
  return {
    ok: true,
    value: {
      title,
      category_id: categoryId,
      description,
      starting_price_tnd: priceValue,
      delivery_time: deliveryTime,
      status,
      deliverables,
      revisions_count: revisionsCount,
      tags,
      buyer_briefing: buyerBriefing,
    },
  }
}
