import type { Metadata } from 'next'
import Link from 'next/link'
import { Package } from 'lucide-react'
import { AppShell } from '@/components/shell/AppShell'
import { Pagination } from '@/components/shared/Pagination'
import { SearchFiltersSheet } from '@/components/recherche/SearchFiltersSheet'
import { buildSearchQuery } from '@/components/recherche/search-url'
import { getShellUser } from '@/lib/marche/shell-user'
import { getFilterCategoriesForType } from '@/lib/marche/filter-categories'
import { getProductCities } from '@/lib/marche/filter-cities'
import { parseSearchParams } from '@/lib/search/search-params'
import { searchMarketplace } from '@/lib/search/search-marketplace'
import { getLang } from '@/lib/i18n/server'
import { t } from '@/lib/i18n'
import { FOCUS_RING } from '@/components/layout/styles'
import { ProduitsLensToggle } from './_components/ProduitsLensToggle'
import { ProduitsFilterBar } from './_components/ProduitsFilterBar'
import { ProductBrowseGrid } from './_components/ProductBrowseGrid'

export const metadata: Metadata = { title: 'Produits — Servyou' }

const BASE = '/marche/produits'

// The products grid is 4-up × 3 rows in the Figma (569:39817 — twelve 272×373 cards), so this
// surface overrides the shared 20/page default with 12. Kept local rather than changing PER_PAGE,
// so /recherche and /categories product results are unaffected. Same posture as SERVICE_PER_PAGE.
const PRODUCT_PER_PAGE = 12

// Engine 1 — the products marketplace, rebuilt to the C1 Figma (569:39769). This route was a
// ComingSoon stub: the legacy consumer browse UI was stripped in PR #83 and nothing replaced it,
// so a seller could publish a product and it appeared on no marketplace surface at all.
//
// Mirrors the services engine (ServicesBrowsePage) deliberately — same shell, same data layer, same
// URL contract (q / categorie / ville / prix / tri / page), same public no-auth-gate posture. What
// differs is measured, not stylistic: a 4-up grid of 272×373 cards instead of 3-up verticals, a
// 44px search field, and a text-only lens toggle.
//
// The category list stays DB-driven (scoped to active listings) — the frame's hardcoded parents are
// a separate taxonomy-reconciliation migration.
export default async function ProduitsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  const params = { ...parseSearchParams(sp), type: 'product' as const }
  const lang = await getLang()

  const shell = await getShellUser()
  const topBarUser = shell?.topBarUser ?? null

  const [categories, cities, result] = await Promise.all([
    getFilterCategoriesForType('product'),
    getProductCities(),
    searchMarketplace(params, { perPage: PRODUCT_PER_PAGE }),
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
          {/* Mobile page title. Desktop takes its identity from the sidebar's active nav item, so
              this is below-lg only. Reuses the sidebar's own key rather than adding a second
              string for the same word. */}
          <h1 className="text-xl font-semibold text-text-primary lg:hidden">
            {t('shell.sidebar.marketplace', lang)}
          </h1>

          <ProduitsLensToggle lang={lang} />

          {/* Desktop: the top filter bar. Mobile: the existing bottom-sheet trigger, shared with
              /recherche — Ville parity there is the same logged follow-up the services bar carries. */}
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
          // Empty state — C1 specimen 571:41125 ("aucun résultat"), same treatment the services
          // surface landed on: a 1px border-subtle stroke rather than a drop shadow, pad 48/40, and
          // a 112px tinted circle around the glyph.
          <div className="flex flex-col items-center gap-5 rounded-2xl border border-border-subtle bg-white px-10 py-12 text-center">
            <span className="flex h-28 w-28 items-center justify-center rounded-full bg-surface-pill">
              <Package className="h-16 w-16 text-icon-muted" aria-hidden="true" />
            </span>
            <div className="flex max-w-md flex-col gap-2">
              <p className="text-xl font-semibold text-text-primary">
                {t(hasFilters ? 'produits.empty.filtered' : 'produits.empty.title', lang)}
              </p>
              <p className="text-base text-text-muted">
                {t(
                  hasFilters ? 'produits.empty.filteredSubtitle' : 'produits.empty.subtitle',
                  lang,
                )}
              </p>
            </div>
            {hasFilters && (
              <Link
                href={clearFiltersHref}
                className={`inline-flex h-10 items-center gap-2 rounded-[10px] bg-brand-blue-600 px-4 text-base font-semibold text-white transition-colors hover:bg-brand-blue-600/90 ${FOCUS_RING}`}
              >
                {t('produits.empty.resetFilters', lang)}
              </Link>
            )}
          </div>
        ) : (
          <>
            <ProductBrowseGrid items={result.products} />
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
