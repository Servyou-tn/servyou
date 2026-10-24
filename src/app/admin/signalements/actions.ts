'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { checkAdmin, adminRejectionError } from '@/lib/auth/require-admin'
import { setAuthBan, isSuspensionAlreadyApplied } from '@/lib/auth/auth-ban'

export type ReportActionResult = { success: boolean; error?: string }

// Every action here first runs checkAdmin (src/lib/auth/require-admin.ts) — a non-admin
// caller is rejected before any query or RPC runs. Under that, RLS is still the real guard:
// the reports UPDATE policy is is_admin(). For a double-submit, or an already-claimed/
// resolved report, the WHERE filter matches zero rows and PostgREST returns
// { data: [], error: null } — i.e. NO error. So we .select('id') after the update and treat
// an empty result as failure. The DB CHECK + RLS are the real guards; this is the
// honest-result layer that prevents a misleading green UI.
// Error values are i18n keys; the calling client component translates them.

// Audit logging (best-effort, by design). Each successful action writes a
// forensic row via the log_admin_action RPC (migration 20260608165709). Unlike
// the four content/user SECURITY DEFINER RPCs — which log INSIDE their own
// transaction, so a failed audit rolls the mutation back — these report actions
// are bare UPDATEs that have ALREADY committed by the time we log. The audit
// write is therefore a separate Supabase round-trip and best-effort by
// necessity: a failed audit write must NOT turn a succeeded action into a
// reported failure (that would drive confusing double-submits). We surface the
// error to the server log per the never-swallow-a-Supabase-error rule, then
// return success — and the call is wrapped in try/catch so a transport-level
// throw (not just a returned { error }) is caught and swallowed identically,
// so the contract holds regardless of how the client surfaces failure.
// Wrapping each action in its own RPC to regain atomicity is heavier than the
// value for a solo-admin forensic log.

// checkAdmin rejection key for the report + suspension actions (reports have no forbidden key of
// their own). hide/unhide return admin.moderation.error_forbidden instead — the same key
// translateModerationError already gives the RPC's own Forbidden raise, so one condition, one key.
const FORBIDDEN = 'admin.users.error_forbidden'

// A transport-level throw is `unknown`, not a PostgrestError — log its message, never the raw value.
function thrownMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e)
}

export async function claimReport(reportId: string): Promise<ReportActionResult> {
  const supabase = await createClient()
  const admin = await checkAdmin(supabase)
  if (!admin.ok) {
    console.error(`[admin/signalements] claimReport rejected: ${admin.reason}`)
    return { success: false, error: adminRejectionError(admin.reason, FORBIDDEN) }
  }

  const { data, error } = await supabase
    .from('reports')
    .update({ status: 'under_review' })
    .eq('id', reportId)
    .eq('status', 'open')
    .select('id')

  if (error) {
    console.error('[admin/signalements] claimReport error:', error.message, error.code, error.details)
    return { success: false, error: 'admin.reports.error_already_claimed' }
  }
  if (!data || data.length === 0) {
    // RLS-blocked, already under review/resolved, or gone.
    return { success: false, error: 'admin.reports.error_already_claimed' }
  }

  try {
    const { error: logError } = await supabase.rpc('log_admin_action', {
      p_action: 'claim_report',
      p_target_type: 'report',
      p_target_id: reportId,
      p_before_state: { status: 'open' },
      p_after_state: { status: 'under_review' },
    })
    if (logError) {
      console.error('[admin/signalements] claimReport audit log error:', logError.message, logError.code, logError.details)
    }
  } catch (logError) {
    console.error('[admin/signalements] claimReport audit log error:', thrownMessage(logError))
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
  const supabase = await createClient()
  const admin = await checkAdmin(supabase)
  if (!admin.ok) {
    console.error(`[admin/signalements] hideContent rejected: ${admin.reason}`)
    return { success: false, error: adminRejectionError(admin.reason, 'admin.moderation.error_forbidden') }
  }

  const trimmed = reason.trim()
  if (trimmed.length === 0) {
    return { success: false, error: 'admin.moderation.hide_reason_required' }
  }

  const { error } = await supabase.rpc('admin_hide_content', {
    target_type: targetType,
    target_id: targetId,
    reason: trimmed,
  })
  if (error) {
    console.error('[admin/signalements] hideContent error:', error.message, error.code, error.details)
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
  const admin = await checkAdmin(supabase)
  if (!admin.ok) {
    console.error(`[admin/signalements] unhideContent rejected: ${admin.reason}`)
    return { success: false, error: adminRejectionError(admin.reason, 'admin.moderation.error_forbidden') }
  }

  const { error } = await supabase.rpc('admin_unhide_content', {
    target_type: targetType,
    target_id: targetId,
  })
  if (error) {
    console.error('[admin/signalements] unhideContent error:', error.message, error.code, error.details)
    return { success: false, error: translateModerationError(error.message) }
  }

  revalidatePath('/admin/signalements')
  revalidatePath('/admin/signalements/' + reportId)
  return { success: true }
}

export async function resolveReport(reportId: string, adminNote: string): Promise<ReportActionResult> {
  const supabase = await createClient()
  const admin = await checkAdmin(supabase)
  if (!admin.ok) {
    console.error(`[admin/signalements] resolveReport rejected: ${admin.reason}`)
    return { success: false, error: adminRejectionError(admin.reason, FORBIDDEN) }
  }

  const note = adminNote.trim()
  if (note.length === 0) {
    return { success: false, error: 'admin.reports.admin_note_required' }
  }

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
    console.error('[admin/signalements] resolveReport error:', error.message, error.code, error.details)
    return { success: false, error: 'admin.reports.error_not_actionable' }
  }
  if (!data || data.length === 0) {
    // RLS-blocked, already resolved, or gone.
    return { success: false, error: 'admin.reports.error_not_actionable' }
  }

  try {
    const { error: logError } = await supabase.rpc('log_admin_action', {
      p_action: 'resolve_report',
      p_target_type: 'report',
      p_target_id: reportId,
      p_after_state: { status: 'resolved' },
      p_note: note,
    })
    if (logError) {
      console.error('[admin/signalements] resolveReport audit log error:', logError.message, logError.code, logError.details)
    }
  } catch (logError) {
    console.error('[admin/signalements] resolveReport audit log error:', thrownMessage(logError))
  }

  revalidatePath('/admin/signalements')
  revalidatePath('/admin/signalements/' + reportId)
  return { success: true }
}

// Dismiss = terminal close with NO action against the target (the report was invalid
// or spurious). Mirrors resolveReport exactly: same admin gate, same admin_note
// requirement (the DB CHECK reports_terminal_requires_admin_note backs it), same RLS
// (is_admin UPDATE policy) + rowcount-honest guard. updated_at is bumped by
// reports_set_updated_at; there is no resolved_at column.
export async function dismissReport(reportId: string, adminNote: string): Promise<ReportActionResult> {
  const supabase = await createClient()
  const admin = await checkAdmin(supabase)
  if (!admin.ok) {
    console.error(`[admin/signalements] dismissReport rejected: ${admin.reason}`)
    return { success: false, error: adminRejectionError(admin.reason, FORBIDDEN) }
  }

  const note = adminNote.trim()
  if (note.length === 0) {
    return { success: false, error: 'admin.reports.dismiss_note_required' }
  }

  const { data, error } = await supabase
    .from('reports')
    .update({ status: 'dismissed', admin_note: note })
    .eq('id', reportId)
    .in('status', ['open', 'under_review'])
    .select('id')

  if (error) {
    console.error('[admin/signalements] dismissReport error:', error.message, error.code, error.details)
    return { success: false, error: 'admin.reports.error_dismiss_no_row' }
  }
  if (!data || data.length === 0) {
    // RLS-blocked, or already in a terminal state (resolved/dismissed).
    return { success: false, error: 'admin.reports.error_dismiss_no_row' }
  }

  try {
    const { error: logError } = await supabase.rpc('log_admin_action', {
      p_action: 'dismiss_report',
      p_target_type: 'report',
      p_target_id: reportId,
      p_after_state: { status: 'dismissed' },
      p_note: note,
    })
    if (logError) {
      console.error('[admin/signalements] dismissReport audit log error:', logError.message, logError.code, logError.details)
    }
  } catch (logError) {
    console.error('[admin/signalements] dismissReport audit log error:', thrownMessage(logError))
  }

  revalidatePath('/admin/signalements')
  revalidatePath('/admin/signalements/' + reportId)
  return { success: true }
}

// --- Inline user suspension (user-targeted reports) -------------------------
// Report-local wrappers around admin_suspend_user / admin_unsuspend_user (the same
// SECURITY DEFINER functions /admin/utilisateurs uses), mirroring how hideContent/
// unhideContent re-wrap admin_hide_content here. The difference from the utilisateurs
// actions is the revalidate target: these refresh the report detail page (where the
// action is invoked) as well as the user surfaces. The functions RAISE on every
// failure mode (admin gate, self-suspend, empty reason, already/not-suspended), so a
// null error genuinely means the state changed — no rowcount guard needed. Like the
// utilisateurs actions, each then mirrors the new state as an auth ban
// (src/lib/auth/auth-ban.ts), database first, retry-safe.

function translateSuspendError(message: string): string {
  if (message.includes('Forbidden')) return 'admin.users.error_forbidden'
  if (message.includes('cannot suspend themselves')) return 'admin.users.error_self_suspend'
  if (message.includes('reason is required')) return 'admin.users.suspend_reason_required'
  if (message.includes('already suspended')) return 'admin.users.error_already_suspended'
  if (message.includes('not currently suspended')) return 'admin.users.error_not_suspended'
  return 'common.error_generic'
}

export async function suspendReportedUser(
  targetUserId: string,
  reason: string,
  reportId: string,
): Promise<ReportActionResult> {
  const supabase = await createClient()
  const admin = await checkAdmin(supabase)
  if (!admin.ok) {
    console.error(`[admin/signalements] suspendReportedUser rejected: ${admin.reason}`)
    return { success: false, error: adminRejectionError(admin.reason, FORBIDDEN) }
  }

  const trimmed = reason.trim()
  if (trimmed.length === 0) {
    return { success: false, error: 'admin.users.suspend_reason_required' }
  }

  const { error } = await supabase.rpc('admin_suspend_user', {
    target_user_id: targetUserId,
    reason: trimmed,
  })
  // Retry-safe: "already suspended" means an earlier attempt's database write landed, so fall
  // through and (re-)apply the idempotent ban. Every other raise stops here, before the ban.
  if (error && !isSuspensionAlreadyApplied(error.message, true)) {
    console.error('[admin/signalements] suspendReportedUser error:', error.message, error.code, error.details)
    return { success: false, error: translateSuspendError(error.message) }
  }

  // Database first, then the auth ban (service role, which CLAUDE.md allows in server actions):
  // the account can no longer sign in or refresh, and middleware.ts signs out its current session
  // on the next request.
  const ban = await setAuthBan(targetUserId, true)
  if (!ban.ok) {
    // An unknown id raises the same "not found or already suspended"; GoTrue settles which.
    if (error && ban.reason === 'not_found') return { success: false, error: translateSuspendError(error.message) }
    // Not revalidated, so the form stays up and resubmitting lands in the retry branch above.
    return { success: false, error: 'admin.users.error_ban_failed' }
  }

  // Suspension changed global state: refresh the report page (we're on it) and the
  // user surfaces so they aren't stale on the next visit.
  revalidatePath('/admin/signalements/' + reportId)
  revalidatePath('/admin/utilisateurs')
  revalidatePath('/admin/utilisateurs/' + targetUserId)
  return { success: true }
}

export async function unsuspendReportedUser(
  targetUserId: string,
  reportId: string,
): Promise<ReportActionResult> {
  const supabase = await createClient()
  const admin = await checkAdmin(supabase)
  if (!admin.ok) {
    console.error(`[admin/signalements] unsuspendReportedUser rejected: ${admin.reason}`)
    return { success: false, error: adminRejectionError(admin.reason, FORBIDDEN) }
  }

  const { error } = await supabase.rpc('admin_unsuspend_user', {
    target_user_id: targetUserId,
  })
  // Retry-safe, mirroring suspendReportedUser: "not currently suspended" falls through to the unban.
  if (error && !isSuspensionAlreadyApplied(error.message, false)) {
    console.error('[admin/signalements] unsuspendReportedUser error:', error.message, error.code, error.details)
    return { success: false, error: translateSuspendError(error.message) }
  }

  // Database first, then lift the auth ban so the account can sign in again.
  const unban = await setAuthBan(targetUserId, false)
  if (!unban.ok) {
    if (error && unban.reason === 'not_found') return { success: false, error: translateSuspendError(error.message) }
    return { success: false, error: 'admin.users.error_unban_failed' }
  }

  revalidatePath('/admin/signalements/' + reportId)
  revalidatePath('/admin/utilisateurs')
  revalidatePath('/admin/utilisateurs/' + targetUserId)
  return { success: true }
}
