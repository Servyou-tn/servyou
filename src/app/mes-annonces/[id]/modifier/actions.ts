'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { isNoRowLike, reportQueryError } from '@/lib/supabase/query-error'
import { validateJobPost, type JobPostInput } from '@/lib/marche/job-post-validation'
import { jobPostCapKey } from '@/lib/marche/cap-refusal'
import { resolveAnnonceStatus } from '@/lib/marche/annonce-status'
import { annonceEditBlock, ANNONCE_EDIT_BLOCK_KEY } from '@/lib/marche/annonce-edit-rules'
import { skillKey } from '@/lib/marche/skills-match'

export type UpdateAnnonceResult = { ok: true } | { ok: false; errorKey: string }

const idSchema = z.string().uuid()

// TS types are erased at runtime: a hand-crafted call must not reach `.trim()` with a non-string and answer 500.
const inputSchema = z.object({
  title: z.string(),
  description: z.string(),
  categoryId: z.string(),
  city: z.string(),
  budget: z.string(),
  isRemote: z.boolean(),
  deadline: z.string(),
  skills: z.array(z.string()).max(50),
})

type DbError = { message: string; code?: string | null; details?: string | null; hint?: string | null }

// 42501 + hint `content_locked`: a proposal arrived between the form loading and this save (enforce_job_post_writes / the skills lock).
const isContentLocked = (e: Pick<DbError, 'code' | 'hint'>) => e.code === '42501' && e.hint === 'content_locked'

type StoredPost = {
  title: string
  description: string
  deadline: string | null
  budget_min: number | string | null
  budget_max: number | string | null
  status: 'open' | 'filled' | 'expired' | 'deleted'
  created_at: string
  response_count: number
  admin_hidden_at: string | null
  job_post_skills: { id: string; skill: string }[] | null
}

// Edit an annonce's content (F2 form reused). Owner-only three times over — the WHERE clause, RLS (consumer_id = auth.uid()) and the DB's own
// guards. Validation runs before any write; `validateJobPost(input, now, original)` gets the STORED row as `original` (never client input), so
// an old over-long title / description, a deadline that has since passed and an old min–max budget do not block a save that leaves them alone.
// The post and its skills are separate tables, so this is NOT atomic: the post row is written first (the content lock can refuse it), then the
// skills as a diff (insert the new, then delete the dropped) — a failed skills write is reported and a retry converges, it never loses the post.
export async function updateAnnonce(annonceId: string, input: JobPostInput): Promise<UpdateAnnonceResult> {
  if (!idSchema.safeParse(annonceId).success || !inputSchema.safeParse(input).success) return { ok: false, errorKey: 'common.error_generic' }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, errorKey: 'annonce.error.not_authorized' }

  const { data: post, error: readErr } = await supabase
    .from('job_posts')
    .select(
      'title, description, deadline, budget_min, budget_max, status, created_at, response_count, admin_hidden_at, job_post_skills ( id, skill )',
    )
    .eq('id', annonceId)
    .eq('consumer_id', user.id)
    .maybeSingle()
  if (readErr) {
    if (!isNoRowLike(readErr)) reportQueryError('updateAnnonce read', readErr)
    return { ok: false, errorKey: 'common.error_generic' }
  }
  if (!post) return { ok: false, errorKey: 'common.error_generic' }

  const stored = post as unknown as StoredPost
  if (stored.status === 'deleted') return { ok: false, errorKey: 'common.error_generic' }

  const block = annonceEditBlock({
    displayStatus: resolveAnnonceStatus(stored.status, stored.created_at),
    responseCount: stored.response_count,
    adminHiddenAt: stored.admin_hidden_at,
  })
  if (block) return { ok: false, errorKey: ANNONCE_EDIT_BLOCK_KEY[block] }

  const v = validateJobPost(input, new Date(), {
    title: stored.title,
    description: stored.description,
    deadline: stored.deadline,
    budgetMin: stored.budget_min == null ? null : Number(stored.budget_min),
    budgetMax: stored.budget_max == null ? null : Number(stored.budget_max),
  })
  if (!v.ok) return { ok: false, errorKey: v.errorKey }

  const { data: updated, error: updateErr } = await supabase
    .from('job_posts')
    .update({
      title: v.value.title,
      description: v.value.description,
      category_id: v.value.category_id,
      city: v.value.city,
      is_remote: v.value.is_remote,
      budget_min: v.value.budget_min,
      budget_max: v.value.budget_max,
      deadline: v.value.deadline,
    })
    .eq('id', annonceId)
    .eq('consumer_id', user.id)
    .eq('status', 'open')
    .select('id')

  if (updateErr) {
    if (isContentLocked(updateErr)) return { ok: false, errorKey: 'annonce.error.content_locked' }
    const cap = jobPostCapKey(updateErr)
    if (cap) return { ok: false, errorKey: cap }
    console.error('[updateAnnonce] update error:', updateErr.message, updateErr.code, updateErr.details)
    return { ok: false, errorKey: 'common.error_generic' }
  }
  // Zero rows: not the owner, no longer open, or a concurrent change — never a false success.
  if (!updated || updated.length === 0) return { ok: false, errorKey: 'common.error_generic' }

  // Skills as a diff, compared accent- and case-insensitively (« Figma » and « figma » are one skill; the stored spelling wins).
  const current = stored.job_post_skills ?? []
  const currentKeys = new Set(current.map((s) => skillKey(s.skill)))
  const nextKeys = new Set(v.value.skills.map(skillKey))
  const toAdd = v.value.skills.filter((s) => !currentKeys.has(skillKey(s)))
  // Removed by row id, not by text: a skill with a quote or a comma in it would need escaping in a text filter.
  const toRemove = current.filter((s) => !nextKeys.has(skillKey(s.skill))).map((s) => s.id)

  if (toAdd.length > 0) {
    const { error } = await supabase.from('job_post_skills').insert(toAdd.map((skill) => ({ job_post_id: annonceId, skill })))
    if (error) return skillsFailure('insert', error)
  }
  if (toRemove.length > 0) {
    const { error } = await supabase.from('job_post_skills').delete().eq('job_post_id', annonceId).in('id', toRemove)
    if (error) return skillsFailure('delete', error)
  }

  revalidatePath('/mes-annonces')
  revalidatePath(`/mes-annonces/${annonceId}`)
  return { ok: true }
}

// The post row is ALREADY saved when this runs (a proposal arriving in between, or any other failure), so the answer says « enregistré, mais pas
// les compétences » rather than a generic error or « content locked » that would read as if nothing had been saved. A retry converges.
function skillsFailure(step: 'insert' | 'delete', error: DbError): UpdateAnnonceResult {
  console.error(`[updateAnnonce] skills ${step} failed (post saved):`, error.message, error.code, error.details)
  return { ok: false, errorKey: 'annonce.error.skills_partial' }
}
