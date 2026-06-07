'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export type UserActionResult = { success: boolean; error?: string }

// Map the SECURITY DEFINER functions' RAISE EXCEPTION messages to friendly i18n
// keys. Unlike a bare UPDATE (which returns no error on a zero-row match), these
// functions RAISE on every failure mode — admin gate, self-suspend, empty reason,
// already-suspended / not-suspended — so a null error genuinely means the state
// changed. No rowcount guard needed; the function is the guard.
function translateRpcError(message: string): string {
  if (message.includes('Forbidden')) return 'admin.users.error_forbidden'
  if (message.includes('cannot suspend themselves')) return 'admin.users.error_self_suspend'
  if (message.includes('reason is required')) return 'admin.users.suspend_reason_required'
  if (message.includes('already suspended')) return 'admin.users.error_already_suspended'
  if (message.includes('not currently suspended')) return 'admin.users.error_not_suspended'
  return 'common.error_generic'
}

export async function suspendUser(targetUserId: string, reason: string): Promise<UserActionResult> {
  const trimmed = reason.trim()
  if (trimmed.length === 0) {
    return { success: false, error: 'admin.users.suspend_reason_required' }
  }

  const supabase = await createClient()
  const { error } = await supabase.rpc('admin_suspend_user', {
    target_user_id: targetUserId,
    reason: trimmed,
  })
  if (error) {
    console.error('[admin/utilisateurs] suspendUser error:', error)
    return { success: false, error: translateRpcError(error.message) }
  }

  // No service-role admin.signOut() here (CLAUDE.md: service role key stays out of
  // app code). The suspended user is signed out by middleware.ts on their next
  // protected-route request.
  revalidatePath('/admin/utilisateurs')
  revalidatePath('/admin/utilisateurs/' + targetUserId)
  return { success: true }
}

export async function unsuspendUser(targetUserId: string): Promise<UserActionResult> {
  const supabase = await createClient()
  const { error } = await supabase.rpc('admin_unsuspend_user', {
    target_user_id: targetUserId,
  })
  if (error) {
    console.error('[admin/utilisateurs] unsuspendUser error:', error)
    return { success: false, error: translateRpcError(error.message) }
  }

  revalidatePath('/admin/utilisateurs')
  revalidatePath('/admin/utilisateurs/' + targetUserId)
  return { success: true }
}
