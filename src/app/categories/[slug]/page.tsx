import { notFound } from 'next/navigation'
import Link from 'next/link'
import { MarcheLayout } from '@/components/marche/MarcheLayout'
import { ListingResults } from '@/components/listings/ListingResults'
import { getShellUser } from '@/lib/marche/shell-user'
import { getLang } from '@/lib/i18n/server'
import { t } from '@/lib/i18n'
import { FOCUS_RING } from '@/components/layout/styles'
import { otherType, parseSearchParams } from '@/lib/search/search-params'
import { searchMarketplace } from '@/lib/search/search-marketplace'
import { buildSearchQuery } from '@/components/recherche/search-url'
import { SearchFilters } from '@/components/recherche/SearchFilters'
import { SearchFiltersSheet } from '@/components/recherche/SearchFiltersSheet'
import { Pagination } from '@/components/shared/Pagination'
import { PageHeader } from '@/components/shared/PageHeader'
import { getCategoryBySlug, getSubcategories } from '@/lib/categories/category-data'
import { SubcategoryStrip } from '@/components/categories/SubcategoryStrip'
import { CategoryEmptyState } from '@/components/categories/CategoryEmptyState'

// /categories/[slug] — the category-scoped browse surface (public). The slug locks the
// category; the page browses-by-default (full grid immediately), refinable by city/price.
// Reuses /recherche's data layer (searchMarketplace with a categoryId) + filter components
// (with the Catégorie section hidden and the base path pointed at this slug). The header
// search bar + type toggle are the shared shell's, unchanged (they target /recherche).
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

  const [subcategories, shell] = await Promise.all([
    getSubcategories(category.id),
    getShellUser(),
  ])
  const topBarUser = shell?.topBarUser ?? null

  // Browse-by-default within the category (default sort = newest, since q is always empty
  // here so 'pertinence' collapses to created_at DESC).
  const result = await searchMarketplace(sParams, { categoryId: category.id })
  const isEmpty = result.totalCount === 0
  const name = lang === 'ar' ? category.name_ar : category.name_fr
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
    <MarcheLayout user={topBarUser} searchType={sParams.type} searchQuery="">
      {/* Breadcrumbs — Accueil > Catégories > {name}. "Catégories" is plain text:
          TODO link it when the /categories index page exists. */}
      <nav
        aria-label={t('category.breadcrumb.categories', lang)}
        className="mb-3 flex flex-wrap items-center gap-1.5 text-[13px] text-text-muted"
      >
        <Link href="/" className={`rounded hover:underline ${FOCUS_RING}`}>
          {t('category.breadcrumb.home', lang)}
        </Link>
        <span aria-hidden="true">›</span>
        <span>{t('category.breadcrumb.categories', lang)}</span>
        <span aria-hidden="true">›</span>
        <span className="font-medium text-text-primary">{name}</span>
      </nav>

      <PageHeader
        subtitle={t('page_header.categories.subtitle', lang, { count: result.totalCount, category: name })}
        emphasisWord={t('page_header.categories.emphasis', lang, { count: result.totalCount })}
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
    </MarcheLayout>
  )
}
