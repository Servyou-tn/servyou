import type { MyOrder } from '@/lib/marche/my-data'
import type { ProductListing } from '@/components/listings/ProductListingCard'
import type { ServiceListing } from '@/components/listings/ServiceListingCard'

// Pure, dependency-free helpers + the homepage shape-builder. Kept apart from
// homepage-data.ts (which imports the Supabase server client) so the assembly and the
// hasActivity logic are unit-testable in a plain Node env. Type-only imports above are
// erased at compile time, so this file pulls in no runtime/server modules.

export const ACTIVE_ORDERS_LIMIT = 4
export const FAVORITES_LIMIT = 6
export const RECENT_LIMIT = 8

const TERMINAL_STATUSES = new Set(['received', 'cancelled'])

/** An order is "active" (in-flight) until it reaches a terminal state. */
export function isActiveOrderStatus(status: string): boolean {
  return !TERMINAL_STATUSES.has(status)
}

/** The display first name: first whitespace-separated word of full_name ('' when absent). */
export function firstName(fullName: string | null | undefined): string {
  return (fullName ?? '').trim().split(/\s+/).filter(Boolean)[0] ?? ''
}

export type HomeFavorite =
  | { type: 'product'; product: ProductListing }
  | { type: 'service'; service: ServiceListing }

/**
 * Round-robin interleave of product + service favorites (each already newest-first),
 * capped at `limit`. Interleaving favors showing BOTH kinds in the teaser over strict
 * cross-type recency (the source arrays carry no shared timestamp to merge on).
 */
export function mergeFavorites(
  products: ProductListing[],
  services: ServiceListing[],
  limit: number = FAVORITES_LIMIT,
): HomeFavorite[] {
  const out: HomeFavorite[] = []
  const max = Math.max(products.length, services.length)
  for (let i = 0; i < max && out.length < limit; i++) {
    if (i < products.length && out.length < limit) {
      out.push({ type: 'product', product: products[i] })
    }
    if (i < services.length && out.length < limit) {
      out.push({ type: 'service', service: services[i] })
    }
  }
  return out
}

export type HomepageData = {
  activeOrders: MyOrder[]
  favorites: HomeFavorite[]
  recentProducts: ProductListing[]
  recentServices: ServiceListing[]
  hasActivity: boolean
}

export type HomepageInputs = {
  orders: MyOrder[]
  favProducts: ProductListing[]
  favServices: ServiceListing[]
  recentProducts: ProductListing[]
  recentServices: ServiceListing[]
}

/**
 * Assemble the homepage view-model from raw fetched data: filter orders to active +
 * cap, merge favorites + cap, cap recent strips, and compute the hasActivity flag
 * (used to branch the "returning user with history" vs "lean" rendering).
 */
export function buildHomepageData(input: HomepageInputs): HomepageData {
  const activeOrders = input.orders
    .filter((o) => isActiveOrderStatus(o.status))
    .slice(0, ACTIVE_ORDERS_LIMIT)
  const favorites = mergeFavorites(input.favProducts, input.favServices, FAVORITES_LIMIT)

  return {
    activeOrders,
    favorites,
    recentProducts: input.recentProducts.slice(0, RECENT_LIMIT),
    recentServices: input.recentServices.slice(0, RECENT_LIMIT),
    hasActivity: activeOrders.length > 0 || favorites.length > 0,
  }
}
