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
import { FOCUS_RING } from '@/components/layout/styles'

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
          {/* Mobile page title (Figma 621:49740 mobile-header, delta S6). Desktop takes its
              identity from the sidebar's active nav item, so this is below-lg only. Reuses the
              sidebar's own key rather than adding a second string for the same word. */}
          <h1 className="text-xl font-semibold text-text-primary lg:hidden">
            {t('shell.sidebar.marketplace', lang)}
          </h1>

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
          // Empty state — Figma 611:47916 (deltas S3, S4, P6-P10, C5, T2-T4). A 1px border-subtle
          // stroke, NOT the CARD_SHADOW drop shadow it used to carry; pad 48/40; a 112px tinted
          // circle around the 64px glyph, where it used to be a bare 40px icon.
          <div className="flex flex-col items-center gap-5 rounded-2xl border border-border-subtle bg-white px-10 py-12 text-center">
            <span className="flex h-28 w-28 items-center justify-center rounded-full bg-surface-pill">
              <BriefcaseIcon className="h-16 w-16 text-icon-muted" aria-hidden="true" />
            </span>
            <div className="flex max-w-md flex-col gap-2">
              <p className="text-xl font-semibold text-text-primary">
                {t(hasFilters ? 'services.empty.filtered' : 'marche.empty.services', lang)}
              </p>
              <p className="text-base text-text-muted">
                {t(hasFilters ? 'services.empty.filteredSubtitle' : 'marche.empty.services_subtitle', lang)}
              </p>
            </div>
            {hasFilters && (
              <Link
                href={clearFiltersHref}
                className={`inline-flex h-10 items-center gap-2 rounded-[10px] bg-brand-blue-600 px-4 text-base font-semibold text-white transition-colors hover:bg-brand-blue-600/90 ${FOCUS_RING}`}
              >
                {t('services.empty.resetFilters', lang)}
              </Link>
            )}
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
