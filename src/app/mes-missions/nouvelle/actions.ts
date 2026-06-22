'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { validateJobPost, type JobPostInput } from '@/lib/marche/job-post-validation'

// On success this redirects to /mes-missions (never returns); only failures return.
export type CreateMissionResult = { ok: false; errorKey: string }

// Create a job post (mission). Validation runs BEFORE createClient() so a malformed
// request never touches the DB. RLS re-validates (consumer_id = auth.uid() on INSERT);
// an RLS-blocked insert returns no row and is surfaced as a generic error.
export async function createMission(input: JobPostInput): Promise<CreateMissionResult> {
  const v = validateJobPost(input)
  if (!v.ok) return { ok: false, errorKey: v.errorKey }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, errorKey: 'mission.error.not_authorized' }

  const { data, error } = await supabase
    .from('job_posts')
    .insert({
      consumer_id: user.id,
      title: v.value.title,
      description: v.value.description,
      category_id: v.value.category_id,
      city: v.value.city,
      is_remote: v.value.is_remote,
      budget_min: v.value.budget_min,
      budget_max: v.value.budget_max,
      deadline: v.value.deadline,
      status: 'open',
    })
    .select('id')

  if (error) {
    console.error('[createMission] insert error:', error)
    return { ok: false, errorKey: 'common.error_generic' }
  }
  if (!data || data.length === 0) {
    // RLS-blocked insert returns no row.
    return { ok: false, errorKey: 'common.error_generic' }
  }

  revalidatePath('/mes-missions')
  redirect('/mes-missions')
}
