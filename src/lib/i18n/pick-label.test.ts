import { describe, expect, it } from 'vitest'
import { pickLabel } from './pick-label'
import { GOVERNORATES } from '@/lib/tunisia-governorates'

describe('pickLabel', () => {
  it('picks the interface language and falls back to French for English', () => {
    expect(pickLabel({ fr: 'Natif', ar: 'اللغة الأم', en: 'Native' }, 'en')).toBe('Native')
    expect(pickLabel({ fr: 'Sfax', ar: 'صفاقس' }, 'en')).toBe('Sfax')
    expect(pickLabel({ fr: 'Sfax', ar: 'صفاقس' }, 'ar')).toBe('صفاقس')
    expect(pickLabel({ fr: 'Le Kef', ar: 'الكاف', en: 'Kef' }, 'fr')).toBe('Le Kef')
  })
  it('every governorate has an English label with no accent', () => {
    for (const g of GOVERNORATES) expect(pickLabel(g, 'en')).toMatch(/^[A-Za-z ]+$/)
  })
})
