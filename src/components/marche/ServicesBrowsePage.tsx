import Link from 'next/link'
import { AppShell } from '@/components/shell/AppShell'
import { BriefcaseIcon } from './icons'
import { ServicesLensToggle } from './ServicesLensToggle'
import { ServicesFilterBar } from './ServicesFilterBar'
import { ListingResults } from '@/components/listings/ListingResults'
import { SearchFiltersSheet } from '@/components/recherche/SearchFiltersSheet'
import { Pagination } from '@/components/shared/Pagination'
import { buildSearchQuery } from '@/components/recherche/search-url'
import { getShellUser } from '@/lib/marche/shell-user'
import { getFilterCategoriesForType } from '@/lib/marche/filter-categories'
import { getServiceCities } from '@/lib/marche/filter-cities'
import { parseSearchParams } from '@/lib/search/search-params'
import { searchMarketplace } from '@/lib/search/search-marketplace'
import { getLang } from '@/lib/i18n/server'
import { t } from '@/lib/i18n'
import { CARD_SHADOW, FOCUS_RING } from '@/components/layout/styles'

const BASE = '/marche/services'
// The services grid is 3-up × 4 rows in the Figma (611:45637 caption "Affichage 1 à 12 sur N"),
// so this surface overrides the shared 20/page default with 12. Kept local rather than changing
// PER_PAGE, so /recherche and /categories service results are unaffected.
const SERVICE_PER_PAGE = 12

// Engine 2 rebuilt to the v3.7 Figma (611:45637 desktop / 621:49740 mobile). The services
// marketplace, forked off the shared MarcheBrowsePage so /marche/produits keeps its current
// engine until its own rebuild. The category filter, city/price/sort/page, and public (no
// auth gate) posture all carry over from the shared data layer — only the UI changes:
// filters move from the sidebar into a top FilterBar (desktop) / bottom sheet (mobile), the
// cards become a 3-up grid of vertical v3.7 cards, and a Services/Freelances lens toggle sits
// above. The category list stays DB-driven (scoped to active listings) — the Figma's 13
// hardcoded parents are a separate taxonomy-reconciliation migration (see docs/follow-ups.md).
export async function ServicesBrowsePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  const params = { ...parseSearchParams(sp), type: 'service' as const }
  const lang = await getLang()

  const shell = await getShellUser()
  const topBarUser = shell?.topBarUser ?? null

  const [categories, cities, result] = await Promise.all([
    getFilterCategoriesForType('service'),
    getServiceCities(),
    searchMarketplace(params, { perPage: SERVICE_PER_PAGE }),
  ])

  const isEmpty = result.totalCount === 0
  const hasFilters =
    params.categorie.length > 0 ||
    params.ville != null ||
    params.prixMin != null ||
    params.prixMax != null ||
    params.q.trim() !== ''

  // Current filter params → the empty-state "clear" escape hatch.
  const current = new URLSearchParams()
  if (params.q.trim()) current.set('q', params.q)
  if (params.categorie.length) current.set('categorie', params.categorie.join(','))
  if (params.ville) current.set('ville', params.ville)
  if (params.prixMin != null) current.set('prix_min', String(params.prixMin))
  if (params.prixMax != null) current.set('prix_max', String(params.prixMax))
  if (params.tri !== 'pertinence') current.set('tri', params.tri)
  const clearQs = buildSearchQuery(current, {
    q: null,
    categorie: null,
    ville: null,
    prix_min: null,
    prix_max: null,
  })
  const clearFiltersHref = clearQs ? `${BASE}?${clearQs}` : BASE

  return (
    <AppShell user={topBarUser}>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-4">
          <ServicesLensToggle lang={lang} />

          {/* Desktop: the top filter bar. Mobile: the existing bottom-sheet trigger. */}
          <div className="hidden lg:block">
            <ServicesFilterBar
              categories={categories}
              cities={cities}
              selectedCategorie={params.categorie}
              ville={params.ville}
              prixMin={params.prixMin}
              prixMax={params.prixMax}
              tri={params.tri}
              q={params.q}
              basePath={BASE}
            />
          </div>
          <div className="lg:hidden">
            <SearchFiltersSheet
              categories={categories}
              selectedCategorie={params.categorie}
              prixMin={params.prixMin}
              prixMax={params.prixMax}
              basePath={BASE}
            />
          </div>
        </div>

        {isEmpty ? (
          <div className={`rounded-2xl bg-white p-12 text-center ${CARD_SHADOW}`}>
            <div className="mx-auto max-w-md">
              <BriefcaseIcon className="mx-auto h-10 w-10 text-icon-muted" aria-hidden="true" />
              <p className="mt-4 text-base font-semibold text-text-primary">
                {t(hasFilters ? 'search.empty.filtered' : 'marche.empty.services', lang)}
              </p>
              <p className="mt-2 text-body-sm text-text-muted">
                {t(hasFilters ? 'search.empty.subtitle' : 'marche.empty.services_subtitle', lang)}
              </p>
              {hasFilters && (
                <Link
                  href={clearFiltersHref}
                  className={`mt-5 inline-flex items-center rounded-full bg-brand-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-blue-600/90 ${FOCUS_RING}`}
                >
                  {t('services.filters.clearAll', lang)}
                </Link>
              )}
            </div>
          </div>
        ) : (
          <>
            <ListingResults type="service" items={result.services} />
            <div className="mt-2">
              <Pagination
                page={result.page}
                totalPages={result.totalPages}
                basePath={BASE}
                totalItems={result.totalCount}
                perPage={result.perPage}
              />
            </div>
          </>
        )}
      </div>
    </AppShell>
  )
}
