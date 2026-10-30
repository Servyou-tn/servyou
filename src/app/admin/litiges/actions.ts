'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { checkAdmin, adminRejectionError } from '@/lib/auth/require-admin'
import type { DisputeOutcome } from '@/lib/types/dispute'
import { ADMIN_TEXT_MAX, isUuid } from '@/lib/admin/action-input'

export type DisputeActionResult = { success: boolean; error?: string }

const VALID_OUTCOMES: DisputeOutcome[] = ['sided_buyer', 'sided_seller', 'compromise']

// Same rowcount-honest pattern as the reports actions (src/app/admin/signalements/
// actions.ts). Every action first runs checkAdmin (src/lib/auth/require-admin.ts) — a
// non-admin caller is rejected before any query touches disputes. Under that, RLS is still
// the real guard: the disputes UPDATE policy is is_admin(). A double-submit, or an
// already-claimed/closed dispute, matches zero rows and PostgREST returns
// { data: [], error: null } — i.e. NO error. So we .select('id') after the update and
// treat an empty result as failure. The DB CHECKs (disputes_terminal_requires_admin_note,
// disputes_outcome_only_when_resolved) + RLS are the real guards; this is the honest-result
// layer. Error values are i18n keys; the client translates.

// Audit logging (best-effort, by design) — same rationale as the reports actions
// (src/app/admin/signalements/actions.ts). Each successful action writes a forensic
// row via the log_admin_action RPC (migration 20260608165709). The dispute UPDATE has
// already committed by the time we log, so the audit write is a separate Supabase
// round-trip: a failed audit must NOT turn a succeeded action into a reported failure.
// We surface the error to the server log per the never-swallow rule, then return success.

const FORBIDDEN = 'admin.users.error_forbidden'

// A transport-level throw is `unknown`, not a PostgrestError — log its message, never the raw value.
function thrownMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e)
}

export async function claimDispute(disputeId: string): Promise<DisputeActionResult> {
  if (!isUuid(disputeId)) return { success: false, error: 'common.error_generic' }

  const supabase = await createClient()
  const admin = await checkAdmin(supabase)
  if (!admin.ok) {
    console.error(`[admin/litiges] claimDispute rejected: ${admin.reason}`)
    return { success: false, error: adminRejectionError(admin.reason, FORBIDDEN) }
  }

  const { data, error } = await supabase
    .from('disputes')
    .update({ status: 'under_review' })
    .eq('id', disputeId)
    .eq('status', 'open')
    .select('id')

  if (error) {
    console.error('[admin/litiges] claimDispute error:', error.message, error.code, error.details)
    return { success: false, error: 'admin.disputes.error_claim_no_row' }
  }
  if (!data || data.length === 0) {
    // RLS-blocked, already under review/closed, or gone.
    return { success: false, error: 'admin.disputes.error_claim_no_row' }
  }

  try {
    const { error: logError } = await supabase.rpc('log_admin_action', {
      p_action: 'claim_dispute',
      p_target_type: 'dispute',
      p_target_id: disputeId,
      p_before_state: { status: 'open' },
      p_after_state: { status: 'under_review' },
    })
    if (logError) {
      console.error('[admin/litiges] claimDispute audit log error:', logError.message, logError.code, logError.details)
    }
  } catch (logError) {
    console.error('[admin/litiges] claimDispute audit log error:', thrownMessage(logError))
  }

  revalidatePath('/admin/litiges')
  revalidatePath('/admin/litiges/' + disputeId)
  return { success: true }
}

// Resolve = terminal close that records the side the admin took. After the admin gate, both
// validations run BEFORE any disputes query so a bad request never touches the table: the note
// is required (DB CHECK disputes_terminal_requires_admin_note backs it), and the outcome must be
// one of the three valid sides (DB CHECK disputes_outcome_only_when_resolved requires a
// non-null outcome when status='resolved'). updated_at is bumped by the trigger.
export async function resolveDispute(
  disputeId: string,
  outcome: string,
  adminNote: string,
): Promise<DisputeActionResult> {
  if (!isUuid(disputeId)) return { success: false, error: 'common.error_generic' }

  const supabase = await createClient()
  const admin = await checkAdmin(supabase)
  if (!admin.ok) {
    console.error(`[admin/litiges] resolveDispute rejected: ${admin.reason}`)
    return { success: false, error: adminRejectionError(admin.reason, FORBIDDEN) }
  }

  const note = adminNote.trim()
  if (note.length === 0) {
    return { success: false, error: 'admin.disputes.note_required' }
  }
  if (note.length > ADMIN_TEXT_MAX) return { success: false, error: 'admin.note_too_long' }
  if (!VALID_OUTCOMES.includes(outcome as DisputeOutcome)) {
    return { success: false, error: 'admin.disputes.outcome_required' }
  }

  const { data, error } = await supabase
    .from('disputes')
    .update({ status: 'resolved', outcome, admin_note: note })
    .eq('id', disputeId)
    .in('status', ['open', 'under_review'])
    .select('id')

  if (error) {
    console.error('[admin/litiges] resolveDispute error:', error.message, error.code, error.details)
    return { success: false, error: 'admin.disputes.error_resolve_no_row' }
  }
  if (!data || data.length === 0) {
    // RLS-blocked, already terminal, or gone.
    return { success: false, error: 'admin.disputes.error_resolve_no_row' }
  }

  try {
    const { error: logError } = await supabase.rpc('log_admin_action', {
      p_action: 'resolve_dispute',
      p_target_type: 'dispute',
      p_target_id: disputeId,
      p_after_state: { status: 'resolved', outcome },
      p_note: note,
    })
    if (logError) {
      console.error('[admin/litiges] resolveDispute audit log error:', logError.message, logError.code, logError.details)
    }
  } catch (logError) {
    console.error('[admin/litiges] resolveDispute audit log error:', thrownMessage(logError))
  }

  revalidatePath('/admin/litiges')
  revalidatePath('/admin/litiges/' + disputeId)
  return { success: true }
}

// Dismiss = terminal close with NO side taken (the dispute was judged invalid). Mirrors
// resolveDispute minus the outcome: same admin gate, same admin_note requirement (DB CHECK
// backs it), same RLS + rowcount-honest guard. outcome stays null
// (disputes_outcome_only_when_resolved requires null outcome for any non-resolved status).
export async function dismissDispute(disputeId: string, adminNote: string): Promise<DisputeActionResult> {
  if (!isUuid(disputeId)) return { success: false, error: 'common.error_generic' }

  const supabase = await createClient()
  const admin = await checkAdmin(supabase)
  if (!admin.ok) {
    console.error(`[admin/litiges] dismissDispute rejected: ${admin.reason}`)
    return { success: false, error: adminRejectionError(admin.reason, FORBIDDEN) }
  }

  const note = adminNote.trim()
  if (note.length === 0) {
    return { success: false, error: 'admin.disputes.dismiss_note_required' }
  }
  if (note.length > ADMIN_TEXT_MAX) return { success: false, error: 'admin.note_too_long' }

  const { data, error } = await supabase
    .from('disputes')
    .update({ status: 'dismissed', admin_note: note })
    .eq('id', disputeId)
    .in('status', ['open', 'under_review'])
    .select('id')

  if (error) {
    console.error('[admin/litiges] dismissDispute error:', error.message, error.code, error.details)
    return { success: false, error: 'admin.disputes.error_dismiss_no_row' }
  }
  if (!data || data.length === 0) {
    // RLS-blocked, or already in a terminal state (resolved/dismissed).
    return { success: false, error: 'admin.disputes.error_dismiss_no_row' }
  }

  try {
    const { error: logError } = await supabase.rpc('log_admin_action', {
      p_action: 'dismiss_dispute',
      p_target_type: 'dispute',
      p_target_id: disputeId,
      p_after_state: { status: 'dismissed' },
      p_note: note,
    })
    if (logError) {
      console.error('[admin/litiges] dismissDispute audit log error:', logError.message, logError.code, logError.details)
    }
  } catch (logError) {
    console.error('[admin/litiges] dismissDispute audit log error:', thrownMessage(logError))
  }

  revalidatePath('/admin/litiges')
  revalidatePath('/admin/litiges/' + disputeId)
  return { success: true }
}
