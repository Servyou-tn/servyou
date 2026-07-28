import { createClient } from '@/lib/supabase/server'

// The Ville filter's option list for /marche/services: the distinct freelancer cities that have
// ≥1 active service listing. City lives on freelancer_profiles, reached through the same embed
// the search layer uses, so the picker can only ever offer a city that returns results — no dead
// options. Free-text column, so values are compared/deduped after trimming.
//
// Small-data posture (matches filter-categories.ts): one query, distinct + French collation sort
// in JS rather than a DISTINCT/RPC round-trip. Errors are surfaced, never a silent empty list —
// a failure logs and returns [] so the control degrades to "no cities" instead of crashing the
// page. Revisit with a DISTINCT query or a materialized city list when the catalog grows.
type CityRow = {
  freelancer_profiles: { city: string | null } | { city: string | null }[] | null
}

export async function getServiceCities(): Promise<string[]> {
  const supabase = await createClient()
  // Moderation: mirror the result query exactly (lib/search/search-marketplace.ts). If a
  // moderated freelancer's city stayed in this list the picker would offer an option whose
  // result set is now empty — and before the result query was filtered, selecting it surfaced
  // precisely the listings moderation was meant to remove. Row + parent, both mechanisms.
  const { data, error } = await supabase
    .from('service_listings')
    .select('freelancer_profiles!inner(city, admin_hidden_at)')
    .eq('status', 'active')
    .is('admin_hidden_at', null)
    .is('freelancer_profiles.admin_hidden_at', null)
  if (error) {
    console.error(
      '[filter-cities] service cities fetch error:',
      error.message,
      error.code,
      error.details,
    )
    return []
  }

  const cities = new Set<string>()
  for (const row of (data ?? []) as unknown as CityRow[]) {
    const fp = Array.isArray(row.freelancer_profiles)
      ? row.freelancer_profiles[0]
      : row.freelancer_profiles
    const city = fp?.city?.trim()
    if (city) cities.add(city)
  }
  return [...cities].sort((a, b) => a.localeCompare(b, 'fr'))
}
