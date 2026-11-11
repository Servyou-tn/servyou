import { describe, expect, it } from 'vitest'
import { serviceCategories } from './service-categories'
import { skillLabel, skillLabelPair, skillTextLabel } from '@/lib/freelance/service-draft'

// A label with French accents or French link words is not a brand name: it needs an English label.
const looksFrench = (s: string) => /[éèêàâçùûôîï]|\b(de|des|du|la|le|les|et|à|sur|mesure)\b|\b[dl]'/i.test(s)

describe('service taxonomy in English', () => {
  it('every French-worded sector, subcategory and skill has an English label', () => {
    const missing: string[] = []
    for (const sector of serviceCategories) {
      if (looksFrench(sector.labelFr) && !sector.labelEn) missing.push(sector.id)
      for (const x of [...sector.subcategories, ...sector.skills]) if (looksFrench(x.labelFr) && !x.labelEn) missing.push(x.id)
    }
    expect(missing).toEqual([])
  })

  it('skill labels pick English, and tool names stay as they are', () => {
    expect(skillLabel('typographie', 'en')).toBe('typography')
    expect(skillLabel('typographie', 'fr')).toBe('typographie')
    expect(skillLabel('react', 'en')).toBe('React')
    expect(skillLabelPair('relecture')).toEqual({ fr: 'relecture', ar: expect.any(String), en: 'proofreading' })
    // A skill that shares its id with a subcategory keeps its own short, lower-case English.
    expect(skillLabel('copywriting', 'en')).toBe('copywriting')
    expect(skillLabel('photo-de-profil', 'en')).toBe('profile photo')
    expect(skillLabel('traduction', 'en')).toBe('translation')
  })

  it('a skill stored as French text shows in English; custom text and FR / AR stay as stored', () => {
    expect(skillTextLabel('gestion de projet', 'en')).toBe('project management')
    expect(skillTextLabel('Gestion de projet', 'en')).toBe('project management')
    expect(skillTextLabel('gestion de projet', 'fr')).toBe('gestion de projet')
    expect(skillTextLabel('gestion de projet', 'ar')).toBe('gestion de projet')
    expect(skillTextLabel('Mon savoir-faire maison', 'en')).toBe('Mon savoir-faire maison')
  })
})
