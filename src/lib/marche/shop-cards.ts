import { createClient } from '@/lib/supabase/server'
import { failQuery, reportQueryError } from '@/lib/supabase/query-error'

// Data for the SHOP CARD (Figma « Shop Card » 578:42367 — banner, logo, name, « ville · N produits », category chips, a four-thumbnail
// peek and « Voir la boutique »). Batch-shaped on purpose: /mes-favoris (B6) feeds it the favorited shop ids and the « Boutiques »
// lens of /marche/produits (B4) will feed it a page of ids — one loader, one card, no second fork.
//
// Visibility: only shops with `admin_hidden_at IS NULL` come back (RLS agrees); a shop that is missing from the answer was hidden or
// deleted, and the caller drops it. The shop row itself is the MAIN query (failure throws — never « no shops »); the product peek and
// the per-shop categories are decoration: a failure there is reported and the card renders without them.

export type ShopCardData = {
  id: string
  name: string
  city: string | null
  logoUrl: string | null
  bannerUrl: string | null
  /** Active products. null = could not be counted (the card hides the figure instead of showing a false « 0 »). */
  productCount: number | null
  categories: { name_fr: string; name_ar: string | null }[]
  /** Up to four product image URLs, newest product first. */
  thumbs: string[]
}

type Cat = { name_fr: string; name_ar: string | null }
type ShopRow = {
  id: string
  name: string
  city: string | null
  logo_url: string | null
  banner_url: string | null
  shop_categories: { categories: Cat | Cat[] | null }[] | null
}
type ProductRow = {
  shop_id: string
  product_images: { image_url: string; display_order: number }[] | null
}

function one<T>(v: T | T[] | null | undefined): T | null {
  return Array.isArray(v) ? (v[0] ?? null) : (v ?? null)
}

export const SHOP_CARD_THUMBS = 4

function firstImage(images: ProductRow['product_images']): string | null {
  if (!images || images.length === 0) return null
  return [...images].sort((a, b) => a.display_order - b.display_order)[0]?.image_url ?? null
}

/** Returns the visible shops among `ids`, in the order of `ids`. */
export async function getShopCards(ids: string[]): Promise<ShopCardData[]> {
  if (ids.length === 0) return []
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('shops')
    .select('id, name, city, logo_url, banner_url, shop_categories ( categories ( name_fr, name_ar ) )')
    .in('id', ids)
    .is('admin_hidden_at', null)
  if (error) failQuery('shop-cards shops', error)
  const shops = (data ?? []) as unknown as ShopRow[]
  if (shops.length === 0) return []

  const visibleIds = shops.map((s) => s.id)
  const { data: productRows, error: productsError } = await supabase
    .from('products')
    .select('shop_id, product_images ( image_url, display_order )')
    .in('shop_id', visibleIds)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
  if (productsError) reportQueryError('shop-cards products', productsError)

  const counts = new Map<string, number>()
  const thumbs = new Map<string, string[]>()
  for (const p of (productRows ?? []) as unknown as ProductRow[]) {
    counts.set(p.shop_id, (counts.get(p.shop_id) ?? 0) + 1)
    const img = firstImage(p.product_images)
    const list = thumbs.get(p.shop_id) ?? []
    if (img && list.length < SHOP_CARD_THUMBS) list.push(img)
    thumbs.set(p.shop_id, list)
  }

  const byId = new Map<string, ShopCardData>(
    shops.map((s) => [
      s.id,
      {
        id: s.id,
        name: s.name,
        city: s.city,
        logoUrl: s.logo_url,
        bannerUrl: s.banner_url,
        productCount: productsError ? null : (counts.get(s.id) ?? 0),
        categories: (s.shop_categories ?? []).map((r) => one(r.categories)).filter((c): c is Cat => c !== null),
        thumbs: thumbs.get(s.id) ?? [],
      },
    ]),
  )
  return ids.flatMap((id) => {
    const card = byId.get(id)
    return card ? [card] : []
  })
}
