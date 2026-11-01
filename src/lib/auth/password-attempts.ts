import { createAdminClient } from '@/lib/supabase/admin'

// Wrong current-password attempts on Mon compte's password change: at most PASSWORD_ATTEMPT_LIMIT per account per
// PASSWORD_ATTEMPT_WINDOW_MINUTES (pre-beta review M1). Stored in public.password_change_attempts, which only the
// service role can touch (RLS on, no policy, no client privilege — see its migration).
//
// Reserve-then-count: the attempt's row is inserted FIRST and the window counted AFTER, so concurrent attempts see
// each other and no burst gets past the limit. Over the limit, the row is removed again (a refused attempt does not
// extend the lockout). The caller keeps the row only for a wrong current password and releases it for every other
// outcome, so only wrong passwords count.
export const PASSWORD_ATTEMPT_LIMIT = 5
export const PASSWORD_ATTEMPT_WINDOW_MINUTES = 15

export type PasswordAttempt = { ok: true; id: string; blocked: boolean } | { ok: false }

const attempts = () => createAdminClient().from('password_change_attempts')

export async function reservePasswordAttempt(userId: string): Promise<PasswordAttempt> {
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  // Housekeeping: rows older than a day can never matter again. Best effort — a failure here is not the attempt's.
  const { error: pruneError } = await attempts().delete().lt('attempted_at', dayAgo)
  if (pruneError) console.error('[reservePasswordAttempt] prune failed:', pruneError.message, pruneError.code)

  const { data, error } = await attempts().insert({ user_id: userId }).select('id').single()
  if (error || !data) {
    console.error('[reservePasswordAttempt] insert failed:', error?.message, error?.code, error?.details)
    return { ok: false }
  }
  const id = data.id

  const since = new Date(Date.now() - PASSWORD_ATTEMPT_WINDOW_MINUTES * 60 * 1000).toISOString()
  const { count, error: countError } = await attempts()
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gt('attempted_at', since)
  if (countError) {
    console.error('[reservePasswordAttempt] count failed:', countError.message, countError.code, countError.details)
    await releasePasswordAttempt(id)
    return { ok: false }
  }
  if ((count ?? 0) > PASSWORD_ATTEMPT_LIMIT) {
    await releasePasswordAttempt(id)
    return { ok: true, id, blocked: true }
  }
  return { ok: true, id, blocked: false }
}

/** Removes an attempt that must not count (anything but a wrong current password). Best effort, never throws. */
export async function releasePasswordAttempt(id: string): Promise<void> {
  const { error } = await attempts().delete().eq('id', id)
  if (error) console.error('[releasePasswordAttempt] delete failed:', error.message, error.code)
}
