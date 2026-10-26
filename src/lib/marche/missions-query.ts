import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/supabase/database.types'
import { MAX_RESPONSES_PER_POST } from '@/lib/job-constants'
import { isAnnoncePastExpiry } from '@/lib/marche/annonce-status'
import {
  budgetBucketOrFilters,
  firstName,
  isNewMission,
  missionCutoffIso,
  missionDaysLeft,
  MISSIONS_PER_PAGE,
  type MissionFilters,
} from './missions'

// H9 « Trouver des missions » data layer (docs/design/h9-h13-measurements.md §9 PR-1).
//
// Filtering, sorting, paging and the counts all run IN SQL: the open set can reach thousands, unlike the
// freelancer's own lists (H8 fetches everything and filters in JS). Every query throws on error — a failed
// read must never render as « no missions ».
//
// RLS is NOT the filter. job_posts SELECT is `(status = 'open' AND admin_hidden_at IS NULL) OR consumer_id = me`
// and has no expiry clause, so the freelancer's own (possibly old) posts and every 30-day-old open post are
// readable. Every exclusion below is therefore asked for explicitly: open · not moderated · inside the 30-day
// window · not mine · not full (10/10) · not already answered (D-H9-3).

type Client = SupabaseClient

type PostRow = Pick<
  Database['public']['Tables']['job_posts']['Row'],
  'id' | 'title' | 'description' | 'budget_min' | 'budget_max' | 'city' | 'is_remote' | 'created_at' | 'consumer_id' | 'response_count'
>
type CategoryEmbed = { slug: string; name_fr: string; name_ar: string }
type BoardRow = PostRow & {
  categories: CategoryEmbed | CategoryEmbed[] | null
  job_post_skills: { skill: string }[] | null
}

export type MissionSummary = {
  id: string
  title: string
  excerpt: string
  budgetMin: number | null
  budgetMax: number | null
  city: string | null
  isRemote: boolean
  responseCount: number
  categorySlug: string | null
  categoryNameFr: string | null
  categoryNameAr: string | null
  /** At most the first 3 — the card shows no more. */
  skills: string[]
  clientFirstName: string
  clientCity: string | null
  /** Server-clock fields, computed here so a client render never reads `now` (hydration). */
  isNew: boolean
  daysLeft: number
}

export type MissionBoardPage = {
  missions: MissionSummary[]
  /** Everything a freelancer could answer right now, ignoring the filters (« N missions disponibles »). */
  totalAvailable: number
  /** The filtered set (« Affichage x à y sur N », the pagination length). */
  totalCount: number
  page: number
  totalPages: number
  /** The viewer's responses on posts that are still open and inside the window (« N sur 5 »). */
  activeResponses: number
}

export type ServiceSector = { id: string; slug: string; nameFr: string; nameAr: string }

function one<T>(embed: T | T[] | null | undefined): T | null {
  if (Array.isArray(embed)) return embed[0] ?? null
  return embed ?? null
}

function toNum(v: number | string | null | undefined): number | null {
  return v == null ? null : Number(v)
}

function fail(scope: string, error: { message: string; code?: string; details?: string }): never {
  console.error(`[${scope}] failed:`, error.message, error.code, error.details)
  throw new Error(`${scope} failed: ${error.message}`)
}

/**
 * The viewer's own responses → which posts they already answered, and how many are still « active » (post open
 * and inside the window — the DB's own cap rule in check_job_response_limits).
 *
 * The post embed is a LEFT join: RLS hides a response's post from its responder once it stops being open
 * (docs/design/h9-h13-measurements.md gap G2), and a hidden post is correctly not active. Known drift (G5): a
 * moderated-but-open post counts toward the DB cap but is invisible here, so this can read 4/5 while the DB
 * refuses at 5.
 */
export async function getMyResponseState(
  supabase: Client,
  userId: string,
  now: Date,
): Promise<{ answeredIds: string[]; answeredLiveIds: string[]; activeCount: number }> {
  const { data, error } = await supabase
    .from('job_responses')
    .select('job_post_id, job_posts ( status, created_at )')
    .eq('freelancer_id', userId)
  if (error) fail('missions responses', error)

  const rows = (data ?? []) as unknown as {
    job_post_id: string
    job_posts: { status: string; created_at: string } | { status: string; created_at: string }[] | null
  }[]
  // `answeredLiveIds` = answered AND still open inside the window: the only ones the board's `not in` needs (every
  // other answered post is already excluded by the status / window predicates), which keeps that URL list short
  // for a freelancer with a long history.
  const answeredLiveIds: string[] = []
  for (const r of rows) {
    const post = one(r.job_posts)
    if (post && post.status === 'open' && !isAnnoncePastExpiry(post.created_at, now)) answeredLiveIds.push(r.job_post_id)
  }
  return { answeredIds: rows.map((r) => r.job_post_id), answeredLiveIds, activeCount: answeredLiveIds.length }
}

/** Service sectors for the Catégorie filter. Throws — the shared getCategories() swallows errors into []. */
export async function getServiceSectors(supabase: Client): Promise<ServiceSector[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('id, slug, name_fr, name_ar')
    .in('kind', ['service', 'both'])
    .is('parent_id', null)
    .order('name_fr')
  if (error) fail('missions sectors', error)
  return (data ?? []).map((c) => ({ id: c.id as string, slug: c.slug as string, nameFr: c.name_fr as string, nameAr: c.name_ar as string }))
}

/** The viewer's own profile skills — the pool for the Compétences filter (D-H9-4). */
export async function getMyProfileSkills(supabase: Client, freelancerProfileId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('freelancer_skills')
    .select('skill')
    .eq('freelancer_profile_id', freelancerProfileId)
    .order('skill')
  if (error) fail('missions skills', error)
  return [...new Set((data ?? []).map((r) => r.skill as string))]
}

type BoardQueryArgs = {
  select: string
  head: boolean
  userId: string
  now: Date
  answeredIds: string[]
  /** null = the unfiltered « available » set. */
  filters: MissionFilters | null
  categoryId: string | null
  skillPostIds: string[] | null
}

function boardQuery(supabase: Client, a: BoardQueryArgs) {
  let q = supabase
    .from('job_posts')
    .select(a.select, a.head ? { count: 'exact', head: true } : { count: 'exact' })
    .eq('status', 'open')
    .is('admin_hidden_at', null)
    .gte('created_at', missionCutoffIso(a.now))
    .neq('consumer_id', a.userId)
    .lt('response_count', MAX_RESPONSES_PER_POST)
  if (a.answeredIds.length > 0) q = q.not('id', 'in', `(${a.answeredIds.join(',')})`)

  const f = a.filters
  if (f) {
    if (a.categoryId) q = q.eq('category_id', a.categoryId)
    if (f.ville) q = q.eq('city', f.ville)
    if (f.teletravail) q = q.eq('is_remote', true)
    if (f.budget) for (const group of budgetBucketOrFilters(f.budget)) q = q.or(group)
    if (a.skillPostIds) q = q.in('id', a.skillPostIds)
  }
  return q
}

const CARD_SELECT = `id, title, description, budget_min, budget_max, city, is_remote, created_at, consumer_id, response_count,
  categories ( slug, name_fr, name_ar ),
  job_post_skills ( skill )`

export async function getMissionBoard(
  userId: string,
  filters: MissionFilters,
  categoryId: string | null,
  now: Date = new Date(),
): Promise<MissionBoardPage> {
  const supabase = await createClient()
  const mine = await getMyResponseState(supabase, userId, now)

  // A skill filter is a lookup of post ids first (not an `!inner` embed): an inner embed filtered on `skill`
  // would also cut the card's displayed skill chips down to the one matching row.
  let skillPostIds: string[] | null = null
  if (filters.competence) {
    // Scoped to posts the board could show (open, inside the window) so old open posts never pile into the id
    // list, and capped explicitly: PostgREST would otherwise truncate at max_rows without saying so.
    const { data, error } = await supabase
      .from('job_post_skills')
      .select('job_post_id, job_posts!inner ( id )')
      .eq('skill', filters.competence)
      .eq('job_posts.status', 'open')
      .gte('job_posts.created_at', missionCutoffIso(now))
      .limit(500)
    if (error) fail('missions skill filter', error)
    skillPostIds = [...new Set((data ?? []).map((r) => r.job_post_id as string))]
  }

  const common = { userId, now, answeredIds: mine.answeredLiveIds }
  const skillFilterMatchesNothing = skillPostIds !== null && skillPostIds.length === 0

  const [availableRes, filteredRes] = await Promise.all([
    boardQuery(supabase, { ...common, select: 'id', head: true, filters: null, categoryId: null, skillPostIds: null }),
    skillFilterMatchesNothing
      ? Promise.resolve({ count: 0, error: null })
      : boardQuery(supabase, { ...common, select: 'id', head: true, filters, categoryId, skillPostIds }),
  ])
  if (availableRes.error) fail('missions available count', availableRes.error)
  if (filteredRes.error) fail('missions filtered count', filteredRes.error)

  const totalAvailable = availableRes.count ?? 0
  const totalCount = filteredRes.count ?? 0
  const totalPages = Math.max(1, Math.ceil(totalCount / MISSIONS_PER_PAGE))
  // Clamp BEFORE ranging: PostgREST answers a range past the end with 416 / PGRST103, which would 500 a stale ?page=99.
  const page = Math.min(filters.page, totalPages)
  const empty = { missions: [], totalAvailable, totalCount, page, totalPages, activeResponses: mine.activeCount }
  if (totalCount === 0) return empty

  let q = boardQuery(supabase, { ...common, select: CARD_SELECT, head: false, filters, categoryId, skillPostIds })
  switch (filters.tri) {
    case 'concurrence':
      q = q.order('response_count', { ascending: true }).order('created_at', { ascending: false })
      break
    case 'budget':
      q = q
        .order('budget_max', { ascending: false, nullsFirst: false })
        .order('budget_min', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false })
      break
    case 'expire':
      q = q.order('created_at', { ascending: true })
      break
    default:
      q = q.order('created_at', { ascending: false })
  }
  // `id` last: without a total order, rows tied on the sort key can swap between page N and N+1.
  const from = (page - 1) * MISSIONS_PER_PAGE
  const { data, error } = await q
    .order('id')
    .order('created_at', { referencedTable: 'job_post_skills', ascending: true })
    .range(from, from + MISSIONS_PER_PAGE - 1)
  if (error) fail('missions page', error)

  const rows = (data ?? []) as unknown as BoardRow[]
  const clients = await getClientNames(supabase, [...new Set(rows.map((r) => r.consumer_id))])

  const missions: MissionSummary[] = rows.map((r) => {
    const cat = one(r.categories)
    const client = clients.get(r.consumer_id)
    return {
      id: r.id,
      title: r.title,
      excerpt: r.description.slice(0, 300),
      budgetMin: toNum(r.budget_min),
      budgetMax: toNum(r.budget_max),
      city: r.city,
      isRemote: r.is_remote,
      responseCount: r.response_count,
      categorySlug: cat?.slug ?? null,
      categoryNameFr: cat?.name_fr ?? null,
      categoryNameAr: cat?.name_ar ?? null,
      skills: (r.job_post_skills ?? []).slice(0, 3).map((s) => s.skill),
      clientFirstName: client?.firstName ?? '',
      clientCity: client?.city ?? null,
      isNew: isNewMission(r.created_at, now),
      daysLeft: missionDaysLeft(r.created_at, now),
    }
  })

  return { missions, totalAvailable, totalCount, page, totalPages, activeResponses: mine.activeCount }
}

/**
 * Client first name + city from public_profiles (name/city only; profiles SELECT is owner-only, so an embed
 * would be null for every client). Not degraded: without it every card would read « un client ».
 */
export async function getClientNames(
  supabase: Client,
  ids: string[],
): Promise<Map<string, { firstName: string; fullName: string; city: string | null; avatarUrl: string | null }>> {
  const out = new Map<string, { firstName: string; fullName: string; city: string | null; avatarUrl: string | null }>()
  if (ids.length === 0) return out
  const { data, error } = await supabase.from('public_profiles').select('id, full_name, city, avatar_url').in('id', ids)
  if (error) fail('missions clients', error)
  for (const p of data ?? []) {
    out.set(p.id as string, {
      firstName: firstName(p.full_name as string | null),
      fullName: (p.full_name as string | null) ?? '',
      city: (p.city as string | null) ?? null,
      avatarUrl: (p.avatar_url as string | null) ?? null,
    })
  }
  return out
}
