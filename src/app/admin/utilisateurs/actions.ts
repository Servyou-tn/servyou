'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { checkAdmin, adminRejectionError } from '@/lib/auth/require-admin'
import { syncAuthBan, isSuspensionAlreadyApplied } from '@/lib/auth/auth-ban'

export type UserActionResult = { success: boolean; error?: string }

// Map the SECURITY DEFINER functions' RAISE EXCEPTION messages to friendly i18n
// keys. Unlike a bare UPDATE (which returns no error on a zero-row match), these
// functions RAISE on every failure mode — admin gate, self-suspend, empty reason,
// already-suspended / not-suspended — so a null error genuinely means the state
// changed. No rowcount guard needed; the function is the guard. checkAdmin
// (src/lib/auth/require-admin.ts) runs first anyway, so a non-admin is rejected
// before the RPC is ever called.
function translateRpcError(message: string): string {
  if (message.includes('Forbidden')) return 'admin.users.error_forbidden'
  if (message.includes('cannot suspend themselves')) return 'admin.users.error_self_suspend'
  if (message.includes('reason is required')) return 'admin.users.suspend_reason_required'
  if (message.includes('already suspended')) return 'admin.users.error_already_suspended'
  if (message.includes('not currently suspended')) return 'admin.users.error_not_suspended'
  return 'common.error_generic'
}

// The target arrives from the client. A uuid is the only valid shape — anything else would fail the
// RPC's cast (22P02) before its admin gate and audit log ever ran.
const TargetUserId = z.string().uuid()

export async function suspendUser(targetUserId: string, reason: string): Promise<UserActionResult> {
  if (!TargetUserId.safeParse(targetUserId).success) return { success: false, error: 'common.error_generic' }

  const supabase = await createClient()
  const admin = await checkAdmin(supabase)
  if (!admin.ok) {
    console.error(`[admin/utilisateurs] suspendUser rejected: ${admin.reason}`)
    return { success: false, error: adminRejectionError(admin.reason, 'admin.users.error_forbidden') }
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
  if (error && !isSuspensionAlreadyApplied(error, true)) {
    console.error('[admin/utilisateurs] suspendUser error:', error.message, error.code, error.details)
    return { success: false, error: translateRpcError(error.message) }
  }

  // Database first, then the auth ban, set from the committed suspended_at (src/lib/auth/auth-ban.ts —
  // service role, which CLAUDE.md allows in server actions): the account can no longer sign in or
  // refresh, and middleware.ts signs out its current session on the next request.
  const sync = await syncAuthBan(targetUserId)
  if (!sync.ok) {
    // The RPC's "not found or already suspended" was the not-found half.
    if (sync.reason === 'not_found') return { success: false, error: 'admin.users.error_not_found' }
    // Not revalidated, so the form stays up and resubmitting lands in the retry branch above.
    return { success: false, error: 'admin.users.error_ban_failed' }
  }

  revalidatePath('/admin/utilisateurs')
  revalidatePath('/admin/utilisateurs/' + targetUserId)
  // A concurrent unsuspend committed between the RPC and the sync: the account, and so its ban, is active.
  if (!sync.suspended) return { success: false, error: 'admin.users.error_not_suspended' }
  return { success: true }
}

export async function unsuspendUser(targetUserId: string): Promise<UserActionResult> {
  if (!TargetUserId.safeParse(targetUserId).success) return { success: false, error: 'common.error_generic' }

  const supabase = await createClient()
  const admin = await checkAdmin(supabase)
  if (!admin.ok) {
    console.error(`[admin/utilisateurs] unsuspendUser rejected: ${admin.reason}`)
    return { success: false, error: adminRejectionError(admin.reason, 'admin.users.error_forbidden') }
  }

  const { error } = await supabase.rpc('admin_unsuspend_user', {
    target_user_id: targetUserId,
  })
  // Retry-safe, mirroring suspendUser: "not currently suspended" falls through to the unban.
  if (error && !isSuspensionAlreadyApplied(error, false)) {
    console.error('[admin/utilisateurs] unsuspendUser error:', error.message, error.code, error.details)
    return { success: false, error: translateRpcError(error.message) }
  }

  // Database first, then lift the auth ban — again from the committed suspended_at.
  const sync = await syncAuthBan(targetUserId)
  if (!sync.ok) {
    if (sync.reason === 'not_found') return { success: false, error: 'admin.users.error_not_found' }
    return { success: false, error: 'admin.users.error_unban_failed' }
  }

  revalidatePath('/admin/utilisateurs')
  revalidatePath('/admin/utilisateurs/' + targetUserId)
  // A concurrent suspend committed between the RPC and the sync: the account, and so its ban, is suspended.
  if (sync.suspended) return { success: false, error: 'admin.users.error_already_suspended' }
  return { success: true }
}
