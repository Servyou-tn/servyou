import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import {
  SERVICES_PER_PAGE,
  DEFAULT_SERVICE_SORT,
  countServiceTabs,
  type ServiceTab,
  type ServiceSort,
  type SellerServiceRow,
  type SellerServicesPage,
  type ServiceStats,
} from './seller-services'

// Server-only fetch for H5 « Mes services ». Split from ./seller-services (pure predicates/types,
// safe to import from a client component) for the same next/headers-leak reason seller-products.ts
// documents at its own header.

// Widened to the literal union here, at the query boundary, so everything downstream (the tab
// predicate, ServiceRow's switch) is compiler-exhaustive over the real DB domain instead of a bare
// `string` that silently accepts anything.
type CountRow = { id: string; status: 'active' | 'hidden' | 'draft' }

function countOf(embed: { count: number }[] | { count: number } | null | undefined): number {
  if (Array.isArray(embed)) return embed[0]?.count ?? 0
  return embed?.count ?? 0
}

function one<T>(embed: T | T[] | null | undefined): T | null {
  if (Array.isArray(embed)) return embed[0] ?? null
  return embed ?? null
}

type ContentRow = {
  id: string
  title: string
  description: string | null
  starting_price_tnd: number | string
  status: 'active' | 'hidden' | 'draft'
  admin_hidden_at: string | null
  commandes: { count: number }[] | { count: number } | null
  all_orders: { count: number }[] | { count: number } | null
  categories: { slug: string } | { slug: string }[] | null
}

// Africa/Tunis has been a fixed UTC+1 offset year-round since Tunisia abolished DST in 2005 — no
// seasonal shift to account for. Boundaries are still derived from Intl's own tz database rather
// than a hardcoded "+1", so a future DST reintroduction would only require re-verifying this
// comment, not rewriting the arithmetic.
export function tunisYearMonth(date: Date): { year: number; month: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Africa/Tunis',
    year: 'numeric',
    month: 'numeric',
  }).formatToParts(date)
  return {
    year: Number(parts.find((p) => p.type === 'year')!.value),
    month: Number(parts.find((p) => p.type === 'month')!.value), // 1-12
  }
}

// Tunis-local midnight on the 1st of (year, month) as a UTC instant. Fixed UTC+1 → Tunis midnight
// is 23:00 UTC the previous day.
export function tunisMonthStartUtc(year: number, monthIndex0: number): Date {
  return new Date(Date.UTC(year, monthIndex0, 1, -1, 0, 0))
}

export function monthBoundaries(now: Date) {
  const { year, month } = tunisYearMonth(now) // month is 1-12
  const thisMonthStart = tunisMonthStartUtc(year, month - 1)
  const nextMonthStart = tunisMonthStartUtc(year, month) // JS Date rolls month=12 into next year
  const lastMonthStart = tunisMonthStartUtc(year, month - 2)
  return { lastMonthStart, thisMonthStart, nextMonthStart }
}

/**
 * One page of the freelancer's own service catalogue, its tab counts, and the four "Ce qui se
 * passe" stat tiles (Services actifs / Demandes en attente / Commandes reçues / Commandes ce
 * mois). `ownerId` is `profiles.id` (orders.seller_id / orders.buyer_id target) — NOT
 * `freelancer_profile_id`, which only service_listings.freelancer_profile_id uses.
 */
export const getSellerServices = cache(
  async (
    freelancerProfileId: string,
    ownerId: string,
    opts: { tab: ServiceTab; page: number; q?: string; sort?: ServiceSort },
  ): Promise<SellerServicesPage> => {
    const supabase = await createClient()
    const sort = opts.sort ?? DEFAULT_SERVICE_SORT

    const { data: countRows, error: countsError } = await supabase
      .from('service_listings')
      .select('id, status')
      .eq('freelancer_profile_id', freelancerProfileId)

    if (countsError) {
      console.error('[seller-services] counts fetch error:', countsError.message, countsError.code, countsError.details)
      throw new Error(`seller services counts fetch failed: ${countsError.message}`)
    }

    const rows = (countRows ?? []) as unknown as CountRow[]
    const counts = countServiceTabs(rows)
    const activeCount = counts.active
    // Pagination is scoped to the CURRENT TAB's count; the stats tile below needs `counts.all`
    // instead ("5 sur 7 au total" counts every service, not just the active tab).
    const tabCount = counts[opts.tab]
    const totalPages = Math.max(1, Math.ceil(tabCount / SERVICES_PER_PAGE))
    const page = Math.min(Math.max(1, opts.page), totalPages)
    const start = (page - 1) * SERVICES_PER_PAGE

    let query = supabase
      .from('service_listings')
      .select(
        `id, title, description, starting_price_tnd, status, admin_hidden_at,
         commandes:orders(count), all_orders:orders(count), categories(slug)`,
      )
      .eq('freelancer_profile_id', freelancerProfileId)
      .neq('commandes.status', 'cancelled')

    if (opts.tab === 'active') query = query.eq('status', 'active')
    else if (opts.tab === 'paused') query = query.eq('status', 'hidden')
    // 'all' (Tous) is every status EXCEPT draft — a draft was never published by its owner, and H5
    // must not be the surface that first makes it visible (mirrors matchesServiceTab's 'all' case
    // in seller-services.ts; the DB-side filter and the pure predicate must agree or the tab's
    // fetched rows and its reported count would silently diverge).
    else query = query.neq('status', 'draft')

    if (opts.q && opts.q.trim().length > 0) {
      query = query.ilike('title', `%${opts.q.trim()}%`)
    }

    if (sort === 'price_asc') query = query.order('starting_price_tnd', { ascending: true })
    else if (sort === 'price_desc') query = query.order('starting_price_tnd', { ascending: false })
    else query = query.order('created_at', { ascending: false })
    // `.range()` needs a deterministic tiebreaker — same reasoning as seller-products-query.ts.
    query = query.order('id', { ascending: false })

    const { data, error } = await query.range(start, start + SERVICES_PER_PAGE - 1)

    if (error) {
      console.error('[seller-services] content fetch error:', error.message, error.code, error.details)
      throw new Error(`seller services content fetch failed: ${error.message}`)
    }

    const contentRows = (data ?? []) as unknown as ContentRow[]
    const services: SellerServiceRow[] = contentRows.map((r) => ({
      id: r.id,
      title: r.title,
      description: r.description,
      priceTnd: Number(r.starting_price_tnd),
      status: r.status,
      adminHiddenAt: r.admin_hidden_at,
      ordersCount: countOf(r.commandes),
      hasOrders: countOf(r.all_orders) > 0,
      isLastActive: r.status === 'active' && activeCount === 1,
      categorySlug: one(r.categories)?.slug ?? null,
    }))

    const stats = await getServiceStats(supabase, ownerId, activeCount, counts.all)

    return { services, counts, stats, totalCount: tabCount, totalPages, page }
  },
)

async function getServiceStats(
  supabase: Awaited<ReturnType<typeof createClient>>,
  ownerId: string,
  activeCount: number,
  totalCount: number,
): Promise<ServiceStats> {
  const { lastMonthStart, thisMonthStart, nextMonthStart } = monthBoundaries(new Date())

  const [pendingRes, receivedRes, thisMonthRes, lastMonthRes] = await Promise.all([
    supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('seller_id', ownerId)
      .eq('order_type', 'service')
      .eq('status', 'pending'),
    supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('seller_id', ownerId)
      .eq('order_type', 'service')
      .neq('status', 'cancelled'),
    supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('seller_id', ownerId)
      .eq('order_type', 'service')
      .neq('status', 'cancelled')
      .gte('created_at', thisMonthStart.toISOString())
      .lt('created_at', nextMonthStart.toISOString()),
    supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('seller_id', ownerId)
      .eq('order_type', 'service')
      .neq('status', 'cancelled')
      .gte('created_at', lastMonthStart.toISOString())
      .lt('created_at', thisMonthStart.toISOString()),
  ])

  for (const [label, res] of [
    ['pending', pendingRes],
    ['received', receivedRes],
    ['thisMonth', thisMonthRes],
    ['lastMonth', lastMonthRes],
  ] as const) {
    if (res.error) {
      console.error(`[seller-services] ${label} stats query failed:`, res.error.message, res.error.code, res.error.details)
    }
  }

  const thisMonthOrders = thisMonthRes.count ?? 0
  const lastMonthOrders = lastMonthRes.count ?? 0

  return {
    activeCount,
    totalCount,
    pendingOrders: pendingRes.count ?? 0,
    receivedOrders: receivedRes.count ?? 0,
    thisMonthOrders,
    monthDelta: thisMonthOrders - lastMonthOrders,
  }
}
