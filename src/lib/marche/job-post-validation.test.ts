import { describe, it, expect } from 'vitest'
import {
  ANNONCE_DESCRIPTION_MAX,
  ANNONCE_TITLE_MAX,
  validateJobPost,
  type JobPostInput,
} from './job-post-validation'

// A valid baseline; each test overrides one field to isolate a rule.
const base: JobPostInput = {
  title: 'CrÃ©ation de logo',
  description: 'Un logo moderne pour ma marque.',
  categoryId: 'cat-1',
  city: 'Tunis',
  budget: '',
  isRemote: false,
  deadline: '',
  skills: [],
}
const NOW = new Date(2026, 5, 15) // 2026-06-15 (injected, since Date.now varies)

describe('validateJobPost', () => {
  it('accepts a valid minimal post (optional fields empty)', () => {
    const r = validateJobPost(base, NOW)
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.value.title).toBe('CrÃ©ation de logo')
      expect(r.value.budget_min).toBeNull()
      expect(r.value.budget_max).toBeNull()
      expect(r.value.deadline).toBeNull()
      expect(r.value.is_remote).toBe(false)
    }
  })

  it('trims and rejects an empty title', () => {
    const r = validateJobPost({ ...base, title: '   ' }, NOW)
    expect(r).toEqual({ ok: false, errorKey: 'annonce.error.title_required' })
  })

  it('rejects an empty description', () => {
    const r = validateJobPost({ ...base, description: '' }, NOW)
    expect(r).toEqual({ ok: false, errorKey: 'annonce.error.description_required' })
  })

  it('rejects a missing category', () => {
    const r = validateJobPost({ ...base, categoryId: '' }, NOW)
    expect(r).toEqual({ ok: false, errorKey: 'annonce.error.category_required' })
  })

  it('rejects a missing city', () => {
    const r = validateJobPost({ ...base, city: '' }, NOW)
    expect(r).toEqual({ ok: false, errorKey: 'annonce.error.city_required' })
  })

  it('rejects a non-numeric or negative budget', () => {
    expect(validateJobPost({ ...base, budget: 'abc' }, NOW)).toEqual({
      ok: false,
      errorKey: 'annonce.error.budget_invalid',
    })
    expect(validateJobPost({ ...base, budget: '-5' }, NOW)).toEqual({
      ok: false,
      errorKey: 'annonce.error.budget_invalid',
    })
  })

  it('saves the single budget as budget_max and leaves budget_min null (founder ruling D3)', () => {
    const r = validateJobPost({ ...base, budget: '500' }, NOW)
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.value.budget_min).toBeNull()
      expect(r.value.budget_max).toBe(500)
    }
  })

  it('refuses a budget the numeric(10,2) column cannot hold, accepts the largest it can', () => {
    expect(validateJobPost({ ...base, budget: '100000000' }, NOW)).toEqual({
      ok: false,
      errorKey: 'annonce.error.budget_invalid',
    })
    expect(validateJobPost({ ...base, budget: '1e10' }, NOW)).toEqual({ ok: false, errorKey: 'annonce.error.budget_invalid' })
    expect(validateJobPost({ ...base, budget: '99999999.99' }, NOW).ok).toBe(true)
  })

  it('a stale client still sending budgetMin / budgetMax (no `budget`) is read as no budget, never a throw', () => {
    const stale = { ...base, budgetMin: '100', budgetMax: '500' } as unknown as JobPostInput
    delete (stale as Partial<JobPostInput>).budget
    const r = validateJobPost(stale, NOW)
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.value).toMatchObject({ budget_min: null, budget_max: null })
    const numeric = { ...base, budget: 500 } as unknown as JobPostInput
    expect(validateJobPost(numeric, NOW).ok).toBe(true)
  })

  it('a budget of 0 is a real value, an empty one is no budget', () => {
    const zero = validateJobPost({ ...base, budget: '0' }, NOW)
    expect(zero.ok && zero.value.budget_max).toBe(0)
    const none = validateJobPost({ ...base, budget: '  ' }, NOW)
    expect(none.ok && none.value.budget_max).toBeNull()
  })

  describe('length limits (60 title / 500 description)', () => {
    it('accepts exactly the limit, rejects one over — measured on the trimmed text', () => {
      expect(validateJobPost({ ...base, title: 'a'.repeat(ANNONCE_TITLE_MAX) }, NOW).ok).toBe(true)
      expect(validateJobPost({ ...base, title: `  ${'a'.repeat(ANNONCE_TITLE_MAX)}  ` }, NOW).ok).toBe(true)
      expect(validateJobPost({ ...base, title: 'a'.repeat(ANNONCE_TITLE_MAX + 1) }, NOW)).toEqual({
        ok: false,
        errorKey: 'annonce.error.title_max',
      })
      expect(validateJobPost({ ...base, description: 'a'.repeat(ANNONCE_DESCRIPTION_MAX) }, NOW).ok).toBe(true)
      expect(validateJobPost({ ...base, description: 'a'.repeat(ANNONCE_DESCRIPTION_MAX + 1) }, NOW)).toEqual({
        ok: false,
        errorKey: 'annonce.error.description_max',
      })
    })

    it('on an edit an UNCHANGED over-long field passes, a changed one is checked again', () => {
      const longTitle = 'a'.repeat(90)
      const longDescription = 'b'.repeat(800)
      const original = { title: longTitle, description: longDescription }
      expect(validateJobPost({ ...base, title: longTitle, description: longDescription }, NOW, original).ok).toBe(true)
      expect(validateJobPost({ ...base, title: `${longTitle}x`, description: longDescription }, NOW, original)).toEqual({
        ok: false,
        errorKey: 'annonce.error.title_max',
      })
      expect(validateJobPost({ ...base, title: 'Court', description: `${longDescription}x` }, NOW, original)).toEqual({
        ok: false,
        errorKey: 'annonce.error.description_max',
      })
    })
  })

  it('rejects a past deadline', () => {
    const r = validateJobPost({ ...base, deadline: '2026-06-14' }, NOW)
    expect(r).toEqual({ ok: false, errorKey: 'annonce.error.deadline_past' })
  })

  it('accepts today and future deadlines', () => {
    expect(validateJobPost({ ...base, deadline: '2026-06-15' }, NOW).ok).toBe(true)
    expect(validateJobPost({ ...base, deadline: '2026-12-31' }, NOW).ok).toBe(true)
  })

  it('trims skills and drops empties, no minimum required', () => {
    const r = validateJobPost({ ...base, skills: ['  Plomberie  ', '', '  '] }, NOW)
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.value.skills).toEqual(['Plomberie'])
  })

  it('accepts exactly 8 skills, rejects 9', () => {
    const eight = Array.from({ length: 8 }, (_, i) => `skill-${i}`)
    expect(validateJobPost({ ...base, skills: eight }, NOW).ok).toBe(true)
    const nine = Array.from({ length: 9 }, (_, i) => `skill-${i}`)
    expect(validateJobPost({ ...base, skills: nine }, NOW)).toEqual({
      ok: false,
      errorKey: 'annonce.error.skills_max',
    })
  })

  it('rejects a skill longer than 60 characters', () => {
    const r = validateJobPost({ ...base, skills: ['a'.repeat(61)] }, NOW)
    expect(r).toEqual({ ok: false, errorKey: 'annonce.error.skills_length' })
  })

  it('accepts a skill at exactly 60 characters', () => {
    const r = validateJobPost({ ...base, skills: ['a'.repeat(60)] }, NOW)
    expect(r.ok).toBe(true)
  })

  it('treats a missing skills array as empty rather than throwing', () => {
    const { skills: _skills, ...rest } = base
    const r = validateJobPost({ ...rest, skills: undefined as unknown as string[] }, NOW)
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.value.skills).toEqual([])
  })
})

describe('validateJobPost — an EDIT (original = the stored row)', () => {
  const original = { title: base.title, description: base.description, deadline: '2026-06-01', budgetMin: 200, budgetMax: 400 }

  it('keeps an old min–max budget while the single field stays at the stored max; changing it makes a single budget', () => {
    const same = validateJobPost({ ...base, budget: '400' }, NOW, original)
    expect(same.ok && same.value).toMatchObject({ budget_min: 200, budget_max: 400 })
    const changed = validateJobPost({ ...base, budget: '350' }, NOW, original)
    expect(changed.ok && changed.value).toMatchObject({ budget_min: null, budget_max: 350 })
    const cleared = validateJobPost({ ...base, budget: '' }, NOW, original)
    expect(cleared.ok && cleared.value).toMatchObject({ budget_min: null, budget_max: null })
  })

  it('an old « à partir de » budget (a min, no max) keeps its min while the field stays empty, and becomes a single budget once an amount is typed', () => {
    const fromOnly = { ...original, budgetMin: 300, budgetMax: null }
    const kept = validateJobPost({ ...base, budget: '' }, NOW, fromOnly)
    expect(kept.ok && kept.value).toMatchObject({ budget_min: 300, budget_max: null })
    const typed = validateJobPost({ ...base, budget: '500' }, NOW, fromOnly)
    expect(typed.ok && typed.value).toMatchObject({ budget_min: null, budget_max: 500 })
  })

  it('never invents a min: a create (no original) and a single-budget original both give budget_min null', () => {
    const create = validateJobPost({ ...base, budget: '400' }, NOW)
    expect(create.ok && create.value.budget_min).toBeNull()
    const single = validateJobPost({ ...base, budget: '400' }, NOW, { ...original, budgetMin: null })
    expect(single.ok && single.value.budget_min).toBeNull()
  })

  it('a deadline left at its stored value is fine even once past; a NEW past deadline is still refused', () => {
    expect(validateJobPost({ ...base, deadline: '2026-06-01' }, NOW, original).ok).toBe(true)
    expect(validateJobPost({ ...base, deadline: '2026-06-02' }, NOW, original)).toEqual({ ok: false, errorKey: 'annonce.error.deadline_past' })
    expect(validateJobPost({ ...base, deadline: '2026-06-01' }, NOW)).toEqual({ ok: false, errorKey: 'annonce.error.deadline_past' })
  })
})

describe('skills — de-duplicated, accent- and case-insensitively (missions PR-4)', () => {
  it('keeps the first spelling and drops repeats', () => {
    const r = validateJobPost({ ...base, skills: ['Figma', 'figma', ' Rédaction ', 'redaction', ''] }, NOW)
    expect(r.ok && r.value.skills).toEqual(['Figma', 'Rédaction'])
  })
})
