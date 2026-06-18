// Pure, dependency-free search helpers: URL parsing, ranking, sort comparison, and page
// math. Kept separate from search-marketplace.ts (which imports the Supabase server
// client) so these can be unit-tested in a plain Node env without the request-context
// module graph. See search-params.test.ts.

export type SearchType = 'product' | 'service'
export type SearchSort = 'pertinence' | 'recent' | 'prix_asc' | 'prix_desc'

export const SEARCH_SORTS: readonly SearchSort[] = ['pertinence', 'recent', 'prix_asc', 'prix_desc']

// Page size for the results grid (brief default).
export const PER_PAGE = 20

export type SearchParams = {
  q: string
  type: SearchType
  categorie: string[] // category slugs
  ville: string[] // canonical governorate values (profiles.city / shops.city)
  prixMin: number | null
  prixMax: number | null
  tri: SearchSort
  page: number
}

function firstParam(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v
}

// Accept both repeated params (?ville=a&ville=b) and comma-joined (?ville=a,b).
function listParam(v: string | string[] | undefined): string[] {
  const raw = Array.isArray(v) ? v : v != null ? [v] : []
  return raw
    .flatMap((s) => s.split(','))
    .map((s) => s.trim())
    .filter(Boolean)
}

function toNum(v: string | undefined): number | null {
  if (v == null || v.trim() === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

/**
 * Parse the raw Next.js searchParams into a normalized SearchParams.
 * Defaults: type=product, tri=pertinence, page=1. `type` accepts the French alias
 * `produit` (and any non-'service' value) as product, so the repointed header search
 * (which emits type=product) and a hand-typed ?type=produit both resolve correctly.
 */
export function parseSearchParams(
  sp: Record<string, string | string[] | undefined>,
): SearchParams {
  const rawType = firstParam(sp.type)
  const type: SearchType = rawType === 'service' ? 'service' : 'product'

  const rawTri = firstParam(sp.tri)
  const tri: SearchSort = (SEARCH_SORTS as readonly string[]).includes(rawTri ?? '')
    ? (rawTri as SearchSort)
    : 'pertinence'

  const rawPage = toNum(firstParam(sp.page))
  const page = rawPage != null && rawPage >= 1 ? Math.floor(rawPage) : 1

  return {
    q: (firstParam(sp.q) ?? '').trim(),
    type,
    categorie: listParam(sp.categorie),
    ville: listParam(sp.ville),
    prixMin: toNum(firstParam(sp.prix_min)),
    prixMax: toNum(firstParam(sp.prix_max)),
    tri,
    page,
  }
}

/**
 * Category-id precedence. The /categories/[slug] page resolves its slug to a single id
 * and passes it directly; /recherche resolves the ?categorie= slugs to ids. An explicit
 * categoryId always wins (and skips the slug lookup entirely).
 */
export function pickCategoryIds(
  categoryId: string | null | undefined,
  slugResolvedIds: string[] | null,
): string[] | null {
  if (categoryId) return [categoryId]
  return slugResolvedIds
}

/** The opposite catalog — powers the "Voir l'autre type" toggle on the empty state. */
export function otherType(type: SearchType): SearchType {
  return type === 'product' ? 'service' : 'product'
}

/**
 * Strip diacritics via NFD normalization (é→e, ç→c, à→a, …). This mirrors the write-time
 * `unaccent` applied in the FTS generated column, so a query the app accent-strips here
 * lines up with the accent-stripped lexemes stored in `search_vector`. Non-Latin scripts
 * (e.g. Arabic, which carries meaning in its marks) pass through unchanged — NFD only
 * decomposes Latin combining diacritics in the U+0300–U+036F range.
 */
export function stripAccents(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '')
}

/**
 * Weighted match score: title hit 2×, description hit 1×. Empty term → 0. Accent- and
 * case-insensitive (both sides are stripAccents+lowercased) so JS ordering stays aligned
 * with the accent-insensitive FTS filter that selected these rows in the first place.
 */
export function scoreListing(
  title: string | null,
  description: string | null,
  term: string,
): number {
  const needle = stripAccents(term.trim().toLowerCase())
  if (!needle) return 0
  let score = 0
  if (stripAccents((title ?? '').toLowerCase()).includes(needle)) score += 2
  if (stripAccents((description ?? '').toLowerCase()).includes(needle)) score += 1
  return score
}

export type Ranked = { score: number; price: number | null; createdAt: string }

// Null prices (services "sur devis") always sort last, in both directions.
function byPriceAsc(a: number | null, b: number | null): number {
  if (a == null && b == null) return 0
  if (a == null) return 1
  if (b == null) return -1
  return a - b
}

/** Comparator for the four sorts. Ties (and pertinence) fall back to newest-first. */
export function compareRanked(a: Ranked, b: Ranked, tri: SearchSort): number {
  const newest = b.createdAt.localeCompare(a.createdAt)
  switch (tri) {
    case 'recent':
      return newest
    case 'prix_asc':
      return byPriceAsc(a.price, b.price) || newest
    case 'prix_desc': {
      if (a.price == null && b.price == null) return newest
      if (a.price == null) return 1
      if (b.price == null) return -1
      return b.price - a.price || newest
    }
    case 'pertinence':
    default:
      return b.score - a.score || newest
  }
}

/** Page math: clamps the requested page into range and returns the slice bounds. */
export function paginate(total: number, page: number, perPage: number = PER_PAGE) {
  const totalPages = Math.max(1, Math.ceil(total / perPage))
  const safePage = Math.min(Math.max(1, page), totalPages)
  const start = (safePage - 1) * perPage
  return { totalPages, safePage, start, end: start + perPage }
}

/**
 * Build the ILIKE pattern for an `.or()` filter. Strips characters that would break
 * PostgREST's or-filter grammar (`,` `(` `)`) or act as unintended wildcards
 * (`%` `_` `*` `\`), so the term is matched literally. Returns null if nothing is left.
 */
export function ilikePattern(term: string): string | null {
  const safe = term
    .replace(/[%_,()*\\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return safe ? `%${safe}%` : null
}
