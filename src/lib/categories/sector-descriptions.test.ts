import { describe, it, expect } from 'vitest'
import { fr } from '@/lib/i18n/fr'
import { ar } from '@/lib/i18n/ar'
import { serviceCategories } from '@/lib/taxonomy/service-categories'

// C2 shows `category.description.<sector-slug>` under the title when the key exists (CategoryServicesPage looks it up by slug). Every one of the 13
// sectors has one, in both languages, and none points at a slug that is not a sector (a typo would silently show nothing).
const PREFIX = 'category.description.'
const keys = (d: Record<string, string>) => Object.keys(d).filter((k) => k.startsWith(PREFIX)).map((k) => k.slice(PREFIX.length))

describe('sector descriptions', () => {
  const sectors = serviceCategories.map((s) => s.id)

  it('every service sector has a non-empty French and Arabic description', () => {
    for (const id of sectors) {
      expect(fr[PREFIX + id]?.trim(), `fr ${id}`).toBeTruthy()
      expect(ar[PREFIX + id]?.trim(), `ar ${id}`).toBeTruthy()
    }
  })

  it('no description key targets anything but a sector, and fr / ar have the same set', () => {
    expect(keys(fr).sort()).toEqual([...sectors].sort())
    expect(keys(ar).sort()).toEqual([...sectors].sort())
  })

  it('reads as one sentence: ends with a full stop, no raw placeholder, Arabic text is Arabic', () => {
    for (const id of sectors) {
      expect(fr[PREFIX + id]).toMatch(/\.$/)
      expect(ar[PREFIX + id]).toMatch(/\.$/)
      expect(fr[PREFIX + id]).not.toMatch(/[{}]/)
      expect(ar[PREFIX + id]).toMatch(/[\u0600-\u06FF]/)
    }
  })
})
