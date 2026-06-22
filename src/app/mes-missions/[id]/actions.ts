'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { JOB_POST_EXPIRY_DAYS } from '@/lib/job-constants'

// Manage actions for a consumer's own mission. Each is author-scoped by the WHERE clause AND
// re-guarded by RLS (job_posts UPDATE policy = consumer_id = auth.uid()). A status-only update
// passes the two job_posts UPDATE triggers cleanly (handle_updated_at; enforce_admin_marker_lock
// only blocks non-admins from touching admin_hidden_*). A zero-row update — already in the wrong
// state, not the owner, or a concurrent change — is surfaced as a failure, never a false success
// (mirrors createMission's no-row guard).

export type MissionActionResult = { ok: boolean; errorKey?: string }

function revalidate(missionId: string) {
  revalidatePath('/mes-missions')
  revalidatePath(`/mes-missions/${missionId}`)
}

// Close an open mission (open → filled). Freelancers can no longer respond.
export async function closeMissionAction(missionId: string): Promise<MissionActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, errorKey: 'mission.error.not_authorized' }

  const { data, error } = await supabase
    .from('job_posts')
    .update({ status: 'filled' })
    .eq('id', missionId)
    .eq('consumer_id', user.id)
    .eq('status', 'open')
    .select('id')

  if (error) {
    console.error('[closeMissionAction] update error:', error)
    return { ok: false, errorKey: 'common.error_generic' }
  }
  if (!data || data.length === 0) return { ok: false, errorKey: 'common.error_generic' }

  revalidate(missionId)
  return { ok: true }
}

// Reopen a closed mission (filled → open) only if it has not passed the 30-day expiry. An
// expired post cannot accept responses anyway (the response trigger blocks them), so reopening
// it would be a dead end. Expiry is computed server-side from created_at — never trusted from
// the client.
export async function reopenMissionAction(missionId: string): Promise<MissionActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, errorKey: 'mission.error.not_authorized' }

  const { data: post, error: readErr } = await supabase
    .from('job_posts')
    .select('created_at')
    .eq('id', missionId)
    .eq('consumer_id', user.id)
    .maybeSingle()
  if (readErr) {
    console.error('[reopenMissionAction] read error:', readErr)
    return { ok: false, errorKey: 'common.error_generic' }
  }
  if (!post) return { ok: false, errorKey: 'common.error_generic' }

  const expiryMs = JOB_POST_EXPIRY_DAYS * 24 * 60 * 60 * 1000
  if (Date.now() - new Date(post.created_at as string).getTime() > expiryMs) {
    return { ok: false, errorKey: 'missions.detail.reopen_expired_error' }
  }

  const { data, error } = await supabase
    .from('job_posts')
    .update({ status: 'open' })
    .eq('id', missionId)
    .eq('consumer_id', user.id)
    .eq('status', 'filled')
    .select('id')

  if (error) {
    console.error('[reopenMissionAction] update error:', error)
    return { ok: false, errorKey: 'common.error_generic' }
  }
  if (!data || data.length === 0) return { ok: false, errorKey: 'common.error_generic' }

  revalidate(missionId)
  return { ok: true }
}

// Soft-delete (status → 'deleted'). No hard delete — preserves response rows / data integrity.
// The client shows the success toast and redirects to /mes-missions (a server redirect here
// would discard the toast).
export async function deleteMissionAction(missionId: string): Promise<MissionActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, errorKey: 'mission.error.not_authorized' }

  const { data, error } = await supabase
    .from('job_posts')
    .update({ status: 'deleted' })
    .eq('id', missionId)
    .eq('consumer_id', user.id)
    .select('id')

  if (error) {
    console.error('[deleteMissionAction] update error:', error)
    return { ok: false, errorKey: 'common.error_generic' }
  }
  if (!data || data.length === 0) return { ok: false, errorKey: 'common.error_generic' }

  revalidatePath('/mes-missions')
  return { ok: true }
}
