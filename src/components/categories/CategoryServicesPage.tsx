import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { AppShell } from '@/components/shell/AppShell'
import type { TopBarUser } from '@/components/marche/ProfileAvatarMenu'
import { ServicesFilterBar } from '@/components/marche/ServicesFilterBar'
import { ErrorState } from '@/components/marche/ErrorState'
import { BriefcaseIcon } from '@/components/marche/icons'
import { ListingResults } from '@/components/listings/ListingResults'
import { SearchFiltersSheet } from '@/components/recherche/SearchFiltersSheet'
import type { FilterCategory } from '@/components/recherche/SearchFilters'
import { buildSearchQuery } from '@/components/recherche/search-url'
import { Pagination } from '@/components/shared/Pagination'
import { CategoryChips, type CategoryChip } from '@/components/categories/CategoryChips'
import { FOCUS_RING } from '@/components/layout/styles'
import type { Category } from '@/lib/categories/category-data'
import type { SearchOutcome } from '@/lib/search/search-marketplace'
import type { SearchParams } from '@/lib/search/search-params'
import { t, tn } from '@/lib/i18n'
import type { Lang } from '@/lib/i18n'

// C2 — a SERVICE category's page (Figma 1486:24359 desktop / 1488:66061 mobile; measurements + decisions: docs/design/category-c2-measurements.md,
// docs/design/category-c2-deltas.md). Same engine as /marche/services — only the scope differs: the category is the page. Header (breadcrumb · H1 +
// count · description · sub-category chips), the FilterBar, the 3-up grid, numbered pagination with its « Affichage … » caption.
// Below `lg` the FilterBar becomes the shared bottom-sheet trigger, as on /marche/services (621:49740): the 375 frame stacks five controls, which would
// push the first card off the first screen (D6).

// The frame is 3 columns × 2 rows with « Affichage 1 à 6 sur 86 » and 15 pages (86 / 6): six cards a page, not the 12 of /marche/services (D5).
export const CATEGORY_SERVICES_PER_PAGE = 6

export function CategoryServicesPage({
  lang,
  user,
  category,
  parent,
  chips,
  chipsAllHref,
  description,
  params,
  result,
  filterCategories,
  cities,
}: {
  lang: Lang
  user: TopBarUser | null
  category: Category
  /** Set on a subcategory page: its sector (a breadcrumb step, and the « Tout » chip's target). */
  parent: Category | null
  /** The sector's children (on a sector page: its own; on a subcategory page: the siblings). */
  chips: CategoryChip[]
  chipsAllHref: string
  description: string | null
  params: SearchParams
  /** null = the search failed: the results area becomes the inline ErrorState (header and filters stay). */
  result: SearchOutcome | null
  filterCategories: FilterCategory[]
  cities: string[]
}) {
  const base = `/categories/${category.slug}`
  const name = lang === 'ar' ? category.name_ar : category.name_fr
  const parentName = parent ? (lang === 'ar' ? parent.name_ar : parent.name_fr) : null

  // What the chips and the empty state carry: the typed query, city, price and sort — never the page, and never `type`
  // (a service category is a service page by default).
  const current = new URLSearchParams()
  if (params.q.trim()) current.set('q', params.q)
  if (params.ville) current.set('ville', params.ville)
  if (params.prixMin != null) current.set('prix_min', String(params.prixMin))
  if (params.prixMax != null) current.set('prix_max', String(params.prixMax))
  if (params.tri !== 'pertinence') current.set('tri', params.tri)
  const carry = current.toString()

  const hasFilters = carry !== ''
  const clearQs = buildSearchQuery(current, { q: null, ville: null, prix_min: null, prix_max: null, tri: null })
  const clearFiltersHref = clearQs ? `${base}?${clearQs}` : base

  const crumbLink = `rounded hover:underline ${FOCUS_RING}`
  const chevron = <ChevronRight className="size-3.5 shrink-0 text-text-muted rtl:rotate-180" aria-hidden="true" />

  return (
    <AppShell user={user}>
      <div className="flex flex-col gap-6">
        {/* category-head — gap 16 */}
        <header className="flex flex-col gap-4">
          <nav aria-label={t('category.breadcrumb.aria', lang)}>
            <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-body-sm text-text-muted">
              <li>
                <Link href="/marche" className={crumbLink}>
                  {t('shell.sidebar.marketplace', lang)}
                </Link>
              </li>
              <li aria-hidden="true">{chevron}</li>
              <li>
                <Link href="/marche/services" className={crumbLink}>
                  {t('nav.services', lang)}
                </Link>
              </li>
              {parent && parentName ? (
                <>
                  <li aria-hidden="true">{chevron}</li>
                  <li>
                    <Link href={`/categories/${parent.slug}`} className={crumbLink}>
                      {parentName}
                    </Link>
                  </li>
                </>
              ) : null}
              <li aria-hidden="true">{chevron}</li>
              <li aria-current="page" className="font-medium text-text-primary">
                {name}
              </li>
            </ol>
          </nav>

          {/* title-row — 32 Bold + the count (16 muted) on the same baseline; the count drops under the title below `sm`. */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-baseline">
            <h1 className="wrap-anywhere text-h1 text-text-primary">{name}</h1>
            {result ? (
              <p className="text-body text-text-muted">{tn('page_header.categories.emphasis_service', lang, result.totalCount)}</p>
            ) : null}
          </div>

          {description ? <p className="text-body text-text-secondary">{description}</p> : null}

          <CategoryChips
            allHref={chipsAllHref}
            chips={chips}
            activeSlug={parent ? category.slug : null}
            carry={carry}
            lang={lang}
          />
        </header>

        {/* browseHead — the FilterBar from `lg`, the shared sheet trigger below it. */}
        <div className="hidden lg:block">
          <ServicesFilterBar
            categories={filterCategories}
            cities={cities}
            selectedCategorie={[]}
            ville={params.ville}
            prixMin={params.prixMin}
            prixMax={params.prixMax}
            tri={params.tri}
            q={params.q}
            basePath={base}
            scopedCategory={{ slug: category.slug, name_fr: category.name_fr, name_ar: category.name_ar }}
          />
        </div>
        <div className="lg:hidden">
          <SearchFiltersSheet
            categories={[]}
            selectedCategorie={[]}
            prixMin={params.prixMin}
            prixMax={params.prixMax}
            basePath={base}
            showCategory={false}
          />
        </div>

        {/* gridWrap — gap 32 */}
        {result === null ? (
          <ErrorState lang={lang} />
        ) : result.totalCount === 0 ? (
          <div className="flex flex-col items-center gap-5 rounded-2xl border border-border-subtle bg-white px-10 py-12 text-center">
            <span className="flex h-28 w-28 items-center justify-center rounded-full bg-surface-pill">
              <BriefcaseIcon className="h-16 w-16 text-icon-muted" aria-hidden="true" />
            </span>
            <div className="flex max-w-md flex-col gap-2">
              <p className="text-xl font-semibold text-text-primary">
                {t(hasFilters ? 'services.empty.filtered' : 'category.empty.services', lang)}
              </p>
              <p className="text-base text-text-muted">
                {t(hasFilters ? 'services.empty.filteredSubtitle' : 'category.empty.services_subtitle', lang)}
              </p>
            </div>
            <Link
              href={hasFilters ? clearFiltersHref : '/marche/services'}
              className={`inline-flex h-10 items-center gap-2 rounded-[10px] bg-brand-blue-600 px-4 text-base font-semibold text-white transition-colors hover:bg-brand-blue-600/90 ${FOCUS_RING}`}
            >
              {t(hasFilters ? 'services.empty.resetFilters' : 'category.empty.browseAll', lang)}
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-8">
            <ListingResults type="service" items={result.services} gap="tight" />
            <Pagination
              page={result.page}
              totalPages={result.totalPages}
              basePath={base}
              totalItems={result.totalCount}
              perPage={result.perPage}
            />
          </div>
        )}
      </div>
    </AppShell>
  )
}
