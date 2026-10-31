import type { SupabaseClient } from '@supabase/supabase-js'
import { pickTopSector } from '@/lib/social/platforms'

type ListingRow = {
  created_at: string
  categories: { slug: string } | { slug: string }[] | null
}

/**
 * The sector slug that holds most of a freelancer's service listings (a tie goes to the sector of the most recent one) — what picks the links editor's
 * suggested platforms. Drafts do not count: they are not what the freelancer sells yet. `null` when there is no listing, or the read fails (the editor then
 * shows the default suggestions; the failure is logged, never thrown — a suggestion is not worth a broken page).
 */
export async function getFreelancerTopSector(supabase: SupabaseClient, freelancerProfileId: string): Promise<string | null> {
  // `categories!service_listings_category_id_fkey`: service_listings has TWO foreign keys to categories (category_id = the sector, subcategory_id).
  const { data, error } = await supabase
    .from('service_listings')
    .select('created_at, categories!service_listings_category_id_fkey ( slug )')
    .eq('freelancer_profile_id', freelancerProfileId)
    .neq('status', 'draft')
  if (error) {
    console.error('[getFreelancerTopSector] service_listings fetch failed:', error.message, error.code, error.details)
    return null
  }
  return pickTopSector(
    ((data ?? []) as ListingRow[]).map((r) => {
      const category = Array.isArray(r.categories) ? r.categories[0] : r.categories
      return { sector: category?.slug ?? null, createdAt: r.created_at }
    }),
  )
}
