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
import { FreelancesFilterBar } from './FreelancesFilterBar'

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
  const params = { q, categorie: parsed.categorie, ville: parsed.ville, tri: parseFreelancerSort(sp.tri), page: parsed.page }

  const [categories, cities, searched] = await Promise.all([
    getFilterCategoriesForType('service'),
    getFreelancerCities(),
    settle('marche/services freelances', searchFreelancers(params)),
  ])
  const result = searched.ok ? searched.data : null
  const favorited = result ? await getFavoritedIds('freelancer', result.freelancers.map((f) => f.id)) : new Set<string>()

  const hasFilters = params.q !== '' || params.categorie.length > 0 || params.ville != null

  return (
    <AppShell user={topBarUser}>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-4">
          {/* Mobile page title — desktop takes its identity from the sidebar's active item. */}
          <h1 className="text-xl font-semibold text-text-primary lg:hidden">{t('shell.sidebar.marketplace', lang)}</h1>

          <ServicesLensToggle lang={lang} active="freelances" />

          <FreelancesFilterBar
            categories={categories}
            cities={cities}
            selectedCategorie={params.categorie}
            ville={params.ville}
            tri={params.tri}
            q={params.q}
            basePath={BASE}
          />
        </div>

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
    </AppShell>
  )
}
