import { describe, it, expect } from 'vitest'
import { canonicalizeSkills, skillKey, splitSkills } from './skills-match'

describe('skillKey', () => {
  it('ignores case, accents and repeated whitespace', () => {
    expect(skillKey('  Rédaction   Web ')).toBe('redaction web')
    expect(skillKey('NEXT.JS')).toBe(skillKey('next.js'))
  })
})

describe('splitSkills — the pre-selection (D-H12-4)', () => {
  it('pre-selects the post skills I have, stored with the POST spelling', () => {
    const s = splitSkills(['React', 'Rédaction', 'Responsive'], ['react', 'redaction', 'Figma'])
    expect(s.preselected).toEqual(['React', 'Rédaction'])
    expect(s.required).toEqual(['React', 'Rédaction', 'Responsive'])
    expect(s.others).toEqual(['Figma'])
  })
  it('a near miss (« NextJS » vs « Next.js ») silently does not match — documented limit of exact-text skills', () => {
    expect(splitSkills(['Next.js'], ['NextJS']).preselected).toEqual([])
  })
  it('empty intersection → nothing pre-selected (the placeholder case)', () => {
    expect(splitSkills(['Logo'], ['Figma']).preselected).toEqual([])
  })
  it('de-duplicates each list', () => {
    const s = splitSkills(['React', 'react'], ['Figma', 'figma'])
    expect(s.required).toEqual(['React'])
    expect(s.others).toEqual(['Figma'])
  })
})

describe('canonicalizeSkills — the server-side pool check', () => {
  it('accepts post skills and my own, canonicalised to the pool spelling', () => {
    const r = canonicalizeSkills(['react', 'FIGMA'], ['React'], ['Figma'])
    expect(r).toEqual({ accepted: ['React', 'Figma'], rejected: [] })
  })
  it('REJECTS anything outside the pool (the action refuses the whole submit, it does not trim)', () => {
    const r = canonicalizeSkills(['React', 'Hacking'], ['React'], [])
    expect(r.accepted).toEqual(['React'])
    expect(r.rejected).toEqual(['Hacking'])
  })
  it('de-duplicates and ignores blanks', () => {
    expect(canonicalizeSkills(['React', 'react', ' '], ['React'], []).accepted).toEqual(['React'])
  })
  it('an empty pool accepts nothing', () => {
    expect(canonicalizeSkills(['React'], [], []).rejected).toEqual(['React'])
  })
})
