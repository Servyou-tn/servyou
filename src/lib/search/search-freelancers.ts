import { createClient } from '@/lib/supabase/server'
import { failQuery } from '@/lib/supabase/query-error'
import { getFreelancerCards, type FreelancerCardData } from '@/lib/marche/freelancer-cards'
import { ilikePattern, paginate, serviceCategoryOrClause, stripAccents, validCategorySlugs } from '@/lib/search/search-params'

// The « Freelances » lens of /marche/services (Figma 662:53894 / 663:55017): published freelancers, searched by name / headline / skills,
// filtered by sector (the sector of their ACTIVE services) and city, newest first or A→Z. Page size 8 = the frame's 2-up × 4-row grid.
//
// WHICH FREELANCERS: `is_published = true` (derived: at least one active service) AND `admin_hidden_at IS NULL`, both stated explicitly. RLS
// agrees (and also hides a suspended freelancer), but its policy additionally lets the OWNER, a buyer and a seller through — so a freelancer
// browsing the marketplace would otherwise see their own unpublished profile in the grid. This lens shows only what a stranger sees.
//
// SHAPE: the candidate profiles (capped, the same pre-launch small-data posture as searchMarketplace) → name / skill / sector filters and the
// sort in JS → `paginate` → `getFreelancerCards` decorates one page. A name lives in `public_profiles` (a view — no embed from
// freelancer_profiles), so a name search or an A→Z sort fetches the candidates' names; the default (newest first, no query) fetches none.
//
// The MAIN query (the candidate profiles) throws on failure — never « aucun freelance ». The name / skill / sector lookups are what the
// filters stand on, so they throw too: a failed lookup must not read as « nothing matches ».

export const FREELANCER_PER_PAGE = 8
/** Pre-launch fetch cap on published profiles; revisit (DB-side search + range pagination) when the catalogue outgrows it. */
export const FREELANCER_FETCH_CAP = 500

export type FreelancerSort = 'recent' | 'nom'

/** `?tri=` for the lens. Anything but `nom` (including the services lens's `prix_*`) is the default, newest first. */
export function parseFreelancerSort(raw: string | string[] | undefined): FreelancerSort {
  const v = Array.isArray(raw) ? raw[0] : raw
  return v === 'nom' ? 'nom' : 'recent'
}

export type FreelancerSearchParams = {
  q: string
  categorie: string[]
  ville: string | null
  tri: FreelancerSort
  page: number
}

export type FreelancerSearchResult = {
  freelancers: FreelancerCardData[]
  totalCount: number
  page: number
  totalPages: number
  perPage: number
}

export type Candidate = { id: string; profile_id: string; headline: string | null; created_at: string }

const norm = (s: string) => stripAccents(s.toLowerCase())

/** Accent- and case-insensitive: does every word of the term appear in the name, the headline or one skill? */
export function matchesFreelancerQuery(term: string, hay: { name: string; headline: string | null; skills: readonly string[] }): boolean {
  const words = norm(term).split(/\s+/).filter(Boolean)
  if (words.length === 0) return true
  const text = norm([hay.name, hay.headline ?? '', ...hay.skills].join(' \n '))
  return words.every((w) => text.includes(w))
}

/** Newest first (id as the stable tiebreak), or A→Z by name (French collation, then id). Does not mutate. */
export function sortCandidates(rows: readonly Candidate[], tri: FreelancerSort, nameOf: (profileId: string) => string): Candidate[] {
  const out = [...rows]
  if (tri === 'nom') {
    return out.sort((a, b) => nameOf(a.profile_id).localeCompare(nameOf(b.profile_id), 'fr') || a.id.localeCompare(b.id))
  }
  return out.sort((a, b) => b.created_at.localeCompare(a.created_at) || a.id.localeCompare(b.id))
}

/** `.in()` filters travel in the URL: keep each call's id list short. */
export function chunk<T>(items: readonly T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size))
  return out
}
const IN_CHUNK = 80

export async function searchFreelancers(
  params: FreelancerSearchParams,
  perPage: number = FREELANCER_PER_PAGE,
): Promise<FreelancerSearchResult> {
  const supabase = await createClient()
  const empty: FreelancerSearchResult = { freelancers: [], totalCount: 0, page: 1, totalPages: 1, perPage }

  // Sector → the freelancers that have an ACTIVE, visible service filed under it (category or sub-category). A slug that resolves to no
  // category, or a sector nobody serves, is « filter given, matched nothing » — never « no filter ».
  let sectorFreelancerIds: Set<string> | null = null
  const slugs = validCategorySlugs(params.categorie)
  if (params.categorie.length > 0) {
    if (slugs.length === 0) return empty
    const { data: cats, error: catErr } = await supabase.from('categories').select('id').in('slug', slugs)
    if (catErr) failQuery('search-freelancers categories', catErr)
    const orClause = serviceCategoryOrClause((cats ?? []).map((c) => c.id))
    if (!orClause) return empty
    const { data: svc, error: svcErr } = await supabase
      .from('service_listings')
      .select('freelancer_profile_id')
      .eq('status', 'active')
      .is('admin_hidden_at', null)
      .or(orClause)
    if (svcErr) failQuery('search-freelancers sector services', svcErr)
    sectorFreelancerIds = new Set((svc ?? []).map((r) => r.freelancer_profile_id))
    if (sectorFreelancerIds.size === 0) return empty
  }

  let query = supabase
    .from('freelancer_profiles')
    .select('id, profile_id, headline, created_at')
    .eq('is_published', true)
    .is('admin_hidden_at', null)
  if (params.ville) query = query.eq('city', params.ville)
  const { data: rows, error } = await query.order('created_at', { ascending: false }).order('id', { ascending: true }).limit(FREELANCER_FETCH_CAP)
  if (error) failQuery('search-freelancers profiles', error)
  let candidates: Candidate[] = (rows ?? []).filter((r) => sectorFreelancerIds === null || sectorFreelancerIds.has(r.id))

  const term = params.q.trim() && ilikePattern(params.q) ? params.q.trim() : ''
  const needNames = term !== '' || params.tri === 'nom'
  const names = new Map<string, string>()
  if (needNames && candidates.length > 0) {
    const results = await Promise.all(
      chunk(candidates.map((c) => c.profile_id), IN_CHUNK).map((ids) => supabase.from('public_profiles').select('id, full_name').in('id', ids)),
    )
    for (const res of results) {
      if (res.error) failQuery('search-freelancers names', res.error)
      for (const p of res.data ?? []) if (p.id) names.set(p.id, p.full_name ?? '')
    }
  }

  if (term !== '' && candidates.length > 0) {
    const skillsBy = new Map<string, string[]>()
    const results = await Promise.all(
      chunk(candidates.map((c) => c.id), IN_CHUNK).map((ids) => supabase.from('freelancer_skills').select('freelancer_profile_id, skill').in('freelancer_profile_id', ids)),
    )
    for (const res of results) {
      if (res.error) failQuery('search-freelancers skills', res.error)
      for (const s of res.data ?? []) skillsBy.set(s.freelancer_profile_id, [...(skillsBy.get(s.freelancer_profile_id) ?? []), s.skill])
    }
    candidates = candidates.filter((c) =>
      matchesFreelancerQuery(term, { name: names.get(c.profile_id) ?? '', headline: c.headline, skills: skillsBy.get(c.id) ?? [] }),
    )
  }

  const sorted = sortCandidates(candidates, params.tri, (pid) => names.get(pid) ?? '')
  const totalCount = sorted.length
  if (totalCount === 0) return empty
  const { totalPages, safePage, start, end } = paginate(totalCount, params.page, perPage)
  const freelancers = await getFreelancerCards(sorted.slice(start, end).map((c) => c.id))
  return { freelancers, totalCount, page: safePage, totalPages, perPage }
}
