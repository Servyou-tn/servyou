import Link from 'next/link'
import { MarcheLayout } from '@/components/marche/MarcheLayout'
import { ListingResults } from '@/components/listings/ListingResults'
import { getShellUser } from '@/lib/marche/shell-user'
import { createClient } from '@/lib/supabase/server'
import { getLang } from '@/lib/i18n/server'
import { t } from '@/lib/i18n'
import { FOCUS_RING } from '@/components/layout/styles'
import { parseSearchParams } from '@/lib/search/search-params'
import { searchMarketplace } from '@/lib/search/search-marketplace'
import { buildSearchQuery } from '@/components/recherche/search-url'
import { SearchFilters, type FilterCategory } from '@/components/recherche/SearchFilters'
import { SearchFiltersSheet } from '@/components/recherche/SearchFiltersSheet'
import { SearchPagination } from '@/components/recherche/SearchPagination'
import { SearchEmptyState } from '@/components/recherche/SearchEmptyState'

// /recherche — the marketplace search+browse surface (public, no auth gate). Search is a
// REFINEMENT, not a gate: a bare /recherche browses the whole active catalog (Produits by
// default); a ?q narrows it to title/description matches; ?categorie / ?ville / ?prix_*
// refine further; ?tri sorts; ?page paginates. The only empty state is zero-results.
async function getFilterCategories(): Promise<FilterCategory[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('categories')
    .select('slug, name_fr, name_ar')
    .order('name_fr')
  if (error) {
    console.error('[recherche] categories fetch error:', error)
    return []
  }
  return (data ?? []) as FilterCategory[]
}

export default async function RecherchePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  const params = parseSearchParams(sp)
  const lang = await getLang()

  // /recherche is public — the shell top bar renders for logged-out visitors too.
  const shell = await getShellUser()
  const topBarUser = shell?.topBarUser ?? null

  const categories = await getFilterCategories()
  const topCategories = categories.slice(0, 3)

  // Always search — an absent q simply means "no text filter" (browse all of the type).
  // There's no on-page sort control anymore, but ?tri= is still honored if hand-typed.
  // Default is 'pertinence', which with no query naturally collapses to newest-first
  // (every score ties at 0, so the created_at-DESC tiebreaker orders the browse view).
  const result = await searchMarketplace(params)
  const isEmpty = result.totalCount === 0
  const hasQuery = params.q !== ''
  const hasFilters =
    params.categorie.length > 0 ||
    params.ville.length > 0 ||
    params.prixMin != null ||
    params.prixMax != null
  // Header echo is redundant with the empty-state card at zero, so only show it when a
  // query actually matched something.
  const showQueryEcho = hasQuery && result.totalCount > 0

  // The current URL state, used to build the two "clear" escape hatches without dropping
  // unrelated params (page is intentionally omitted — clearing returns to page 1).
  const current = new URLSearchParams()
  if (params.q) current.set('q', params.q)
  if (params.type === 'service') current.set('type', 'service')
  if (params.categorie.length) current.set('categorie', params.categorie.join(','))
  if (params.ville.length) current.set('ville', params.ville.join(','))
  if (params.prixMin != null) current.set('prix_min', String(params.prixMin))
  if (params.prixMax != null) current.set('prix_max', String(params.prixMax))
  if (params.tri !== 'pertinence') current.set('tri', params.tri)

  const hrefFrom = (qs: string) => (qs ? `/recherche?${qs}` : '/recherche')
  // "Effacer la recherche": drop the query, keep type + filters + sort.
  const clearSearchHref = hrefFrom(buildSearchQuery(current, { q: null }))
  // "Effacer les filtres": drop category/city/price, keep the query + type + sort.
  const clearFiltersHref = hrefFrom(
    buildSearchQuery(current, { categorie: null, ville: null, prix_min: null, prix_max: null }),
  )
  // "Parcourir tout": drop the query AND filters, keep only the type tab (+ sort).
  const browseAllHref = hrefFrom(
    buildSearchQuery(current, {
      q: null,
      categorie: null,
      ville: null,
      prix_min: null,
      prix_max: null,
    }),
  )

  return (
    <MarcheLayout user={topBarUser} searchType={params.type} searchQuery={params.q}>
      {/* Query echo + clear-search — only when a query actually matched something
          (suppressed on browse and on zero results, where the empty card speaks). */}
      {showQueryEcho && (
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h1 className="text-lg font-bold text-[#0A0A0A]">
            {t('search.resultsCount', lang, { count: result.totalCount, query: params.q })}
          </h1>
          <Link
            href={clearSearchHref}
            className={`rounded text-[13px] font-medium text-[#6B6B6B] underline-offset-2 hover:underline ${FOCUS_RING}`}
          >
            {t('search.clear', lang)}
          </Link>
        </div>
      )}

      {/* Mobile: the filters live behind a button + bottom sheet (hidden ≥lg). */}
      <div className="mb-4 lg:hidden">
        <SearchFiltersSheet
          categories={categories}
          selectedCategorie={params.categorie}
          selectedVille={params.ville}
          prixMin={params.prixMin}
          prixMax={params.prixMax}
        />
      </div>

      <div className="flex gap-6">
        {/* Desktop filter sidebar (≥lg). */}
        <aside className="hidden w-60 shrink-0 lg:block">
          <div className="card-premium p-5">
            <SearchFilters
              mode="inline"
              categories={categories}
              selectedCategorie={params.categorie}
              selectedVille={params.ville}
              prixMin={params.prixMin}
              prixMax={params.prixMax}
            />
          </div>
        </aside>

        {/* Results column. */}
        <div className="min-w-0 flex-1">
          {isEmpty ? (
            <SearchEmptyState
              lang={lang}
              query={params.q}
              categories={topCategories}
              hasFilters={hasFilters}
              clearFiltersHref={clearFiltersHref}
              browseAllHref={browseAllHref}
            />
          ) : (
            <>
              {result.type === 'product' ? (
                <ListingResults type="product" items={result.products} />
              ) : (
                <ListingResults type="service" items={result.services} />
              )}
              <div className="mt-8">
                <SearchPagination page={result.page} totalPages={result.totalPages} />
              </div>
            </>
          )}
        </div>
      </div>
    </MarcheLayout>
  )
}
