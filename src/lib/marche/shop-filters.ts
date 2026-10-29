import { createClient } from '@/lib/supabase/server'
import { reportQueryError } from '@/lib/supabase/query-error'
import type { FilterCategory } from '@/components/recherche/SearchFilters'

// Option lists for the « Boutiques » lens filters (B4). Both are scoped to PUBLIC shops (`admin_hidden_at IS NULL`) and to what shops
// actually declare, so no option can return an empty result — the same posture as filter-categories.ts / filter-cities.ts for the
// products and services lenses. SECONDARY to the results: a failure is reported and the control degrades to « no options » while the
// shop grid still renders.

type CatRow = {
  categories: { slug: string; name_fr: string; name_ar: string | null } | { slug: string; name_fr: string; name_ar: string | null }[] | null
}

/** The categories at least one public shop has declared (`shop_categories`), by French name. */
export async function getShopFilterCategories(): Promise<FilterCategory[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('shop_categories')
    .select('categories ( slug, name_fr, name_ar ), shops!inner ( admin_hidden_at )')
    .is('shops.admin_hidden_at', null)
  if (error) {
    reportQueryError('shop-filters categories', error)
    return []
  }
  const bySlug = new Map<string, FilterCategory>()
  for (const row of (data ?? []) as unknown as CatRow[]) {
    const c = Array.isArray(row.categories) ? row.categories[0] : row.categories
    if (c && !bySlug.has(c.slug)) bySlug.set(c.slug, { slug: c.slug, name_fr: c.name_fr, name_ar: c.name_ar ?? c.name_fr })
  }
  return [...bySlug.values()].sort((a, b) => a.name_fr.localeCompare(b.name_fr, 'fr'))
}

/** Distinct cities of public shops (free text, trimmed), French collation. */
export async function getShopCities(): Promise<string[]> {
  const supabase = await createClient()
  const { data, error } = await supabase.from('shops').select('city').is('admin_hidden_at', null)
  if (error) {
    reportQueryError('shop-filters cities', error)
    return []
  }
  const cities = new Set<string>()
  for (const row of data ?? []) {
    const city = row.city?.trim()
    if (city) cities.add(city)
  }
  return [...cities].sort((a, b) => a.localeCompare(b, 'fr'))
}
