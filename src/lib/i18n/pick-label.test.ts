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

describe('platformExample', () => {
  it('reads « your-… » in English and stays as written in French / Arabic', async () => {
    const { platformExample } = await import('@/lib/social/platforms')
    expect(platformExample('github', 'en')).toBe('https://github.com/your-name')
    expect(platformExample('youtube', 'en')).toBe('https://youtube.com/@your-channel')
    expect(platformExample('website', 'en')).toBe('https://your-site.tn')
    expect(platformExample('github', 'fr')).toBe('https://github.com/votre-nom')
  })
})
