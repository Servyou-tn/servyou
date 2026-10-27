import { createClient } from '@/lib/supabase/server'
import type { FilterCategory } from '@/components/recherche/SearchFilters'
import type { SearchType } from '@/lib/search/search-params'
import { distinctActiveCategoryIds } from './category-scope'
import { reportQueryError } from '@/lib/supabase/query-error'

// The category-filter list for one browse engine, scoped by USAGE (see category-scope.ts):
// only categories that have ≥1 active listing of the given type, ordered by French name.
// Two small queries — the active rows' category_ids, then the matching category labels —
// matching the rest of the marketplace's small-data posture. SECONDARY to the results grid: a
// failure here is reported (log + Sentry, loader-error-surfacing plan) and the filter degrades to
// "no categories" while the results still render — it must not take the whole page down.
export async function getFilterCategoriesForType(
  type: SearchType,
): Promise<FilterCategory[]> {
  const supabase = await createClient()
  const table = type === 'product' ? 'products' : 'service_listings'
  // The moderated parent differs by catalogue: a product hangs off a shop, a service off a
  // freelancer profile. Both are filtered so this list can only offer a category that still
  // has a VISIBLE listing behind it — the option list has to be scoped exactly like the result
  // query (lib/search/search-marketplace.ts), or moderation leaves a category that returns
  // nothing. Row + parent, both mechanisms (see lib/marche/data.ts for why status is not enough).
  const parent = type === 'product' ? 'shops' : 'freelancer_profiles'

  const { data: rows, error } = await supabase
    .from(table)
    .select(`category_id, ${parent}!inner(admin_hidden_at)`)
    .eq('status', 'active')
    .is('admin_hidden_at', null)
    .is(`${parent}.admin_hidden_at`, null)
  if (error) {
    reportQueryError(`filter-categories ${table} category_id`, error)
    return []
  }

  const ids = distinctActiveCategoryIds(
    (rows ?? []) as { category_id: string | null }[],
  )
  if (ids.length === 0) return []

  const { data: cats, error: catsError } = await supabase
    .from('categories')
    .select('slug, name_fr, name_ar')
    .in('id', ids)
    .order('name_fr')
  if (catsError) {
    reportQueryError('filter-categories categories', catsError)
    return []
  }
  return (cats ?? []) as FilterCategory[]
}
