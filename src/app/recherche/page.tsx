import Link from 'next/link'
import { MarcheLayout } from '@/components/marche/MarcheLayout'
import { ListingResults } from '@/components/listings/ListingResults'
import { getShellUser } from '@/lib/marche/shell-user'
import { getLang } from '@/lib/i18n/server'
import { t } from '@/lib/i18n'
import type { Lang } from '@/lib/i18n'
import { FOCUS_RING } from '@/components/layout/styles'
import { otherType, parseSearchParams, type SearchType } from '@/lib/search/search-params'
import { searchMarketplace } from '@/lib/search/search-marketplace'
import { getFilterCategoriesForType } from '@/lib/marche/filter-categories'
import { isWeakResult, shouldShowSearchLanding } from '@/lib/search/recherche-logic'
import { buildSearchQuery } from '@/components/recherche/search-url'
import { SearchFilters } from '@/components/recherche/SearchFilters'
import { SearchFiltersSheet } from '@/components/recherche/SearchFiltersSheet'
import { SearchPagination } from '@/components/recherche/SearchPagination'
import { SearchEmptyState } from '@/components/recherche/SearchEmptyState'
import { SearchLanding } from '@/components/recherche/SearchLanding'

// /recherche — Engine 3, the search surface (public, no auth gate). The Produits/Services
// toggle in the top bar is the compass: search runs against ONE side only. Browse-by-default
// now lives on /marche/produits and /marche/services, so a bare /recherche (no query, no
// filters) shows a landing block, not a grid. A ?q narrows to title/description matches;
// ?categorie / ?ville / ?prix_* refine; ?tri sorts; ?page paginates. When the active side is
// empty or thin, a cross-side nudge points to the other side of the toggle.
function sideLabel(type: SearchType, lang: Lang): string {
  return t(type === 'product' ? 'common.products_section' : 'common.services_section', lang)
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

  // Bare /recherche (no query AND no filters) → landing block. The top bar (toggle + search)
  // still frames it; the two CTAs route to the marketplaces.
  if (shouldShowSearchLanding(params)) {
    return (
      <MarcheLayout user={topBarUser} searchType={params.type} searchQuery={params.q}>
        <SearchLanding lang={lang} />
      </MarcheLayout>
    )
  }

  // Type-scoped category filter: only categories with ≥1 active listing of the toggled type,
  // consistent with the two browse engines.
  const categories = await getFilterCategoriesForType(params.type)
  const topCategories = categories.slice(0, 3)

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

  // The current URL state, used to build the escape hatches without dropping unrelated
  // params (page is intentionally omitted — clearing/flipping returns to page 1).
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

  // Cross-side compass: flip the Produits/Services toggle. Keep the query and the
  // type-agnostic filters (ville/prix apply to both sides), but DROP `categorie`: the
  // category filter is usage-scoped per side, so a product category carried onto the
  // services side would just land in another empty state — defeating "is it on the other
  // side?". Dropping `type` (vs setting 'product') keeps product URLs clean (it's default).
  const otherT = otherType(params.type)
  const otherSideHref = hrefFrom(
    buildSearchQuery(current, {
      type: otherT === 'service' ? 'service' : null,
      categorie: null,
    }),
  )
  const currentLabel = sideLabel(params.type, lang)
  const otherLabel = sideLabel(otherT, lang)
  const showWeakHelper = hasQuery && isWeakResult(result.totalCount)

  return (
    <MarcheLayout user={topBarUser} searchType={params.type} searchQuery={params.q}>
      {/* Query echo + clear-search — only when a query actually matched something
          (suppressed on zero results, where the empty card speaks). */}
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
              currentLabel={currentLabel}
              otherLabel={otherLabel}
              otherSideHref={otherSideHref}
            />
          ) : (
            <>
              {result.type === 'product' ? (
                <ListingResults type="product" items={result.products} />
              ) : (
                <ListingResults type="service" items={result.services} />
              )}

              {/* Weak result set (1..3): show what we have + a one-tap switch to the other side. */}
              {showWeakHelper && (
                <div className="mt-6 text-center">
                  <Link
                    href={otherSideHref}
                    className={`inline-block rounded-xl border border-border-subtle bg-surface-subtle px-4 py-3 text-[13px] text-text-muted transition-colors hover:bg-slate-100 ${FOCUS_RING}`}
                  >
                    {t('search.otherSide.weak', lang, { other: otherLabel })}
                  </Link>
                </div>
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
