'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { resolveAnnonceStatus } from '@/lib/marche/annonce-status'
import { parseJobResponseStatus } from '@/lib/marche/journey-gates'

// H11 « Retirer ma proposition » — the only legal write on a job_response (RLS "Freelancer deletes own response"; UPDATE is revoked),
// D-H11-2. The DB decrements job_posts.response_count (trg_sync_job_post_response_count) and frees one of the 5 active slots; the
// post owner loses the proposal and the phone link.
//
// « Only while the post is open » is enforced by the DB too since migration 76 (DELETE policy « Freelancer withdraws own response
// while the post is open »: open, unmoderated, within 30 days — a closed post's DELETE matches 0 rows). The state is still
// re-derived here from the persisted post, never from the client's view of the row, so the user gets `not_open`, not `not_found`.
//
// Since the journey gates (migrations 20261106153901 + 20261106170449_choose_race), a proposal the owner has decided (chosen or not
// chosen) can no longer be withdrawn: the DB refuses the DELETE with 42501 hint `response_decided`. The status is checked here first
// (so the freelancer reads why, not a generic error), and the DB refusal is mapped too, for a decision made in between.
//
// Never logs the raw error object: message / code / details only.

const Input = z.object({ responseId: z.string().uuid() })

export type WithdrawProposalResult =
  | { ok: true }
  | { ok: false; reason: 'not_found' | 'not_open' | 'decided' | 'technical' }

export async function withdrawProposalAction(input: unknown): Promise<WithdrawProposalResult> {
  const parsed = Input.safeParse(input)
  if (!parsed.success) return { ok: false, reason: 'not_found' }
  const { responseId } = parsed.data

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, reason: 'not_found' }

  // Ownership is re-derived: the row is looked up by id AND the session user, so a forged id of someone else's response is
  // simply « not found » (RLS would hide it anyway).
  const { data: row, error: readError } = await supabase
    .from('job_responses')
    .select('id, job_post_id, status, job_posts ( status, created_at )')
    .eq('id', responseId)
    .eq('freelancer_id', user.id)
    .maybeSingle()
  if (readError) {
    console.error('[withdrawProposal] read failed:', readError.message, readError.code, readError.details)
    return { ok: false, reason: 'technical' }
  }
  if (!row) return { ok: false, reason: 'not_found' }

  const embed = row.job_posts as unknown as { status: string; created_at: string } | { status: string; created_at: string }[] | null
  const post = Array.isArray(embed) ? (embed[0] ?? null) : embed
  // A post the viewer can no longer read, or one that is filled / expired, is closed: nothing to free, and the sent record is kept.
  if (!post || resolveAnnonceStatus(post.status as 'open' | 'filled' | 'expired' | 'deleted', post.created_at) !== 'open') {
    return { ok: false, reason: 'not_open' }
  }
  // After the post check: a post that left `open` has its pending proposals set to not_chosen by the sync trigger, and the
  // freelancer should read « the mission changed », not « already answered ».
  if (parseJobResponseStatus(row.status) !== 'pending') return { ok: false, reason: 'decided' }

  // `.select('id')` so a 0-row delete (RLS silently filtering it) is detected instead of reported as success.
  const { data: deleted, error: deleteError } = await supabase
    .from('job_responses')
    .delete()
    .eq('id', responseId)
    .eq('freelancer_id', user.id)
    .select('id')
  if (deleteError) {
    if (deleteError.code === '42501' && deleteError.hint === 'response_decided') {
      console.warn('[withdrawProposal] refused:', deleteError.code, deleteError.hint)
      return { ok: false, reason: 'decided' }
    }
    console.error('[withdrawProposal] delete failed:', deleteError.message, deleteError.code, deleteError.details)
    return { ok: false, reason: 'technical' }
  }
  if (!deleted || deleted.length === 0) return { ok: false, reason: 'not_found' }

  revalidatePath('/mes-propositions')
  revalidatePath('/trouver-des-missions')
  revalidatePath(`/missions/${row.job_post_id}`)
  return { ok: true }
}
