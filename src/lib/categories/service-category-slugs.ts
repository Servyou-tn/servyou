import { serviceCategories } from '@/lib/taxonomy/service-categories'

// Which category slugs belong to the SERVICE taxonomy (13 sectors + their 91 subcategories, the stable slugs of
// lib/taxonomy/service-categories.ts — the same values the categories table holds since the cutover). /categories/[slug] uses it to
// pick the catalogue when the URL does not say (`?type=` absent): a service sector opens on its services, not on an empty
// product grid.
const SERVICE_SLUGS: ReadonlySet<string> = new Set(
  serviceCategories.flatMap((sector) => [sector.id, ...sector.subcategories.map((sub) => sub.id)]),
)

export function isServiceCategorySlug(slug: string): boolean {
  return SERVICE_SLUGS.has(slug)
}

/**
 * Which catalogue /categories/[slug] shows. `?type=` wins when it is present and non-empty (an array takes its first value; anything other than
 * « service » is the product catalogue, as parseSearchParams reads it); without it the slug decides — a service-taxonomy slug opens on its services.
 */
export function categoryCatalogue(rawType: string | string[] | undefined, slug: string): 'service' | 'product' {
  const explicit = Array.isArray(rawType) ? rawType[0] : rawType
  if (explicit) return explicit === 'service' ? 'service' : 'product'
  return isServiceCategorySlug(slug) ? 'service' : 'product'
}

/**
 * Sub-category chips in the TAXONOMY's order (docs/design/taxonomy-services.md, locked), not the alphabetical order the query returns — and not the
 * order the C2 frame happens to draw its mock chips in (D4).
 * A slug the taxonomy does not know sorts after the known ones, alphabetically — a DB row ahead of the TS file never disappears.
 */
export function orderByTaxonomy<T extends { slug: string; name_fr: string }>(items: T[], sectorSlug: string): T[] {
  const order = new Map(
    (serviceCategories.find((s) => s.id === sectorSlug)?.subcategories ?? []).map((sub, i) => [sub.id, i] as const),
  )
  const rank = (slug: string) => order.get(slug) ?? Number.MAX_SAFE_INTEGER
  return [...items].sort((a, b) => rank(a.slug) - rank(b.slug) || a.name_fr.localeCompare(b.name_fr, 'fr'))
}
