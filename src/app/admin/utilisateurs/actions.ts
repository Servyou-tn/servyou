'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { checkAdmin, adminRejectionError } from '@/lib/auth/require-admin'
import { setAuthBan, isSuspensionAlreadyApplied } from '@/lib/auth/auth-ban'

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

export async function suspendUser(targetUserId: string, reason: string): Promise<UserActionResult> {
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
  if (error && !isSuspensionAlreadyApplied(error.message, true)) {
    console.error('[admin/utilisateurs] suspendUser error:', error.message, error.code, error.details)
    return { success: false, error: translateRpcError(error.message) }
  }

  // Database first, then the auth ban (src/lib/auth/auth-ban.ts — service role, which CLAUDE.md
  // allows in server actions): the account can no longer sign in or refresh, and middleware.ts
  // signs out its current session on the next request.
  const ban = await setAuthBan(targetUserId, true)
  if (!ban.ok) {
    // An unknown id raises the same "not found or already suspended"; GoTrue settles which.
    if (error && ban.reason === 'not_found') return { success: false, error: translateRpcError(error.message) }
    // Not revalidated, so the form stays up and resubmitting lands in the retry branch above.
    return { success: false, error: 'admin.users.error_ban_failed' }
  }

  revalidatePath('/admin/utilisateurs')
  revalidatePath('/admin/utilisateurs/' + targetUserId)
  return { success: true }
}

export async function unsuspendUser(targetUserId: string): Promise<UserActionResult> {
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
  if (error && !isSuspensionAlreadyApplied(error.message, false)) {
    console.error('[admin/utilisateurs] unsuspendUser error:', error.message, error.code, error.details)
    return { success: false, error: translateRpcError(error.message) }
  }

  // Database first, then lift the auth ban so the account can sign in again.
  const unban = await setAuthBan(targetUserId, false)
  if (!unban.ok) {
    if (error && unban.reason === 'not_found') return { success: false, error: translateRpcError(error.message) }
    return { success: false, error: 'admin.users.error_unban_failed' }
  }

  revalidatePath('/admin/utilisateurs')
  revalidatePath('/admin/utilisateurs/' + targetUserId)
  return { success: true }
}
