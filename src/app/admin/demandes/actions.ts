'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { checkAdmin, adminRejectionError } from '@/lib/auth/require-admin'
import { finishAccountErasure, tombstoneEmail } from '@/lib/admin/account-erasure'
import {
  ALREADY_PROCESSED_MESSAGE,
  ApprovedResult,
  ERASURE_AUDIT_ACTION,
  REQUEST_ERROR,
  RefusalInput,
  RequestInput,
  inputErrorKey,
  requestRpcErrorKey,
  type RequestActionResult,
  type RequestErrorKey,
} from '@/lib/admin/requests'

// Server actions behind the admin « Demandes » page (the page and its buttons are Agent B's). Every action:
//   * Zod-validates its input first (ids are uuids; a note is trimmed, ≤ 500 characters, required for a refusal);
//   * runs checkAdmin (src/lib/auth/require-admin.ts) before any query — a non-admin is refused here, and again by the
//     RPCs' own is_admin() gate, which stays the real boundary;
//   * calls one SECURITY DEFINER RPC (migrations 20261106074610 + 20261106083409), which logs the decision itself, in
//     the same transaction;
//   * returns an i18n key (src/lib/admin/requests.ts, REQUEST_ERROR) — the page maps it to text.
// Nothing personal is logged: ids, steps and the RPCs' own (impersonal) messages only — never a note, a name or an
// e-mail.

const PATH = '/admin/demandes'
const TAG = '[admin/demandes]'

type Rpc = { code?: string; message: string; details?: string | null }

function logRpc(action: string, error: Rpc): void {
  console.error(`${TAG} ${action} error:`, error.message, error.code, error.details)
}

async function adminSession(action: string) {
  const supabase = await createClient()
  const admin = await checkAdmin(supabase)
  if (!admin.ok) {
    console.error(`${TAG} ${action} rejected: ${admin.reason}`)
    // adminRejectionError's rule (a failed lookup is an outage, not a denial), narrowed to this module's keys.
    const error: RequestErrorKey =
      adminRejectionError(admin.reason, REQUEST_ERROR.forbidden) === REQUEST_ERROR.forbidden ? REQUEST_ERROR.forbidden : REQUEST_ERROR.generic
    return { ok: false as const, error }
  }
  return { ok: true as const, supabase }
}

type Session = Extract<Awaited<ReturnType<typeof adminSession>>, { ok: true }>['supabase']

// Retry path: the RPC refused because the request is no longer pending. If an earlier attempt APPROVED it, its auth +
// files step may not have finished — return the user id so that step runs again. A rejected request runs nothing.
async function alreadyApprovedUserId(supabase: Session, requestId: string): Promise<string | null> {
  const { data, error } = await supabase.from('deletion_requests').select('status, user_id').eq('id', requestId).maybeSingle()
  if (error) {
    logRpc('approveDeletionRequest retry lookup', error)
    return null
  }
  return data?.status === 'approved' ? data.user_id : null
}

/**
 * « Approuver » a deletion request: the RPC tombstones the account (database), then the auth e-mail, the ban and the
 * person's files are erased (service role). Safe to call again: on an already-approved request it only finishes the
 * auth + files step. `{ approved: true, error: erasureIncomplete }` means: approved, but retry to finish.
 */
export async function approveDeletionRequest(requestId: unknown, note?: unknown): Promise<RequestActionResult> {
  const input = RequestInput.safeParse({ id: requestId, note })
  if (!input.success) return { success: false, error: inputErrorKey(input.error) }

  const session = await adminSession('approveDeletionRequest')
  if (!session.ok) return { success: false, error: session.error }
  const { supabase } = session

  let userId: string
  const { data, error } = await supabase.rpc('admin_process_deletion_request', {
    p_request_id: input.data.id,
    p_decision: 'approve',
    p_note: input.data.note,
  })
  if (error) {
    if (error.code !== '23514' || error.message !== ALREADY_PROCESSED_MESSAGE) {
      logRpc('approveDeletionRequest', error)
      return { success: false, error: requestRpcErrorKey(error) }
    }
    const approvedUser = await alreadyApprovedUserId(supabase, input.data.id)
    if (!approvedUser) return { success: false, error: REQUEST_ERROR.alreadyProcessed }
    userId = approvedUser
  } else {
    const approved = ApprovedResult.safeParse(data)
    if (!approved.success || approved.data.tombstone_email !== tombstoneEmail(approved.data.user_id)) {
      // The database step committed; without a trustworthy user id nothing else may run.
      console.error(`${TAG} approveDeletionRequest: unexpected RPC result shape for request ${input.data.id}`)
      revalidatePath(PATH)
      return { success: false, error: REQUEST_ERROR.erasureIncomplete, approved: true }
    }
    userId = approved.data.user_id
  }

  const erased = await finishAccountErasure(userId)
  if (!erased.ok) {
    console.error(`${TAG} approveDeletionRequest: erasure stopped at ${erased.step} (${erased.reason}) for user ${userId}`)
    revalidatePath(PATH)
    return { success: false, error: REQUEST_ERROR.erasureIncomplete, approved: true }
  }

  // The completion marker the page reads (an approved request without it = « côté connexion non terminé »). Written
  // only after every step succeeded; best-effort like every post-commit audit row (src/app/admin/signalements/actions.ts):
  // a failed write is logged, never turned into a failure of an action that has fully happened.
  try {
    const { error: logError } = await supabase.rpc('log_admin_action', {
      p_action: ERASURE_AUDIT_ACTION,
      p_target_type: 'user',
      p_target_id: userId,
      p_after_state: { request_id: input.data.id, auth: 'banned', files_removed: erased.filesRemoved, image_rows_removed: erased.imageRowsRemoved },
    })
    if (logError) logRpc('approveDeletionRequest audit', logError)
  } catch (e) {
    console.error(`${TAG} approveDeletionRequest audit threw:`, e instanceof Error ? e.message : String(e))
  }

  revalidatePath(PATH)
  return { success: true }
}

/** « Refuser » a deletion request — a note is required. */
export async function rejectDeletionRequest(requestId: unknown, note: unknown): Promise<RequestActionResult> {
  const input = RefusalInput.safeParse({ id: requestId, note })
  if (!input.success) return { success: false, error: inputErrorKey(input.error) }

  const session = await adminSession('rejectDeletionRequest')
  if (!session.ok) return { success: false, error: session.error }

  const { error } = await session.supabase.rpc('admin_process_deletion_request', {
    p_request_id: input.data.id,
    p_decision: 'reject',
    p_note: input.data.note,
  })
  if (error) {
    logRpc('rejectDeletionRequest', error)
    return { success: false, error: requestRpcErrorKey(error) }
  }
  revalidatePath(PATH)
  return { success: true }
}

/** « Export envoyé » — the admin sent the file by e-mail (Paramètres' promise); the note is optional. */
export async function completeDataExport(exportId: unknown, note?: unknown): Promise<RequestActionResult> {
  const input = RequestInput.safeParse({ id: exportId, note })
  if (!input.success) return { success: false, error: inputErrorKey(input.error) }
  return processExport('completeDataExport', input.data.id, 'completed', input.data.note)
}

/** « Refuser » an export request — a note is required. */
export async function rejectDataExport(exportId: unknown, note: unknown): Promise<RequestActionResult> {
  const input = RefusalInput.safeParse({ id: exportId, note })
  if (!input.success) return { success: false, error: inputErrorKey(input.error) }
  return processExport('rejectDataExport', input.data.id, 'rejected', input.data.note)
}

async function processExport(
  action: string,
  exportId: string,
  decision: 'completed' | 'rejected',
  note: string | undefined,
): Promise<RequestActionResult> {
  const session = await adminSession(action)
  if (!session.ok) return { success: false, error: session.error }

  const { error } = await session.supabase.rpc('admin_process_data_export', {
    p_export_id: exportId,
    p_decision: decision,
    p_note: note,
  })
  if (error) {
    logRpc(action, error)
    return { success: false, error: requestRpcErrorKey(error) }
  }
  revalidatePath(PATH)
  return { success: true }
}

/** « Traité » for a /contact message; the note is optional. */
export async function markContactMessageHandled(messageId: unknown, note?: unknown): Promise<RequestActionResult> {
  const input = RequestInput.safeParse({ id: messageId, note })
  if (!input.success) return { success: false, error: inputErrorKey(input.error) }

  const session = await adminSession('markContactMessageHandled')
  if (!session.ok) return { success: false, error: session.error }

  const { error } = await session.supabase.rpc('admin_mark_contact_message_handled', {
    p_message_id: input.data.id,
    p_note: input.data.note,
  })
  if (error) {
    logRpc('markContactMessageHandled', error)
    return { success: false, error: requestRpcErrorKey(error) }
  }
  revalidatePath(PATH)
  return { success: true }
}
