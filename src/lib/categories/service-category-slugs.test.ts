import { describe, it, expect } from 'vitest'
import { serviceCategories } from '@/lib/taxonomy/service-categories'
import { categoryCatalogue, isServiceCategorySlug, orderByTaxonomy } from './service-category-slugs'

describe('isServiceCategorySlug', () => {
  it('recognises every sector and every subcategory of the service taxonomy', () => {
    for (const sector of serviceCategories) {
      expect(isServiceCategorySlug(sector.id)).toBe(true)
      for (const sub of sector.subcategories) expect(isServiceCategorySlug(sub.id)).toBe(true)
    }
  })

  it('rejects anything else — a product category, an unknown slug, a near miss', () => {
    expect(isServiceCategorySlug('vetements')).toBe(false)
    expect(isServiceCategorySlug('')).toBe(false)
    expect(isServiceCategorySlug('design-graphique')).toBe(false) // the pre-2026-09-07 id, renamed
    expect(isServiceCategorySlug('Design-Graphique-Logo')).toBe(false) // slugs are lower-case, exact
  })
})

describe('orderByTaxonomy', () => {
  const design = serviceCategories.find((s) => s.id === 'design-graphique-logo')!
  const rows = (slugs: string[]) => slugs.map((slug) => ({ slug, name_fr: slug }))

  it('returns the chips in the taxonomy order, whatever order the query gave', () => {
    const ids = design.subcategories.map((s) => s.id)
    const shuffled = [...ids].reverse()
    expect(orderByTaxonomy(rows(shuffled), 'design-graphique-logo').map((r) => r.slug)).toEqual(ids)
  })

  it('puts a slug the taxonomy does not know after the known ones, alphabetically, and never drops it', () => {
    const first = design.subcategories[0].id
    const out = orderByTaxonomy(rows(['zeta-inconnu', 'alpha-inconnu', first]), 'design-graphique-logo').map((r) => r.slug)
    expect(out).toEqual([first, 'alpha-inconnu', 'zeta-inconnu'])
  })

  it('does not mutate its input, and keeps everything alphabetical for an unknown sector', () => {
    const input = rows(['b', 'a'])
    expect(orderByTaxonomy(input, 'no-such-sector').map((r) => r.slug)).toEqual(['a', 'b'])
    expect(input.map((r) => r.slug)).toEqual(['b', 'a'])
  })
})

describe('categoryCatalogue', () => {
  it('a service slug opens on its services, any other slug on its products, when ?type= is absent or empty', () => {
    expect(categoryCatalogue(undefined, 'design-graphique-logo')).toBe('service')
    expect(categoryCatalogue('', 'design-graphique-logo')).toBe('service')
    expect(categoryCatalogue(undefined, 'vetements')).toBe('product')
  })

  it('?type= wins over the slug, both ways', () => {
    expect(categoryCatalogue('product', 'design-graphique-logo')).toBe('product')
    expect(categoryCatalogue('service', 'vetements')).toBe('service')
  })

  it('takes the first value of a repeated ?type=, and reads garbage as products (as parseSearchParams does)', () => {
    expect(categoryCatalogue(['service', 'product'], 'vetements')).toBe('service')
    expect(categoryCatalogue(['product', 'service'], 'design-graphique-logo')).toBe('product')
    expect(categoryCatalogue('banane', 'design-graphique-logo')).toBe('product')
  })
})
