import { createClient } from '@/lib/supabase/server'
import type { ProductListing } from '@/components/listings/ProductListingCard'
import type { ServiceListing } from '@/components/listings/ServiceListingCard'

// Server reads for the account pages (/mes-commandes, /mes-favoris, /mes-missions).
// Each is owner-scoped (buyer_id / user_id / consumer_id = me) and re-guarded by RLS;
// the explicit .eq() keeps the intent clear and, for orders, narrows the buyer+seller
// RLS read to the buyer slice. Errors are captured and surfaced (never a silent []).

// PostgREST returns a to-one embed as a single object, but some paths surface it as a
// one-element array — normalize to a single record (or null). Mirrors lib/marche/data.ts.
function one<T>(embed: T | T[] | null | undefined): T | null {
  if (Array.isArray(embed)) return embed[0] ?? null
  return embed ?? null
}

function primaryImage(images: { image_url: string; display_order: number }[] | null): string | null {
  if (!images || images.length === 0) return null
  return [...images].sort((a, b) => a.display_order - b.display_order)[0]?.image_url ?? null
}

// ─── /mes-commandes ─────────────────────────────────────────────────────────────

// The orders table stores no price snapshot, so the displayed amount is best-effort:
// products show price_tnd × quantity (price_kind 'total'); services have only a "from"
// starting price (price_kind 'from'); a now-unreadable item (e.g. hidden by its seller)
// yields title=null and price_kind 'unavailable'.
export type MyOrder = {
  id: string
  order_type: 'product' | 'service'
  status: string
  quantity: number
  cancelled_by: string | null
  cancellation_reason: string | null
  received_at: string | null
  created_at: string
  title: string | null
  image_url: string | null
  category: string | null
  seller_name: string | null
  seller_city: string | null
  unit_price: number | null
  total: number | null
  price_kind: 'total' | 'from' | 'unavailable'
}

type OrderRow = {
  id: string
  order_type: 'product' | 'service'
  status: string
  quantity: number
  cancelled_by: string | null
  cancellation_reason: string | null
  received_at: string | null
  created_at: string
  products:
    | {
        title: string
        price_tnd: number | string
        shops: { name: string | null; city: string | null } | { name: string | null; city: string | null }[] | null
        categories: { name_fr: string } | { name_fr: string }[] | null
        product_images: { image_url: string; display_order: number }[] | null
      }
    | null
  service_listings:
    | {
        title: string
        starting_price_tnd: number | string | null
        freelancer_profiles: { profile_id: string; city: string | null } | { profile_id: string; city: string | null }[] | null
        categories: { name_fr: string } | { name_fr: string }[] | null
      }
    | null
}

export async function getMyOrders(userId: string): Promise<MyOrder[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('orders')
    .select(
      `id, order_type, status, quantity, cancelled_by, cancellation_reason, received_at, created_at,
       products ( title, price_tnd, shops ( name, city ), categories ( name_fr ), product_images ( image_url, display_order ) ),
       service_listings ( title, starting_price_tnd, freelancer_profiles ( profile_id, city ), categories ( name_fr ) )`,
    )
    .eq('buyer_id', userId)
    .order('created_at', { ascending: false })

  // A failed query must NEVER degrade to "you have no orders" — that is the worst possible
  // failure on this page, and the file header above already promised it would not happen.
  // Throwing surfaces it (error boundary) instead of silently rendering an empty list.
  if (error) {
    console.error('[my-data] orders fetch error:', error.message, error.code, error.details)
    throw new Error(`orders fetch failed: ${error.message}`)
  }

  const rows = (data ?? []) as unknown as OrderRow[]

  // Resolve freelancer display names for service orders (profiles is owner-only;
  // names come from the public_profiles view — same pattern as lib/marche/data.ts).
  const profileIds = [
    ...new Set(
      rows
        .filter((r) => r.order_type === 'service')
        .map((r) => one(r.service_listings)?.freelancer_profiles)
        .map((fp) => one(fp)?.profile_id)
        .filter((id): id is string => Boolean(id)),
    ),
  ]
  const names = new Map<string, string>()
  if (profileIds.length > 0) {
    const { data: profiles, error: pErr } = await supabase
      .from('public_profiles')
      .select('id, full_name')
      .in('id', profileIds)
    if (pErr) console.error('[my-data] orders public_profiles error:', pErr)
    for (const p of (profiles ?? []) as { id: string; full_name: string | null }[]) {
      names.set(p.id, p.full_name ?? '')
    }
  }

  return rows.map((row): MyOrder => {
    if (row.order_type === 'product') {
      const p = one(row.products)
      if (!p) {
        return baseUnavailable(row)
      }
      const shop = one(p.shops)
      const unit = Number(p.price_tnd)
      return {
        ...baseFields(row),
        title: p.title,
        image_url: primaryImage(p.product_images),
        category: one(p.categories)?.name_fr ?? null,
        seller_name: shop?.name ?? null,
        seller_city: shop?.city ?? null,
        unit_price: unit,
        total: Number.isFinite(unit) ? unit * row.quantity : null,
        price_kind: 'total',
      }
    }
    const s = one(row.service_listings)
    if (!s) {
      return baseUnavailable(row)
    }
    const fp = one(s.freelancer_profiles)
    const starting = s.starting_price_tnd != null ? Number(s.starting_price_tnd) : null
    return {
      ...baseFields(row),
      title: s.title,
      image_url: null,
      category: one(s.categories)?.name_fr ?? null,
      seller_name: (fp?.profile_id ? names.get(fp.profile_id) : null) || null,
      seller_city: fp?.city ?? null,
      unit_price: starting,
      total: null,
      price_kind: 'from',
    }
  })
}

function baseFields(row: OrderRow) {
  return {
    id: row.id,
    order_type: row.order_type,
    status: row.status,
    quantity: row.quantity,
    cancelled_by: row.cancelled_by,
    cancellation_reason: row.cancellation_reason,
    received_at: row.received_at,
    created_at: row.created_at,
  }
}

function baseUnavailable(row: OrderRow): MyOrder {
  return {
    ...baseFields(row),
    title: null,
    image_url: null,
    category: null,
    seller_name: null,
    seller_city: null,
    unit_price: null,
    total: null,
    price_kind: 'unavailable',
  }
}

// ─── /mes-favoris ───────────────────────────────────────────────────────────────

type HiddenAt = { admin_hidden_at: string | null }

type FavoriteRow = {
  item_type: 'product' | 'service'
  created_at: string
  products:
    | {
        id: string
        title: string
        description: string | null
        price_tnd: number | string
        status: string
        admin_hidden_at: string | null
        shops:
          | ({ name: string | null; city: string | null } & HiddenAt)
          | ({ name: string | null; city: string | null } & HiddenAt)[]
          | null
        categories:
          | { name_fr: string; name_ar: string | null }
          | { name_fr: string; name_ar: string | null }[]
          | null
        product_images: { image_url: string; display_order: number }[] | null
      }
    | null
  service_listings:
    | {
        id: string
        title: string
        description: string | null
        starting_price_tnd: number | string | null
        delivery_time: string | null
        status: string
        admin_hidden_at: string | null
        freelancer_profiles:
          | ({ profile_id: string; city: string | null } & HiddenAt)
          | ({ profile_id: string; city: string | null } & HiddenAt)[]
          | null
        categories: { name_fr: string } | { name_fr: string }[] | null
      }
    | null
}

// Favorites is the one public read path where moderation CANNOT be pushed into the query.
// A favorite row points at a product OR a service, so both embeds are nullable to-one joins:
// `!inner` on either would drop every favorite of the other kind, and a PostgREST filter on a
// nullable embed's column changes the join semantics rather than the row set. So the predicate
// is applied here, in code, over the fetched rows — same three conditions the query-side paths
// use (lib/marche/data.ts): the listing is active, the listing is not itself moderated, and its
// parent (shop / freelancer profile) is not moderated.
//
// This path had NEITHER check before, which made it the only surface that rendered a DIRECTLY
// hidden listing — elsewhere `status='active'` caught that case incidentally.
function favoriteIsVisible(
  listing: { status: string; admin_hidden_at: string | null } | null,
  parent: HiddenAt | null,
): boolean {
  if (!listing) return false
  if (listing.status !== 'active') return false
  if (listing.admin_hidden_at !== null) return false
  // A missing parent means the embed was unreadable (RLS) — fail closed, not open.
  if (!parent || parent.admin_hidden_at !== null) return false
  return true
}

// One favorited item, tagged by kind, for the combined "Tous" view (which interleaves products
// and services in a single recency-ordered list).
export type FavoriteItem =
  | { kind: 'product'; item: ProductListing }
  | { kind: 'service'; item: ServiceListing }

// Favorited products + services, each shaped into the exact card type /marche uses so
// ListingResults can render them unchanged. An item the viewer can no longer read
// (e.g. a product its seller hid) embeds as null and is dropped from the list. `combined` holds
// both kinds interleaved in favorited-at-DESC order (the query order) for the "Tous" view; the
// split `products`/`services` arrays preserve that same order within each kind.
export async function getMyFavorites(
  userId: string,
): Promise<{ products: ProductListing[]; services: ServiceListing[]; combined: FavoriteItem[] }> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('favorites')
    .select(
      `item_type, created_at,
       products ( id, title, description, price_tnd, status, admin_hidden_at, shops ( name, city, admin_hidden_at ), categories ( name_fr, name_ar ), product_images ( image_url, display_order ) ),
       service_listings ( id, title, description, starting_price_tnd, delivery_time, status, admin_hidden_at, freelancer_profiles ( profile_id, city, admin_hidden_at ), categories ( name_fr ) )`,
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[my-data] favorites fetch error:', error)
    return { products: [], services: [], combined: [] }
  }

  const rows = (data ?? []) as unknown as FavoriteRow[]

  const products: ProductListing[] = []
  const serviceRows: { id: string; title: string; description: string | null; price_starting: number | null; delivery_time: string | null; category: { name_fr: string } | null; profileId: string | null; city: string | null }[] = []
  // The global favorited-at-DESC order across both kinds (drives the combined "Tous" list).
  const order: { kind: 'product' | 'service'; id: string }[] = []

  for (const row of rows) {
    if (row.item_type === 'product') {
      const p = one(row.products)
      if (!p) continue
      const shop = one(p.shops)
      if (!favoriteIsVisible(p, shop)) continue
      const category = one(p.categories)
      products.push({
        id: p.id,
        title: p.title,
        description: p.description ?? null,
        price_tnd: Number(p.price_tnd),
        image_url: primaryImage(p.product_images),
        shop: { name: shop?.name ?? '', city: shop?.city ?? null },
        category: category ? { name_fr: category.name_fr, name_ar: category.name_ar ?? undefined } : null,
      })
      order.push({ kind: 'product', id: p.id })
    } else {
      const s = one(row.service_listings)
      if (!s) continue
      const fp = one(s.freelancer_profiles)
      if (!favoriteIsVisible(s, fp)) continue
      serviceRows.push({
        id: s.id,
        title: s.title,
        description: s.description ?? null,
        price_starting: s.starting_price_tnd != null ? Number(s.starting_price_tnd) : null,
        delivery_time: s.delivery_time ?? null,
        category: one(s.categories) ? { name_fr: one(s.categories)!.name_fr } : null,
        profileId: fp?.profile_id ?? null,
        city: fp?.city ?? null,
      })
      order.push({ kind: 'service', id: s.id })
    }
  }

  // Resolve freelancer names from public_profiles (owner-only profiles → view).
  const profileIds = [...new Set(serviceRows.map((s) => s.profileId).filter((id): id is string => Boolean(id)))]
  const names = new Map<string, string>()
  if (profileIds.length > 0) {
    const { data: profiles, error: pErr } = await supabase
      .from('public_profiles')
      .select('id, full_name')
      .in('id', profileIds)
    if (pErr) console.error('[my-data] favorites public_profiles error:', pErr)
    for (const p of (profiles ?? []) as { id: string; full_name: string | null }[]) {
      names.set(p.id, p.full_name ?? '')
    }
  }

  const services: ServiceListing[] = serviceRows.map((s) => ({
    id: s.id,
    title: s.title,
    description: s.description,
    price_starting: s.price_starting,
    delivery_time: s.delivery_time,
    category: s.category,
    freelancer: {
      full_name: (s.profileId ? names.get(s.profileId) : '') ?? '',
      city: s.city,
    },
  }))

  // Rebuild the interleaved recency order from the per-kind lists (keyed by id within each kind,
  // so a hypothetical cross-table id clash can't mismatch). Skipped (null) embeds are absent
  // from `order`, so they fall out of `combined` too.
  const productById = new Map(products.map((p) => [p.id, p]))
  const serviceById = new Map(services.map((s) => [s.id, s]))
  const combined: FavoriteItem[] = []
  for (const o of order) {
    if (o.kind === 'product') {
      const p = productById.get(o.id)
      if (p) combined.push({ kind: 'product', item: p })
    } else {
      const s = serviceById.get(o.id)
      if (s) combined.push({ kind: 'service', item: s })
    }
  }

  return { products, services, combined }
}

// ─── /mes-missions ──────────────────────────────────────────────────────────────

export type MyMission = {
  id: string
  title: string
  description: string | null
  budget_min: number | null
  budget_max: number | null
  city: string | null
  is_remote: boolean
  deadline: string | null
  status: 'open' | 'filled' | 'expired' | 'deleted'
  created_at: string
  category: string | null
  response_count: number
}

type MissionRow = {
  id: string
  title: string
  description: string | null
  budget_min: number | string | null
  budget_max: number | string | null
  city: string | null
  is_remote: boolean | null
  deadline: string | null
  status: 'open' | 'filled' | 'expired' | 'deleted'
  created_at: string
  categories: { name_fr: string } | { name_fr: string }[] | null
  job_responses: { count: number }[] | null
}

export async function getMyMissions(userId: string): Promise<MyMission[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('job_posts')
    .select(
      `id, title, description, budget_min, budget_max, city, is_remote, deadline, status, created_at,
       categories ( name_fr ), job_responses ( count )`,
    )
    .eq('consumer_id', userId)
    .neq('status', 'deleted')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[my-data] missions fetch error:', error)
    return []
  }

  return ((data ?? []) as unknown as MissionRow[]).map((row) => ({
    id: row.id,
    title: row.title,
    description: row.description ?? null,
    budget_min: row.budget_min != null ? Number(row.budget_min) : null,
    budget_max: row.budget_max != null ? Number(row.budget_max) : null,
    city: row.city ?? null,
    is_remote: Boolean(row.is_remote),
    deadline: row.deadline ?? null,
    status: row.status,
    created_at: row.created_at,
    category: one(row.categories)?.name_fr ?? null,
    response_count: row.job_responses?.[0]?.count ?? 0,
  }))
}

// Categories for the create-mission select. Public-readable reference data.
//
// SERVICE-SIDE ONLY. A job post is a freelance mission, so the picker must not offer product
// categories — before `categories.kind` existed (migration 20260804132447) this select rendered
// all 14 rows and a consumer could file a mission under "Électronique" or "Beauté & Soins".
//
// `categories` is one flat table shared by products, service_listings, job_posts and
// shop_categories, so `kind` is the only thing that separates them. It is matched with `in` and
// not with equality because 'both' is a real value: `maison` carries it, on the grounds that
// ménage / plomberie / bricolage are a real Tunisian market the digital-only service taxonomy has
// not reached yet. Testing `kind = 'service'` would silently drop it.
export async function getCategories(): Promise<{ id: string; name_fr: string }[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('categories')
    .select('id, name_fr')
    .in('kind', ['service', 'both'])
    .order('name_fr')
  if (error) {
    console.error('[my-data] categories fetch error:', error.message, error.code, error.details)
    return []
  }
  return (data ?? []) as { id: string; name_fr: string }[]
}
