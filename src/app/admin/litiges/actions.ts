'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { DisputeOutcome } from '@/lib/types/dispute'

export type DisputeActionResult = { success: boolean; error?: string }

const VALID_OUTCOMES: DisputeOutcome[] = ['sided_buyer', 'sided_seller', 'compromise']

// Same rowcount-honest pattern as the reports actions (src/app/admin/signalements/
// actions.ts). The admin layout's client guard does NOT protect server actions — only
// RLS does, and the disputes UPDATE policy is is_admin(). A non-admin caller (or a
// double-submit, or an already-claimed/closed dispute) matches zero rows and PostgREST
// returns { data: [], error: null } — i.e. NO error. So we .select('id') after the
// update and treat an empty result as failure. The DB CHECKs (disputes_terminal_
// requires_admin_note, disputes_outcome_only_when_resolved) + RLS are the real guards;
// this is the honest-result layer. Error values are i18n keys; the client translates.

export async function claimDispute(disputeId: string): Promise<DisputeActionResult> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('disputes')
    .update({ status: 'under_review' })
    .eq('id', disputeId)
    .eq('status', 'open')
    .select('id')

  if (error) {
    console.error('[admin/litiges] claimDispute error:', error)
    return { success: false, error: 'admin.disputes.error_claim_no_row' }
  }
  if (!data || data.length === 0) {
    // RLS-blocked, already under review/closed, or gone.
    return { success: false, error: 'admin.disputes.error_claim_no_row' }
  }

  revalidatePath('/admin/litiges')
  revalidatePath('/admin/litiges/' + disputeId)
  return { success: true }
}

// Resolve = terminal close that records the side the admin took. Both validations run
// BEFORE any DB call so a bad request never touches the database: the note is required
// (DB CHECK disputes_terminal_requires_admin_note backs it), and the outcome must be one
// of the three valid sides (DB CHECK disputes_outcome_only_when_resolved requires a
// non-null outcome when status='resolved'). updated_at is bumped by the trigger.
export async function resolveDispute(
  disputeId: string,
  outcome: string,
  adminNote: string,
): Promise<DisputeActionResult> {
  const note = adminNote.trim()
  if (note.length === 0) {
    return { success: false, error: 'admin.disputes.note_required' }
  }
  if (!VALID_OUTCOMES.includes(outcome as DisputeOutcome)) {
    return { success: false, error: 'admin.disputes.outcome_required' }
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('disputes')
    .update({ status: 'resolved', outcome, admin_note: note })
    .eq('id', disputeId)
    .in('status', ['open', 'under_review'])
    .select('id')

  if (error) {
    console.error('[admin/litiges] resolveDispute error:', error)
    return { success: false, error: 'admin.disputes.error_resolve_no_row' }
  }
  if (!data || data.length === 0) {
    // RLS-blocked, already terminal, or gone.
    return { success: false, error: 'admin.disputes.error_resolve_no_row' }
  }

  revalidatePath('/admin/litiges')
  revalidatePath('/admin/litiges/' + disputeId)
  return { success: true }
}

// Dismiss = terminal close with NO side taken (the dispute was judged invalid). Mirrors
// resolveDispute minus the outcome: same admin_note requirement (DB CHECK backs it), same
// RLS + rowcount-honest guard. outcome stays null (disputes_outcome_only_when_resolved
// requires null outcome for any non-resolved status).
export async function dismissDispute(disputeId: string, adminNote: string): Promise<DisputeActionResult> {
  const note = adminNote.trim()
  if (note.length === 0) {
    return { success: false, error: 'admin.disputes.dismiss_note_required' }
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('disputes')
    .update({ status: 'dismissed', admin_note: note })
    .eq('id', disputeId)
    .in('status', ['open', 'under_review'])
    .select('id')

  if (error) {
    console.error('[admin/litiges] dismissDispute error:', error)
    return { success: false, error: 'admin.disputes.error_dismiss_no_row' }
  }
  if (!data || data.length === 0) {
    // RLS-blocked, or already in a terminal state (resolved/dismissed).
    return { success: false, error: 'admin.disputes.error_dismiss_no_row' }
  }

  revalidatePath('/admin/litiges')
  revalidatePath('/admin/litiges/' + disputeId)
  return { success: true }
}
