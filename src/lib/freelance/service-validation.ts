// Pure validation for the add/edit service form. Extracted from the form + server action so the
// rules are unit-tested and shared by both (the same posture as marche/job-post-validation.ts). The
// DB (RLS: freelancer_profiles.profile_id = auth.uid() on INSERT/UPDATE) is the real authorization
// guard; these are app-layer checks returning i18n error keys. Bounds are enforced HERE, not only
// via the input's maxLength — the server action is directly invokable, so the client cap isn't a
// guarantee, and a value past numeric(10,2) would otherwise surface as a raw DB error with no field
// context. Unlike job-post-validation (single errorKey), this collects per-field errors so the form
// can show inline messages under every invalid field at once.

export type ServiceField = 'title' | 'category' | 'description' | 'price' | 'delivery'

export type ServiceInput = {
  title: string
  categoryId: string
  description: string
  startingPrice: string // raw string from the number input
  deliveryTime: string
  status: string // 'active' | 'hidden'
}

export type ServiceValues = {
  title: string
  category_id: string
  description: string
  starting_price_tnd: number
  delivery_time: string
  status: 'active' | 'hidden'
}

export type ServiceValidation =
  | { ok: true; value: ServiceValues }
  | { ok: false; errors: Partial<Record<ServiceField, string>> }

const TITLE_MAX = 100
const DESCRIPTION_MAX = 2000
// numeric(10,2) ceiling — 8 integer digits + 2 decimals (money is numeric(10,2) TND per CLAUDE.md).
const PRICE_MAX = 99_999_999.99

const ERR = {
  required: 'freelance.services.form.error.required',
  titleTooLong: 'freelance.services.form.error.title_too_long',
  descriptionTooLong: 'freelance.services.form.error.description_too_long',
  priceInvalid: 'freelance.services.form.error.price_invalid',
} as const

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

  // Round to the column's 2 decimals so the sent value matches what Postgres stores (a typed
  // "10.999" otherwise rounds to 11.00 in the DB and surprises the user), then bound-check.
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
    },
  }
}
