'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import type { Json } from '@/lib/supabase/database.types'
import { resolveOwnedFreelancerProfileId } from '@/lib/freelancer/owner-profile'
import { mapProposalDbError, type ProposalFailure } from '@/lib/marche/proposal-errors'
import { validateProposal, type ProposalErrors } from '@/lib/marche/proposal-validation'
import { canonicalizeSkills } from '@/lib/marche/skills-match'

// H12 « Envoyer ma proposition » — the one write of the outbound-mission flow (docs/design/h9-h13-measurements.md §3, §9 PR-2).
//
// Order of work, and why:
//   1. Zod — the SHAPE and sizes of what arrived (a forged payload never reaches the business rules);
//   2. validateProposal — the same pure function the form runs, so a client pass cannot become a server reject;
//   3. who — `freelancer_id` is ALWAYS the session user, never anything from the input;
//   4. skills ⊆ (the post's skills ∪ the freelancer's own), canonicalised — the whole submit is refused, not trimmed, when
//      one is outside the pool;
//   5. INSERT job_responses under the user's own session (RLS + the BEFORE INSERT triggers are the real gate: post open /
//      not hidden / inside 30 days / not full / ≤ 5 active / not own / not a duplicate, and the responder's capability);
//   6. skills INSERT — NON-FATAL, exactly like createAnnonce: a proposal without its optional skill tags is a valid
//      proposal, and rolling it back (or telling the freelancer it failed) would invite a duplicate resend;
//   7. revalidate + redirect to H13.
//
// The DB's typed `hint` codes are mapped to a reason (proposal-errors.ts) and returned; the form renders it in place with
// the input kept (D-H13-3). `duplicate` is NOT a failure: the first insert succeeded, so it redirects to H13 like a success.
//
// Never logs the raw error object (PostgrestError serialises to {}): message / code / details / hint only.

const Input = z.object({
  jobPostId: z.string().uuid(),
  message: z.string().max(5000),
  links: z.array(z.object({ label: z.string().max(1000), url: z.string().max(2000) })).max(20),
  price: z.string().max(40),
  timeframe: z.string().max(500),
  skills: z.array(z.string().max(500)).max(50),
})

export type SubmitProposalResult =
  | { ok: false; kind: 'invalid'; errors: ProposalErrors }
  | { ok: false; kind: 'failure'; reason: ProposalFailure }

function logDbError(scope: string, error: { message: string; code?: string; details?: string; hint?: string }) {
  console.error(`[${scope}] failed:`, error.message, error.code, error.details, error.hint)
}

export async function submitProposalAction(input: unknown): Promise<SubmitProposalResult> {
  const parsed = Input.safeParse(input)
  if (!parsed.success) return { ok: false, kind: 'failure', reason: 'technical' }
  const { jobPostId } = parsed.data

  const v = validateProposal(parsed.data)
  if (!v.ok) return { ok: false, kind: 'invalid', errors: v.errors }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(`/connexion?next=${encodeURIComponent(`/missions/${jobPostId}/proposer`)}`)

  // Skills: only from the pool the form offered.
  let skills: string[] = []
  if (v.value.skills.length > 0) {
    const [postSkills, mine] = await Promise.all([
      supabase.from('job_post_skills').select('skill').eq('job_post_id', jobPostId),
      loadMySkills(supabase, user.id),
    ])
    if (postSkills.error) {
      logDbError('submitProposal post skills', postSkills.error)
      return { ok: false, kind: 'failure', reason: 'technical' }
    }
    if (mine === null) return { ok: false, kind: 'failure', reason: 'technical' }
    const { accepted, rejected } = canonicalizeSkills(
      v.value.skills,
      (postSkills.data ?? []).map((r) => r.skill as string),
      mine,
    )
    if (rejected.length > 0) return { ok: false, kind: 'invalid', errors: { skills: 'proposal.error.skills_invalid' } }
    skills = accepted
  }

  const { data: inserted, error } = await supabase
    .from('job_responses')
    .insert({
      job_post_id: jobPostId,
      freelancer_id: user.id,
      proposal_message: v.value.message,
      proposed_price_tnd: v.value.price,
      proposed_timeframe: v.value.timeframe,
      portfolio_links: v.value.links as unknown as Json,
    })
    .select('id')
    .single()

  if (error) {
    const outcome = mapProposalDbError(error)
    if (outcome !== 'duplicate') {
      logDbError('submitProposal insert', error)
      return { ok: false, kind: 'failure', reason: outcome }
    }
    // Already answered: the first insert succeeded. Take them to what they sent.
    redirect(`/missions/${jobPostId}/proposition-envoyee`)
  }

  if (skills.length > 0 && inserted) {
    const { error: skillsError } = await supabase
      .from('job_response_skills')
      .insert(skills.map((skill) => ({ job_response_id: inserted.id, skill })))
    // NON-FATAL, deliberately (see the header): log it, keep the proposal, redirect normally.
    if (skillsError) logDbError('submitProposal skills insert (proposal kept)', skillsError)
  }

  revalidatePath(`/missions/${jobPostId}`)
  revalidatePath('/trouver-des-missions')
  revalidatePath('/mes-propositions')
  redirect(`/missions/${jobPostId}/proposition-envoyee`)
}

async function loadMySkills(supabase: Awaited<ReturnType<typeof createClient>>, userId: string): Promise<string[] | null> {
  const profile = await resolveOwnedFreelancerProfileId(supabase, userId)
  if (!profile.ok) return profile.reason === 'no_profile' ? [] : null
  const { data, error } = await supabase
    .from('freelancer_skills')
    .select('skill')
    .eq('freelancer_profile_id', profile.freelancerProfileId)
  if (error) {
    logDbError('submitProposal my skills', error)
    return null
  }
  return (data ?? []).map((r) => r.skill as string)
}
