'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { validateJobPost, type JobPostInput } from '@/lib/marche/job-post-validation'

// On success this redirects to /mes-annonces (never returns); only failures return.
export type CreateAnnonceResult = { ok: false; errorKey: string }

// Create a job post (annonce). Validation runs BEFORE createClient() so a malformed
// request never touches the DB. RLS re-validates (consumer_id = auth.uid() on INSERT);
// an RLS-blocked insert returns no row and is surfaced as a generic error.
export async function createAnnonce(input: JobPostInput): Promise<CreateAnnonceResult> {
  const v = validateJobPost(input)
  if (!v.ok) return { ok: false, errorKey: v.errorKey }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, errorKey: 'annonce.error.not_authorized' }

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
    console.error('[createAnnonce] insert error:', error.message, error.code, error.details)
    return { ok: false, errorKey: 'common.error_generic' }
  }
  if (!data || data.length === 0) {
    // RLS-blocked insert returns no row.
    return { ok: false, errorKey: 'common.error_generic' }
  }

  const jobPostId = data[0].id

  if (v.value.skills.length > 0) {
    const { error: skillsError } = await supabase
      .from('job_post_skills')
      .insert(v.value.skills.map((skill) => ({ job_post_id: jobPostId, skill })))
    if (skillsError) {
      // NON-FATAL, DELIBERATELY. Unlike createProductAction's compensating delete on a failed
      // product_images insert — where a gallery-less product is a BROKEN state a buyer shouldn't
      // see — a skills-less job post is a completely ordinary, valid state (§6 RULING: optional,
      // no minimum). Rolling back the post over the loss of an optional tag list would destroy a
      // real, useful annonce and hand the consumer a false "failed" error while re-submitting
      // would just create a duplicate. So: log it, keep the post, redirect normally.
      console.error(
        '[createAnnonce] skills insert failed (post kept, redirecting anyway):',
        skillsError.message,
        skillsError.code,
        skillsError.details,
      )
    }
  }

  revalidatePath('/mes-annonces')
  redirect('/mes-annonces')
}
