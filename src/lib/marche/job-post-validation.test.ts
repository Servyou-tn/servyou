import { describe, it, expect } from 'vitest'
import { validateJobPost, type JobPostInput } from './job-post-validation'

// A valid baseline; each test overrides one field to isolate a rule.
const base: JobPostInput = {
  title: 'Création de logo',
  description: 'Un logo moderne pour ma marque.',
  categoryId: 'cat-1',
  city: 'Tunis',
  budgetMin: '',
  budgetMax: '',
  isRemote: false,
  deadline: '',
}
const NOW = new Date(2026, 5, 15) // 2026-06-15 (injected, since Date.now varies)

describe('validateJobPost', () => {
  it('accepts a valid minimal post (optional fields empty)', () => {
    const r = validateJobPost(base, NOW)
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.value.title).toBe('Création de logo')
      expect(r.value.budget_min).toBeNull()
      expect(r.value.budget_max).toBeNull()
      expect(r.value.deadline).toBeNull()
      expect(r.value.is_remote).toBe(false)
    }
  })

  it('trims and rejects an empty title', () => {
    const r = validateJobPost({ ...base, title: '   ' }, NOW)
    expect(r).toEqual({ ok: false, errorKey: 'mission.error.title_required' })
  })

  it('rejects an empty description', () => {
    const r = validateJobPost({ ...base, description: '' }, NOW)
    expect(r).toEqual({ ok: false, errorKey: 'mission.error.description_required' })
  })

  it('rejects a missing category', () => {
    const r = validateJobPost({ ...base, categoryId: '' }, NOW)
    expect(r).toEqual({ ok: false, errorKey: 'mission.error.category_required' })
  })

  it('rejects a missing city', () => {
    const r = validateJobPost({ ...base, city: '' }, NOW)
    expect(r).toEqual({ ok: false, errorKey: 'mission.error.city_required' })
  })

  it('rejects a non-numeric or negative budget', () => {
    expect(validateJobPost({ ...base, budgetMin: 'abc' }, NOW)).toEqual({
      ok: false,
      errorKey: 'mission.error.budget_invalid',
    })
    expect(validateJobPost({ ...base, budgetMax: '-5' }, NOW)).toEqual({
      ok: false,
      errorKey: 'mission.error.budget_invalid',
    })
  })

  it('rejects min greater than max', () => {
    const r = validateJobPost({ ...base, budgetMin: '500', budgetMax: '100' }, NOW)
    expect(r).toEqual({ ok: false, errorKey: 'mission.error.budget_order' })
  })

  it('accepts a valid budget range', () => {
    const r = validateJobPost({ ...base, budgetMin: '100', budgetMax: '500' }, NOW)
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.value.budget_min).toBe(100)
      expect(r.value.budget_max).toBe(500)
    }
  })

  it('rejects a past deadline', () => {
    const r = validateJobPost({ ...base, deadline: '2026-06-14' }, NOW)
    expect(r).toEqual({ ok: false, errorKey: 'mission.error.deadline_past' })
  })

  it('accepts today and future deadlines', () => {
    expect(validateJobPost({ ...base, deadline: '2026-06-15' }, NOW).ok).toBe(true)
    expect(validateJobPost({ ...base, deadline: '2026-12-31' }, NOW).ok).toBe(true)
  })
})
