import { createAdminClient } from '@/lib/supabase/admin'

// The auth half of a suspension: mirrors profiles.suspended_at as a Supabase Auth ban. The database
// is the source of truth and is written FIRST (admin_suspend_user / admin_unsuspend_user); since
// migration 20261024191215_suspension_enforcement it already refuses every write a suspended
// account attempts. The ban closes the session side (measured live 2026-10-24):
//   * GoTrue refuses sign-in and token refresh with `user_banned` — sign-in even before it checks
//     the password — and getUser() answers 403 `user_banned` on the account's still-valid access
//     token, which src/middleware.ts turns into the suspended sign-out;
//   * an access token issued before the ban stays valid at PostgREST / Storage until it expires
//     (3600 s on this project), so the account can still READ through the API for at most that hour.
//
// Service role: callers MUST be 'use server' admin actions that already passed checkAdmin()
// (src/lib/supabase/admin.ts). Deliberately NOT a 'use server' module itself — every export of one
// becomes a callable endpoint.

// GoTrue has no permanent ban; 100 years.
export const SUSPENSION_BAN_DURATION = '876000h'

export type AuthBanResult = { ok: true } | { ok: false; reason: 'not_found' | 'failed' }

// Idempotent both ways (verified live: banning a banned account and unbanning an unbanned one both
// succeed), so a retry after a partial failure is safe.
export async function setAuthBan(userId: string, banned: boolean): Promise<AuthBanResult> {
  try {
    const { error } = await createAdminClient().auth.admin.updateUserById(userId, {
      ban_duration: banned ? SUSPENSION_BAN_DURATION : 'none',
    })
    if (error) {
      console.error(`[setAuthBan] ${banned ? 'ban' : 'unban'} failed for ${userId}:`, error.message, error.status, error.code)
      return { ok: false, reason: error.code === 'user_not_found' ? 'not_found' : 'failed' }
    }
    return { ok: true }
  } catch (e) {
    console.error(`[setAuthBan] ${banned ? 'ban' : 'unban'} threw for ${userId}:`, e instanceof Error ? e.message : String(e))
    return { ok: false, reason: 'failed' }
  }
}

// admin_suspend_user / admin_unsuspend_user raise these when the account is ALREADY in the requested
// state — which, on a retry, means an earlier attempt's database write landed and its ban may not
// have. (An unknown id raises the same message; setAuthBan then reports not_found.) Only these fall
// through to the ban: Forbidden, self-suspend and an empty reason never reach it.
export function isSuspensionAlreadyApplied(rpcMessage: string, suspend: boolean): boolean {
  return rpcMessage.includes(suspend ? 'already suspended' : 'not currently suspended')
}
