import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import type { ProductListing } from '@/components/listings/ProductListingCard'
import type { PaymentMethod, ShopType, DeliverySetup } from '@/lib/types/shop-config'

// D3 « Boutique publique » — /boutique/[id]. Bare uuid, no slug column (docs/follow-ups.md,
// "D3 URL shape — RESOLVED 2026-08-12"). Mirrors product-detail.ts's shape exactly: React
// cache() so generateMetadata + the page share one fetch, admin_hidden_at moderation preserved,
// public read (shops/shop_payment_methods/shop_categories are all public-select).

export type ShopDetailData = {
  id: string
  name: string
  description: string | null
  city: string | null
  logoUrl: string | null
  bannerUrl: string | null
  shopType: ShopType | null
  deliverySetup: DeliverySetup | null
  createdAt: string
  paymentMethods: PaymentMethod[]
  categories: { name_fr: string; name_ar: string | null }[]
}

type ShopRow = {
  id: string
  name: string
  description: string | null
  city: string | null
  logo_url: string | null
  banner_url: string | null
  shop_type: ShopType | null
  delivery_setup: DeliverySetup | null
  created_at: string
  shop_payment_methods: { method: PaymentMethod }[] | null
  shop_categories: { categories: { name_fr: string; name_ar: string | null } | { name_fr: string; name_ar: string | null }[] | null }[] | null
}

function one<T>(embed: T | T[] | null | undefined): T | null {
  if (Array.isArray(embed)) return embed[0] ?? null
  return embed ?? null
}

// Wrapped in cache() so generateMetadata + the page render share a single fetch per request,
// same reason as getProductDetail.
export const getShopDetail = cache(async (id: string): Promise<ShopDetailData | null> => {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('shops')
    .select(
      `id, name, description, city, logo_url, banner_url, shop_type, delivery_setup, created_at, admin_hidden_at,
       shop_payment_methods ( method ),
       shop_categories ( categories ( name_fr, name_ar ) )`,
    )
    .eq('id', id)
    .is('admin_hidden_at', null)
    .maybeSingle()

  if (error) {
    console.error('[shop-detail] fetch error:', error.message, error.code, error.details)
    return null
  }
  if (!data) return null

  const row = data as unknown as ShopRow

  return {
    id: row.id,
    name: row.name,
    description: row.description ?? null,
    city: row.city ?? null,
    logoUrl: row.logo_url ?? null,
    bannerUrl: row.banner_url ?? null,
    shopType: row.shop_type ?? null,
    deliverySetup: row.delivery_setup ?? null,
    createdAt: row.created_at,
    paymentMethods: (row.shop_payment_methods ?? []).map((r) => r.method),
    categories: (row.shop_categories ?? [])
      .map((r) => one(r.categories))
      .filter((c): c is { name_fr: string; name_ar: string | null } => c !== null),
  }
})

type ShopProductRow = {
  id: string
  title: string
  description: string | null
  price_tnd: number | string
  categories: { name_fr: string; name_ar: string | null } | { name_fr: string; name_ar: string | null }[] | null
  product_images: { image_url: string; display_order: number }[] | null
}

function primaryImage(images: { image_url: string; display_order: number }[] | null): string | null {
  if (!images || images.length === 0) return null
  return [...images].sort((a, b) => a.display_order - b.display_order)[0]?.image_url ?? null
}

// All ACTIVE products for the storefront grid. status='active' is the same filter every public
// browse surface in this codebase uses (data.ts, product-detail.ts's related row, demander.ts) —
// it already excludes both 'hidden' and 'sold_out'; nothing in the app currently writes
// 'sold_out' (product-stock.ts's own header note), so this is not a special case, it is the
// existing convention. shop.name/city are already known by the caller (getShopDetail), so they
// are NOT re-selected here — only what ProductBrowseCard needs beyond that.
//
// No .limit()/pagination: unlike C1's marketplace-wide grid (which needs both because it spans
// every shop), this query is bounded by what ONE shop lists — the Figma frame draws no pagination
// control here either. A cap here would silently hide products past the threshold with nothing on
// screen telling a visitor they exist; if a single shop's catalog ever grows large enough to make
// this query slow, that is the trigger to add C1's own Pagination component, not a silent cap.
export async function getShopProducts(shopId: string, shopName: string, shopCity: string | null): Promise<ProductListing[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('products')
    .select('id, title, description, price_tnd, categories ( name_fr, name_ar ), product_images ( image_url, display_order )')
    .eq('shop_id', shopId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[shop-detail] products fetch error:', error.message, error.code, error.details)
    return []
  }

  return ((data ?? []) as unknown as ShopProductRow[]).map((row) => {
    const category = one(row.categories)
    return {
      id: row.id,
      title: row.title,
      description: row.description ?? null,
      price_tnd: Number(row.price_tnd),
      image_url: primaryImage(row.product_images),
      shop: { name: shopName, city: shopCity },
      category: category ? { name_fr: category.name_fr, name_ar: category.name_ar ?? undefined } : null,
    }
  })
}
