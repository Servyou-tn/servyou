import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import type { ProductListing } from '@/components/listings/ProductListingCard'
import type { ServiceListing } from '@/components/listings/ServiceListingCard'

// Initial-render cap. The marketplace is small pre-launch; pagination is a later concern.
const LIMIT = 30

// PostgREST returns a to-one embed as a single object, but some client/type paths
// surface it as a one-element array — normalize to a single record (or null).
function one<T>(embed: T | T[] | null | undefined): T | null {
  if (Array.isArray(embed)) return embed[0] ?? null
  return embed ?? null
}

type ProductRow = {
  id: string
  title: string
  price_tnd: number | string
  shops:
    | { name: string | null; city: string | null }
    | { name: string | null; city: string | null }[]
    | null
  product_images: { image_url: string; display_order: number }[] | null
}

// Active products for the /marche grid: newest first, with shop name/city (public on the
// shops table) and the primary image (lowest display_order). status='active' excludes the
// seller's hidden + sold_out rows; an optional q does a case-insensitive title match.
export const getActiveProducts = cache(async (q?: string): Promise<ProductListing[]> => {
  const supabase = await createClient()
  let query = supabase
    .from('products')
    .select('id, title, price_tnd, shops!inner(name, city), product_images(image_url, display_order)')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(LIMIT)

  const term = q?.trim()
  if (term) query = query.ilike('title', `%${term}%`)

  const { data, error } = await query
  if (error) {
    console.error('[marche/data] products fetch error:', error)
    return []
  }

  return ((data ?? []) as ProductRow[]).map((row) => {
    const shop = one(row.shops)
    const primary = [...(row.product_images ?? [])].sort(
      (a, b) => a.display_order - b.display_order,
    )[0]
    return {
      id: row.id,
      title: row.title,
      price_tnd: Number(row.price_tnd),
      image_url: primary?.image_url ?? null,
      shop: { name: shop?.name ?? '', city: shop?.city ?? null },
    }
  })
})

type ServiceRow = {
  id: string
  title: string
  starting_price_tnd: number | string | null
  created_at: string
  freelancer_profiles:
    | { profile_id: string; city: string | null }
    | { profile_id: string; city: string | null }[]
    | null
}

// Active services for the /marche list. Freelancer display names come from the
// public_profiles view, NOT a nested profiles embed: profiles SELECT is owner-only, so an
// embed would return a null full_name for every service the viewer doesn't own. We read
// freelancer_profiles (publicly readable: profile_id + professional city), then resolve
// names from public_profiles in a second query and merge them in.
export const getActiveServices = cache(async (q?: string): Promise<ServiceListing[]> => {
  const supabase = await createClient()
  let query = supabase
    .from('service_listings')
    .select('id, title, starting_price_tnd, created_at, freelancer_profiles!inner(profile_id, city)')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(LIMIT)

  const term = q?.trim()
  if (term) query = query.ilike('title', `%${term}%`)

  const { data, error } = await query
  if (error) {
    console.error('[marche/data] services fetch error:', error)
    return []
  }

  const rows = (data ?? []) as ServiceRow[]

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
    if (profilesError) console.error('[marche/data] public_profiles fetch error:', profilesError)
    for (const p of (profiles ?? []) as { id: string; full_name: string | null }[]) {
      names.set(p.id, p.full_name ?? '')
    }
  }

  return rows.map((row) => {
    const fp = one(row.freelancer_profiles)
    return {
      id: row.id,
      title: row.title,
      price_starting: row.starting_price_tnd != null ? Number(row.starting_price_tnd) : null,
      freelancer: {
        full_name: (fp?.profile_id ? names.get(fp.profile_id) : '') ?? '',
        city: fp?.city ?? null,
      },
      created_at: row.created_at,
    }
  })
})
