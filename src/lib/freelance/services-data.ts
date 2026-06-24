import { createClient } from '@/lib/supabase/server'

// Server reads for the freelancer's own services list (/mon-profil-freelance/services). Owner-scoped
// and re-guarded by RLS. Schema (verified live):
//   • service_listings.freelancer_profile_id → freelancer_profiles.id (NOT the auth uid)
//   • price column is `starting_price_tnd`; status is 'active' | 'hidden'
//   • category name via the categories embed; the request count via orders.service_listing_id

export type ServiceRow = {
  id: string
  title: string
  descriptionPreview: string | null
  price: number | null
  status: string // 'active' | 'hidden'
  categoryName: string | null
  requestCount: number
  deliverablesCount: number
  revisionsCount: number
  createdAt: string
}

const DESCRIPTION_PREVIEW_MAX = 100

function one<T>(embed: T | T[] | null | undefined): T | null {
  if (Array.isArray(embed)) return embed[0] ?? null
  return embed ?? null
}

// The freelancer_profiles row id for a user (auth uid), or null if they haven't created one yet
// (→ the page redirects to /creer). service_listings key on this fp id, not the auth uid.
export async function getFreelancerProfileId(userId: string): Promise<string | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('freelancer_profiles')
    .select('id')
    .eq('profile_id', userId)
    .maybeSingle()
  if (error) console.error('[services-data] profile id error:', error)
  return (data as { id: string } | null)?.id ?? null
}

type RawService = {
  id: string
  title: string
  description: string | null
  starting_price_tnd: string | number | null
  status: string
  created_at: string
  deliverables: string[] | null
  revisions_count: number | null
  categories: { name_fr: string } | { name_fr: string }[] | null
}

// The freelancer's own service listings (active + hidden), newest first, each with its category
// name and the count of service requests it has received. The request count is RLS-safe: orders
// SELECT allows the seller (buyer_id OR seller_id = auth.uid()) to read their own orders, and every
// order for one of these services has this freelancer as the seller.
export async function getMyServices(freelancerProfileId: string): Promise<ServiceRow[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('service_listings')
    .select(
      'id, title, description, starting_price_tnd, status, created_at, deliverables, revisions_count, categories ( name_fr )',
    )
    .eq('freelancer_profile_id', freelancerProfileId)
    .order('created_at', { ascending: false })
  if (error) {
    console.error('[services-data]', error)
    return []
  }

  const rows = (data ?? []) as unknown as RawService[]
  const ids = rows.map((r) => r.id)

  // Request count per service — orders for these services (one query, counted in-app).
  const counts = new Map<string, number>()
  if (ids.length > 0) {
    const { data: orderRows, error: orderError } = await supabase
      .from('orders')
      .select('service_listing_id')
      .in('service_listing_id', ids)
      .eq('order_type', 'service')
    if (orderError) console.error('[services-data]', orderError)
    for (const o of (orderRows ?? []) as { service_listing_id: string }[]) {
      counts.set(o.service_listing_id, (counts.get(o.service_listing_id) ?? 0) + 1)
    }
  }

  return rows.map((r) => {
    const description = r.description ?? null
    return {
      id: r.id,
      title: r.title,
      descriptionPreview:
        description && description.length > DESCRIPTION_PREVIEW_MAX
          ? `${description.slice(0, DESCRIPTION_PREVIEW_MAX).trimEnd()}…`
          : description,
      price: r.starting_price_tnd != null ? Number(r.starting_price_tnd) : null,
      status: r.status,
      categoryName: one(r.categories)?.name_fr ?? null,
      requestCount: counts.get(r.id) ?? 0,
      deliverablesCount: (r.deliverables ?? []).length,
      revisionsCount: r.revisions_count ?? 0,
      createdAt: r.created_at,
    }
  })
}

// The 14 platform categories for the service form's dropdown (id needed to store category_id).
export async function getServiceCategories(): Promise<
  { id: string; name_fr: string; name_ar: string }[]
> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('categories')
    .select('id, name_fr, name_ar')
    .order('name_fr')
  if (error) {
    console.error('[services-data] categories error:', error)
    return []
  }
  return (data ?? []) as { id: string; name_fr: string; name_ar: string }[]
}

// Form-shaped values for the edit page (all strings, ready to seed the controlled inputs). Scoped
// to the owner via the freelancer_profile_id .eq() — a non-owned / missing id returns null so the
// page can notFound() (RLS SELECT is public, so this .eq() is the ownership gate for the edit view).
export type ServiceEditValues = {
  id: string
  title: string
  categoryId: string
  description: string
  startingPrice: string
  deliveryTime: string
  status: string
  deliverables: string[]
  revisions: string
  tags: string[]
  buyerBriefing: string
}

export async function getServiceForEdit(
  serviceId: string,
  freelancerProfileId: string,
): Promise<ServiceEditValues | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('service_listings')
    .select(
      'id, title, description, category_id, starting_price_tnd, delivery_time, status, deliverables, revisions_count, tags, buyer_briefing',
    )
    .eq('id', serviceId)
    .eq('freelancer_profile_id', freelancerProfileId)
    .maybeSingle()
  if (error) {
    console.error('[services-data] service for edit error:', error)
    return null
  }
  if (!data) return null

  const r = data as {
    id: string
    title: string
    description: string | null
    category_id: string | null
    starting_price_tnd: string | number | null
    delivery_time: string | null
    status: string
    deliverables: string[] | null
    revisions_count: number | null
    tags: string[] | null
    buyer_briefing: string | null
  }
  return {
    id: r.id,
    title: r.title,
    categoryId: r.category_id ?? '',
    description: r.description ?? '',
    startingPrice: r.starting_price_tnd != null ? String(r.starting_price_tnd) : '',
    deliveryTime: r.delivery_time ?? '',
    status: r.status,
    deliverables: r.deliverables ?? [],
    revisions: r.revisions_count != null ? String(r.revisions_count) : '1',
    tags: r.tags ?? [],
    buyerBriefing: r.buyer_briefing ?? '',
  }
}
