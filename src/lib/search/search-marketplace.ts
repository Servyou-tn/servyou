import { createClient } from '@/lib/supabase/server'
import type { ProductListing } from '@/components/listings/ProductListingCard'
import type { ServiceListing } from '@/components/listings/ServiceListingCard'
import {
  compareRanked,
  paginate,
  PER_PAGE,
  pickCategoryIds,
  scoreListing,
  stripAccents,
  type SearchParams,
  type SearchType,
} from './search-params'

// The /recherche query layer. /marche is the browse surface (newest-first, single
// catalog); /recherche is the typed-query surface: FTS match on title+description,
// refinable by category / city / price, sortable, paginated. Search is single-type
// (Produits OR Services) — the 'Tous' tab was deliberately dropped at MVP, so there is
// no cross-type merge: pertinence runs within one catalog.
//
// Search strategy: Postgres FTS via tsvector columns (title weighted A, description
// weighted B) with GIN indexes and websearch_to_tsquery. Accent normalization happens at
// write time via unaccent in the generated column, and at query time via NFD strip on the
// client. The DB does the *matching*; ordering still runs in JS (compareRanked) so the
// four sorts — pertinence (weighted-score heuristic), recent, prix_asc, prix_desc — share
// one tested code path and null prices ("sur devis") sort last consistently in both price
// directions. The A/B setweight is stored in the vector for a future ts_rank ordering but
// does NOT affect today's ordering (that's the JS scoreListing heuristic above). True
// ts_rank ordering is a deliberate follow-up (needs an RPC/raw query; not worth it at this
// catalog size).
//
// The pure URL/ranking/pagination helpers live in ./search-params (re-exported below) so
// they can be unit-tested without this module's Supabase server-client dependency.
export {
  parseSearchParams,
  scoreListing,
  stripAccents,
  compareRanked,
  paginate,
  ilikePattern,
  SEARCH_SORTS,
  PER_PAGE,
} from './search-params'
export type { SearchParams, SearchType, SearchSort, Ranked } from './search-params'

// Pre-launch fetch cap. The catalog is small, so we pull the full filtered set (up to
// this many rows of the *active* type) and score/sort/paginate in JS — same small-data
// posture as /marche's LIMIT 30. The other catalog only needs a count for its tab badge.
// Revisit (DB-side ranking + range pagination) when a real catalog outgrows this.
const FETCH_CAP = 500

export type SearchOutcome = {
  type: SearchType
  // Exactly one of these carries the current page's slice; the other is empty.
  products: ProductListing[]
  services: ServiceListing[]
  totalCount: number // total matches of the active type (drives the count + pagination)
  totalPages: number
  page: number // the clamped, in-range page actually shown
  perPage: number // page size actually applied (a surface may override the shared default)
}

// ── Row shapes + mapping (mirror lib/marche/data.ts) ────────────────────────────

function one<T>(embed: T | T[] | null | undefined): T | null {
  if (Array.isArray(embed)) return embed[0] ?? null
  return embed ?? null
}

type ProductRow = {
  id: string
  title: string
  description: string | null
  price_tnd: number | string
  created_at: string
  shops:
    | { name: string | null; city: string | null }
    | { name: string | null; city: string | null }[]
    | null
  product_images: { image_url: string; display_order: number }[] | null
  // Added for C1's card, which carries a category chip on the cover (Figma 569:39818). Same shape
  // and same embed the service row already uses — both localized at the card, never here.
  categories:
    | { name_fr: string; name_ar: string }
    | { name_fr: string; name_ar: string }[]
    | null
}

function mapProduct(row: ProductRow): ProductListing {
  const shop = one(row.shops)
  const cat = one(row.categories)
  const primary = [...(row.product_images ?? [])].sort(
    (a, b) => a.display_order - b.display_order,
  )[0]
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? null,
    price_tnd: Number(row.price_tnd),
    image_url: primary?.image_url ?? null,
    shop: { name: shop?.name ?? '', city: shop?.city ?? null },
    // OPTIONAL on ProductListing, deliberately: `ProductListingCard` and its three surfaces
    // (/recherche, /categories/[slug], ConsumerHomepage) do not read it and must not have to.
    // Both names travel; the consumer picks by lang, as ServiceListingCard already does.
    category: cat ? { name_fr: cat.name_fr, name_ar: cat.name_ar } : null,
  }
}

type ServiceRow = {
  id: string
  title: string
  description: string | null
  starting_price_tnd: number | string | null
  delivery_time: string | null
  tags: string[] | null
  created_at: string
  freelancer_profiles:
    | { profile_id: string; city: string | null }
    | { profile_id: string; city: string | null }[]
    | null
  categories:
    | { name_fr: string; name_ar: string }
    | { name_fr: string; name_ar: string }[]
    | null
}

// ── Filter application (shared by full-fetch and head-count queries) ─────────────

type AnyQuery = {
  eq: (col: string, v: string | number) => AnyQuery
  in: (col: string, vals: readonly (string | number)[]) => AnyQuery
  gte: (col: string, v: number) => AnyQuery
  lte: (col: string, v: number) => AnyQuery
  textSearch: (
    col: string,
    query: string,
    opts: { type: 'websearch'; config: string },
  ) => AnyQuery
}

// The full-text match: accent-strip the query (to align with the unaccent'd lexemes in
// search_vector) then hand it to websearch_to_tsquery, which AND-joins the words and is
// order-independent — so "iphone pro" and "pro iphone" both match a row carrying both
// words. Empty-after-strip queries skip the clause (filters still apply on their own).
function applySearch<Q extends AnyQuery>(q: Q, term: string): Q {
  const qNormalized = stripAccents(term.trim())
  if (!qNormalized) return q
  return q.textSearch('search_vector', qNormalized, {
    type: 'websearch',
    config: 'simple',
  }) as Q
}

function applyProductFilters<Q extends AnyQuery>(
  q: Q,
  params: SearchParams,
  categoryIds: string[] | null,
): Q {
  let out = applySearch(q, params.q)
  if (categoryIds) out = out.in('category_id', categoryIds) as Q
  // Ville filters on the SHOP's city through the products→shops join, and only when a city is
  // picked — never a gate. Mirrors applyServiceFilters' freelancer_profiles.city predicate exactly.
  // ⚑ This only works because the shops embed is `!inner` (see fetchProducts): on a left join the
  // predicate would not restrict the parent rows, and every product would come back with a null
  // embed instead of being filtered out.
  if (params.ville) out = out.eq('shops.city', params.ville) as Q
  if (params.prixMin != null) out = out.gte('price_tnd', params.prixMin) as Q
  if (params.prixMax != null) out = out.lte('price_tnd', params.prixMax) as Q
  return out
}

function applyServiceFilters<Q extends AnyQuery>(
  q: Q,
  params: SearchParams,
  categoryIds: string[] | null,
): Q {
  let out = applySearch(q, params.q)
  if (categoryIds) out = out.in('category_id', categoryIds) as Q
  // City filter — city lives on freelancer_profiles, so the predicate is applied THROUGH the
  // services→freelancer embed, and only when a city is actually selected. It is never a gate:
  // with no ?ville=, no city clause is added at all, so listings whose freelancer has a blank
  // city still appear. (The embed below is `!inner`, but that joins on the FK, not on `city` —
  // and `service_listings.freelancer_profile_id` is NOT NULL, so the join itself can never drop
  // a row. Verified against the live catalog: 21 active listings → 21 joined, 0 orphans.)
  if (params.ville) out = out.eq('freelancer_profiles.city', params.ville) as Q
  if (params.prixMin != null) out = out.gte('starting_price_tnd', params.prixMin) as Q
  if (params.prixMax != null) out = out.lte('starting_price_tnd', params.prixMax) as Q
  return out
}

// ── Per-type fetch (full, mapped, scored, sorted) ───────────────────────────────

type Supabase = Awaited<ReturnType<typeof createClient>>

async function fetchProducts(
  supabase: Supabase,
  params: SearchParams,
  categoryIds: string[] | null,
): Promise<ProductListing[]> {
  // Moderation, both mechanisms: `admin_hide_content` sets status='hidden' AND admin_hidden_at
  // on a product, but on a SHOP it sets admin_hidden_at only and leaves the shop's products at
  // status='active'. Filtering status alone therefore left a moderated shop's whole catalogue
  // in /recherche, /marche/produits and /categories — including in totalCount, which is derived
  // from this fetch. Row + parent are both filtered; same shape as lib/marche/product-detail.ts.
  let query = supabase
    .from('products')
    .select(
      'id, title, description, price_tnd, created_at, category_id, shops!inner(name, city, admin_hidden_at), product_images(image_url, display_order), categories(name_fr, name_ar)',
    )
    .eq('status', 'active')
    .is('admin_hidden_at', null)
    .is('shops.admin_hidden_at', null)
    .limit(FETCH_CAP)
  query = applyProductFilters(query as unknown as AnyQuery, params, categoryIds) as unknown as typeof query

  const { data, error } = await query
  if (error) {
    console.error('[search] products fetch error:', error)
    return []
  }

  const rows = (data ?? []) as unknown as ProductRow[]
  return rows
    .map((row) => ({
      listing: mapProduct(row),
      score: scoreListing(row.title, row.description, params.q),
      price: Number(row.price_tnd),
      createdAt: row.created_at,
    }))
    .sort((a, b) => compareRanked(a, b, params.tri))
    .map((r) => r.listing)
}

async function fetchServices(
  supabase: Supabase,
  params: SearchParams,
  categoryIds: string[] | null,
): Promise<ServiceListing[]> {
  // Moderation, both mechanisms — see fetchProducts above. A freelancer hidden by an admin
  // keeps every listing at status='active', so the parent predicate is what actually keeps a
  // moderated freelancer's services out of the marketplace.
  let query = supabase
    .from('service_listings')
    .select(
      'id, title, description, starting_price_tnd, delivery_time, tags, created_at, category_id, freelancer_profiles!inner(profile_id, city, admin_hidden_at), categories(name_fr, name_ar)',
    )
    .eq('status', 'active')
    .is('admin_hidden_at', null)
    .is('freelancer_profiles.admin_hidden_at', null)
    .limit(FETCH_CAP)
  query = applyServiceFilters(query as unknown as AnyQuery, params, categoryIds) as unknown as typeof query

  const { data, error } = await query
  if (error) {
    console.error('[search] services fetch error:', error)
    return []
  }

  const rows = (data ?? []) as unknown as ServiceRow[]

  // Freelancer display names come from public_profiles (profiles.full_name is owner-only;
  // a nested embed would return null for every service the viewer doesn't own).
  const profileIds = [
    ...new Set(
      rows
        .map((r) => one(r.freelancer_profiles)?.profile_id)
        .filter((id): id is string => Boolean(id)),
    ),
  ]
  const names = new Map<string, string>()
  if (profileIds.length > 0) {
    const { data: profiles, error: profilesError } = await supabase
      .from('public_profiles')
      .select('id, full_name')
      .in('id', profileIds)
    if (profilesError) console.error('[search] public_profiles fetch error:', profilesError)
    for (const p of (profiles ?? []) as { id: string; full_name: string | null }[]) {
      names.set(p.id, p.full_name ?? '')
    }
  }

  return rows
    .map((row) => {
      const fp = one(row.freelancer_profiles)
      const cat = one(row.categories)
      const listing: ServiceListing = {
        id: row.id,
        title: row.title,
        description: row.description ?? null,
        price_starting: row.starting_price_tnd != null ? Number(row.starting_price_tnd) : null,
        delivery_time: row.delivery_time ?? null,
        // Skill chips on the v3.7 card. Column exists but is sparsely populated today
        // (most listings ship with []), so the card falls back to the category label —
        // see ServiceListingCard. Backfill lands when H6/H7 make tags required.
        tags: row.tags ?? [],
        category: cat ? { name_fr: cat.name_fr, name_ar: cat.name_ar } : null,
        freelancer: {
          full_name: (fp?.profile_id ? names.get(fp.profile_id) : '') ?? '',
          city: fp?.city ?? null,
        },
      }
      return {
        listing,
        score: scoreListing(row.title, row.description, params.q),
        price: row.starting_price_tnd != null ? Number(row.starting_price_tnd) : null,
        createdAt: row.created_at,
      }
    })
    .sort((a, b) => compareRanked(a, b, params.tri))
    .map((r) => r.listing)
}

// ── Public entry point ──────────────────────────────────────────────────────────

export async function searchMarketplace(
  params: SearchParams,
  opts: { categoryId?: string; perPage?: number } = {},
): Promise<SearchOutcome> {
  const supabase = await createClient()

  // The /categories/[slug] page passes a resolved categoryId directly; /recherche resolves
  // the ?categorie= slugs to ids here. An explicit categoryId wins and skips the lookup.
  // For slug resolution: null = no filter; [] = filter given but matched nothing → zero.
  let slugResolvedIds: string[] | null = null
  if (!opts.categoryId && params.categorie.length > 0) {
    const { data, error } = await supabase
      .from('categories')
      .select('id')
      .in('slug', params.categorie)
    if (error) console.error('[search] category resolve error:', error)
    slugResolvedIds = ((data ?? []) as { id: string }[]).map((r) => r.id)
  }
  const categoryIds = pickCategoryIds(opts.categoryId, slugResolvedIds)

  // Single-catalog search: only the active type is fetched (the type switch lives in the
  // top search-bar toggle now, so there are no cross-catalog tab counts to compute).
  const items =
    params.type === 'product'
      ? await fetchProducts(supabase, params, categoryIds)
      : await fetchServices(supabase, params, categoryIds)

  const perPage = opts.perPage ?? PER_PAGE
  const total = items.length
  const { totalPages, safePage, start, end } = paginate(total, params.page, perPage)
  const slice = items.slice(start, end)

  return {
    type: params.type,
    products: params.type === 'product' ? (slice as ProductListing[]) : [],
    services: params.type === 'service' ? (slice as ServiceListing[]) : [],
    totalCount: total,
    totalPages,
    page: safePage,
    perPage,
  }
}
