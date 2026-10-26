import { createClient } from '@/lib/supabase/server'
import { isUuid } from '@/lib/uuid'
import { getClientNames } from './missions-query'

// H13 « Proposition envoyée » data layer (docs/design/h9-h13-measurements.md §4). Server-rendered from the PERSISTED response,
// so the page survives a refresh and a deep link — never from transient client state. The response is the viewer's own
// (RLS: a responder reads their own rows).
//
// The post embed is a LEFT join on purpose: the responder-read policy (M-B) keeps an answered post readable while it is open /
// filled / expired, but not once it is deleted or moderated — the recap then still shows what was sent, without the mission.

type CategoryEmbed = { slug: string; name_fr: string; name_ar: string }
type PostEmbed = {
  id: string
  title: string
  consumer_id: string
  response_count: number
  categories: CategoryEmbed | CategoryEmbed[] | null
}
type Row = {
  id: string
  created_at: string
  proposal_message: string | null
  proposed_price_tnd: number | string | null
  proposed_timeframe: string | null
  portfolio_links: unknown
  job_response_skills: { skill: string }[] | null
  job_posts: PostEmbed | PostEmbed[] | null
}

export type SentLink = { url: string; label: string | null }

export type SentProposal = {
  id: string
  createdAt: string
  message: string
  price: number | null
  timeframe: string | null
  links: SentLink[]
  skills: string[]
  mission: {
    id: string
    title: string
    consumerId: string
    categorySlug: string | null
    categoryNameFr: string | null
    categoryNameAr: string | null
    /** Everyone's responses including this one. */
    responseCount: number
  } | null
  clientFirstName: string
}

function one<T>(v: T | T[] | null | undefined): T | null {
  return Array.isArray(v) ? (v[0] ?? null) : (v ?? null)
}

/** portfolio_links is jsonb: accept only well-formed { url, label? } entries (the DB trigger already guarantees it; this is for the type). */
export function parseSentLinks(raw: unknown): SentLink[] {
  if (!Array.isArray(raw)) return []
  const out: SentLink[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const { url, label } = item as { url?: unknown; label?: unknown }
    if (typeof url !== 'string' || url === '') continue
    out.push({ url, label: typeof label === 'string' && label.trim() !== '' ? label.trim() : null })
  }
  return out
}

/** `null` when the viewer has not answered this post (→ the page sends them back to the mission). */
export async function getSentProposal(jobPostId: string, userId: string): Promise<SentProposal | null> {
  if (!isUuid(jobPostId)) return null
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('job_responses')
    .select(
      `id, created_at, proposal_message, proposed_price_tnd, proposed_timeframe, portfolio_links,
       job_response_skills ( skill ),
       job_posts ( id, title, consumer_id, response_count, categories ( slug, name_fr, name_ar ) )`,
    )
    .eq('job_post_id', jobPostId)
    .eq('freelancer_id', userId)
    .order('created_at', { referencedTable: 'job_response_skills', ascending: true })
    .maybeSingle()
  if (error) {
    console.error('[sent-proposal] fetch failed:', error.message, error.code, error.details)
    throw new Error(`sent proposal fetch failed: ${error.message}`)
  }
  if (!data) return null

  const row = data as unknown as Row
  const post = one(row.job_posts)
  const cat = one(post?.categories)
  const client = post ? (await getClientNames(supabase, [post.consumer_id])).get(post.consumer_id) : undefined

  return {
    id: row.id,
    createdAt: row.created_at,
    message: row.proposal_message ?? '',
    price: row.proposed_price_tnd == null ? null : Number(row.proposed_price_tnd),
    timeframe: row.proposed_timeframe,
    links: parseSentLinks(row.portfolio_links),
    skills: (row.job_response_skills ?? []).map((s) => s.skill),
    mission: post
      ? {
          id: post.id,
          title: post.title,
          consumerId: post.consumer_id,
          categorySlug: cat?.slug ?? null,
          categoryNameFr: cat?.name_fr ?? null,
          categoryNameAr: cat?.name_ar ?? null,
          responseCount: post.response_count,
        }
      : null,
    clientFirstName: client?.firstName ?? '',
  }
}
