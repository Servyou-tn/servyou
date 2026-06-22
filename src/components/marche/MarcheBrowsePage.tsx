import Link from 'next/link'
import { MarcheLayout } from './MarcheLayout'
import { PackageIcon, BriefcaseIcon } from './icons'
import { ListingResults } from '@/components/listings/ListingResults'
import { SearchFilters } from '@/components/recherche/SearchFilters'
import { SearchFiltersSheet } from '@/components/recherche/SearchFiltersSheet'
import { Pagination } from '@/components/shared/Pagination'
import { PageHeader } from '@/components/shared/PageHeader'
import { buildSearchQuery } from '@/components/recherche/search-url'
import { getShellUser } from '@/lib/marche/shell-user'
import { getFilterCategoriesForType } from '@/lib/marche/filter-categories'
import { parseSearchParams, type SearchType } from '@/lib/search/search-params'
import { searchMarketplace } from '@/lib/search/search-marketplace'
import { getLang } from '@/lib/i18n/server'
import { t } from '@/lib/i18n'
import { CARD_SHADOW, FOCUS_RING } from '@/components/layout/styles'

// Shared engine behind the two marketplace browse routes. Engine 1 (/marche/produits)
// shows products; Engine 2 (/marche/services) shows services. Each is a single-catalog
// browse-by-default surface: the route fixes the type, the scoped category filter lives in
// the sidebar (desktop) / bottom sheet (mobile), and city/price/sort/page refine via URL.
// Boutiques/freelancers "en vedette" strips are a deliberate fast-follow (their data layer +
// cards + /boutique·/freelance pages don't exist yet — Scope A).
const ENGINE = {
  product: {
    base: '/marche/produits',
    emptyKey: 'marche.empty.products',
    emptySubKey: 'marche.empty.products_subtitle',
    subtitleKey: 'page_header.produits.subtitle',
    emphasisKey: 'page_header.produits.emphasis',
  },
  service: {
    base: '/marche/services',
    emptyKey: 'marche.empty.services',
    emptySubKey: 'marche.empty.services_subtitle',
    subtitleKey: 'page_header.services.subtitle',
    emphasisKey: 'page_header.services.emphasis',
  },
} as const

export async function MarcheBrowsePage({
  type,
  searchParams,
}: {
  type: SearchType
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  // The route fixes the type — ignore any hand-typed ?type=.
  const params = { ...parseSearchParams(sp), type }
  const lang = await getLang()

  const shell = await getShellUser()
  const topBarUser = shell?.topBarUser ?? null

  const [categories, result] = await Promise.all([
    getFilterCategoriesForType(type),
    searchMarketplace(params),
  ])

  const isEmpty = result.totalCount === 0
  const hasFilters =
    params.categorie.length > 0 || params.prixMin != null || params.prixMax != null

  const engine = ENGINE[type]
  const base = engine.base

  // Current params (category/price/sort) → the "Effacer les filtres" escape hatch.
  const current = new URLSearchParams()
  if (params.categorie.length) current.set('categorie', params.categorie.join(','))
  if (params.prixMin != null) current.set('prix_min', String(params.prixMin))
  if (params.prixMax != null) current.set('prix_max', String(params.prixMax))
  if (params.tri !== 'pertinence') current.set('tri', params.tri)
  const clearQs = buildSearchQuery(current, {
    categorie: null,
    prix_min: null,
    prix_max: null,
  })
  const clearFiltersHref = clearQs ? `${base}?${clearQs}` : base

  // The scoped filter panel rendered in the sidebar beneath the active sub-item.
  const sidebarFilter = (
    <SearchFilters
      mode="inline"
      categories={categories}
      selectedCategorie={params.categorie}
      prixMin={params.prixMin}
      prixMax={params.prixMax}
      basePath={base}
    />
  )

  const Icon = type === 'product' ? PackageIcon : BriefcaseIcon

  return (
    <MarcheLayout
      user={topBarUser}
      searchType={type}
      searchQuery={params.q}
      sidebarFilter={sidebarFilter}
    >
      <PageHeader
        subtitle={t(engine.subtitleKey, lang)}
        emphasisWord={t(engine.emphasisKey, lang)}
      />

      {/* Mobile: filters behind a button + bottom sheet (the desktop filter is in the sidebar). */}
      <div className="mb-4 lg:hidden">
        <SearchFiltersSheet
          categories={categories}
          selectedCategorie={params.categorie}
          prixMin={params.prixMin}
          prixMax={params.prixMax}
          basePath={base}
        />
      </div>

      {isEmpty ? (
        <div className={`rounded-2xl bg-white p-12 text-center ${CARD_SHADOW}`}>
          <div className="mx-auto max-w-md">
            <Icon className="mx-auto h-10 w-10 text-[#B8B8B8]" aria-hidden="true" />
            <p className="mt-4 text-base font-semibold text-text-primary">
              {t(hasFilters ? 'search.empty.filtered' : engine.emptyKey, lang)}
            </p>
            <p className="mt-2 text-[13px] text-text-muted">
              {t(hasFilters ? 'search.empty.subtitle' : engine.emptySubKey, lang)}
            </p>
            {hasFilters && (
              <Link
                href={clearFiltersHref}
                className={`mt-5 inline-flex items-center rounded-full bg-brand-accent px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-accent/90 ${FOCUS_RING}`}
              >
                {t('search.filters.clear', lang)}
              </Link>
            )}
          </div>
        </div>
      ) : (
        <>
          {result.type === 'product' ? (
            <ListingResults type="product" items={result.products} />
          ) : (
            <ListingResults type="service" items={result.services} />
          )}
          <div className="mt-8">
            <Pagination page={result.page} totalPages={result.totalPages} basePath={base} />
          </div>
        </>
      )}
    </MarcheLayout>
  )
}
