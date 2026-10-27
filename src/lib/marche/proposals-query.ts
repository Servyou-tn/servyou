import { createClient } from '@/lib/supabase/server'
import { getClientNames } from './missions-query'
import {
  pageProposals,
  resolveProposalState,
  type Proposal,
  type ProposalSort,
  type ProposalsPage,
  type ProposalTab,
} from './proposals'

// H11 « Mes propositions » data layer (docs/design/h9-h13-measurements.md §5). Read-only; the one write (« Retirer ma proposition »)
// is the server action in app/mes-propositions/actions.ts.
//
// The viewer's own job_responses (RLS: a responder reads their own rows) with the post as a LEFT embed. Since migration 70 (M-B) a
// post the viewer answered stays readable while open / filled / expired and disappears only once deleted or moderated, so a null
// embed is a real state (`unavailable`), not a failed join. Never degrades to « no proposals » on a failed query — it throws, like
// getEngagements. Small-data posture, as H8: the freelancer's proposals are bounded (5 active at a time) and filtered in JS.

type CategoryEmbed = { slug: string; name_fr: string; name_ar: string }
type PostEmbed = {
  id: string
  title: string
  status: string
  created_at: string
  consumer_id: string
  categories: CategoryEmbed | CategoryEmbed[] | null
}
type Row = {
  id: string
  job_post_id: string
  created_at: string
  proposed_price_tnd: number | string | null
  proposed_timeframe: string | null
  job_posts: PostEmbed | PostEmbed[] | null
}

function one<T>(embed: T | T[] | null | undefined): T | null {
  return Array.isArray(embed) ? (embed[0] ?? null) : (embed ?? null)
}

export async function getMyProposals(
  userId: string,
  opts: { tab: ProposalTab; q: string; sort: ProposalSort; page: number },
  now: Date = new Date(),
): Promise<ProposalsPage> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('job_responses')
    .select(
      `id, job_post_id, created_at, proposed_price_tnd, proposed_timeframe,
       job_posts ( id, title, status, created_at, consumer_id, categories ( slug, name_fr, name_ar ) )`,
    )
    .eq('freelancer_id', userId)
    .order('created_at', { ascending: false })
  if (error) {
    console.error('[proposals] fetch failed:', error.message, error.code, error.details)
    throw new Error(`proposals fetch failed: ${error.message}`)
  }

  const rows = (data ?? []) as unknown as Row[]
  const posts = rows.map((r) => one(r.job_posts))
  // Not degraded: without it every client reads « Client » and the client-name search matches nothing.
  const clients = await getClientNames(supabase, [...new Set(posts.flatMap((p) => (p ? [p.consumer_id] : [])))])

  const all: Proposal[] = rows.map((r, i) => {
    const post = posts[i]
    const cat = one(post?.categories)
    const client = post ? clients.get(post.consumer_id) : undefined
    return {
      id: r.id,
      jobPostId: r.job_post_id,
      createdAt: r.created_at,
      state: resolveProposalState(
        post ? { status: post.status as 'open' | 'filled' | 'expired' | 'deleted', createdAt: post.created_at } : null,
        now,
      ),
      price: r.proposed_price_tnd == null ? null : Number(r.proposed_price_tnd),
      timeframe: r.proposed_timeframe,
      title: post?.title ?? null,
      categorySlug: cat?.slug ?? null,
      categoryNameFr: cat?.name_fr ?? null,
      categoryNameAr: cat?.name_ar ?? null,
      clientId: post?.consumer_id ?? null,
      clientFirstName: client?.firstName ?? '',
      clientCity: client?.city ?? null,
    }
  })

  return pageProposals(all, opts, now)
}
