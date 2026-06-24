import { createClient } from '@/lib/supabase/server'

// Server reads for the freelancer dashboard landing page (/mon-profil-freelance). Owner-scoped
// and re-guarded by RLS; explicit .eq() keeps the intent clear. Every read captures `error`
// (never a silent default). Mirrors the shape of lib/marche/my-data.ts.
//
// Ownership keys are NOT uniform — verified against the migrations:
//   • service_listings.freelancer_profile_id → freelancer_profiles.id  (the fp row)
//   • orders.seller_id                        → profiles.id            (the auth uid)
//   • job_responses.freelancer_id             → profiles.id            (the auth uid; FK + RLS)
// Getting these wrong silently returns 0, so they are pinned here.

export type RecentServiceRequest = {
  id: string
  status: string
  created_at: string
  serviceTitle: string | null
  requesterName: string | null
}

export type FreelancerDashboard = {
  // null when the freelancer has upgraded but not yet created their freelancer_profiles row.
  profile: { id: string; headline: string | null } | null
  metrics: {
    activeServices: number
    pendingRequests: number
    sentResponses: number
    savedMissions: number | null // null → no table yet → render "coming soon"
  }
  recentRequests: RecentServiceRequest[]
}

// PostgREST returns a to-one embed as a single object, but some paths surface it as a
// one-element array — normalize to a single record (or null). Mirrors lib/marche/my-data.ts.
function one<T>(embed: T | T[] | null | undefined): T | null {
  if (Array.isArray(embed)) return embed[0] ?? null
  return embed ?? null
}

const EMPTY_METRICS = {
  activeServices: 0,
  pendingRequests: 0,
  sentResponses: 0,
  savedMissions: null as number | null,
}

export async function getFreelancerDashboard(userId: string): Promise<FreelancerDashboard> {
  const supabase = await createClient()

  // The freelancer_profiles row gates everything else. maybeSingle() → null = no profile yet.
  const { data: fp, error: fpError } = await supabase
    .from('freelancer_profiles')
    .select('id, headline')
    .eq('profile_id', userId)
    .maybeSingle()
  if (fpError) console.error('[freelance/dashboard] profile fetch error:', fpError)
  if (!fp) {
    return { profile: null, metrics: { ...EMPTY_METRICS }, recentRequests: [] }
  }

  // Three head-counts in parallel (head: true → count only, no rows shipped).
  const [services, requests, responses] = await Promise.all([
    supabase
      .from('service_listings')
      .select('*', { count: 'exact', head: true })
      .eq('freelancer_profile_id', fp.id)
      .eq('status', 'active'),
    supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('seller_id', userId)
      .eq('order_type', 'service')
      .eq('status', 'pending'),
    supabase
      .from('job_responses')
      .select('*', { count: 'exact', head: true })
      .eq('freelancer_id', userId),
  ])
  if (services.error) console.error('[freelance/dashboard] active services count error:', services.error)
  if (requests.error) console.error('[freelance/dashboard] pending requests count error:', requests.error)
  if (responses.error) console.error('[freelance/dashboard] sent responses count error:', responses.error)

  // The 3 most recent incoming service requests, with the service title via embed.
  const { data: recentRows, error: recentError } = await supabase
    .from('orders')
    .select('id, status, created_at, buyer_id, service_listings ( title )')
    .eq('seller_id', userId)
    .eq('order_type', 'service')
    .order('created_at', { ascending: false })
    .limit(3)
  if (recentError) console.error('[freelance/dashboard] recent requests error:', recentError)

  const rows = (recentRows ?? []) as unknown as {
    id: string
    status: string
    created_at: string
    buyer_id: string
    service_listings: { title: string } | { title: string }[] | null
  }[]

  // Requester display names — profiles is owner-only, so names come from the public_profiles
  // view via a single .in() lookup (the established pattern in lib/marche/my-data.ts).
  const buyerIds = [...new Set(rows.map((r) => r.buyer_id).filter(Boolean))]
  const names = new Map<string, string>()
  if (buyerIds.length > 0) {
    const { data: profiles, error: namesError } = await supabase
      .from('public_profiles')
      .select('id, full_name')
      .in('id', buyerIds)
    if (namesError) console.error('[freelance/dashboard] requester names error:', namesError)
    for (const p of (profiles ?? []) as { id: string; full_name: string | null }[]) {
      names.set(p.id, p.full_name ?? '')
    }
  }

  const recentRequests: RecentServiceRequest[] = rows.map((r) => ({
    id: r.id,
    status: r.status,
    created_at: r.created_at,
    serviceTitle: one(r.service_listings)?.title ?? null,
    requesterName: names.get(r.buyer_id) || null,
  }))

  return {
    profile: { id: fp.id, headline: fp.headline ?? null },
    metrics: {
      activeServices: services.count ?? 0,
      pendingRequests: requests.count ?? 0,
      sentResponses: responses.count ?? 0,
      savedMissions: null, // no saved-missions table at MVP — surfaced as "coming soon"
    },
    recentRequests,
  }
}
