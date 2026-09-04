import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'

// H4 « Tableau de bord freelance » data layer (Figma 166:12086). Every field below traces to
// docs/design/h4-discovery.md — read that file before changing a mapping here, it carries the
// measured/re-verified/ruled provenance this comment block does not repeat.
//
// One freelancer's snapshot: the four glance tiles, the Force du profil checklist, the Ecosystem
// counts, the Missions récentes match, and the Activité récente feed. Read-only.

export type FreelancerChecklist = {
  avatar: boolean
  bio: boolean
  skills: boolean
  /** Always false — Ruling 2. Goes live with H3's freelancer_portfolio_items; do not flip this
   *  true off `portfolio_link`, that column is not the same thing as a portfolio item. */
  portfolio: boolean
}

export type MissionMatch = {
  id: string
  title: string
  budgetMin: number | null
  budgetMax: number | null
  city: string | null
  isRemote: boolean
  createdAt: string
}

export type ActivityEvent =
  | { kind: 'request'; createdAt: string; title: string }
  | { kind: 'status'; createdAt: string; status: string; title: string }
  // title is null when job_posts' RLS hides the post from its responder (see the note on
  // responsesQuery below) — a real, honest gap, not a bug in this mapping.
  | { kind: 'proposal'; createdAt: string; title: string | null }

export type FreelancerDashboard = {
  servicesActifs: number
  engagementsActifs: number
  demandesEnAttente: number
  checklist: FreelancerChecklist
  ecosystem: { consumers: number; shops: number }
  missions: MissionMatch[]
  activite: ActivityEvent[]
  /** Orders where THIS freelancer is the buyer (not the seller), not yet terminal — backs the
   *  count badge on Actions rapides' "Voir mes commandes" chip. §9 of h4-discovery.md: the frame
   *  is explicit that badge is a real count, not a static dot. */
  activePurchasesCount: number
}

/** Ruling 1: no profile_views table, no write path, nothing seeded. A named constant so the "0"
 *  in the stat tile reads as a documented decision, not a forgotten wire-up. */
export const VUES_DU_PROFIL = 0

// A SERVICE order only ever reaches 5 of the DB's 8 statuses (order-status.ts) — pending,
// accepted, arrived, received, cancelled. "Active" excludes the two terminal ones.
const TERMINAL_ORDER_STATUSES: readonly string[] = ['received', 'cancelled']
const ACTIVITY_LIMIT = 4
const MISSIONS_LIMIT = 3

type OrderEventRow = { event_type: string; to_status: string | null; created_at: string }
type OrderRow = {
  id: string
  status: string
  created_at: string
  item_title: string | null
  service_listings: { title: string } | { title: string }[] | null
  order_events: OrderEventRow[] | null
}

function one<T>(embed: T | T[] | null | undefined): T | null {
  if (Array.isArray(embed)) return embed[0] ?? null
  return embed ?? null
}

/** Snapshot first, live join as the self-retiring fallback — same rule as seller-orders.ts. */
function titleOf(row: OrderRow): string {
  return row.item_title ?? one(row.service_listings)?.title ?? ''
}

// ── Pure, exported for tests — business-rule logic is must-test per CLAUDE.md's testing
// discipline, and every one of these is a rule from a founder ruling, not a mechanical mapping. ──

/** Engagements actifs / Demandes en attente — Ruling: excludes only the two terminal statuses. */
export function activeOrderCounts(orders: readonly { status: string }[]): {
  engagementsActifs: number
  demandesEnAttente: number
} {
  return {
    engagementsActifs: orders.filter((o) => !TERMINAL_ORDER_STATUSES.includes(o.status)).length,
    demandesEnAttente: orders.filter((o) => o.status === 'pending').length,
  }
}

/**
 * Skill match for Missions récentes: dedup post ids across every row of `postSkillRows` whose
 * `skill` is in `mySkills`. Exact string match — no case/accent folding (docs/design/h4-discovery
 * .md §4: a documented follow-up, not a bug in this function).
 */
export function matchingPostIds(
  mySkills: readonly string[],
  postSkillRows: readonly { job_post_id: string; skill: string }[],
): string[] {
  const wanted = new Set(mySkills)
  const ids = postSkillRows.filter((r) => wanted.has(r.skill)).map((r) => r.job_post_id)
  return [...new Set(ids)]
}

/**
 * Activité récente — Ruling 8: unions the three sources, sorts newest-first, caps at `limit`.
 * `event_type === 'status_change'` is filtered by the CALLER (orders' events are pre-filtered
 * before reaching this function is NOT assumed — filtered again here so this function is correct
 * on its own, independent of how its caller queried).
 */
export function buildActivityFeed(
  orders: readonly OrderRow[],
  responses: readonly { created_at: string; job_posts: { title: string } | { title: string }[] | null }[],
  limit: number,
): ActivityEvent[] {
  return [
    ...orders.map((o): ActivityEvent => ({ kind: 'request', createdAt: o.created_at, title: titleOf(o) })),
    ...orders.flatMap((o) =>
      (o.order_events ?? [])
        .filter((e) => e.event_type === 'status_change' && e.to_status)
        .map(
          (e): ActivityEvent => ({
            kind: 'status',
            createdAt: e.created_at,
            status: e.to_status as string,
            title: titleOf(o),
          }),
        ),
    ),
    ...responses.map(
      (r): ActivityEvent => ({
        kind: 'proposal',
        createdAt: r.created_at,
        title: one(r.job_posts)?.title ?? null,
      }),
    ),
  ]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit)
}

/** Same "active" rule as activeOrderCounts, applied to the freelancer's OWN purchases (buyer_id),
 *  not their sales — backs the Actions rapides count badge (§9, h4-discovery.md). */
export function activePurchaseCount(orders: readonly { status: string }[]): number {
  return orders.filter((o) => !TERMINAL_ORDER_STATUSES.includes(o.status)).length
}

/** Force du profil checklist — Ruling 2: `portfolio` is always false, never derived. */
export function checklistFrom(input: {
  avatarUrl: string | null
  bioNonEmpty: boolean
  skillsCount: number
}): FreelancerChecklist {
  return {
    avatar: input.avatarUrl != null,
    bio: input.bioNonEmpty,
    skills: input.skillsCount > 0,
    portfolio: false,
  }
}

/**
 * Everything H4 renders for one freelancer.
 *
 * `avatarUrl` is passed in rather than re-queried: the caller (requireFreelancer, via
 * getShellUser) already reads `profiles.avatar_url` for the top bar, and a second read of the
 * same row would be a redundant round trip for one boolean.
 */
export const getFreelancerDashboard = cache(
  async (
    userId: string,
    freelancerProfileId: string | null,
    avatarUrl: string | null,
  ): Promise<FreelancerDashboard> => {
    const supabase = await createClient()

    // Orders I sold as a service, WITH their event timeline embedded — one round trip serves
    // three consumers: the Engagements actifs / Demandes en attente tiles, and Activité récente's
    // (a) request rows and (b) status-change rows. Same proven shape as seller-orders.ts:173-185.
    // Scoping to seller_id (not a bare order_events read) is what keeps a freelancer's OWN
    // purchases out of their seller activity feed — order_events RLS alone grants either party.
    const { data: orderData, error: ordersError } = await supabase
      .from('orders')
      .select(
        `id, status, created_at, item_title,
         service_listings ( title ),
         order_events ( event_type, to_status, created_at )`,
      )
      .eq('seller_id', userId)
      .eq('order_type', 'service')
      .order('created_at', { ascending: false })

    if (ordersError) {
      console.error(
        '[freelancer-dashboard] orders fetch error:',
        ordersError.message,
        ordersError.code,
        ordersError.details,
      )
      throw new Error(`freelancer orders fetch failed: ${ordersError.message}`)
    }
    const orders = (orderData ?? []) as unknown as OrderRow[]

    // Orders I bought — a completely separate slice from the `orders` read above (that one is
    // scoped to seller_id; this one is buyer_id, the freelancer acting as a consumer). Backs only
    // the Actions rapides count badge, so a bare status count is enough — no titles, no events.
    const { data: purchaseData, error: purchasesError } = await supabase
      .from('orders')
      .select('status')
      .eq('buyer_id', userId)
    if (purchasesError) {
      console.error(
        '[freelancer-dashboard] purchases fetch error:',
        purchasesError.message,
        purchasesError.code,
        purchasesError.details,
      )
      throw new Error(`freelancer purchases fetch failed: ${purchasesError.message}`)
    }
    const activePurchasesCount = activePurchaseCount(purchaseData ?? [])

    // Proposals I sent — Activité récente's (c) rows. job_posts' RLS only grants a non-owner
    // reader rows where status = 'open': a post that has since moved to filled/expired is
    // invisible to the responder even though they legitimately responded to it, and the title
    // embed comes back null. Logged in docs/follow-ups.md — no migration in this PR to widen it.
    const { data: responseData, error: responsesError } = await supabase
      .from('job_responses')
      .select('id, created_at, job_posts ( title )')
      .eq('freelancer_id', userId)
      .order('created_at', { ascending: false })

    if (responsesError) {
      console.error(
        '[freelancer-dashboard] job_responses fetch error:',
        responsesError.message,
        responsesError.code,
        responsesError.details,
      )
      throw new Error(`freelancer proposals fetch failed: ${responsesError.message}`)
    }
    const responses = (responseData ?? []) as unknown as {
      id: string
      created_at: string
      job_posts: { title: string } | { title: string }[] | null
    }[]

    // Ecosystem — consumers: public_profiles bypasses base-table RLS by design (security_invoker
    // false), so this also counts suspended profiles; there is no flag on the view to exclude
    // them. Shops: plain count, no admin_hidden_at filter — see docs/design/h4-discovery.md §3 for
    // the stated tension against 20260607160156's "public surfaces must filter" comment.
    const { count: consumersCount, error: consumersError } = await supabase
      .from('public_profiles')
      .select('id', { count: 'exact', head: true })
      .is('seller_type', null)
    if (consumersError) {
      console.error('[freelancer-dashboard] consumers count error:', consumersError.message, consumersError.code)
      throw new Error(`ecosystem consumers count failed: ${consumersError.message}`)
    }

    const { count: shopsCount, error: shopsError } = await supabase
      .from('shops')
      .select('id', { count: 'exact', head: true })
    if (shopsError) {
      console.error('[freelancer-dashboard] shops count error:', shopsError.message, shopsError.code)
      throw new Error(`ecosystem shops count failed: ${shopsError.message}`)
    }

    // Profile-dependent reads: nothing to query without a freelancer_profiles row (H2 step 1 not
    // finished yet) — checklist items 2-3 stay false, no services, no skill-matched missions.
    let servicesActifs = 0
    let bioNonEmpty = false
    let skillsCount = 0
    let missions: MissionMatch[] = []

    if (freelancerProfileId) {
      const { count: servicesCount, error: servicesError } = await supabase
        .from('service_listings')
        .select('id', { count: 'exact', head: true })
        .eq('freelancer_profile_id', freelancerProfileId)
        .eq('status', 'active')
      if (servicesError) {
        console.error('[freelancer-dashboard] services count error:', servicesError.message, servicesError.code)
        throw new Error(`services count failed: ${servicesError.message}`)
      }
      servicesActifs = servicesCount ?? 0

      const { data: fpRow, error: fpError } = await supabase
        .from('freelancer_profiles')
        .select('bio')
        .eq('id', freelancerProfileId)
        .maybeSingle()
      if (fpError) {
        console.error('[freelancer-dashboard] freelancer_profiles fetch error:', fpError.message, fpError.code)
        throw new Error(`freelancer profile fetch failed: ${fpError.message}`)
      }
      // H2 step 1 requires a non-empty bio to create this row at all, so this is expected to
      // read true for nearly every freelancer with a profile — queried anyway, not hardcoded,
      // per the founder ruling: do not assume completeness just because a gate exists upstream.
      bioNonEmpty = (fpRow?.bio ?? '').trim().length > 0

      const { data: skillRows, error: skillRowsError } = await supabase
        .from('freelancer_skills')
        .select('skill')
        .eq('freelancer_profile_id', freelancerProfileId)
      if (skillRowsError) {
        console.error('[freelancer-dashboard] skills fetch error:', skillRowsError.message, skillRowsError.code)
        throw new Error(`skills fetch failed: ${skillRowsError.message}`)
      }
      const skills = (skillRows ?? []).map((r) => r.skill).filter(Boolean)
      skillsCount = skills.length

      if (skills.length > 0) {
        // Two round trips: skill -> matching post ids, then the posts themselves. Both `skill`
        // columns are free text, so this match is exact and case/accent-sensitive today —
        // near-miss matching is a follow-up, not this PR.
        const { data: matchRows, error: matchError } = await supabase
          .from('job_post_skills')
          .select('job_post_id')
          .in('skill', skills)
        if (matchError) {
          console.error('[freelancer-dashboard] job_post_skills match error:', matchError.message, matchError.code)
          throw new Error(`mission skill match failed: ${matchError.message}`)
        }
        const postIds = matchingPostIds(skills, (matchRows ?? []) as { job_post_id: string; skill: string }[])

        if (postIds.length > 0) {
          // RLS grants status='open' rows to a non-owner reader but does NOT filter
          // admin_hidden_at — that half of "public surfaces must filter admin_hidden_at IS NULL"
          // (20260607160156) has to be enforced here explicitly, not assumed from RLS.
          const { data: postRows, error: postsError } = await supabase
            .from('job_posts')
            .select('id, title, budget_min, budget_max, city, is_remote, created_at')
            .in('id', postIds)
            .eq('status', 'open')
            .is('admin_hidden_at', null)
            .order('created_at', { ascending: false })
            .limit(MISSIONS_LIMIT)
          if (postsError) {
            console.error('[freelancer-dashboard] job_posts fetch error:', postsError.message, postsError.code)
            throw new Error(`missions fetch failed: ${postsError.message}`)
          }
          missions = (postRows ?? []).map((p) => ({
            id: p.id,
            title: p.title,
            budgetMin: p.budget_min,
            budgetMax: p.budget_max,
            city: p.city,
            isRemote: p.is_remote,
            createdAt: p.created_at,
          }))
        }
      }
    }

    const activite = buildActivityFeed(orders, responses, ACTIVITY_LIMIT)
    const { engagementsActifs, demandesEnAttente } = activeOrderCounts(orders)

    return {
      servicesActifs,
      engagementsActifs,
      demandesEnAttente,
      checklist: checklistFrom({ avatarUrl, bioNonEmpty, skillsCount }),
      ecosystem: {
        consumers: consumersCount ?? 0,
        shops: shopsCount ?? 0,
      },
      missions,
      activite,
      activePurchasesCount,
    }
  },
)
