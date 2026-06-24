import { createClient } from '@/lib/supabase/server'
import type { FilterCategory } from '@/components/recherche/SearchFilters'
import {
  parseJobBoardParams,
  selectJobPosts,
  toNum,
  type JobBoardParams,
  type JobBoardSort,
  type JobPostRow,
} from './job-board-filter'

// Server reads for the public job board (/emplois). Freelancers (and any visitor) browse open
// project posts here. Everything is RLS-safe for an anonymous session:
//   • job_posts        SELECT = (status = 'open' OR own)   → open posts readable by everyone
//   • job_post_skills  SELECT = true                       → skills readable by everyone
//   • job_responses    SELECT = participant-only           → NOT readable by a browser, so the
//     per-post response count is DEFERRED in v1 (would render 0/10 for every viewer). Revisit
//     with a SECURITY DEFINER count RPC in its own migration PR. See the PR body.
//
// Schema reality (verified live; differs from a first-glance assumption):
//   • status values are open/filled/expired/deleted — the active filter is status='open'
//     (expired posts already carry status='expired'); there is no expires_at column.
//   • budget is a range (budget_min, budget_max), both nullable.
//   • category is category_id → categories (embedded for its name).
//   • skills live in the job_post_skills child table (free-text `skill`), not an array.
//   • created_at is the "posted at" timestamp.
//
// Small-data posture (matches lib/marche/filter-categories.ts): the in-app budget/skills filters,
// the COALESCE(budget_max, budget_min) sort, and pagination (in job-board-filter.ts) run on the
// fetched open-post set rather than via PostgREST, which cannot ORDER BY a COALESCE expression.
// Open posts are a small set today; revisit server-side pagination if open posts ever approach
// PostgREST's 1000-row cap.

// Re-export the pure types + param parser so consumers import everything job-board from one place.
export { parseJobBoardParams }
export type { JobBoardParams, JobBoardSort, JobPostRow }

// PostgREST returns a to-one embed as a single object, but some paths surface it as a
// one-element array — normalize to a single record (or null).
function one<T>(embed: T | T[] | null | undefined): T | null {
  if (Array.isArray(embed)) return embed[0] ?? null
  return embed ?? null
}

const DESCRIPTION_PREVIEW_MAX = 200

// All platform categories for the filter list (ordered by French name). The brief calls for the
// full category list (not usage-scoped), so a category with no open post still appears and simply
// returns no results when picked.
export async function getJobFilterCategories(): Promise<FilterCategory[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('categories')
    .select('slug, name_fr, name_ar')
    .order('name_fr')
  if (error) {
    console.error('[job-board-data] categories fetch error:', error)
    return []
  }
  return (data ?? []) as FilterCategory[]
}

// The distinct skills present on the current OPEN posts — the option set for the skills filter.
// Two small queries (open post ids, then their skills) keep it RLS-safe and embed-free.
export async function getJobSkillOptions(): Promise<string[]> {
  const supabase = await createClient()
  const { data: posts, error: postsError } = await supabase
    .from('job_posts')
    .select('id')
    .eq('status', 'open')
    .is('admin_hidden_at', null)
  if (postsError) {
    console.error('[job-board-data] open post ids error:', postsError)
    return []
  }
  const ids = (posts ?? []).map((p) => (p as { id: string }).id)
  if (ids.length === 0) return []

  const { data: skillRows, error: skillsError } = await supabase
    .from('job_post_skills')
    .select('skill')
    .in('job_post_id', ids)
  if (skillsError) {
    console.error('[job-board-data] skill options error:', skillsError)
    return []
  }
  return [...new Set((skillRows ?? []).map((r) => (r as { skill: string }).skill))].sort((a, b) =>
    a.localeCompare(b),
  )
}

type RawJobPost = {
  id: string
  title: string
  description: string | null
  budget_min: string | number | null
  budget_max: string | number | null
  city: string | null
  is_remote: boolean
  deadline: string | null
  created_at: string
  categories:
    | { name_fr: string; name_ar: string; slug: string }
    | { name_fr: string; name_ar: string; slug: string }[]
    | null
}

// The open job posts matching the filters, sorted and paginated. Returns the page slice plus the
// full matching `total` (used for pagination) — so a separate count query is intentionally NOT
// needed in this small-data model. The DB query applies the filters PostgREST handles cleanly
// (category / city / posted-within); the budget/skills filter + sort + slice run in-app via
// selectJobPosts (PostgREST can't ORDER BY a COALESCE expression).
export async function getActiveJobPosts(
  params: JobBoardParams,
): Promise<{ items: JobPostRow[]; total: number }> {
  const supabase = await createClient()

  // Resolve category slugs → ids (the URL carries slugs; the column stores ids).
  let categoryIds: string[] | null = null
  if (params.categories.length > 0) {
    const { data: cats, error: catError } = await supabase
      .from('categories')
      .select('id, slug')
      .in('slug', params.categories)
    if (catError) {
      console.error('[job-board-data] category slug resolve error:', catError)
      return { items: [], total: 0 }
    }
    categoryIds = (cats ?? []).map((c) => (c as { id: string }).id)
    // A category filter that resolves to nothing → no posts can match.
    if (categoryIds.length === 0) return { items: [], total: 0 }
  }

  // Server-side filters PostgREST handles cleanly; the category name comes via the to-one embed
  // (same FK-embed pattern as orders → service_listings in the dashboard).
  let query = supabase
    .from('job_posts')
    .select(
      'id, title, description, budget_min, budget_max, city, is_remote, deadline, created_at, categories ( name_fr, name_ar, slug )',
    )
    .eq('status', 'open')
    .is('admin_hidden_at', null)

  if (categoryIds) query = query.in('category_id', categoryIds)
  if (params.cities.length > 0) query = query.in('city', params.cities)
  if (params.postedWithinDays != null) {
    const cutoff = new Date(Date.now() - params.postedWithinDays * 86_400_000).toISOString()
    query = query.gte('created_at', cutoff)
  }

  const { data, error } = await query
  if (error) {
    console.error('[job-board-data] active posts error:', error)
    return { items: [], total: 0 }
  }

  const rows = (data ?? []) as unknown as RawJobPost[]

  // Skills for the fetched posts — a separate RLS-safe lookup (job_post_skills is public-SELECT),
  // mapped back onto each post. Avoids a to-many embed on the critical fetch path.
  const skillsByPost = new Map<string, string[]>()
  const ids = rows.map((r) => r.id)
  if (ids.length > 0) {
    const { data: skillRows, error: skillsError } = await supabase
      .from('job_post_skills')
      .select('job_post_id, skill')
      .in('job_post_id', ids)
    if (skillsError) console.error('[job-board-data] post skills error:', skillsError)
    for (const r of (skillRows ?? []) as { job_post_id: string; skill: string }[]) {
      const arr = skillsByPost.get(r.job_post_id)
      if (arr) arr.push(r.skill)
      else skillsByPost.set(r.job_post_id, [r.skill])
    }
  }

  const mapped: JobPostRow[] = rows.map((r) => {
    const description = r.description ?? null
    return {
      id: r.id,
      title: r.title,
      descriptionPreview:
        description && description.length > DESCRIPTION_PREVIEW_MAX
          ? `${description.slice(0, DESCRIPTION_PREVIEW_MAX).trimEnd()}…`
          : description,
      budgetMin: toNum(r.budget_min),
      budgetMax: toNum(r.budget_max),
      categoryName: one(r.categories)?.name_fr ?? null,
      city: r.city,
      isRemote: r.is_remote,
      deadline: r.deadline,
      skills: skillsByPost.get(r.id) ?? [],
      createdAt: r.created_at,
    }
  })

  // Budget/skills filter + sort + page slice (pure, unit-tested in job-board-filter.test.ts).
  return selectJobPosts(mapped, params)
}
