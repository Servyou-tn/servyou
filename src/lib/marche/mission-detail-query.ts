import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/supabase/database.types'
import { isUuid } from '@/lib/uuid'
import { isAnnoncePastExpiry } from '@/lib/marche/annonce-status'
import { resolveMissionCta, type MissionCtaState } from './mission-cta'
import { getClientNames, getMyResponseState } from './missions-query'
import { missionLiveness } from './missions'

// H10 mission detail data layer (docs/design/h9-h13-measurements.md §2). Read-only.
//
// What a viewer can see is whatever job_posts RLS lets through: a freelancer reads an OPEN, un-moderated post
// (or their own), and since migration 70 (M-B / gap G2) also a post they answered that has since been filled or
// expired; a deleted or moderated one is not found for them — they get a 404, not a stale page. An admin reads every post
// (admin read-all policy), which is how the moderation report's /missions/{id} link works (D10).

type PostRow = Pick<
  Database['public']['Tables']['job_posts']['Row'],
  | 'id'
  | 'consumer_id'
  | 'title'
  | 'description'
  | 'budget_min'
  | 'budget_max'
  | 'city'
  | 'is_remote'
  | 'status'
  | 'created_at'
  | 'admin_hidden_at'
  | 'response_count'
>
type CategoryEmbed = { slug: string; name_fr: string; name_ar: string }
type DetailRow = PostRow & {
  categories: CategoryEmbed | CategoryEmbed[] | null
  job_post_skills: { skill: string }[] | null
}

export type MissionDetail = {
  id: string
  title: string
  description: string
  budgetMin: number | null
  budgetMax: number | null
  city: string | null
  isRemote: boolean
  createdAt: string
  responseCount: number
  categorySlug: string | null
  categoryNameFr: string | null
  categoryNameAr: string | null
  skills: string[]
  client: { firstName: string; fullName: string; city: string | null; avatarUrl: string | null }
  hidden: boolean
  /** false unless the post still takes proposals (open, inside the window, not moderated). */
  isNew: boolean
  /** null unless the post still takes proposals — no « Expire dans » on a filled / expired one. */
  daysLeft: number | null
  expired: boolean
  /** null for an admin viewer — read-only, no CTA at all (D10). */
  cta: MissionCtaState | null
  /** The viewer's active proposals, for the « N sur 5 » reason line. */
  activeResponses: number
  /** created_at of the viewer's own response on this post, when there is one. */
  answeredAt: string | null
}

export type MissionViewer = { userId: string; kind: 'freelancer'; hasFreelancerProfile: boolean } | { userId: string; kind: 'admin' }

function one<T>(embed: T | T[] | null | undefined): T | null {
  if (Array.isArray(embed)) return embed[0] ?? null
  return embed ?? null
}

/** Null when the post does not exist or is not readable by the viewer (→ notFound()). */
export async function getMissionDetail(id: string, viewer: MissionViewer, now: Date = new Date()): Promise<MissionDetail | null> {
  // A malformed segment would reach PostgREST as a 22P02 and surface as a 500.
  if (!isUuid(id)) return null

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('job_posts')
    .select(
      `id, consumer_id, title, description, budget_min, budget_max, city, is_remote, status, created_at, admin_hidden_at, response_count,
       categories ( slug, name_fr, name_ar ),
       job_post_skills ( skill )`,
    )
    .eq('id', id)
    .order('created_at', { referencedTable: 'job_post_skills', ascending: true })
    .maybeSingle()
  if (error) {
    console.error('[mission-detail] post fetch failed:', error.message, error.code, error.details)
    throw new Error(`mission detail failed: ${error.message}`)
  }
  if (!data) return null

  const row = data as unknown as DetailRow
  const cat = one(row.categories)
  const clients = await getClientNames(supabase, [row.consumer_id])
  const client = clients.get(row.consumer_id) ?? { firstName: '', fullName: '', city: null, avatarUrl: null }

  let cta: MissionCtaState | null = null
  let activeResponses = 0
  let answeredAt: string | null = null
  if (viewer.kind === 'freelancer') {
    const mine = await getMyResponseState(supabase, viewer.userId, now)
    activeResponses = mine.activeCount
    if (mine.answeredIds.includes(row.id)) {
      const { data: resp, error: respError } = await supabase
        .from('job_responses')
        .select('created_at')
        .eq('job_post_id', row.id)
        .eq('freelancer_id', viewer.userId)
        .maybeSingle()
      if (respError) {
        console.error('[mission-detail] response fetch failed:', respError.message, respError.code, respError.details)
        throw new Error(`mission detail response failed: ${respError.message}`)
      }
      answeredAt = (resp?.created_at as string | undefined) ?? null
    }
    cta = resolveMissionCta(
      {
        isOwnPost: row.consumer_id === viewer.userId,
        answered: mine.answeredIds.includes(row.id),
        hasFreelancerProfile: viewer.hasFreelancerProfile,
        postStatus: row.status as 'open' | 'filled' | 'expired' | 'deleted',
        hidden: row.admin_hidden_at != null,
        createdAt: row.created_at,
        responseCount: row.response_count,
        activeResponses,
      },
      now,
    )
  }

  const liveness = missionLiveness(
    { status: row.status as 'open' | 'filled' | 'expired' | 'deleted', createdAt: row.created_at, hidden: row.admin_hidden_at != null },
    now,
  )

  return {
    id: row.id,
    title: row.title,
    description: row.description,
    budgetMin: row.budget_min == null ? null : Number(row.budget_min),
    budgetMax: row.budget_max == null ? null : Number(row.budget_max),
    city: row.city,
    isRemote: row.is_remote,
    createdAt: row.created_at,
    responseCount: row.response_count,
    categorySlug: cat?.slug ?? null,
    categoryNameFr: cat?.name_fr ?? null,
    categoryNameAr: cat?.name_ar ?? null,
    skills: (row.job_post_skills ?? []).map((s) => s.skill),
    client,
    hidden: row.admin_hidden_at != null,
    isNew: liveness.isNew,
    daysLeft: liveness.daysLeft,
    expired: row.status === 'open' && isAnnoncePastExpiry(row.created_at, now),
    cta,
    activeResponses,
    answeredAt,
  }
}
