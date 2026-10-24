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
// Service role (see src/lib/supabase/admin.ts for the rule): callers MUST be 'use server' admin
// actions that already passed checkAdmin() (src/lib/auth/require-admin.ts). Deliberately NOT a
// 'use server' module itself — every export of one becomes a callable endpoint.

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

export type AuthBanSyncResult = { ok: true; suspended: boolean } | { ok: false; reason: 'not_found' | 'failed' }

// What the admin actions call: sets the ban from the COMMITTED profiles.suspended_at, never from the
// caller's intent, so the last call always converges on the database — two admins acting at once, a
// resubmit after a failed ban, or a stale tab can no longer leave a reinstated account banned (or a
// suspended one unbanned). Returns the state it mirrored, so the caller can tell when a concurrent
// action won.
export async function syncAuthBan(userId: string): Promise<AuthBanSyncResult> {
  try {
    const { data, error } = await createAdminClient().from('profiles').select('suspended_at').eq('id', userId).maybeSingle()
    if (error) {
      console.error(`[syncAuthBan] suspended_at lookup failed for ${userId}:`, error.message, error.code, error.details)
      return { ok: false, reason: 'failed' }
    }
    if (!data) return { ok: false, reason: 'not_found' }
    const suspended = data.suspended_at !== null
    const ban = await setAuthBan(userId, suspended)
    return ban.ok ? { ok: true, suspended } : ban
  } catch (e) {
    console.error(`[syncAuthBan] threw for ${userId}:`, e instanceof Error ? e.message : String(e))
    return { ok: false, reason: 'failed' }
  }
}

// admin_suspend_user / admin_unsuspend_user raise exactly these (SQLSTATE P0001, migration
// 20260608165819) when the account is ALREADY in the requested state — which, on a retry, means an
// earlier attempt's database write landed and its ban may not have. (An unknown id raises the same
// message; syncAuthBan then reports not_found.) Only these fall through to the ban: Forbidden,
// self-suspend and an empty reason never reach it. Matched whole, never as a substring — a malformed
// id fails the uuid cast first (22P02) with the raw input echoed in the message.
const ALREADY_APPLIED = {
  suspend: 'User not found or already suspended',
  unsuspend: 'User not found or not currently suspended',
} as const

export function isSuspensionAlreadyApplied(rpcError: { code?: string; message: string }, suspend: boolean): boolean {
  return rpcError.code === 'P0001' && rpcError.message === ALREADY_APPLIED[suspend ? 'suspend' : 'unsuspend']
}
