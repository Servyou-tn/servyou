import { createClient } from '@/lib/supabase/server'
import { reportQueryError } from '@/lib/supabase/query-error'

// The city list of the « Freelances » lens filter (Figma 662:53894). Scoped to what a stranger can browse — PUBLISHED, non-moderated
// freelancers, exactly the set searchFreelancers lists — so no option can return an empty grid. SECONDARY to the results: a failure is
// reported and the control degrades to « no options » while the grid still renders. (The Catégorie list reuses
// getFilterCategoriesForType('service'): the sectors that have an active, visible listing.)

/** Distinct cities of published freelancers (free text, trimmed), French collation. */
export async function getFreelancerCities(): Promise<string[]> {
  const supabase = await createClient()
  const { data, error } = await supabase.from('freelancer_profiles').select('city').eq('is_published', true).is('admin_hidden_at', null)
  if (error) {
    reportQueryError('freelancer-filters cities', error)
    return []
  }
  const cities = new Set<string>()
  for (const row of data ?? []) {
    const city = row.city?.trim()
    if (city) cities.add(city)
  }
  return [...cities].sort((a, b) => a.localeCompare(b, 'fr'))
}
