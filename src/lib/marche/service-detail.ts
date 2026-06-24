import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import type { ServiceListing } from '@/components/listings/ServiceListingCard'

// Single-service detail fetch for /services/[id], mirroring product-detail.ts. Resurrected
// from the pre-reset page (59cb952^) and extended with service_media (work samples) +
// freelancer headline. Moderation is preserved and hardened: status='active' AND the
// service's own admin_hidden_at IS NULL AND the freelancer's admin_hidden_at IS NULL via
// freelancer_profiles!inner (cascade). Freelancer name comes from the public_profiles view
// (profiles is owner-only read) — the robust two-query pattern from getActiveServices.

function one<T>(embed: T | T[] | null | undefined): T | null {
  if (Array.isArray(embed)) return embed[0] ?? null
  return embed ?? null
}

export type ServiceDetailData = {
  id: string
  title: string
  description: string | null
  startingPrice: number | null
  deliveryTime: string | null
  category: string | null
  categoryId: string | null
  freelancerProfileId: string | null
  deliverables: string[]
  revisionsCount: number
  tags: string[]
  buyerBriefing: string | null
  media: { url: string }[]
  freelancer: { name: string; city: string | null; headline: string | null } | null
}

type DetailRow = {
  id: string
  title: string
  description: string | null
  starting_price_tnd: number | string | null
  delivery_time: string | null
  category_id: string | null
  freelancer_profile_id: string | null
  deliverables: string[] | null
  revisions_count: number | null
  tags: string[] | null
  buyer_briefing: string | null
  categories: { name_fr: string } | { name_fr: string }[] | null
  freelancer_profiles:
    | { id: string; profile_id: string | null; city: string | null; headline: string | null }
    | { id: string; profile_id: string | null; city: string | null; headline: string | null }[]
    | null
  service_media: { media_url: string; media_type: string; display_order: number }[] | null
}

export const getServiceDetail = cache(async (id: string): Promise<ServiceDetailData | null> => {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('service_listings')
    .select(
      `id, title, description, starting_price_tnd, delivery_time, status, category_id, freelancer_profile_id,
       deliverables, revisions_count, tags, buyer_briefing,
       categories ( name_fr ),
       freelancer_profiles!inner ( id, profile_id, city, headline, admin_hidden_at ),
       service_media ( media_url, media_type, display_order )`,
    )
    .eq('id', id)
    .eq('status', 'active')
    .is('admin_hidden_at', null)
    .is('freelancer_profiles.admin_hidden_at', null)
    .maybeSingle()

  if (error) {
    console.error('[service-detail] fetch error:', error)
    return null
  }
  if (!data) return null

  const row = data as unknown as DetailRow
  const fp = one(row.freelancer_profiles)

  let name = ''
  if (fp?.profile_id) {
    const { data: prof, error: pErr } = await supabase
      .from('public_profiles')
      .select('full_name')
      .eq('id', fp.profile_id)
      .maybeSingle()
    if (pErr) console.error('[service-detail] public_profiles error:', pErr)
    name = prof?.full_name ?? ''
  }

  const media = [...(row.service_media ?? [])]
    .filter((m) => m.media_type === 'image')
    .sort((a, b) => a.display_order - b.display_order)
    .map((m) => ({ url: m.media_url }))

  return {
    id: row.id,
    title: row.title,
    description: row.description ?? null,
    startingPrice: row.starting_price_tnd != null ? Number(row.starting_price_tnd) : null,
    deliveryTime: row.delivery_time ?? null,
    category: one(row.categories)?.name_fr ?? null,
    categoryId: row.category_id,
    freelancerProfileId: row.freelancer_profile_id,
    deliverables: row.deliverables ?? [],
    revisionsCount: row.revisions_count ?? 0,
    tags: row.tags ?? [],
    buyerBriefing: row.buyer_briefing ?? null,
    media,
    freelancer: fp ? { name, city: fp.city ?? null, headline: fp.headline ?? null } : null,
  }
})

type RelatedRow = {
  id: string
  title: string
  description: string | null
  starting_price_tnd: number | string | null
  delivery_time: string | null
  categories: { name_fr: string } | { name_fr: string }[] | null
  freelancer_profiles: { profile_id: string | null; city: string | null } | { profile_id: string | null; city: string | null }[] | null
}

// Related = active services from the SAME freelancer OR SAME category, excluding the
// current one (and excluding admin-hidden services/freelancers), newest first, capped at 8.
// Shaped into ServiceListing so the existing ServiceListingCard renders them unchanged.
export async function getRelatedServices(opts: {
  serviceId: string
  freelancerProfileId: string | null
  categoryId: string | null
}): Promise<ServiceListing[]> {
  const orParts: string[] = []
  if (opts.freelancerProfileId) orParts.push(`freelancer_profile_id.eq.${opts.freelancerProfileId}`)
  if (opts.categoryId) orParts.push(`category_id.eq.${opts.categoryId}`)
  if (orParts.length === 0) return []

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('service_listings')
    .select(
      `id, title, description, starting_price_tnd, delivery_time,
       categories ( name_fr ),
       freelancer_profiles!inner ( profile_id, city, admin_hidden_at )`,
    )
    .eq('status', 'active')
    .is('admin_hidden_at', null)
    .is('freelancer_profiles.admin_hidden_at', null)
    .neq('id', opts.serviceId)
    .or(orParts.join(','))
    .order('created_at', { ascending: false })
    .limit(8)

  if (error) {
    console.error('[service-detail] related fetch error:', error)
    return []
  }

  const rows = (data ?? []) as unknown as RelatedRow[]

  const profileIds = [
    ...new Set(
      rows
        .map((r) => one(r.freelancer_profiles)?.profile_id)
        .filter((pid): pid is string => Boolean(pid)),
    ),
  ]
  const names = new Map<string, string>()
  if (profileIds.length > 0) {
    const { data: profiles, error: pErr } = await supabase
      .from('public_profiles')
      .select('id, full_name')
      .in('id', profileIds)
    if (pErr) console.error('[service-detail] related public_profiles error:', pErr)
    for (const p of (profiles ?? []) as { id: string; full_name: string | null }[]) {
      names.set(p.id, p.full_name ?? '')
    }
  }

  return rows.map((row) => {
    const fp = one(row.freelancer_profiles)
    return {
      id: row.id,
      title: row.title,
      description: row.description ?? null,
      price_starting: row.starting_price_tnd != null ? Number(row.starting_price_tnd) : null,
      delivery_time: row.delivery_time ?? null,
      category: one(row.categories) ? { name_fr: one(row.categories)!.name_fr } : null,
      freelancer: {
        full_name: (fp?.profile_id ? names.get(fp.profile_id) : '') ?? '',
        city: fp?.city ?? null,
      },
    }
  })
}
