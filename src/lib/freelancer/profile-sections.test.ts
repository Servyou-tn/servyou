import { describe, expect, it } from 'vitest'
import { EDIT_PROFILE_PATH, PROFILE_SECTIONS, parseProfileSection, profileSectionHref } from './profile-sections'

describe('profile sections (dashboard « Force du profil » → H3)', () => {
  it('every section has a link that parses back to itself', () => {
    for (const s of PROFILE_SECTIONS) {
      expect(profileSectionHref(s)).toBe(`${EDIT_PROFILE_PATH}?section=${s}`)
      expect(parseProfileSection(s)).toBe(s)
    }
  })

  it('the five checklist targets exist', () => {
    expect([...PROFILE_SECTIONS]).toEqual(['photo', 'bio', 'competences', 'realisations', 'liens'])
  })

  it.each([undefined, null, '', 'unknown', 'BIO', ' bio', 'bio ', '__proto__', 'constructor', '../x', '<script>'])('%j is not a section', (v) => {
    expect(parseProfileSection(v as never)).toBeNull()
  })

  it('takes the first value of a repeated parameter, and refuses a repeated bad one', () => {
    expect(parseProfileSection(['liens', 'bio'])).toBe('liens')
    expect(parseProfileSection(['nope', 'bio'])).toBeNull()
  })
})
