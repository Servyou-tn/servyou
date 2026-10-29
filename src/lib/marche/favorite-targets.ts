import { createClient } from '@/lib/supabase/server'
import { failQuery } from '@/lib/supabase/query-error'
import { getShopCards, type ShopCardData } from './shop-cards'
import { getFreelancerCards, type FreelancerCardData } from './freelancer-cards'

/**
 * The caller's favorited SHOPS and FREELANCERS for /mes-favoris, newest favorite first. Complements `getMyFavorites` (products +
 * services), which is unchanged. RLS already hides favorites whose target is hidden / suspended; a target that disappears between
 * the two reads is dropped by the card loaders. A failed read throws (never « you have no favorites »); the page settle()s it.
 */
/** Most recent favorites loaded per call. Bounds the `.in()` URL lengths and the per-shop card queries; paging comes with the follow-up. */
export const FAVORITE_TARGETS_CAP = 60

export async function getMyFavoriteTargets(
  userId: string,
): Promise<{ shops: ShopCardData[]; freelancers: FreelancerCardData[] }> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('favorites')
    .select('item_type, shop_id, freelancer_profile_id, created_at')
    .eq('user_id', userId)
    .in('item_type', ['shop', 'freelancer'])
    .order('created_at', { ascending: false })
    .limit(FAVORITE_TARGETS_CAP)
  if (error) failQuery('favorite-targets favorites', error)

  const rows = data ?? []
  const shopIds = rows.flatMap((r) => (r.item_type === 'shop' && r.shop_id ? [r.shop_id] : []))
  const freelancerIds = rows.flatMap((r) =>
    r.item_type === 'freelancer' && r.freelancer_profile_id ? [r.freelancer_profile_id] : [],
  )

  const [shops, freelancers] = await Promise.all([getShopCards(shopIds), getFreelancerCards(freelancerIds)])
  return { shops, freelancers }
}
