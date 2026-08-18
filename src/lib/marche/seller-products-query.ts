import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import {
  PRODUCTS_PER_PAGE,
  DELIVERED,
  countProductTabs,
  type ProductTab,
  type SellerProductRow,
  type SellerProductsPage,
} from './seller-products'

// G7 « Modifier un produit » read — a SIBLING of getSellerProducts below, not a reuse of it.
// getSellerProducts is list-shaped (paginated, tab-filtered) and reduces product_images down to
// one cover URL via primaryImage() — it never selects the images' own row ids, so a caller can
// display a gallery but not target one image for deletion. getProductDetail (src/lib/marche/
// product-detail.ts) is the other near-miss: it filters `status='active'`, which is correct for a
// public buyer view and wrong for an owner editing their own hidden or admin-moderated product.
// Neither fits, so this is new, scoped by shopId — matching getSellerProducts's own signature
// shape rather than getSellerOrderDetail's by-userId shape, since products has no direct owner_id
// column the way orders has seller_id; shop_id is the natural scoping key here.

// Server-only fetch for G5 « Mes produits ». Split from ./seller-products (pure predicates/types,
// safe to import from a client component) specifically so this file's `next/headers` dependency
// chain never reaches the client bundle. See that file's header note.

type CountRow = { id: string; status: string; tracks_stock: boolean; stock_count: number | null }

type ImageRow = { image_url: string; display_order: number }

function primaryImage(images: ImageRow[] | null): string | null {
  if (!images || images.length === 0) return null
  return [...images].sort((a, b) => a.display_order - b.display_order)[0]?.image_url ?? null
}

function countOf(embed: { count: number }[] | { count: number } | null | undefined): number {
  if (Array.isArray(embed)) return embed[0]?.count ?? 0
  return embed?.count ?? 0
}

type ContentRow = {
  id: string
  title: string
  price_tnd: number | string
  tracks_stock: boolean
  stock_count: number | null
  status: string
  admin_hidden_at: string | null
  admin_hidden_reason: string | null
  product_images: ImageRow[] | null
  sold: { count: number }[] | { count: number } | null
  all_orders: { count: number }[] | { count: number } | null
}

/**
 * One page of the seller's catalogue, plus the per-tab counts the tab badges need.
 *
 * TWO queries, not one (§8.1): a cheap fetch of every row's minimal columns for the counts
 * (mirrors seller-dashboard.ts:199's low-stock rail shape), then a second, tab-filtered,
 * `.range()`-paginated fetch with the full row shape — including the double-aliased `orders(count)`
 * embed spiked live against the real catalogue (26 products / shop f4757d2d…) before this was
 * written: `sold` (filtered to DELIVERED) and `all_orders` (unfiltered) both compute correctly and
 * both preserve LEFT-join semantics for a zero-order product (`count: 0`, not dropped).
 *
 * `totalCount`/`totalPages` come from the counts object, not a third query — the current tab's
 * count is already known once step 1 has run.
 */
export const getSellerProducts = cache(
  async (shopId: string, opts: { tab: ProductTab; page: number }): Promise<SellerProductsPage> => {
    const supabase = await createClient()

    const { data: countRows, error: countsError } = await supabase
      .from('products')
      .select('id, status, tracks_stock, stock_count')
      .eq('shop_id', shopId)

    if (countsError) {
      console.error(
        '[seller-products] counts fetch error:',
        countsError.message,
        countsError.code,
        countsError.details,
      )
      throw new Error(`seller products counts fetch failed: ${countsError.message}`)
    }

    const counts = countProductTabs((countRows ?? []) as CountRow[])
    const totalCount = counts[opts.tab]
    const totalPages = Math.max(1, Math.ceil(totalCount / PRODUCTS_PER_PAGE))
    const page = Math.min(Math.max(1, opts.page), totalPages)
    const start = (page - 1) * PRODUCTS_PER_PAGE

    let query = supabase
      .from('products')
      .select(
        `id, title, price_tnd, tracks_stock, stock_count, status, admin_hidden_at, admin_hidden_reason,
         product_images ( image_url, display_order ),
         sold:orders(count), all_orders:orders(count)`,
      )
      .eq('shop_id', shopId)
      .eq('sold.status', DELIVERED)

    if (opts.tab === 'active') query = query.eq('status', 'active')
    else if (opts.tab === 'hidden') query = query.eq('status', 'hidden')
    else if (opts.tab === 'out_of_stock') {
      // Matches `isOutOfStock` exactly: tracked AND (null or <=0 — null-as-zero, same as
      // resolveStockState's own `?? 0`).
      query = query.eq('tracks_stock', true).or('stock_count.is.null,stock_count.lte.0')
    }

    // `.range()` needs a deterministic tiebreaker — `created_at` alone isn't unique, and without
    // one a row can be duplicated or skipped across pages.
    const { data, error } = await query
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .range(start, start + PRODUCTS_PER_PAGE - 1)

    if (error) {
      console.error('[seller-products] content fetch error:', error.message, error.code, error.details)
      throw new Error(`seller products content fetch failed: ${error.message}`)
    }

    const rows = (data ?? []) as unknown as ContentRow[]
    const products: SellerProductRow[] = rows.map((r) => ({
      id: r.id,
      title: r.title,
      priceTnd: Number(r.price_tnd),
      tracksStock: r.tracks_stock,
      stockCount: r.stock_count,
      status: r.status,
      adminHiddenAt: r.admin_hidden_at,
      adminHiddenReason: r.admin_hidden_reason,
      imageUrl: primaryImage(r.product_images),
      soldCount: countOf(r.sold),
      hasOrders: countOf(r.all_orders) > 0,
    }))

    return { products, counts, totalCount, totalPages, page }
  },
)

export type SellerProductImage = { id: string; url: string; displayOrder: number }

export type SellerProductDetail = {
  id: string
  title: string
  description: string | null
  categoryId: string
  priceTnd: number
  deliveryFeeTnd: number
  tracksStock: boolean
  stockCount: number | null
  status: string
  adminHiddenAt: string | null
  /** Sorted by displayOrder ascending — images[0] is the cover, same rule as primaryImage() above. */
  images: SellerProductImage[]
  hasOrders: boolean
}

type DetailRow = {
  id: string
  title: string
  description: string | null
  category_id: string
  price_tnd: number | string
  delivery_fee_tnd: number | string
  tracks_stock: boolean
  stock_count: number | null
  status: string
  admin_hidden_at: string | null
  product_images: { id: string; image_url: string; display_order: number }[] | null
  all_orders: { count: number }[] | { count: number } | null
}

/**
 * One product, scoped to `shopId` — NOT to `productId` alone. `products` is public-SELECT, so the
 * `.eq('shop_id', shopId)` clause is the ownership check, not RLS; a mismatched id (wrong shop, or
 * no such product) returns null rather than another seller's row. The caller turns that into a
 * `notFound()`, matching getSellerOrderDetail's convention: missing id and "not yours" are one
 * indistinguishable state, so the response can't be used to probe whether a product id exists.
 */
export const getSellerProductDetail = cache(
  async (shopId: string, productId: string): Promise<SellerProductDetail | null> => {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('products')
      .select(
        `id, title, description, category_id, price_tnd, delivery_fee_tnd, tracks_stock, stock_count,
         status, admin_hidden_at,
         product_images ( id, image_url, display_order ),
         all_orders:orders(count)`,
      )
      .eq('id', productId)
      .eq('shop_id', shopId)
      .maybeSingle()

    if (error) {
      console.error('[seller-product-detail] fetch error:', error.message, error.code, error.details)
      throw new Error(`seller product detail fetch failed: ${error.message}`)
    }
    if (!data) return null

    const r = data as unknown as DetailRow
    const images = (r.product_images ?? [])
      .map((img) => ({ id: img.id, url: img.image_url, displayOrder: img.display_order }))
      .sort((a, b) => a.displayOrder - b.displayOrder)

    return {
      id: r.id,
      title: r.title,
      description: r.description,
      categoryId: r.category_id,
      priceTnd: Number(r.price_tnd),
      deliveryFeeTnd: Number(r.delivery_fee_tnd),
      tracksStock: r.tracks_stock,
      stockCount: r.stock_count,
      status: r.status,
      adminHiddenAt: r.admin_hidden_at,
      images,
      hasOrders: countOf(r.all_orders) > 0,
    }
  },
)
