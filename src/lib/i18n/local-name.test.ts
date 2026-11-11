import { describe, expect, it } from 'vitest'
import { localName } from './local-name'

describe('localName', () => {
  const row = { name_fr: 'Mode', name_ar: 'أزياء', name_en: 'Fashion' }
  it('picks the interface language', () => {
    expect(localName(row, 'fr')).toBe('Mode')
    expect(localName(row, 'ar')).toBe('أزياء')
    expect(localName(row, 'en')).toBe('Fashion')
  })
  it('falls back to French when a name is missing or empty', () => {
    expect(localName({ name_fr: 'Mode', name_en: null }, 'en')).toBe('Mode')
    expect(localName({ name_fr: 'Mode', name_ar: '' }, 'ar')).toBe('Mode')
    expect(localName({ name_fr: 'Mode' }, 'en')).toBe('Mode')
  })
})
