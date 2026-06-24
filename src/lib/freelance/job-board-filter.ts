// Pure, framework-free logic for the job board (/emplois): URL-param parsing and the in-app
// budget/skills filter + sort + pagination. Kept dependency-free (no React, no Supabase) so it is
// unit-tested directly (see job-board-filter.test.ts) — the same posture as marche-routing.ts and
// search-url.ts. The DB fetch and the category/city/posted-within filters (which PostgREST handles
// cleanly) live in job-board-data.ts; this module is the part that runs on the fetched rows.

export type JobBoardSort = 'newest' | 'highest_budget'

export type JobPostRow = {
  id: string
  title: string
  descriptionPreview: string | null
  budgetMin: number | null
  budgetMax: number | null
  categoryName: string | null
  city: string | null
  isRemote: boolean
  deadline: string | null
  skills: string[]
  createdAt: string
}

export type JobBoardParams = {
  page: number
  pageSize: number
  categories: string[] // category slugs
  minBudget: number | null
  maxBudget: number | null
  cities: string[] // governorate canonical values
  skills: string[] // skill strings
  postedWithinDays: number | null // 1 | 7 | 30 | null (all)
  sort: JobBoardSort
}

export function toNum(v: string | number | null | undefined): number | null {
  if (v == null || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

// COALESCE(budget_max, budget_min) — the value the "highest budget" sort ranks on.
export function budgetValue(p: JobPostRow): number {
  return p.budgetMax ?? p.budgetMin ?? 0
}

// Parse the /emplois URL search params into a typed, whitelisted query. Unknown sort/postedWithin
// values fall back to safe defaults; lists are comma-separated (matching buildSearchQuery's writer).
export function parseJobBoardParams(
  sp: Record<string, string | string[] | undefined>,
  pageSize: number,
): JobBoardParams {
  const get = (k: string): string | undefined => {
    const v = sp[k]
    return Array.isArray(v) ? v[0] : v
  }
  const list = (k: string): string[] => {
    const s = get(k)
    return s ? s.split(',').map((x) => x.trim()).filter(Boolean) : []
  }

  const pageRaw = Number(get('page'))
  const page = Number.isFinite(pageRaw) && pageRaw >= 1 ? Math.floor(pageRaw) : 1

  const sort: JobBoardSort = get('sort') === 'highest_budget' ? 'highest_budget' : 'newest'

  const pwRaw = Number(get('postedWithin'))
  const postedWithinDays = [1, 7, 30].includes(pwRaw) ? pwRaw : null

  return {
    page,
    pageSize,
    categories: list('categories'),
    minBudget: toNum(get('minBudget')),
    maxBudget: toNum(get('maxBudget')),
    cities: list('cities'),
    skills: list('skills'),
    postedWithinDays,
    sort,
  }
}

// Apply the in-app filters (budget overlap, skills ANY-match), sort, and page-slice. Returns the
// page slice plus the full matching `total` (for pagination). A post with no budget at all is
// excluded once any budget bound is set (can't confirm it's in range).
export function selectJobPosts(
  all: JobPostRow[],
  params: JobBoardParams,
): { items: JobPostRow[]; total: number } {
  let items = all

  if (params.minBudget != null) {
    const lo = params.minBudget
    items = items.filter((p) => {
      const effMax = p.budgetMax ?? p.budgetMin
      return effMax != null && effMax >= lo
    })
  }
  if (params.maxBudget != null) {
    const hi = params.maxBudget
    items = items.filter((p) => {
      const effMin = p.budgetMin ?? p.budgetMax
      return effMin != null && effMin <= hi
    })
  }

  if (params.skills.length > 0) {
    const want = new Set(params.skills.map((s) => s.toLowerCase()))
    items = items.filter((p) => p.skills.some((s) => want.has(s.toLowerCase())))
  }

  const total = items.length

  // Sort on a copy: newest (created_at DESC, ISO strings sort lexically) or highest budget.
  const sorted = [...items]
  if (params.sort === 'highest_budget') {
    sorted.sort((a, b) => budgetValue(b) - budgetValue(a))
  } else {
    sorted.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }

  const from = (params.page - 1) * params.pageSize
  return { items: sorted.slice(from, from + params.pageSize), total }
}
