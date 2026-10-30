import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { failQuery, isNoRowLike } from '@/lib/supabase/query-error'
import { resolveAnnonceStatus, type AnnonceDisplayStatus } from '@/lib/marche/annonce-status'
import type { JobPostInput } from '@/lib/marche/job-post-validation'

// What /mes-annonces/[id]/modifier needs: the author's own post as the form's starting values, plus the facts annonceEditBlock decides on.
// Author-only like getAnnonceDetail (the WHERE clause AND RLS; a non-owner, a missing id, a junk id and a soft-deleted post are all the same
// « not found »). A failed read throws (failQuery) — a form page lets the root error.tsx show it, never an empty form.

export type AnnonceForEdit = {
  id: string
  form: JobPostInput
  /** Stored amounts, kept apart from the form: an old post can carry a min–max range the single field cannot show. */
  budgetMin: number | null
  budgetMax: number | null
  displayStatus: AnnonceDisplayStatus
  responseCount: number
  adminHiddenAt: string | null
}

type Row = {
  id: string
  title: string
  description: string
  category_id: string | null
  city: string | null
  is_remote: boolean | null
  budget_min: number | string | null
  budget_max: number | string | null
  deadline: string | null
  status: 'open' | 'filled' | 'expired' | 'deleted'
  created_at: string
  response_count: number
  admin_hidden_at: string | null
  job_post_skills: { skill: string }[] | null
}

const num = (v: number | string | null): number | null => (v == null ? null : Number(v))

export const getAnnonceForEdit = cache(async (annonceId: string, userId: string): Promise<AnnonceForEdit | null> => {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('job_posts')
    .select(
      `id, title, description, category_id, city, is_remote, budget_min, budget_max, deadline, status, created_at, response_count,
       admin_hidden_at, job_post_skills ( skill )`,
    )
    .eq('id', annonceId)
    .eq('consumer_id', userId)
    .maybeSingle()
  if (error && !isNoRowLike(error)) failQuery('annonce-edit', error)
  if (!data) return null

  const row = data as unknown as Row
  if (row.status === 'deleted') return null

  const budgetMax = num(row.budget_max)
  return {
    id: row.id,
    form: {
      title: row.title,
      description: row.description,
      categoryId: row.category_id ?? '',
      city: row.city ?? '',
      // The single « Budget approximatif » shows the stored max (an old range keeps its min underneath).
      budget: budgetMax == null ? '' : String(budgetMax),
      isRemote: Boolean(row.is_remote),
      deadline: row.deadline ?? '',
      skills: (row.job_post_skills ?? []).map((s) => s.skill),
    },
    budgetMin: num(row.budget_min),
    budgetMax,
    displayStatus: resolveAnnonceStatus(row.status, row.created_at),
    responseCount: row.response_count,
    adminHiddenAt: row.admin_hidden_at ?? null,
  }
})
