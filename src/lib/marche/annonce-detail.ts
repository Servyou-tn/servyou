import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { MAX_RESPONSES_PER_POST } from '@/lib/job-constants'
import { isAnnoncePastExpiry, resolveAnnonceStatus, type AnnonceDisplayStatus } from '@/lib/marche/annonce-status'

// Single-annonce detail fetch for /mes-annonces/[id] — the consumer's view of one job post
// plus the freelancer responses to it. RLS already restricts job_posts SELECT to
// (status='open' OR consumer_id=auth.uid()); this page is strictly the author's view, so
// getAnnonceDetail re-checks consumer_id === currentUserId and returns null otherwise
// (defense in depth — a non-owner, a missing post, an invalid id, or a soft-deleted post all
// yield the same not-found state, no information leak). Errors are captured, never silent [].
//
// Schema notes (verified against the live DB, not assumed):
//   - job_responses has only (id, job_post_id, freelancer_id, proposal_message, created_at) —
//     no proposed_price / proposed_timeframe columns exist.
//   - job_responses.freelancer_id is a profiles.id (NOT freelancer_profiles.id); it is the
//     get_contact_phone(target) value and the post-owner is authorized via the responder path.
//   - There is no avatar column anywhere → the UI falls back to initials.
//   - "expired" is never stored on job_posts (confirmed against the live DB — see
//     lib/marche/annonce-status.ts's own header for the trigger/CHECK-constraint sweep that
//     settles it). Display status is resolved there and returned as `displayStatus` below.
//
// MODERATION — this file DELIBERATELY does not FILTER on admin_hidden_at (a moderated post stays
// visible to its own author), but it DOES now select the column and return it as
// `adminHiddenAt`, so the owner sees the ModerationBanner explaining why it is hidden — a
// pre-existing component/copy (variant="job_post") that PR-B is the first surface to actually
// render; it was never wired up before. That is a decision, not an omission, and it was made when
// the public read paths were audited and fixed (fix/moderation-filter):
//   - The job post itself is the VIEWER'S OWN (consumer_id === currentUserId is enforced above).
//     An owner must be able to see their own moderated content, with the ModerationBanner
//     explaining why it is hidden — 404-ing an author out of their own post is the wrong
//     outcome, and the owner exception is exactly the carve-out the audit preserved.
//   - The freelancer_profiles read below resolves the people who RESPONDED to that post. That
//     is a relationship path, not public discovery: the same reasoning that keeps a moderated
//     shop's products visible in the buyer's order history keeps a moderated freelancer's
//     existing proposal visible to the author it was sent to. Hiding it would silently erase a
//     real interaction from the author's view.
// If you are grepping for admin_hidden_at coverage: the public listing paths are
// lib/marche/data.ts, lib/marche/filter-cities.ts, lib/marche/filter-categories.ts,
// lib/marche/my-data.ts (favorites) and lib/search/search-marketplace.ts. This file is not one
// of them, and src/__tests__/moderation-read-paths.test.ts pins that boundary.

function one<T>(embed: T | T[] | null | undefined): T | null {
  if (Array.isArray(embed)) return embed[0] ?? null
  return embed ?? null
}

export type AnnonceResponse = {
  id: string
  /** = profiles.id of the responding freelancer; the get_contact_phone(target) value. */
  freelancerId: string
  fullName: string | null
  headline: string | null
  city: string | null
  proposalMessage: string | null
  createdAt: string
}

export type AnnonceDetailData = {
  id: string
  title: string
  description: string
  budgetMin: number | null
  budgetMax: number | null
  city: string | null
  isRemote: boolean
  deadline: string | null
  /** Stored value is only ever 'open' | 'filled' (deleted → null above; 'expired' is computed). */
  status: 'open' | 'filled' | 'expired' | 'deleted'
  /** status folded with computed expiry (resolveAnnonceStatus) — what the UI should render. */
  displayStatus: AnnonceDisplayStatus
  createdAt: string
  updatedAt: string
  category: string | null
  skills: string[]
  responses: AnnonceResponse[]
  responseCount: number
  isAtCap: boolean
  /** Raw age check, independent of status — used to gate reopening (mes-annonces/[id]/actions.ts),
   *  NOT the same thing as `displayStatus === 'expired'` (a filled post has isExpired possibly
   *  true but displayStatus 'filled' — precedence, not equivalence). */
  isExpired: boolean
  /** Set by admin moderation. Never expose admin_hidden_reason — that stays admin-internal. */
  adminHiddenAt: string | null
}

type AnnonceRow = {
  id: string
  consumer_id: string
  title: string
  description: string
  budget_min: number | string | null
  budget_max: number | string | null
  city: string | null
  is_remote: boolean | null
  deadline: string | null
  status: 'open' | 'filled' | 'expired' | 'deleted'
  created_at: string
  updated_at: string
  categories: { name_fr: string } | { name_fr: string }[] | null
  job_post_skills: { skill: string }[] | null
  admin_hidden_at: string | null
  /** Selected but never returned by getAnnonceDetail — stays admin-internal. */
  admin_hidden_reason: string | null
}

// Wrapped in React cache() so generateMetadata + the page share a single fetch per request.
export const getAnnonceDetail = cache(
  async (annonceId: string, currentUserId: string): Promise<AnnonceDetailData | null> => {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('job_posts')
      .select(
        // admin_hidden_reason is selected (mirroring the pair the admin write-side and the DB's
        // own CHECK constraint always keep together) but deliberately never leaves this function —
        // ModerationBanner's own contract is that the reason stays admin-internal.
        `id, consumer_id, title, description, budget_min, budget_max, city, is_remote,
         deadline, status, created_at, updated_at, admin_hidden_at, admin_hidden_reason,
         categories ( name_fr ),
         job_post_skills ( skill )`,
      )
      .eq('id', annonceId)
      .maybeSingle()

    if (error) {
      // The invalid-UUID case (Postgres 22P02) lands here too → graceful not-found, no crash.
      console.error('[annonce-detail] fetch error:', error)
      return null
    }
    if (!data) return null

    const row = data as unknown as AnnonceRow
    // Author-only view (defense in depth on top of RLS); a soft-deleted post is gone for the consumer.
    if (row.consumer_id !== currentUserId) return null
    if (row.status === 'deleted') return null

    // Responses to this post. RLS lets the post owner read them all.
    const { data: respData, error: respErr } = await supabase
      .from('job_responses')
      .select('id, freelancer_id, proposal_message, created_at')
      .eq('job_post_id', row.id)
      .order('created_at', { ascending: false })
    if (respErr) console.error('[annonce-detail] responses fetch error:', respErr)
    const respRows = (respData ?? []) as {
      id: string
      freelancer_id: string
      proposal_message: string | null
      created_at: string
    }[]

    // Resolve responder display data. Names + profile-level city come from the public_profiles
    // view (profiles is owner-only); the freelancer headline + freelancer-level city come from
    // freelancer_profiles (public-read). Two small IN() lookups, same pattern as lib/marche/data.
    const freelancerIds = [...new Set(respRows.map((r) => r.freelancer_id))]
    const nameCity = new Map<string, { full_name: string | null; city: string | null }>()
    const headlineCity = new Map<string, { headline: string | null; city: string | null }>()
    if (freelancerIds.length > 0) {
      const { data: profs, error: pErr } = await supabase
        .from('public_profiles')
        .select('id, full_name, city')
        .in('id', freelancerIds)
      if (pErr) console.error('[annonce-detail] public_profiles error:', pErr)
      for (const p of (profs ?? []) as { id: string; full_name: string | null; city: string | null }[]) {
        nameCity.set(p.id, { full_name: p.full_name, city: p.city })
      }

      const { data: fps, error: fErr } = await supabase
        .from('freelancer_profiles')
        .select('profile_id, headline, city')
        .in('profile_id', freelancerIds)
      if (fErr) console.error('[annonce-detail] freelancer_profiles error:', fErr)
      for (const f of (fps ?? []) as { profile_id: string; headline: string | null; city: string | null }[]) {
        headlineCity.set(f.profile_id, { headline: f.headline, city: f.city })
      }
    }

    const responses: AnnonceResponse[] = respRows.map((r) => ({
      id: r.id,
      freelancerId: r.freelancer_id,
      fullName: nameCity.get(r.freelancer_id)?.full_name ?? null,
      headline: headlineCity.get(r.freelancer_id)?.headline ?? null,
      // Prefer the freelancer-profile city; fall back to the profile-level city.
      city: headlineCity.get(r.freelancer_id)?.city ?? nameCity.get(r.freelancer_id)?.city ?? null,
      proposalMessage: r.proposal_message,
      createdAt: r.created_at,
    }))

    const isExpired = isAnnoncePastExpiry(row.created_at)

    return {
      id: row.id,
      title: row.title,
      description: row.description,
      budgetMin: row.budget_min != null ? Number(row.budget_min) : null,
      budgetMax: row.budget_max != null ? Number(row.budget_max) : null,
      city: row.city ?? null,
      isRemote: Boolean(row.is_remote),
      deadline: row.deadline ?? null,
      status: row.status,
      displayStatus: resolveAnnonceStatus(row.status, row.created_at),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      category: one(row.categories)?.name_fr ?? null,
      skills: (row.job_post_skills ?? []).map((s) => s.skill),
      adminHiddenAt: row.admin_hidden_at ?? null,
      responses,
      responseCount: responses.length,
      isAtCap: responses.length >= MAX_RESPONSES_PER_POST,
      isExpired,
    }
  },
)
