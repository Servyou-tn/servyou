import { createClient } from '@/lib/supabase/server'
import { failQuery } from '@/lib/supabase/query-error'
import { getShopCards, type ShopCardData } from '@/lib/marche/shop-cards'
import { ilikePattern, paginate, validCategorySlugs } from '@/lib/search/search-params'

// The « Boutiques » lens of /marche/produits (B4, Figma 578:42528): public shops, searched by name, filtered by declared category and
// city, newest first (or A→Z). Page size 6 = the frame's 2-up × 3-row grid.
//
// WHICH SHOPS: every shop with `admin_hidden_at IS NULL` (RLS agrees). A shop with no product yet is still a public storefront
// (/boutique/[id] renders it), so it is listed — the card then simply shows « 0 produit » and no thumbnails.
//
// SHAPE: a COUNT query (head only) → `paginate` clamps the page → one page of ids → `getShopCards` decorates them. Counting first
// means an out-of-range ?page= clamps instead of PostgREST's 416. Both queries share `filtered()`, so the count can never describe a
// different set than the page.
//
// Every failure here is the MAIN query: it throws (never « aucune boutique »); the page settle()s it into an inline ErrorState.

export const SHOP_PER_PAGE = 6

export type ShopSort = 'recent' | 'nom'

/** `?tri=` for the lens. Anything but `nom` (including the products lens's `prix_*`) is the default, newest first. */
export function parseShopSort(raw: string | string[] | undefined): ShopSort {
  const v = Array.isArray(raw) ? raw[0] : raw
  return v === 'nom' ? 'nom' : 'recent'
}

export type ShopSearchParams = {
  q: string
  categorie: string[]
  ville: string | null
  tri: ShopSort
  page: number
}

export type ShopSearchResult = {
  shops: ShopCardData[]
  totalCount: number
  page: number
  totalPages: number
  perPage: number
}

// `shop_categories!inner(categories!inner(slug))` only when a category is chosen: it turns the embed into a filter. A shop has each
// category once, so a single slug yields one row per shop (the page UI is single-select); ids are de-duplicated anyway.
const BASE_SELECT = 'id'
const CATEGORY_SELECT = 'id, shop_categories!inner(categories!inner(slug))'

export async function searchShops(params: ShopSearchParams, perPage: number = SHOP_PER_PAGE): Promise<ShopSearchResult> {
  const supabase = await createClient()
  const slugs = validCategorySlugs(params.categorie)
  const pattern = params.q.trim() ? ilikePattern(params.q) : null
  const select = slugs.length > 0 ? CATEGORY_SELECT : BASE_SELECT

  // ONE builder for the count and the page, so the count can never describe a different set than the page.
  // `.in('shop_categories.categories.slug', …)` filters the inner-joined embed.
  function build(head: boolean) {
    let q = supabase
      .from('shops')
      // The page query needs no count of its own (the head query above supplies it): two count(*) per load, joins included, was waste.
      .select(select, head ? { count: 'exact', head: true } : undefined)
      .is('admin_hidden_at', null)
    if (pattern) q = q.ilike('name', pattern)
    if (params.ville) q = q.eq('city', params.ville)
    if (slugs.length > 0) q = q.in('shop_categories.categories.slug', slugs)
    return q
  }

  const { count, error: countError } = await build(true)
  if (countError) failQuery('search-shops count', countError)
  const totalCount = count ?? 0
  const { totalPages, safePage, start, end } = paginate(totalCount, params.page, perPage)
  if (totalCount === 0) return { shops: [], totalCount: 0, page: 1, totalPages: 1, perPage }

  // `id` last: a stable tiebreak, so two shops created in the same instant never swap between pages.
  const sorted = params.tri === 'nom' ? build(false).order('name', { ascending: true }) : build(false).order('created_at', { ascending: false })
  const { data, error } = await sorted.order('id', { ascending: true }).range(start, end - 1)
  if (error) failQuery('search-shops page', error)

  const ids = [...new Set(((data ?? []) as unknown as { id: string }[]).map((r) => r.id))]
  const shops = await getShopCards(ids)
  return { shops, totalCount, page: safePage, totalPages, perPage }
}
