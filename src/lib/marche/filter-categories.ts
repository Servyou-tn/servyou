import { createClient } from '@/lib/supabase/server'
import type { FilterCategory } from '@/components/recherche/SearchFilters'
import type { SearchType } from '@/lib/search/search-params'
import { distinctActiveCategoryIds } from './category-scope'

// The category-filter list for one browse engine, scoped by USAGE (see category-scope.ts):
// only categories that have ≥1 active listing of the given type, ordered by French name.
// Two small queries — the active rows' category_ids, then the matching category labels —
// matching the rest of the marketplace's small-data posture. Errors are surfaced (never a
// silent empty list): a query failure logs and returns [] so the filter degrades to "no
// categories" rather than crashing the page.
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
    console.error(`[filter-categories] ${table} category_id fetch error:`, error)
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
    console.error('[filter-categories] categories fetch error:', catsError)
    return []
  }
  return (cats ?? []) as FilterCategory[]
}
