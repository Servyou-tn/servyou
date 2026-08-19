// Pure validation for the minimal create-mission form. Extracted from the form + server
// action so the rules are unit-tested and shared by both. The DB (RLS: consumer_id =
// auth.uid() on INSERT) is the real authorization guard; these are app-layer UX checks
// that return i18n error keys. Budgets and deadline are optional.

// Skills — PR-D §6 RULING: optional, max 8, no minimum. Distinct from H2's SKILLS_MIN/SKILLS_MAX
// (3/15, CompetencesForm.tsx) — a different form, a different rule, not the same constant.
export const ANNONCE_SKILLS_MAX = 8
const SKILL_MAX_LEN = 60

export type JobPostInput = {
  title: string
  description: string
  categoryId: string
  city: string
  budgetMin: string
  budgetMax: string
  isRemote: boolean
  deadline: string // YYYY-MM-DD or ''
  skills: string[]
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
  skills: string[]
}

export type JobPostValidation =
  | { ok: true; value: JobPostValues }
  | { ok: false; errorKey: string }

// Parse a YYYY-MM-DD value as a LOCAL date (so "future" is timezone-stable).
function parseLocalDate(value: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(NaN)
}

// '' â†’ null (optional); a non-negative finite number â†’ that number; anything else â†’
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
  if (!title) return { ok: false, errorKey: 'annonce.error.title_required' }

  const description = input.description.trim()
  if (!description) return { ok: false, errorKey: 'annonce.error.description_required' }

  if (!input.categoryId) return { ok: false, errorKey: 'annonce.error.category_required' }
  if (!input.city) return { ok: false, errorKey: 'annonce.error.city_required' }

  const budget_min = parseBudget(input.budgetMin)
  const budget_max = parseBudget(input.budgetMax)
  if (budget_min === 'invalid' || budget_max === 'invalid') {
    return { ok: false, errorKey: 'annonce.error.budget_invalid' }
  }
  if (budget_min != null && budget_max != null && budget_min > budget_max) {
    return { ok: false, errorKey: 'annonce.error.budget_order' }
  }

  let deadline: string | null = null
  if (input.deadline.trim()) {
    const d = parseLocalDate(input.deadline.trim())
    if (Number.isNaN(d.getTime())) return { ok: false, errorKey: 'annonce.error.deadline_past' }
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    if (d < today) return { ok: false, errorKey: 'annonce.error.deadline_past' }
    deadline = input.deadline.trim()
  }

  // Server action input is attacker-controlled and TS types are erased at runtime — `?? []`
  // guards a hand-crafted request with `skills` omitted or null from throwing on `.map`.
  const skills = (input.skills ?? []).map((s) => s.trim()).filter((s) => s.length > 0)
  if (skills.length > ANNONCE_SKILLS_MAX) {
    return { ok: false, errorKey: 'annonce.error.skills_max' }
  }
  if (skills.some((s) => s.length > SKILL_MAX_LEN)) {
    return { ok: false, errorKey: 'annonce.error.skills_length' }
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
      skills,
    },
  }
}
