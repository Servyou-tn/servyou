import { createClient } from '@/lib/supabase/server'
import { failQuery } from '@/lib/supabase/query-error'
import { getFreelancerCards, type FreelancerCardData } from '@/lib/marche/freelancer-cards'
import { ilikePattern, paginate, serviceCategoryOrClause, stripAccents, validCategorySlugs } from '@/lib/search/search-params'

// The « Freelances » lens of /marche/services (Figma 662:53894 / 663:55017): published freelancers, searched by name / headline / skills,
// filtered by sector, city and PRICE, newest first or by price. Page size 8 = the frame's 2-up × 4-row grid.
//
// PRICE is the freelancer's real service prices: a service counts when it is active, visible, in the chosen sector (if any) AND its
// `starting_price_tnd` is inside [prixMin, prixMax] — so the sector and the price describe the SAME service. A freelancer's price, for the sort
// and the range, is the LOWEST starting price among those matching services (« à partir de »); services without a price are ignored.
//
// WHICH FREELANCERS: those with at least one ACTIVE, NON-moderated service (the same visibility `getFreelancerCards` counts, so a card never
// says « 0 services »), who are `is_published = true` AND `admin_hidden_at IS NULL`. `is_published` is derived from `status = 'active'`
// alone — it does not see a service an admin hid — which is why the service set is the base and the profile flags are checked on top.
// RLS agrees and also hides a suspended freelancer from a visitor, but its policy lets the OWNER, a buyer and a seller through (and an
// admin sees everything), so the explicit filters keep a freelancer's own unpublished profile out of the grid. They do not catch a
// suspended freelancer seen by an admin or a past buyer: RLS is the only gate for that, as on /freelance/[id].
//
// SHAPE: base set = freelancer ids of visible active services (optionally within a sector) → their profiles, fetched by id in short chunks
// → city / name / skill filters and the sort in memory → `paginate` → `getFreelancerCards` decorates one page. A name lives in
// `public_profiles` (a view — no embed from freelancer_profiles), so a name search fetches the candidates' names; no query fetches none. Every lookup pages past PostgREST's 1000-row response limit.
//
// Every failure here throws (never « aucun freelance »): the page settle()s it into an inline ErrorState.

export const FREELANCER_PER_PAGE = 8

export type FreelancerSort = 'recent' | 'prix_asc' | 'prix_desc'

/** `?tri=` for the lens — the services lens's three sorts. Anything else (including `pertinence`) is the default, newest first. */
export function parseFreelancerSort(raw: string | string[] | undefined): FreelancerSort {
  const v = Array.isArray(raw) ? raw[0] : raw
  return v === 'prix_asc' || v === 'prix_desc' ? v : 'recent'
}

export type FreelancerSearchParams = {
  q: string
  categorie: string[]
  ville: string | null
  prixMin: number | null
  prixMax: number | null
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

export type Candidate = { id: string; profile_id: string; headline: string | null; city: string | null; created_at: string }

const norm = (s: string) => stripAccents(s.toLowerCase())

/** Accent- and case-insensitive: does every word of the term appear in the name, the headline or one skill? */
export function matchesFreelancerQuery(term: string, hay: { name: string; headline: string | null; skills: readonly string[] }): boolean {
  const words = norm(term).split(/\s+/).filter(Boolean)
  if (words.length === 0) return true
  const text = norm([hay.name, hay.headline ?? '', ...hay.skills].join(' \n '))
  return words.every((w) => text.includes(w))
}

/**
 * Newest first (id as the stable tiebreak), or by the freelancer's lowest starting price, ascending / descending — a freelancer with no price
 * goes last either way. Ties fall back to newest first. Does not mutate.
 */
export function sortCandidates(rows: readonly Candidate[], tri: FreelancerSort, priceOf: (id: string) => number | null): Candidate[] {
  const newest = (a: Candidate, b: Candidate) => b.created_at.localeCompare(a.created_at) || a.id.localeCompare(b.id)
  const out = [...rows]
  if (tri === 'recent') return out.sort(newest)
  const dir = tri === 'prix_asc' ? 1 : -1
  return out.sort((a, b) => {
    const pa = priceOf(a.id)
    const pb = priceOf(b.id)
    if (pa === null && pb === null) return newest(a, b)
    if (pa === null) return 1
    if (pb === null) return -1
    return (pa - pb) * dir || newest(a, b)
  })
}

/** `.in()` filters travel in the URL: keep each call's id list short. */
export function chunk<T>(items: readonly T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size))
  return out
}
const IN_CHUNK = 80

/** PostgREST answers at most 1000 rows with no error: read page after page until a short page (bounded, so a bug cannot loop forever). */
export const PAGE_ROWS = 1000
const MAX_PAGES = 20
export async function pageAll<T>(
  read: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: Parameters<typeof failQuery>[1] | null }>,
  label: string,
): Promise<T[]> {
  const out: T[] = []
  for (let page = 0; page < MAX_PAGES; page++) {
    const { data, error } = await read(page * PAGE_ROWS, page * PAGE_ROWS + PAGE_ROWS - 1)
    if (error) failQuery(label, error)
    const rows = data ?? []
    out.push(...rows)
    if (rows.length < PAGE_ROWS) return out
  }
  return out
}

export async function searchFreelancers(
  params: FreelancerSearchParams,
  perPage: number = FREELANCER_PER_PAGE,
): Promise<FreelancerSearchResult> {
  const supabase = await createClient()
  const empty: FreelancerSearchResult = { freelancers: [], totalCount: 0, page: 1, totalPages: 1, perPage }

  // Sector → only the services filed under it (category or sub-category). A slug that resolves to no category is « filter given, matched
  // nothing » — never « no filter ».
  let orClause: string | null = null
  if (params.categorie.length > 0) {
    const slugs = validCategorySlugs(params.categorie)
    if (slugs.length === 0) return empty
    const { data: cats, error: catErr } = await supabase.from('categories').select('id').in('slug', slugs)
    if (catErr) failQuery('search-freelancers categories', catErr)
    orClause = serviceCategoryOrClause((cats ?? []).map((c) => c.id))
    if (!orClause) return empty
  }

  // The base set: freelancers with a visible active service (within the sector, when one is chosen).
  const services = await pageAll<{ freelancer_profile_id: string; starting_price_tnd: number | string | null; tags: string[] | null }>(
    (from, to) => {
      let q = supabase
        .from('service_listings')
        .select('freelancer_profile_id, starting_price_tnd, tags')
        .eq('status', 'active')
        .is('admin_hidden_at', null)
      if (orClause) q = q.or(orClause)
      if (params.prixMin != null) q = q.gte('starting_price_tnd', params.prixMin)
      if (params.prixMax != null) q = q.lte('starting_price_tnd', params.prixMax)
      return q.range(from, to)
    },
    'search-freelancers services',
  )
  const minPrice = new Map<string, number>()
  const tagsBy = new Map<string, string[]>()
  for (const s of services) {
    tagsBy.set(s.freelancer_profile_id, [...(tagsBy.get(s.freelancer_profile_id) ?? []), ...(s.tags ?? [])])
    if (s.starting_price_tnd == null) continue
    const price = Number(s.starting_price_tnd)
    const known = minPrice.get(s.freelancer_profile_id)
    if (Number.isFinite(price) && (known === undefined || price < known)) minPrice.set(s.freelancer_profile_id, price)
  }
  const baseIds = [...new Set(services.map((s) => s.freelancer_profile_id))]
  if (baseIds.length === 0) return empty

  // Their profiles — published and not moderated, by id in short chunks.
  const byId = new Map<string, Candidate>()
  const profileChunks = await Promise.all(
    chunk(baseIds, IN_CHUNK).map((ids) =>
      pageAll<Candidate>(
        (from, to) =>
          supabase
            .from('freelancer_profiles')
            .select('id, profile_id, headline, city, created_at')
            .eq('is_published', true)
            .is('admin_hidden_at', null)
            .in('id', ids)
            .range(from, to),
        'search-freelancers profiles',
      ),
    ),
  )
  for (const rows of profileChunks) for (const r of rows) byId.set(r.id, r)
  // City: the option list is trimmed free text, so compare trimmed — a stray space in the column must not make a listed city return nothing.
  let candidates = [...byId.values()].filter((c) => !params.ville || (c.city ?? '').trim() === params.ville)

  const term = params.q.trim() && ilikePattern(params.q) ? params.q.trim() : ''
  const needNames = term !== ''
  const names = new Map<string, string>()
  if (needNames && candidates.length > 0) {
    const results = await Promise.all(
      chunk(candidates.map((c) => c.profile_id), IN_CHUNK).map((ids) =>
        pageAll<{ id: string | null; full_name: string | null }>(
          (from, to) => supabase.from('public_profiles').select('id, full_name').in('id', ids).range(from, to),
          'search-freelancers names',
        ),
      ),
    )
    for (const rows of results) for (const p of rows) if (p.id) names.set(p.id, p.full_name ?? '')
  }

  if (term !== '' && candidates.length > 0) {
    const skillsBy = new Map<string, string[]>()
    const results = await Promise.all(
      chunk(candidates.map((c) => c.id), IN_CHUNK).map((ids) =>
        pageAll<{ freelancer_profile_id: string; skill: string }>(
          (from, to) => supabase.from('freelancer_skills').select('freelancer_profile_id, skill').in('freelancer_profile_id', ids).range(from, to),
          'search-freelancers skills',
        ),
      ),
    )
    for (const rows of results) for (const s of rows) skillsBy.set(s.freelancer_profile_id, [...(skillsBy.get(s.freelancer_profile_id) ?? []), s.skill])
    candidates = candidates.filter((c) =>
      matchesFreelancerQuery(term, {
        name: names.get(c.profile_id) ?? '',
        headline: c.headline,
        // the profile's skills AND the tags of their matching services — the chips the card shows
        skills: [...(skillsBy.get(c.id) ?? []), ...(tagsBy.get(c.id) ?? [])],
      }),
    )
  }

  const sorted = sortCandidates(candidates, params.tri, (id) => minPrice.get(id) ?? null)
  const totalCount = sorted.length
  if (totalCount === 0) return empty
  const { totalPages, safePage, start, end } = paginate(totalCount, params.page, perPage)
  const freelancers = await getFreelancerCards(sorted.slice(start, end).map((c) => c.id))
  return { freelancers, totalCount, page: safePage, totalPages, perPage }
}
