import type { createClient } from '@/lib/supabase/server'
import { reportQueryError } from '@/lib/supabase/query-error'

type Supabase = Awaited<ReturnType<typeof createClient>>

// Resolves what a report points at — its title, owner, city, price, excerpt and moderation marker — for
// the J5 queue and the J6 detail. One batched query per target table, NO embeds: job_posts carries two
// FKs to the same target (PGRST201 trap), and flat `.in()` reads keep every table's admin SELECT branch
// in play. Names come from `profiles` (admin reads all rows, migration 23) and never select phone,
// email or date_of_birth. A failed read is reported and leaves that target unresolved (« — » on
// screen), never an empty list.

export type ResolvedTarget = {
  /** null for person-shaped targets (user, freelancer_profile): the owner's name is the title. */
  title: string | null
  priceTnd: number | null
  excerpt: string | null
  createdAt: string | null
  city: string | null
  ownerId: string | null
  shopName: string | null
  hiddenAt: string | null
}

export type AdminProfile = {
  id: string
  full_name: string | null
  city: string | null
  seller_type: string | null
  created_at: string
  suspended_at: string | null
  suspended_reason: string | null
}

export type TargetRef = { target_type: string; target_id: string }

export const targetKey = (type: string, id: string) => `${type}:${id}`

const uniq = (values: Array<string | null | undefined>) => [...new Set(values.filter((v): v is string => !!v))]

export async function fetchProfiles(
  supabase: Supabase,
  ids: string[],
  where: string,
): Promise<{ map: Map<string, AdminProfile>; failed: boolean }> {
  const map = new Map<string, AdminProfile>()
  if (ids.length === 0) return { map, failed: false }
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, city, seller_type, created_at, suspended_at, suspended_reason')
    .in('id', ids)
  if (error) reportQueryError(where, error)
  for (const p of data ?? []) map.set(p.id, p)
  return { map, failed: Boolean(error) }
}

export async function resolveTargets(
  supabase: Supabase,
  refs: TargetRef[],
  extraProfileIds: string[],
  where: string,
): Promise<{ targets: Map<string, ResolvedTarget>; profiles: Map<string, AdminProfile>; failed: boolean }> {
  const idsOf = (type: string) => uniq(refs.filter((r) => r.target_type === type).map((r) => r.target_id))
  const productIds = idsOf('product')
  const serviceIds = idsOf('service')
  const jobIds = idsOf('job_post')

  const [products, services, jobs] = await Promise.all([
    productIds.length
      ? supabase.from('products').select('id, title, price_tnd, description, created_at, admin_hidden_at, shop_id').in('id', productIds)
      : null,
    serviceIds.length
      ? supabase
          .from('service_listings')
          .select('id, title, starting_price_tnd, short_description, created_at, admin_hidden_at, freelancer_profile_id')
          .in('id', serviceIds)
      : null,
    jobIds.length
      ? supabase.from('job_posts').select('id, title, city, consumer_id, description, created_at, admin_hidden_at').in('id', jobIds)
      : null,
  ])
  if (products?.error) reportQueryError(`${where} products`, products.error)
  if (services?.error) reportQueryError(`${where} services`, services.error)
  if (jobs?.error) reportQueryError(`${where} job_posts`, jobs.error)

  const shopIds = uniq([...idsOf('shop'), ...(products?.data ?? []).map((p) => p.shop_id)])
  const fpIds = uniq([...idsOf('freelancer_profile'), ...(services?.data ?? []).map((s) => s.freelancer_profile_id)])

  const [shops, fps] = await Promise.all([
    shopIds.length
      ? supabase.from('shops').select('id, name, city, owner_id, description, created_at, admin_hidden_at').in('id', shopIds)
      : null,
    fpIds.length
      ? supabase.from('freelancer_profiles').select('id, profile_id, city, headline, created_at, admin_hidden_at').in('id', fpIds)
      : null,
  ])
  if (shops?.error) reportQueryError(`${where} shops`, shops.error)
  if (fps?.error) reportQueryError(`${where} freelancer_profiles`, fps.error)

  const shopById = new Map((shops?.data ?? []).map((s) => [s.id, s]))
  const fpById = new Map((fps?.data ?? []).map((f) => [f.id, f]))
  const targets = new Map<string, ResolvedTarget>()

  for (const p of products?.data ?? []) {
    const shop = shopById.get(p.shop_id)
    targets.set(targetKey('product', p.id), {
      title: p.title, priceTnd: p.price_tnd, excerpt: p.description, createdAt: p.created_at,
      city: shop?.city ?? null, ownerId: shop?.owner_id ?? null, shopName: shop?.name ?? null, hiddenAt: p.admin_hidden_at,
    })
  }
  for (const s of services?.data ?? []) {
    const fp = fpById.get(s.freelancer_profile_id)
    targets.set(targetKey('service', s.id), {
      title: s.title, priceTnd: s.starting_price_tnd, excerpt: s.short_description, createdAt: s.created_at,
      city: fp?.city ?? null, ownerId: fp?.profile_id ?? null, shopName: null, hiddenAt: s.admin_hidden_at,
    })
  }
  for (const j of jobs?.data ?? []) {
    targets.set(targetKey('job_post', j.id), {
      title: j.title, priceTnd: null, excerpt: j.description, createdAt: j.created_at,
      city: j.city, ownerId: j.consumer_id, shopName: null, hiddenAt: j.admin_hidden_at,
    })
  }
  for (const id of idsOf('shop')) {
    const s = shopById.get(id)
    if (!s) continue
    targets.set(targetKey('shop', id), {
      title: s.name, priceTnd: null, excerpt: s.description, createdAt: s.created_at,
      city: s.city, ownerId: s.owner_id, shopName: s.name, hiddenAt: s.admin_hidden_at,
    })
  }
  for (const id of idsOf('freelancer_profile')) {
    const f = fpById.get(id)
    if (!f) continue
    targets.set(targetKey('freelancer_profile', id), {
      title: null, priceTnd: null, excerpt: f.headline, createdAt: f.created_at,
      city: f.city, ownerId: f.profile_id, shopName: null, hiddenAt: f.admin_hidden_at,
    })
  }

  const userIds = idsOf('user')
  const ownerIds = [...targets.values()].map((t) => t.ownerId)
  const { map: profiles, failed: profilesFailed } = await fetchProfiles(
    supabase,
    uniq([...ownerIds, ...userIds, ...extraProfileIds]),
    `${where} profiles`,
  )
  // Any failed read: a target missing from the map may be unreadable rather than gone.
  const failed = profilesFailed || [products, services, jobs, shops, fps].some((res) => Boolean(res?.error))

  for (const id of userIds) {
    const u = profiles.get(id)
    if (!u) continue
    targets.set(targetKey('user', id), {
      title: null, priceTnd: null, excerpt: null, createdAt: u.created_at,
      city: u.city, ownerId: u.id, shopName: null, hiddenAt: null,
    })
  }

  return { targets, profiles, failed }
}

/** How many reports each reporter sent, and how many of those were dismissed. null = the read failed
 *  (the caller then hides the line — a failed count is never shown as 0). */
export async function countReportsBy(
  supabase: Supabase,
  ids: string[],
  where: string,
): Promise<{ sent: Map<string, number>; dismissed: Map<string, number> } | null> {
  const sent = new Map<string, number>()
  const dismissed = new Map<string, number>()
  if (ids.length === 0) return { sent, dismissed }
  const { data, error } = await supabase.from('reports').select('reporter_id, status').in('reporter_id', ids)
  if (error) {
    reportQueryError(where, error)
    return null
  }
  for (const row of data ?? []) {
    sent.set(row.reporter_id, (sent.get(row.reporter_id) ?? 0) + 1)
    if (row.status === 'dismissed') dismissed.set(row.reporter_id, (dismissed.get(row.reporter_id) ?? 0) + 1)
  }
  return { sent, dismissed }
}

// The person or shop a target's meta line names after its type (« Produit · OM shop »).
export function targetSecondary(type: string, target: ResolvedTarget | undefined, owner: AdminProfile | undefined): string | null {
  if (!target) return null
  if (type === 'product') return target.shopName
  if (type === 'service' || type === 'job_post') return owner?.full_name ?? null
  return target.city
}

export function targetTitle(target: ResolvedTarget | undefined, owner: AdminProfile | undefined): string {
  return target?.title ?? owner?.full_name ?? '—'
}
