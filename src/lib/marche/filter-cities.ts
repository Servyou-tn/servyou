import { createClient } from '@/lib/supabase/server'

// The city-filter list for /marche/services: distinct freelancer cities that have ≥1 active
// service listing (city lives on freelancer_profiles, joined via !inner — same embed the
// search layer uses). Small-data posture: one query, distinct + French sort in JS. Errors are
// surfaced (never a silent empty list) — a failure logs and returns [] so the filter degrades
// to "no cities" rather than crashing the page.
type CityRow = {
  freelancer_profiles: { city: string | null } | { city: string | null }[] | null
}

export async function getServiceCities(): Promise<string[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('service_listings')
    .select('freelancer_profiles!inner(city)')
    .eq('status', 'active')
  if (error) {
    console.error('[filter-cities] service cities fetch error:', error.message, error.code)
    return []
  }

  const cities = new Set<string>()
  for (const row of (data ?? []) as CityRow[]) {
    const fp = Array.isArray(row.freelancer_profiles)
      ? row.freelancer_profiles[0]
      : row.freelancer_profiles
    const c = fp?.city?.trim()
    if (c) cities.add(c)
  }
  return [...cities].sort((a, b) => a.localeCompare(b, 'fr'))
}
