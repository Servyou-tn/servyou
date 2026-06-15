// Pure validation for the minimal create-mission form. Extracted from the form + server
// action so the rules are unit-tested and shared by both. The DB (RLS: consumer_id =
// auth.uid() on INSERT) is the real authorization guard; these are app-layer UX checks
// that return i18n error keys. Budgets and deadline are optional.

export type JobPostInput = {
  title: string
  description: string
  categoryId: string
  city: string
  budgetMin: string
  budgetMax: string
  isRemote: boolean
  deadline: string // YYYY-MM-DD or ''
}

export type JobPostValues = {
  title: string
  description: string
  category_id: string
  city: string
  budget_min: number | null
  budget_max: number | null
  is_remote: boolean
  deadline: string | null
}

export type JobPostValidation =
  | { ok: true; value: JobPostValues }
  | { ok: false; errorKey: string }

// Parse a YYYY-MM-DD value as a LOCAL date (so "future" is timezone-stable).
function parseLocalDate(value: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(NaN)
}

// '' → null (optional); a non-negative finite number → that number; anything else →
// 'invalid'.
function parseBudget(raw: string): number | null | 'invalid' {
  const s = raw.trim()
  if (!s) return null
  const n = Number(s)
  if (!Number.isFinite(n) || n < 0) return 'invalid'
  return n
}

export function validateJobPost(input: JobPostInput, now: Date = new Date()): JobPostValidation {
  const title = input.title.trim()
  if (!title) return { ok: false, errorKey: 'mission.error.title_required' }

  const description = input.description.trim()
  if (!description) return { ok: false, errorKey: 'mission.error.description_required' }

  if (!input.categoryId) return { ok: false, errorKey: 'mission.error.category_required' }
  if (!input.city) return { ok: false, errorKey: 'mission.error.city_required' }

  const budget_min = parseBudget(input.budgetMin)
  const budget_max = parseBudget(input.budgetMax)
  if (budget_min === 'invalid' || budget_max === 'invalid') {
    return { ok: false, errorKey: 'mission.error.budget_invalid' }
  }
  if (budget_min != null && budget_max != null && budget_min > budget_max) {
    return { ok: false, errorKey: 'mission.error.budget_order' }
  }

  let deadline: string | null = null
  if (input.deadline.trim()) {
    const d = parseLocalDate(input.deadline.trim())
    if (Number.isNaN(d.getTime())) return { ok: false, errorKey: 'mission.error.deadline_past' }
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    if (d < today) return { ok: false, errorKey: 'mission.error.deadline_past' }
    deadline = input.deadline.trim()
  }

  return {
    ok: true,
    value: {
      title,
      description,
      category_id: input.categoryId,
      city: input.city,
      budget_min,
      budget_max,
      is_remote: input.isRemote,
      deadline,
    },
  }
}
