import { getMyOrders, getMyFavorites } from '@/lib/marche/my-data'
import { getActiveProducts, getActiveServices } from '@/lib/marche/data'
import { buildHomepageData, type HomepageData } from './homepage-utils'

// Server entry point for the logged-in consumer homepage. Runs the four reads in
// parallel (all reuse the existing, tested account/marketplace data layer), then hands
// the raw results to the pure buildHomepageData assembler. Recent products/services
// reuse /marche's exact active-status filter (status='active', newest first).
export async function getConsumerHomepageData(userId: string): Promise<HomepageData> {
  const [orders, favorites, recentProducts, recentServices] = await Promise.all([
    getMyOrders(userId),
    getMyFavorites(userId),
    getActiveProducts(),
    getActiveServices(),
  ])

  return buildHomepageData({
    orders,
    favProducts: favorites.products,
    favServices: favorites.services,
    recentProducts,
    recentServices,
  })
}
