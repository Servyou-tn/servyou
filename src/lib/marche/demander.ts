import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'

// Target resolution for /demander/[id]: one route serves both product and service
// requests. We try the id as a product first, then as a service_listing. Moderation is
// enforced the same way as the detail pages (status='active' + the parent/own
// admin_hidden_at IS NULL), so a hidden item can't be ordered (returns null → not-found).
// This shape feeds the form's display + summary card only; the server actions re-fetch the
// authoritative seller_id / price / stock themselves (never trusting the client).

function one<T>(embed: T | T[] | null | undefined): T | null {
  if (Array.isArray(embed)) return embed[0] ?? null
  return embed ?? null
}

function primaryImage(images: { image_url: string; display_order: number }[] | null): string | null {
  if (!images || images.length === 0) return null
  return [...images].sort((a, b) => a.display_order - b.display_order)[0]?.image_url ?? null
}

export type ProductRequestTarget = {
  id: string
  title: string
  price: number
  stockCount: number | null
  tracksStock: boolean
  imageUrl: string | null
  shop: { name: string; city: string | null }
}

export type ServiceRequestTarget = {
  id: string
  title: string
  startingPrice: number | null
  deliveryTime: string | null
  /** Summary-panel chips: the category first, then the freelancer's own tags. */
  category: string | null
  tags: string[]
  /**
   * The SELLER's instruction template (service_listings.buyer_briefing) — "what the client
   * must provide before work begins", authored in H6/H7. E1 renders it as guidance above the
   * description field, never as an input. Null on 20 of 21 rows today, so the null path is
   * the common one.
   */
  buyerBriefing: string | null
  freelancer: { name: string; headline: string | null; city: string | null }
}

export type RequestTarget =
  | { type: 'product'; data: ProductRequestTarget }
  | { type: 'service'; data: ServiceRequestTarget }

type ProductRow = {
  id: string
  title: string
  price_tnd: number | string
  tracks_stock: boolean | null
  stock_count: number | null
  shops: { name: string | null; city: string | null } | { name: string | null; city: string | null }[] | null
  product_images: { image_url: string; display_order: number }[] | null
}

type ServiceRow = {
  id: string
  title: string
  starting_price_tnd: number | string | null
  delivery_time: string | null
  buyer_briefing: string | null
  tags: string[] | null
  categories: { name_fr: string } | { name_fr: string }[] | null
  freelancer_profiles:
    | { profile_id: string | null; city: string | null; headline: string | null }
    | { profile_id: string | null; city: string | null; headline: string | null }[]
    | null
}

export const getRequestTarget = cache(async (id: string): Promise<RequestTarget | null> => {
  const supabase = await createClient()

  const { data: product, error: pErr } = await supabase
    .from('products')
    .select(
      `id, title, price_tnd, tracks_stock, stock_count, status,
       shops!inner ( name, city, admin_hidden_at ),
       product_images ( image_url, display_order )`,
    )
    .eq('id', id)
    .eq('status', 'active')
    .is('shops.admin_hidden_at', null)
    .maybeSingle()
  if (pErr) console.error('[demander] product fetch error:', pErr)

  if (product) {
    const row = product as unknown as ProductRow
    const shop = one(row.shops)
    return {
      type: 'product',
      data: {
        id: row.id,
        title: row.title,
        price: Number(row.price_tnd),
        stockCount: row.stock_count,
        tracksStock: Boolean(row.tracks_stock),
        imageUrl: primaryImage(row.product_images),
        shop: { name: shop?.name ?? '', city: shop?.city ?? null },
      },
    }
  }

  const { data: service, error: sErr } = await supabase
    .from('service_listings')
    .select(
      `id, title, starting_price_tnd, delivery_time, status, buyer_briefing, tags,
       categories ( name_fr ),
       freelancer_profiles!inner ( profile_id, city, headline, admin_hidden_at )`,
    )
    .eq('id', id)
    .eq('status', 'active')
    .is('admin_hidden_at', null)
    .is('freelancer_profiles.admin_hidden_at', null)
    .maybeSingle()
  if (sErr) console.error('[demander] service fetch error:', sErr)

  if (service) {
    const row = service as unknown as ServiceRow
    const fp = one(row.freelancer_profiles)
    let name = ''
    if (fp?.profile_id) {
      const { data: prof, error: prErr } = await supabase
        .from('public_profiles')
        .select('full_name')
        .eq('id', fp.profile_id)
        .maybeSingle()
      if (prErr) console.error('[demander] public_profiles error:', prErr)
      name = prof?.full_name ?? ''
    }
    return {
      type: 'service',
      data: {
        id: row.id,
        title: row.title,
        startingPrice: row.starting_price_tnd != null ? Number(row.starting_price_tnd) : null,
        deliveryTime: row.delivery_time ?? null,
        category: one(row.categories)?.name_fr ?? null,
        tags: row.tags ?? [],
        buyerBriefing: row.buyer_briefing ?? null,
        freelancer: { name, headline: fp?.headline ?? null, city: fp?.city ?? null },
      },
    }
  }

  return null
})

/**
 * The signed-in buyer's own phone, for prefilling E1's contact field. `profiles` is
 * owner-only read, so this resolves only for the caller's own row and returns null for a
 * buyer who has never set one — in which case the field renders empty and required, and the
 * number they type is captured on the order (not written back to the profile).
 */
export async function getBuyerPhone(userId: string): Promise<string | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('profiles')
    .select('phone')
    .eq('id', userId)
    .maybeSingle()
  if (error) console.error('[demander] buyer phone fetch error:', error.message, error.code, error.details)
  return data?.phone ?? null
}
