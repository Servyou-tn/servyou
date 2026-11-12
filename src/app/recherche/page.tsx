import Link from 'next/link'
import { AppShell } from '@/components/shell/AppShell'
import { ListingResults } from '@/components/listings/ListingResults'
import { getShellUser } from '@/lib/marche/shell-user'
import { getLang } from '@/lib/i18n/server'
import { t, tn } from '@/lib/i18n'
import type { Lang } from '@/lib/i18n'
import { FOCUS_RING } from '@/components/layout/styles'
import { otherType, parseSearchParams, type SearchSort, type SearchType } from '@/lib/search/search-params'
import { searchMarketplace } from '@/lib/search/search-marketplace'
import { settle } from '@/lib/supabase/query-error'
import { ErrorState } from '@/components/marche/ErrorState'
import { getFilterCategoriesForType } from '@/lib/marche/filter-categories'
import { getProductCities, getServiceCities } from '@/lib/marche/filter-cities'
import { ProduitsFilterBar } from '@/components/marche/ProduitsFilterBar'
import { isWeakResult, shouldShowSearchLanding } from '@/lib/search/recherche-logic'
import { buildSearchQuery } from '@/components/recherche/search-url'
import { SearchFiltersSheet } from '@/components/recherche/SearchFiltersSheet'
import { SearchQueryInput } from '@/components/recherche/SearchQueryInput'
import { Pagination } from '@/components/shared/Pagination'
import { SearchEmptyState } from '@/components/recherche/SearchEmptyState'
import { SearchLanding } from '@/components/recherche/SearchLanding'
import type { Metadata } from 'next'
import { publicMetadata } from '@/lib/seo/metadata'

// Search / share metadata (audit checklist 5). Search results are crawlable (their links lead to the listings) but
// kept out of the index: every query would be a near-duplicate page.
export async function generateMetadata(): Promise<Metadata> {
  return publicMetadata('seo.title.search', 'seo.desc.search', '/recherche', { noindex: true })
}

// /recherche — Engine 3, the search surface (public, no auth gate). Search runs against ONE
// side only, chosen by ?type (product default, service otherwise) — the sidebar's expandable
// Marketplace item is the only cross-engine switch anywhere now (the old top-bar Produits/
// Services toggle was retired with the legacy marche shell; see docs/follow-ups.md). Browse-
// by-default lives on /marche/produits and /marche/services, so a bare /recherche (no query, no
// filters) shows a landing block, not a grid. A ?q narrows to title/description matches;
// ?categorie / ?prix_* refine; ?tri sorts; ?page paginates. When the active side is empty or
// thin, a cross-side nudge (page-local, unaffected by the shell migration) points to the other
// side.
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

  // Bare /recherche (no query AND no filters) → landing block; the two CTAs route to the
  // marketplaces.
  if (shouldShowSearchLanding(params)) {
    return (
      <AppShell user={topBarUser}>
        <SearchQueryInput initialQuery={params.q} type={params.type} basePath="/recherche" />
        <div className="mt-6">
          <SearchLanding lang={lang} />
        </div>
      </AppShell>
    )
  }

  // Type-scoped category filter: only categories with ≥1 active listing of the toggled type,
  // consistent with the two browse engines.
  // Ville (founder ruling PR-2b): the shop's city for products, the freelancer's for services. The predicates already live
  // in searchMarketplace (applyProductFilters / applyServiceFilters); the options are the cities that have listings.
  const [categories, cities] = await Promise.all([
    getFilterCategoriesForType(params.type),
    params.type === 'product' ? getProductCities() : getServiceCities(),
  ])
  const topCategories = categories.slice(0, 3)

  const searched = await settle('recherche search', searchMarketplace(params))
  // A failed search is an inline error state inside the shell (the search box stays) — never the
  // « aucun résultat » card.
  if (!searched.ok) {
    return (
      <AppShell user={topBarUser}>
        <div className="mb-4">
          <SearchQueryInput initialQuery={params.q} type={params.type} basePath="/recherche" />
        </div>
        <ErrorState lang={lang} />
      </AppShell>
    )
  }
  const result = searched.data
  const isEmpty = result.totalCount === 0
  const hasQuery = params.q !== ''
  const hasFilters =
    params.categorie.length > 0 || params.ville != null || params.prixMin != null || params.prixMax != null
  // Header echo is redundant with the empty-state card at zero, so only show it when a
  // query actually matched something.
  const showQueryEcho = hasQuery && result.totalCount > 0

  // The current URL state, used to build the escape hatches without dropping unrelated
  // params (page is intentionally omitted — clearing/flipping returns to page 1).
  const current = new URLSearchParams()
  if (params.q) current.set('q', params.q)
  if (params.type === 'service') current.set('type', 'service')
  if (params.categorie.length) current.set('categorie', params.categorie.join(','))
  if (params.prixMin != null) current.set('prix_min', String(params.prixMin))
  if (params.prixMax != null) current.set('prix_max', String(params.prixMax))
  if (params.ville) current.set('ville', params.ville)
  if (params.tri !== 'pertinence') current.set('tri', params.tri)

  const hrefFrom = (qs: string) => (qs ? `/recherche?${qs}` : '/recherche')
  // "Effacer la recherche": drop the query, keep type + filters + sort.
  const clearSearchHref = hrefFrom(buildSearchQuery(current, { q: null }))
  // "Effacer les filtres": drop category/price, keep the query + type + sort.
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
  // type-agnostic price filter (it applies to both sides), but DROP `categorie`: the
  // category filter is usage-scoped per side, so a product category carried onto the
  // services side would just land in another empty state — defeating "is it on the other
  // side?". Dropping `type` (vs setting 'product') keeps product URLs clean (it's default).
  const otherT = otherType(params.type)
  const otherSideHref = hrefFrom(
    buildSearchQuery(current, {
      type: otherT === 'service' ? 'service' : null,
      categorie: null,
      // Ville too: each side lists its own cities (shops vs freelancers), so a carried city could empty the other side.
      ville: null,
    }),
  )
  const currentLabel = sideLabel(params.type, lang)
  const otherLabel = sideLabel(otherT, lang)
  const showWeakHelper = hasQuery && isWeakResult(result.totalCount)

  // Results header (page-local, existing plural keys — no new text): the count in Semi Bold, the rest of the sentence
  // muted, « Effacer la recherche » at the end (1440: one row; 375: it wraps under).
  const subtitle = tn('page_header.recherche.subtitle', lang, result.totalCount, { query: params.q })
  const emphasis = tn('page_header.recherche.emphasis', lang, result.totalCount)
  const emAt = subtitle.indexOf(emphasis)
  const sortOptions: SearchSort[] = ['pertinence', 'recent', 'prix_asc', 'prix_desc']

  // Layout — Figma 1596:41289 (1440) / 1596:42384 (375), docs/design/recherche-i1-deltas.md §2:
  //   1440: the shared filter bar (search · Catégorie · Ville · Prix · Trier par), the results header 16 below, the grid 24
  //         below that; no sidebar.
  //   375:  a full-bleed white header band (« Recherche » + the search field, border-bottom), then the results header and
  //         « Filtres » (gap 12), the 2-up grid 20 below.
  return (
    <AppShell user={topBarUser}>
      {/* Bleeds through main's padding (px-4 py-6, md:px-8 md:py-8), as MarketplaceMobileHeader does. */}
      <div className="-mx-4 -mt-6 flex flex-col gap-3 border-b border-border-subtle bg-surface-base p-4 md:-mx-8 md:-mt-8 lg:hidden">
        <h1 className="text-xl font-semibold text-text-primary">{t('search.title', lang)}</h1>
        <SearchQueryInput initialQuery={params.q} type={params.type} basePath="/recherche" />
      </div>

      {/* The desktop frame draws no title; the page keeps its h1 for assistive tech (the mobile band shows it). */}
      <h1 className="sr-only max-lg:hidden">{t('search.title', lang)}</h1>

      <div className="flex flex-col gap-6 max-lg:gap-5 max-lg:pt-2">
        <div className="flex flex-col gap-4 max-lg:gap-3">
          {/* Desktop (lg+): the filter bar shared with /marche/produits. Pertinence stays the typed-search default; the
              query is echoed in the header below, not as a chip. */}
          <div className="hidden lg:block">
            <ProduitsFilterBar
              categories={categories}
              cities={cities}
              selectedCategorie={params.categorie}
              ville={params.ville}
              prixMin={params.prixMin}
              prixMax={params.prixMax}
              tri={params.tri}
              q={params.q}
              basePath="/recherche"
              sortOptions={sortOptions}
              triDefault="pertinence"
              showQueryChip={false}
              searchPlaceholderKey={
                params.type === 'product' ? 'produits.filters.searchPlaceholder' : 'services.filters.searchPlaceholder'
              }
            />
          </div>

          {/* Query echo + clear-search — only when a query actually matched something (suppressed on zero results,
              where the empty card speaks). */}
          {showQueryEcho && (
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
              <p className="text-base text-text-muted">
                {emAt >= 0 ? (
                  <>
                    {subtitle.slice(0, emAt)}
                    <span className="font-semibold text-text-primary">{emphasis}</span>
                    {subtitle.slice(emAt + emphasis.length)}
                  </>
                ) : (
                  subtitle
                )}
              </p>
              <Link
                href={clearSearchHref}
                className={`relative rounded text-body-sm font-medium text-text-muted underline underline-offset-2 ${FOCUS_RING}`}
              >
                {t('search.clear', lang)}
                {/* Touch target: ≥ 44 px tall without moving the 21 px text. */}
                <span aria-hidden="true" className="absolute inset-x-0 -inset-y-3" />
              </Link>
            </div>
          )}

          {/* Mobile: the filters live behind « Filtres » + the bottom sheet, with its Ville + Trier par fieldsets. */}
          <div className="lg:hidden">
            {/* Keyed on the URL's filters: the sheet keeps its drafts in state, so a link that changes the URL (« Effacer les
                filtres », « Parcourir tout », the other-side nudge) must give it fresh ones. */}
            <SearchFiltersSheet
              key={[params.categorie.join(','), params.ville ?? '', params.tri, params.prixMin ?? '', params.prixMax ?? ''].join('|')}
              categories={categories}
              selectedCategorie={params.categorie}
              prixMin={params.prixMin}
              prixMax={params.prixMax}
              extras={{
                cities,
                ville: params.ville,
                tri: params.tri,
                triDefault: 'pertinence',
                sortOptions: sortOptions.map((value) => ({ value, labelKey: `produits.sort.${value}` })),
              }}
            />
          </div>
        </div>

        <div className="min-w-0">
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
                <ListingResults type="product" items={result.products} look="browse" />
              ) : (
                <ListingResults type="service" items={result.services} />
              )}

              {/* Weak result set (1..3): show what we have + a one-tap switch to the other side. */}
              {showWeakHelper && (
                <div className="mt-6 text-center">
                  <Link
                    href={otherSideHref}
                    className={`inline-block rounded-xl border border-border-subtle bg-surface-subtle px-4 py-3 text-body-sm text-text-muted transition-colors hover:bg-slate-100 ${FOCUS_RING}`}
                  >
                    {t('search.otherSide.weak', lang, { other: otherLabel })}
                  </Link>
                </div>
              )}

              <div className="mt-8">
                <Pagination
                  page={result.page}
                  totalPages={result.totalPages}
                  basePath="/recherche"
                  totalItems={result.totalCount}
                  perPage={result.perPage}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </AppShell>
  )
}
