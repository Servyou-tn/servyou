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
  // D1's price block is three lines — « 45 TND », « + 7 TND de livraison », « Total : 52 TND à la
  // livraison » — so the fee is not decoration, it is two thirds of the block. The column has been
  // NOT NULL DEFAULT 7 since G6 shipped and G6 has always written it; only this fetch was missing
  // it. E1's order summary needs the same field, which is why it is added here rather than being
  // computed at the one call site.
  delivery_fee_tnd: number
  tracks_stock: boolean
  stock_count: number | null
  // ⚑ BOTH NAMES TRAVEL. This used to be `string | null` carrying name_fr alone, which put a French
  // category in the Badge AND in the breadcrumb of the Arabic page — beside related cards whose
  // chips localize correctly, because their embed selects both. One flat category, rendered twice
  // on this screen, is not a good place to leak the default locale.
  category: { name_fr: string; name_ar: string | null } | null
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
  // numeric(10,2) — PostgREST returns it as a string, same as price_tnd. Number() at the boundary.
  delivery_fee_tnd: number | string
  tracks_stock: boolean | null
  stock_count: number | null
  category_id: string | null
  shop_id: string | null
  categories: { name_fr: string; name_ar: string | null } | { name_fr: string; name_ar: string | null }[] | null
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
      `id, title, description, price_tnd, delivery_fee_tnd, tracks_stock, stock_count, status,
       category_id, shop_id,
       categories ( name_fr, name_ar ),
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
    delivery_fee_tnd: Number(row.delivery_fee_tnd),
    tracks_stock: Boolean(row.tracks_stock),
    stock_count: row.stock_count,
    category: (() => {
      const c = one(row.categories)
      return c ? { name_fr: c.name_fr, name_ar: c.name_ar ?? null } : null
    })(),
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
  // Both names travel, because ProductListing.category carries both and the consumer picks by
  // locale. Selecting name_fr alone would render French chips inside the Arabic page.
  categories: { name_fr: string; name_ar: string | null } | { name_fr: string; name_ar: string | null }[] | null
  product_images: { image_url: string; display_order: number }[] | null
}

// Related = active products from the SAME shop OR SAME category, excluding the current one
// (and excluding admin-hidden shops), newest first, capped at 8. Shaped into ProductListing
// so the existing ProductListingCard renders them unchanged.
//
// ⚑ `categories` is selected for the CHIP, not for filtering. D1's related row reuses C1's card
// (272×373, measured), and that card draws a category chip over the cover. Without this embed the
// chip is hidden on every related card while the identical cards one route away on /marche/produits
// all show one. The moderation shape of the query below is untouched — this is one embed added to
// the select list, not a reshaping of the `shops!inner` + admin_hidden_at cascade.
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
       categories ( name_fr, name_ar ),
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
    const category = one(row.categories)
    return {
      id: row.id,
      title: row.title,
      description: row.description ?? null,
      price_tnd: Number(row.price_tnd),
      image_url: primaryImage(row.product_images),
      shop: { name: shop?.name ?? '', city: shop?.city ?? null },
      // Null when the product has no category — `category_id` is nullable. The card hides the chip
      // rather than rendering an empty pill, so null is a real state, not a fallback.
      category: category ? { name_fr: category.name_fr, name_ar: category.name_ar ?? undefined } : null,
    }
  })
}
