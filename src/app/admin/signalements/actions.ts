'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export type ReportActionResult = { success: boolean; error?: string }

// The admin layout's client guard does NOT protect server actions — only RLS does.
// The reports UPDATE policy is is_admin(). For a non-admin caller (or a double-submit,
// or an already-claimed/resolved report) the WHERE filter matches zero rows and
// PostgREST returns { data: [], error: null } — i.e. NO error. So we .select('id')
// after the update and treat an empty result as failure. The DB CHECK + RLS are the
// real guards; this is the honest-result layer that prevents a misleading green UI.
// Error values are i18n keys; the calling client component translates them.

export async function claimReport(reportId: string): Promise<ReportActionResult> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('reports')
    .update({ status: 'under_review' })
    .eq('id', reportId)
    .eq('status', 'open')
    .select('id')

  if (error) {
    console.error('[admin/signalements] claimReport error:', error)
    return { success: false, error: 'admin.reports.error_already_claimed' }
  }
  if (!data || data.length === 0) {
    // RLS-blocked, already under review/resolved, or gone.
    return { success: false, error: 'admin.reports.error_already_claimed' }
  }

  revalidatePath('/admin/signalements')
  revalidatePath('/admin/signalements/' + reportId)
  return { success: true }
}

// --- In-place content moderation (products + services) ---------------------
// hide/unhide go through the admin_hide_content / admin_unhide_content SECURITY
// DEFINER functions, which gate on is_admin() and RAISE EXCEPTION on every failure
// mode — so a null error genuinely means the state changed (no rowcount guard needed,
// unlike the bare-UPDATE report actions above). We translate the function's RAISE
// messages to friendly i18n keys; the calling client component renders them.

export type ModerationTargetType = 'product' | 'service' | 'shop' | 'freelancer_profile' | 'job_post'

function translateModerationError(message: string): string {
  if (message.includes('Forbidden')) return 'admin.moderation.error_forbidden'
  if (message.includes('reason is required')) return 'admin.moderation.hide_reason_required'
  if (message.includes('already moderated')) return 'admin.moderation.error_already_moderated'
  if (message.includes('not currently moderated')) return 'admin.moderation.error_not_moderated'
  if (message.includes('Unsupported target_type')) return 'admin.moderation.error_unsupported_type'
  return 'common.error_generic'
}

export async function hideContent(
  targetType: ModerationTargetType,
  targetId: string,
  reason: string,
  reportId: string,
): Promise<ReportActionResult> {
  const trimmed = reason.trim()
  if (trimmed.length === 0) {
    return { success: false, error: 'admin.moderation.hide_reason_required' }
  }

  const supabase = await createClient()
  const { error } = await supabase.rpc('admin_hide_content', {
    target_type: targetType,
    target_id: targetId,
    reason: trimmed,
  })
  if (error) {
    console.error('[admin/signalements] hideContent error:', error)
    return { success: false, error: translateModerationError(error.message) }
  }

  revalidatePath('/admin/signalements')
  revalidatePath('/admin/signalements/' + reportId)
  return { success: true }
}

export async function unhideContent(
  targetType: ModerationTargetType,
  targetId: string,
  reportId: string,
): Promise<ReportActionResult> {
  const supabase = await createClient()
  const { error } = await supabase.rpc('admin_unhide_content', {
    target_type: targetType,
    target_id: targetId,
  })
  if (error) {
    console.error('[admin/signalements] unhideContent error:', error)
    return { success: false, error: translateModerationError(error.message) }
  }

  revalidatePath('/admin/signalements')
  revalidatePath('/admin/signalements/' + reportId)
  return { success: true }
}

export async function resolveReport(reportId: string, adminNote: string): Promise<ReportActionResult> {
  const note = adminNote.trim()
  if (note.length === 0) {
    return { success: false, error: 'admin.reports.admin_note_required' }
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('reports')
    .update({ status: 'resolved', admin_note: note })
    .eq('id', reportId)
    .in('status', ['open', 'under_review'])
    .select('id')

  if (error) {
    // The DB CHECK reports_resolved_requires_admin_note is the final guard; a null
    // note can never reach here (trimmed-empty is rejected above), but surface any
    // other failure honestly rather than reporting a phantom success.
    console.error('[admin/signalements] resolveReport error:', error)
    return { success: false, error: 'admin.reports.error_not_actionable' }
  }
  if (!data || data.length === 0) {
    // RLS-blocked, already resolved, or gone.
    return { success: false, error: 'admin.reports.error_not_actionable' }
  }

  revalidatePath('/admin/signalements')
  revalidatePath('/admin/signalements/' + reportId)
  return { success: true }
}

// Dismiss = terminal close with NO action against the target (the report was invalid
// or spurious). Mirrors resolveReport exactly: same admin_note requirement (the DB
// CHECK reports_terminal_requires_admin_note backs it), same RLS (is_admin UPDATE
// policy) + rowcount-honest guard. updated_at is bumped by reports_set_updated_at;
// there is no resolved_at column.
export async function dismissReport(reportId: string, adminNote: string): Promise<ReportActionResult> {
  const note = adminNote.trim()
  if (note.length === 0) {
    return { success: false, error: 'admin.reports.dismiss_note_required' }
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('reports')
    .update({ status: 'dismissed', admin_note: note })
    .eq('id', reportId)
    .in('status', ['open', 'under_review'])
    .select('id')

  if (error) {
    console.error('[admin/signalements] dismissReport error:', error)
    return { success: false, error: 'admin.reports.error_dismiss_no_row' }
  }
  if (!data || data.length === 0) {
    // RLS-blocked, or already in a terminal state (resolved/dismissed).
    return { success: false, error: 'admin.reports.error_dismiss_no_row' }
  }

  revalidatePath('/admin/signalements')
  revalidatePath('/admin/signalements/' + reportId)
  return { success: true }
}
