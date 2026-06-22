import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import type { ProductListing } from '@/components/listings/ProductListingCard'

// Single-product detail fetch for /produits/[id]. Resurrected from the pre-reset page
// (commit 59cb952^) and extended with product_images + shop logo/description for the
// redesigned gallery + seller block. Moderation is preserved exactly: status='active'
// AND shops.admin_hidden_at IS NULL via shops!inner — a hidden product or a product of an
// admin-moderated shop returns null, so the page 404s (cascade moderation). products /
// product_images / shops are public-read, so this resolves for anonymous visitors too.

function one<T>(embed: T | T[] | null | undefined): T | null {
  if (Array.isArray(embed)) return embed[0] ?? null
  return embed ?? null
}

function primaryImage(images: { image_url: string; display_order: number }[] | null): string | null {
  if (!images || images.length === 0) return null
  return [...images].sort((a, b) => a.display_order - b.display_order)[0]?.image_url ?? null
}

export type ProductDetailData = {
  id: string
  title: string
  description: string | null
  price_tnd: number
  tracks_stock: boolean
  stock_count: number | null
  category: string | null
  categoryId: string | null
  shopId: string | null
  images: { url: string }[]
  shop: { name: string; city: string | null; logo_url: string | null; description: string | null } | null
}

type DetailRow = {
  id: string
  title: string
  description: string | null
  price_tnd: number | string
  tracks_stock: boolean | null
  stock_count: number | null
  category_id: string | null
  shop_id: string | null
  categories: { name_fr: string } | { name_fr: string }[] | null
  shops:
    | { name: string | null; city: string | null; logo_url: string | null; description: string | null }
    | { name: string | null; city: string | null; logo_url: string | null; description: string | null }[]
    | null
  product_images: { image_url: string; display_order: number }[] | null
}

// Wrapped in React cache() so generateMetadata + the page share a single fetch per request.
export const getProductDetail = cache(async (id: string): Promise<ProductDetailData | null> => {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('products')
    .select(
      `id, title, description, price_tnd, tracks_stock, stock_count, status, category_id, shop_id,
       categories ( name_fr ),
       shops!inner ( name, city, logo_url, description, admin_hidden_at ),
       product_images ( image_url, display_order )`,
    )
    .eq('id', id)
    .eq('status', 'active')
    .is('shops.admin_hidden_at', null)
    .maybeSingle()

  if (error) {
    console.error('[product-detail] fetch error:', error)
    return null
  }
  if (!data) return null

  const row = data as unknown as DetailRow
  const shop = one(row.shops)
  const images = [...(row.product_images ?? [])]
    .sort((a, b) => a.display_order - b.display_order)
    .map((i) => ({ url: i.image_url }))

  return {
    id: row.id,
    title: row.title,
    description: row.description ?? null,
    price_tnd: Number(row.price_tnd),
    tracks_stock: Boolean(row.tracks_stock),
    stock_count: row.stock_count,
    category: one(row.categories)?.name_fr ?? null,
    categoryId: row.category_id,
    shopId: row.shop_id,
    images,
    shop: shop
      ? {
          name: shop.name ?? '',
          city: shop.city ?? null,
          logo_url: shop.logo_url ?? null,
          description: shop.description ?? null,
        }
      : null,
  }
})

type RelatedRow = {
  id: string
  title: string
  description: string | null
  price_tnd: number | string
  shops: { name: string | null; city: string | null } | { name: string | null; city: string | null }[] | null
  product_images: { image_url: string; display_order: number }[] | null
}

// Related = active products from the SAME shop OR SAME category, excluding the current one
// (and excluding admin-hidden shops), newest first, capped at 8. Shaped into ProductListing
// so the existing ProductListingCard renders them unchanged.
export async function getRelatedProducts(opts: {
  productId: string
  shopId: string | null
  categoryId: string | null
}): Promise<ProductListing[]> {
  const orParts: string[] = []
  if (opts.shopId) orParts.push(`shop_id.eq.${opts.shopId}`)
  if (opts.categoryId) orParts.push(`category_id.eq.${opts.categoryId}`)
  if (orParts.length === 0) return []

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('products')
    .select(
      `id, title, description, price_tnd,
       shops!inner ( name, city, admin_hidden_at ),
       product_images ( image_url, display_order )`,
    )
    .eq('status', 'active')
    .is('shops.admin_hidden_at', null)
    .neq('id', opts.productId)
    .or(orParts.join(','))
    .order('created_at', { ascending: false })
    .limit(8)

  if (error) {
    console.error('[product-detail] related fetch error:', error)
    return []
  }

  return ((data ?? []) as unknown as RelatedRow[]).map((row) => {
    const shop = one(row.shops)
    return {
      id: row.id,
      title: row.title,
      description: row.description ?? null,
      price_tnd: Number(row.price_tnd),
      image_url: primaryImage(row.product_images),
      shop: { name: shop?.name ?? '', city: shop?.city ?? null },
    }
  })
}
