import { notFound } from 'next/navigation'
import Link from 'next/link'
import { AppShell } from '@/components/shell/AppShell'
import { ListingResults } from '@/components/listings/ListingResults'
import { getShellUser } from '@/lib/marche/shell-user'
import { getLang } from '@/lib/i18n/server'
import { t, tn } from '@/lib/i18n'
import { FOCUS_RING } from '@/components/layout/styles'
import { otherType, parseSearchParams } from '@/lib/search/search-params'
import { searchMarketplace } from '@/lib/search/search-marketplace'
import { settle } from '@/lib/supabase/query-error'
import { ErrorState } from '@/components/marche/ErrorState'
import { buildSearchQuery } from '@/components/recherche/search-url'
import { SearchFilters } from '@/components/recherche/SearchFilters'
import { SearchFiltersSheet } from '@/components/recherche/SearchFiltersSheet'
import { SearchQueryInput } from '@/components/recherche/SearchQueryInput'
import { Pagination } from '@/components/shared/Pagination'
import { PageHeader } from '@/components/shared/PageHeader'
import { getCategoryBySlug, getParentCategory, getSubcategories } from '@/lib/categories/category-data'
import { isServiceCategorySlug, orderByTaxonomy } from '@/lib/categories/service-category-slugs'
import { getFilterCategoriesForType } from '@/lib/marche/filter-categories'
import { getServiceCities } from '@/lib/marche/filter-cities'
import { CategoryServicesPage, CATEGORY_SERVICES_PER_PAGE } from '@/components/categories/CategoryServicesPage'
import { SubcategoryStrip } from '@/components/categories/SubcategoryStrip'
import { CategoryEmptyState } from '@/components/categories/CategoryEmptyState'

// /categories/[slug] — the category-scoped browse surface (public). The slug locks the
// category; the page browses-by-default (full grid immediately), refinable by city/price.
// Reuses /recherche's data layer (searchMarketplace with a categoryId) + filter components
//
// A SERVICE category (a sector or subcategory of the service taxonomy, or any slug with ?type=service) renders the C2 page — components/categories/
// CategoryServicesPage (Figma 1486:24359 / 1488:66061). `?type=` still wins when present; without it a service slug opens on its services. Any other
// category keeps the product layout below, unchanged. Search input is
// SearchQueryInput (page-local) — this page never had its own search UI before the shell
// migration; the old top-bar search always targeted /recherche, never this route, so this is a
// genuinely new affordance, not a like-for-like replacement.
export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { slug } = await params
  const sp = await searchParams
  const sParams = parseSearchParams(sp)
  const lang = await getLang()

  const category = await getCategoryBySlug(slug)
  if (!category) notFound()

  const explicitType = Array.isArray(sp.type) ? sp.type[0] : sp.type
  if (explicitType ? explicitType === 'service' : isServiceCategorySlug(category.slug)) {
    const params = { ...sParams, type: 'service' as const }
    const [parent, children, shell, filterCategories, cities, searched] = await Promise.all([
      category.parent_id ? getParentCategory(category.parent_id) : Promise.resolve(null),
      getSubcategories(category.id),
      getShellUser(),
      getFilterCategoriesForType('service'),
      getServiceCities(),
      settle(
        'categories services search',
        searchMarketplace(params, { categoryId: category.id, perPage: CATEGORY_SERVICES_PER_PAGE }),
      ),
    ])
    // The chips list the sector's children: its own on a sector page, its siblings (via the parent) on a subcategory page.
    const chips = orderByTaxonomy(parent ? await getSubcategories(parent.id) : children, (parent ?? category).slug)
    const descriptionKey = `category.description.${category.slug}`
    const description = t(descriptionKey, lang) === descriptionKey ? null : t(descriptionKey, lang)
    return (
      <CategoryServicesPage
        lang={lang}
        user={shell?.topBarUser ?? null}
        category={category}
        parent={parent}
        chips={chips}
        chipsAllHref={parent ? `/categories/${parent.slug}` : `/categories/${category.slug}`}
        description={description}
        params={params}
        result={searched.ok ? searched.data : null}
        filterCategories={filterCategories}
        cities={cities}
      />
    )
  }

  const [subcategories, shell] = await Promise.all([
    getSubcategories(category.id),
    getShellUser(),
  ])
  const topBarUser = shell?.topBarUser ?? null

  // Browse-by-default within the category (default sort = newest, since q is always empty
  // here so 'pertinence' collapses to created_at DESC).
  const searched = await settle('categories search', searchMarketplace(sParams, { categoryId: category.id }))
  const name = lang === 'ar' ? category.name_ar : category.name_fr
  // A failed search is an inline error state inside the shell (the search box stays) — never the
  // « this category is empty » card.
  if (!searched.ok) {
    return (
      <AppShell user={topBarUser}>
        <div className="mb-4">
          <SearchQueryInput initialQuery={sParams.q} type={sParams.type} basePath={`/categories/${category.slug}`} />
        </div>
        <h1 className="mb-4 text-xl font-semibold text-text-primary">{name}</h1>
        <ErrorState lang={lang} />
      </AppShell>
    )
  }
  const result = searched.data
  const isEmpty = result.totalCount === 0
  // Description deferred — the categories table has no description_fr/_ar columns yet
  // (migration logged in docs/follow-ups.md), so no description block is rendered.

  const hasFilters = sParams.prixMin != null || sParams.prixMax != null

  // Current params (type + price + non-default sort) for the filter/empty hrefs.
  const current = new URLSearchParams()
  if (sParams.type === 'service') current.set('type', 'service')
  if (sParams.prixMin != null) current.set('prix_min', String(sParams.prixMin))
  if (sParams.prixMax != null) current.set('prix_max', String(sParams.prixMax))
  if (sParams.tri !== 'pertinence') current.set('tri', sParams.tri)

  const base = `/categories/${category.slug}`
  const hrefFrom = (qs: string) => (qs ? `${base}?${qs}` : base)
  const clearFiltersHref = hrefFrom(buildSearchQuery(current, { prix_min: null, prix_max: null }))
  const switchTypeHref = hrefFrom(buildSearchQuery(current, { type: otherType(sParams.type) }))

  return (
    <AppShell user={topBarUser}>
      <div className="mb-4">
        <SearchQueryInput initialQuery={sParams.q} type={sParams.type} basePath={base} />
      </div>

      {/* Breadcrumbs — Accueil > Catégories > {name}. "Catégories" is plain text:
          TODO link it when the /categories index page exists. */}
      <nav
        aria-label={t('category.breadcrumb.categories', lang)}
        className="mb-3 flex flex-wrap items-center gap-1.5 text-body-sm text-text-muted"
      >
        <Link href="/" className={`rounded hover:underline ${FOCUS_RING}`}>
          {t('category.breadcrumb.home', lang)}
        </Link>
        <span aria-hidden="true">›</span>
        <span>{t('category.breadcrumb.categories', lang)}</span>
        <span aria-hidden="true">›</span>
        <span className="font-medium text-text-primary">{name}</span>
      </nav>

      {/* The count noun follows the result type: « 1 produit » over services was a wrong label. */}
      <PageHeader
        subtitle={tn(
          result.type === 'service' ? 'page_header.categories.subtitle_service' : 'page_header.categories.subtitle',
          lang,
          result.totalCount,
          { category: name },
        )}
        emphasisWord={tn(
          result.type === 'service' ? 'page_header.categories.emphasis_service' : 'page_header.categories.emphasis',
          lang,
          result.totalCount,
        )}
      />

      {/* Sub-category drill-down — renders nothing while the taxonomy is flat. */}
      <SubcategoryStrip items={subcategories} lang={lang} />

      {/* Mobile: filters behind a button + bottom sheet (Catégorie section hidden). */}
      <div className="mb-4 lg:hidden">
        <SearchFiltersSheet
          categories={[]}
          selectedCategorie={[]}
          prixMin={sParams.prixMin}
          prixMax={sParams.prixMax}
          basePath={base}
          showCategory={false}
        />
      </div>

      <div className="flex gap-6">
        {/* Desktop filter sidebar (≥lg) — price only. */}
        <aside className="hidden w-60 shrink-0 lg:block">
          <div className="card-premium p-5">
            <SearchFilters
              mode="inline"
              categories={[]}
              selectedCategorie={[]}
              prixMin={sParams.prixMin}
              prixMax={sParams.prixMax}
              basePath={base}
              showCategory={false}
            />
          </div>
        </aside>

        {/* Results column. */}
        <div className="min-w-0 flex-1">
          {isEmpty ? (
            <CategoryEmptyState
              lang={lang}
              currentType={sParams.type}
              hasFilters={hasFilters}
              clearFiltersHref={clearFiltersHref}
              switchTypeHref={switchTypeHref}
              browseAllHref="/marche"
            />
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
        </div>
      </div>
    </AppShell>
  )
}
