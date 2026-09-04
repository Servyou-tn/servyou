/**
 * `validateForPublish` (src/lib/marche/freelancer-profile-edit.ts) — the H3 publish gate, pure
 * so it's testable without a live DB. Three measured requirements only (404:12236/404:12845/
 * 404:12878's asterisks): headline non-empty, bio >= 100 chars, 3-15 skills. Must-test per
 * CLAUDE.md's testing discipline — this is the business rule that decides whether "Publier mon
 * profil" explains a blocker or proceeds to the is_published check.
 */
import { describe, it, expect } from 'vitest'
import { validateForPublish, BIO_MIN_FOR_PUBLISH, SKILLS_MIN_FOR_PUBLISH, SKILLS_MAX } from '@/lib/marche/freelancer-profile-edit'

const VALID = { headline: 'Développeur web full-stack', bio: 'x'.repeat(BIO_MIN_FOR_PUBLISH), skillsCount: SKILLS_MIN_FOR_PUBLISH }

describe('validateForPublish', () => {
  it('passes when all three measured requirements are met', () => {
    expect(validateForPublish(VALID)).toEqual({ ok: true })
  })

  it('flags a missing headline (whitespace-only counts as missing)', () => {
    const res = validateForPublish({ ...VALID, headline: '   ' })
    expect(res).toEqual({ ok: false, missing: ['headline'] })
  })

  it('flags a bio under the 100-character minimum the frame states literally', () => {
    const res = validateForPublish({ ...VALID, bio: 'x'.repeat(BIO_MIN_FOR_PUBLISH - 1) })
    expect(res).toEqual({ ok: false, missing: ['bio'] })
  })

  it('accepts a bio at exactly the minimum — not off-by-one', () => {
    const res = validateForPublish({ ...VALID, bio: 'x'.repeat(BIO_MIN_FOR_PUBLISH) })
    expect(res.ok).toBe(true)
  })

  it('flags fewer than 3 skills', () => {
    const res = validateForPublish({ ...VALID, skillsCount: SKILLS_MIN_FOR_PUBLISH - 1 })
    expect(res).toEqual({ ok: false, missing: ['skills'] })
  })

  it('flags more than 15 skills too — the measured helper text is "Minimum 3, maximum 15"', () => {
    const res = validateForPublish({ ...VALID, skillsCount: SKILLS_MAX + 1 })
    expect(res).toEqual({ ok: false, missing: ['skills'] })
  })

  it('collects every missing field at once, not just the first', () => {
    const res = validateForPublish({ headline: '', bio: '', skillsCount: 0 })
    expect(res).toEqual({ ok: false, missing: ['headline', 'bio', 'skills'] })
  })
})
