import { uniqueSkills } from './skills-match'

// Pure validation for the minimal create-mission form. Extracted from the form + server
// action so the rules are unit-tested and shared by both. The DB (RLS: consumer_id =
// auth.uid() on INSERT) is the real authorization guard; these are app-layer UX checks
// that return i18n error keys. Budgets and deadline are optional.

// Skills — PR-D §6 RULING: optional, max 8, no minimum. Distinct from H2's SKILLS_MIN/SKILLS_MAX
// (3/15, CompetencesForm.tsx) — a different form, a different rule, not the same constant.
export const ANNONCE_SKILLS_MAX = 8
const SKILL_MAX_LEN = 60

// Length limits (F2 « 60 caractères maximum » / « 0/500 », founder ruling 2026-10-30). App-level only — NO DB constraint, so rows
// written before this rule may exceed them: an EDIT checks a field only when its text changed (`original`).
export const ANNONCE_TITLE_MAX = 60
export const ANNONCE_DESCRIPTION_MAX = 500

export type JobPostInput = {
  title: string
  description: string
  categoryId: string
  city: string
  /** The single « Budget approximatif » field (TND) — saved as budget_max, budget_min stays null. '' = no budget. */
  budget: string
  isRemote: boolean
  deadline: string // YYYY-MM-DD or ''
  skills: string[]
}

/** What an edit started from: a field is length-checked only when it differs from it. */
export type JobPostOriginal = { title: string; description: string }

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

export function validateJobPost(
  input: JobPostInput,
  now: Date = new Date(),
  original?: JobPostOriginal,
): JobPostValidation {
  const title = input.title.trim()
  if (!title) return { ok: false, errorKey: 'annonce.error.title_required' }
  if (title.length > ANNONCE_TITLE_MAX && title !== original?.title.trim()) {
    return { ok: false, errorKey: 'annonce.error.title_max' }
  }

  const description = input.description.trim()
  if (!description) return { ok: false, errorKey: 'annonce.error.description_required' }
  if (description.length > ANNONCE_DESCRIPTION_MAX && description !== original?.description.trim()) {
    return { ok: false, errorKey: 'annonce.error.description_max' }
  }

  if (!input.categoryId) return { ok: false, errorKey: 'annonce.error.category_required' }
  if (!input.city) return { ok: false, errorKey: 'annonce.error.city_required' }

  const budget_max = parseBudget(input.budget)
  if (budget_max === 'invalid') return { ok: false, errorKey: 'annonce.error.budget_invalid' }

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
  // De-duplicated accent- and case-insensitively (« Figma » and « figma » are one skill), keeping the first spelling.
  const skills = uniqueSkills(input.skills ?? [])
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
      // Older annonces may carry a min/max range; a NEW post never does (D3) — display handles both (format-job-budget.ts).
      budget_min: null,
      budget_max,
      is_remote: input.isRemote,
      deadline,
      skills,
    },
  }
}
