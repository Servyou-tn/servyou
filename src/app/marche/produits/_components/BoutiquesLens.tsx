import Link from 'next/link'
import { AppShell } from '@/components/shell/AppShell'
import { ErrorState } from '@/components/marche/ErrorState'
import { Pagination } from '@/components/shared/Pagination'
import { ShopCard } from '@/components/shops/ShopCard'
import { StorefrontIcon } from '@/components/marche/icons'
import { FOCUS_RING } from '@/components/layout/styles'
import { getShopCities, getShopFilterCategories } from '@/lib/marche/shop-filters'
import { getFavoritedIds } from '@/lib/marche/favorite-state'
import { ilikePattern, parseSearchParams } from '@/lib/search/search-params'
import { parseShopSort, searchShops } from '@/lib/search/search-shops'
import { settle } from '@/lib/supabase/query-error'
import { t, type Lang } from '@/lib/i18n'
import type { TopBarUser } from '@/components/marche/ProfileAvatarMenu'
import { ProduitsLensToggle } from './ProduitsLensToggle'
import { BoutiquesFilterBar } from './BoutiquesFilterBar'

const BASE = '/marche/produits'

// The « Boutiques » lens of /marche/produits — Figma 578:42528 (C1 — vue Boutiques): the lens toggle, the filter bar, a 2-up grid of
// Shop Cards (560 wide, gap 16) and the numbered pagination with its « Affichage 1 à N sur M » caption. Reached with
// `?vue=boutiques`; public, no auth gate (the hearts send a guest to sign in).
//
// Data: `searchShops` (public shops; name search, declared category, city, sort) → `getShopCards` — the SAME card loader /mes-favoris
// uses. The page's own failure becomes an inline ErrorState (the shell, the toggle and the bar stay), never « aucune boutique ».
export async function BoutiquesLens({
  sp,
  lang,
  topBarUser,
}: {
  sp: Record<string, string | string[] | undefined>
  lang: Lang
  topBarUser: TopBarUser | null
}) {
  const parsed = parseSearchParams(sp)
  // A query made only of characters the search strips (`%`, `_`, `*`, brackets…) filters nothing, so it must not look like a filter
  // either (no « %% » chip, no « Aucune boutique ne correspond »): normalise it away once, here.
  const q = ilikePattern(parsed.q) ? parsed.q.trim() : ''
  const params = {
    q,
    categorie: parsed.categorie,
    ville: parsed.ville,
    tri: parseShopSort(sp.tri),
    page: parsed.page,
  }

  const [categories, cities, searched] = await Promise.all([
    getShopFilterCategories(),
    getShopCities(),
    settle('marche/produits boutiques', searchShops(params)),
  ])
  const result = searched.ok ? searched.data : null
  const favorited = result ? await getFavoritedIds('shop', result.shops.map((s) => s.id)) : new Set<string>()

  const hasFilters = params.q.trim() !== '' || params.categorie.length > 0 || params.ville != null
  const clearFiltersHref = `${BASE}?vue=boutiques`

  return (
    <AppShell user={topBarUser}>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-4">
          {/* Mobile page title — desktop takes its identity from the sidebar's active item. */}
          <h1 className="text-xl font-semibold text-text-primary lg:hidden">{t('shell.sidebar.marketplace', lang)}</h1>

          <ProduitsLensToggle lang={lang} active="boutiques" />

          {/* The bar follows `q` from the URL by itself (render-time sync) — no remount, so a submitted search keeps the focus. */}
          <BoutiquesFilterBar
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
              <StorefrontIcon className="h-16 w-16 text-icon-muted" aria-hidden="true" />
            </span>
            <div className="flex max-w-md flex-col gap-2">
              <p className="text-xl font-semibold text-text-primary">
                {t(hasFilters ? 'boutiques.empty.filtered' : 'boutiques.empty.title', lang)}
              </p>
              <p className="text-base text-text-muted">
                {t(hasFilters ? 'boutiques.empty.filteredSubtitle' : 'boutiques.empty.subtitle', lang)}
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
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {result.shops.map((shop) => (
                <ShopCard
                  key={shop.id}
                  shop={shop}
                  lang={lang}
                  heart={{ initialFavorited: favorited.has(shop.id), isLoggedIn: topBarUser !== null }}
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
