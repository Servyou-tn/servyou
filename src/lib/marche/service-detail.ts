import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import type { ServiceListing } from '@/components/listings/ServiceListingCard'

// Single-service detail fetch for /services/[id], mirroring product-detail.ts. Resurrected
// from the pre-reset page (59cb952^) and extended with the freelancer headline.
//
// The service_media (work-samples) fetch this file used to carry was REMOVED: the table holds
// zero rows, the per-service gallery was retired in favour of portfolio-per-freelancer, and D2
// (Figma 666:55479 / 668:55920) has no gallery region — so it fed nothing and read as
// load-bearing. If media ever returns, the design comes first. See docs/follow-ups.md.
//
// Moderation is preserved and hardened: status='active' AND the
// service's own admin_hidden_at IS NULL AND the freelancer's admin_hidden_at IS NULL via
// freelancer_profiles!inner (cascade). Freelancer name comes from the public_profiles view
// (profiles is owner-only read) — the robust two-query pattern from getActiveServices.

function one<T>(embed: T | T[] | null | undefined): T | null {
  if (Array.isArray(embed)) return embed[0] ?? null
  return embed ?? null
}

/** service_listings.delivery_mode — CHECK-constrained to these three. */
export type DeliveryMode = 'remote' | 'onsite' | 'hybrid'

const MODES: readonly string[] = ['remote', 'onsite', 'hybrid']
// Narrowed rather than cast: if the CHECK constraint is ever widened, an unknown value should
// degrade to "section hidden", not render a mode the UI has no label for.
function asMode(v: string | null | undefined): DeliveryMode | null {
  return v != null && MODES.includes(v) ? (v as DeliveryMode) : null
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
  freelancer: { name: string; city: string | null; headline: string | null } | null
  /** D2 "Ce qui est inclus" — section hides when empty. 20 of 21 seeded rows are empty today. */
  deliverables: string[]
  /** D2 "Mode de prestation" — null = freelancer has not said; section hides. */
  deliveryMode: DeliveryMode | null
  /**
   * Fetched but NOT surfaced on D2 by design — 666:55479 has no region for it. It is here for
   * E1, where the buyer needs the revision count before committing. Not an oversight; see
   * docs/follow-ups.md before adding UI for it.
   */
  revisionsCount: number
  tags: string[]
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
  delivery_mode: string | null
  revisions_count: number | null
  tags: string[] | null
  categories: { name_fr: string } | { name_fr: string }[] | null
  freelancer_profiles:
    | { id: string; profile_id: string | null; city: string | null; headline: string | null }
    | { id: string; profile_id: string | null; city: string | null; headline: string | null }[]
    | null
}

export const getServiceDetail = cache(async (id: string): Promise<ServiceDetailData | null> => {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('service_listings')
    .select(
      `id, title, description, starting_price_tnd, delivery_time, status, category_id, freelancer_profile_id,
       deliverables, delivery_mode, revisions_count, tags,
       categories ( name_fr ),
       freelancer_profiles!inner ( id, profile_id, city, headline, admin_hidden_at )`,
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

  return {
    id: row.id,
    title: row.title,
    description: row.description ?? null,
    startingPrice: row.starting_price_tnd != null ? Number(row.starting_price_tnd) : null,
    deliveryTime: row.delivery_time ?? null,
    category: one(row.categories)?.name_fr ?? null,
    categoryId: row.category_id,
    freelancerProfileId: row.freelancer_profile_id,
    freelancer: fp ? { name, city: fp.city ?? null, headline: fp.headline ?? null } : null,
    deliverables: row.deliverables ?? [],
    deliveryMode: asMode(row.delivery_mode),
    revisionsCount: row.revisions_count ?? 0,
    tags: row.tags ?? [],
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

export const RELATED_LIMIT = 3

// Related services — THREE TIERS, deduped, capped at RELATED_LIMIT:
//   1. same category   2. same freelancer   3. newest active
// (This replaces the original flat "same freelancer OR same category, cap 8" rule by founder
// direction, because that rule could return nothing.) Never-empty is the durable requirement:
// on today's catalog a category-only rule leaves 1 of 21 listings with an empty section and a
// freelancer-only rule leaves 6 of 21, since 6 of 10 freelancers have exactly one service. Those
// ratios will move at real volume — tier 3 is what makes the section safe regardless of shape.
// Tiers run in order and stop as soon as the cap is filled, so the common case is one query.
// Moderation is preserved from the original: admin-hidden services AND admin-hidden freelancers
// are excluded via the !inner cascade. Shaped into ServiceListing so ServiceListingCard renders
// them unchanged (which also means no rating row — the C1 phase-aware decision).
export async function getRelatedServices(opts: {
  serviceId: string
  freelancerProfileId: string | null
  categoryId: string | null
}): Promise<ServiceListing[]> {
  const supabase = await createClient()

  const tier = async (
    apply: (q: ReturnType<typeof base>) => ReturnType<typeof base>,
  ): Promise<RelatedRow[]> => {
    const { data, error } = await apply(base())
    if (error) {
      console.error('[service-detail] related fetch error:', error.message, error.code, error.details)
      return []
    }
    return (data ?? []) as unknown as RelatedRow[]
  }
  const base = () =>
    supabase
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
      .order('created_at', { ascending: false })
      .limit(RELATED_LIMIT)

  const rows: RelatedRow[] = []
  const seen = new Set<string>([opts.serviceId])
  const take = (incoming: RelatedRow[]) => {
    for (const r of incoming) {
      if (rows.length >= RELATED_LIMIT) return
      if (seen.has(r.id)) continue
      seen.add(r.id)
      rows.push(r)
    }
  }

  // Tier 1 — same category. category_id is NOT NULL on every active row today, so this cannot
  // degenerate into "every uncategorised row matches every other".
  if (opts.categoryId) take(await tier((q) => q.eq('category_id', opts.categoryId!)))
  // Tier 2 — same freelancer.
  if (rows.length < RELATED_LIMIT && opts.freelancerProfileId) {
    take(await tier((q) => q.eq('freelancer_profile_id', opts.freelancerProfileId!)))
  }
  // Tier 3 — newest active, excluding self. The guarantee that the section is never empty.
  if (rows.length < RELATED_LIMIT) take(await tier((q) => q))

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
