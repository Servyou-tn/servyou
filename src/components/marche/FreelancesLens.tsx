import Link from 'next/link'
import { Users } from 'lucide-react'
import { AppShell } from '@/components/shell/AppShell'
import { ErrorState } from '@/components/marche/ErrorState'
import { Pagination } from '@/components/shared/Pagination'
import { FreelancerCard } from '@/components/freelancers/FreelancerCard'
import { FOCUS_RING } from '@/components/layout/styles'
import { getFilterCategoriesForType } from '@/lib/marche/filter-categories'
import { getFreelancerCities } from '@/lib/marche/freelancer-filters'
import { getFavoritedIds } from '@/lib/marche/favorite-state'
import { getShellUser } from '@/lib/marche/shell-user'
import { ilikePattern, parseSearchParams } from '@/lib/search/search-params'
import { parseFreelancerSort, searchFreelancers } from '@/lib/search/search-freelancers'
import { settle } from '@/lib/supabase/query-error'
import { getLang } from '@/lib/i18n/server'
import { t } from '@/lib/i18n'
import { ServicesLensToggle } from './ServicesLensToggle'
import { MarketplaceMobileHeader } from './MarketplaceMobileHeader'
import { ServicesFilterBar } from './ServicesFilterBar'

const BASE = '/marche/services'
const LENS_HREF = `${BASE}?vue=freelances`

// The « Freelances » lens of /marche/services — Figma 662:53894 (1440) / 663:55017 (375). The lens toggle, the filter bar, a 2-up grid of
// Freelancer Cards (556 wide, gap 24) and the numbered pagination with its « Affichage 1 à N sur M » caption. Reached with `?vue=freelances`
// (the same `vue` parameter as the Boutiques lens of /marche/produits); public, no auth gate — the hearts send a guest to sign in.
// Decisions: docs/design/freelances-lens-deltas.md.
//
// Data: `searchFreelancers` (published, non-moderated freelancers; name / headline / skills search, sector, city, sort) → `getFreelancerCards`
// — the SAME card loader /mes-favoris uses. A failed search becomes an inline ErrorState (the shell, the toggle and the bar stay), never
// « aucun freelance ».
export async function FreelancesLens({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams
  const lang = await getLang()
  const shell = await getShellUser()
  const topBarUser = shell?.topBarUser ?? null

  const parsed = parseSearchParams(sp)
  // A query made only of characters the search strips filters nothing, so it must not look like a filter either.
  const q = ilikePattern(parsed.q) ? parsed.q.trim() : ''
  const params = {
    q,
    categorie: parsed.categorie,
    ville: parsed.ville,
    prixMin: parsed.prixMin,
    prixMax: parsed.prixMax,
    tri: parseFreelancerSort(sp.tri),
    page: parsed.page,
  }

  const [categories, cities, searched] = await Promise.all([
    getFilterCategoriesForType('service'),
    getFreelancerCities(),
    settle('marche/services freelances', searchFreelancers(params)),
  ])
  const result = searched.ok ? searched.data : null
  const favorited = result ? await getFavoritedIds('freelancer', result.freelancers.map((f) => f.id)) : new Set<string>()

  const hasFilters = params.q !== '' || params.categorie.length > 0 || params.ville != null || params.prixMin != null || params.prixMax != null

  return (
    <AppShell user={topBarUser}>
      {/* Below `lg` the frame (m375-marche-freelances) opens with the same « Marketplace » + search block as the Services lens; spacing is the frame's. */}
      <div className="flex flex-col gap-6 max-lg:gap-0">
        <MarketplaceMobileHeader
          lang={lang}
          action={BASE}
          q={params.q}
          placeholderKey="freelances.filters.searchPlaceholder"
          keep={{
            vue: 'freelances',
            ...(params.categorie.length ? { categorie: params.categorie.join(',') } : {}),
            ...(params.ville ? { ville: params.ville } : {}),
            ...(params.prixMin != null ? { prix_min: String(params.prixMin) } : {}),
            ...(params.prixMax != null ? { prix_max: String(params.prixMax) } : {}),
            ...(params.tri !== 'recent' ? { tri: params.tri } : {}),
          }}
        />
        <div className="flex flex-col gap-4 max-lg:gap-0 max-lg:pt-1">
          <ServicesLensToggle lang={lang} active="freelances" />

          {/* The SAME Filter Bar as the Services lens (Figma 662:53894 « Filter Bar / viewport=desktop »): search · Catégorie · Ville · Prix · Trier.
              The 375 frame (663:55017) draws NO in-page filter — only the toggle and the cards — so below `lg` there is none (open question D9). */}
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
              searchPlaceholderKey="freelances.filters.searchPlaceholder"
            />
          </div>

        </div>

        <div className="flex flex-col gap-6 max-lg:mt-5">
          {result === null ? (
            <ErrorState lang={lang} />
          ) : result.totalCount === 0 ? (
            <div className="flex flex-col items-center gap-5 rounded-2xl border border-border-subtle bg-white px-10 py-12 text-center">
              <span className="flex h-28 w-28 items-center justify-center rounded-full bg-surface-pill">
                <Users className="h-16 w-16 text-icon-muted" aria-hidden="true" />
              </span>
              <div className="flex max-w-md flex-col gap-2">
                <p className="text-xl font-semibold text-text-primary">
                  {t(hasFilters ? 'freelances.empty.filtered' : 'freelances.empty.title', lang)}
                </p>
                <p className="text-base text-text-muted">
                  {t(hasFilters ? 'freelances.empty.filteredSubtitle' : 'freelances.empty.subtitle', lang)}
                </p>
              </div>
              {hasFilters && (
                <Link
                  href={LENS_HREF}
                  className={`inline-flex h-10 items-center gap-2 rounded-[10px] bg-brand-blue-600 px-4 text-base font-semibold text-white transition-colors hover:bg-brand-blue-600/90 ${FOCUS_RING}`}
                >
                  {t('produits.empty.resetFilters', lang)}
                </Link>
              )}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
                {result.freelancers.map((freelancer) => (
                  <FreelancerCard
                    key={freelancer.id}
                    freelancer={freelancer}
                    lang={lang}
                    heart={{ initialFavorited: favorited.has(freelancer.id), isLoggedIn: topBarUser !== null }}
                  />
                ))}
              </div>
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
      </div>
    </AppShell>
  )
}
