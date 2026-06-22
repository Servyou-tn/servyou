import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { MarcheLayout } from '@/components/marche/MarcheLayout'
import { PageHeader } from '@/components/marche/PageHeader'
import { PageHeader as PageSubtitle } from '@/components/shared/PageHeader'
import { MesFavorisView } from '@/components/marche/MesFavorisView'
import { SidebarSelectFilter } from '@/components/marche/SidebarSelectFilter'
import { getShellUser } from '@/lib/marche/shell-user'
import { getMyFavorites } from '@/lib/marche/my-data'
import { paginate } from '@/lib/search/search-params'
import { Pagination } from '@/components/shared/Pagination'
import { getLang } from '@/lib/i18n/server'
import { t } from '@/lib/i18n'

export const metadata: Metadata = { title: 'Mes favoris — Servyou' }

// The user's favorited products + services. Auth-gated (own data). The sidebar Type filter
// writes ?type=product|service (absent = the default "Tous"/all view). Tous shows products +
// services interleaved by recency (the combined list); each kind keeps its own ?type= view. One
// ?page= paginates whichever list the filter selects, via the shared paginate() helper; changing
// the filter resets the page (different list). The header count reflects the active filter.
export default async function MesFavorisPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const shell = await getShellUser()
  if (!shell) redirect('/connexion')

  const lang = await getLang()
  const { products, services, combined } = await getMyFavorites(shell.id)
  const total = products.length + services.length

  const sp = await searchParams
  const rawType = Array.isArray(sp.type) ? sp.type[0] : sp.type
  const view: 'all' | 'product' | 'service' =
    rawType === 'product' || rawType === 'service' ? rawType : 'all'
  const rawPage = Array.isArray(sp.page) ? sp.page[0] : sp.page

  // Paginate the active list: the combined recency list for Tous, the single kind otherwise.
  const activeLen =
    view === 'product' ? products.length : view === 'service' ? services.length : combined.length
  const { totalPages, safePage, start, end } = paginate(
    activeLen,
    Math.max(1, Number.parseInt(rawPage ?? '1', 10) || 1),
  )
  const productsPage = view === 'product' ? products.slice(start, end) : []
  const servicesPage = view === 'service' ? services.slice(start, end) : []
  const combinedPage = view === 'all' ? combined.slice(start, end) : []

  // Counter reflects the currently-filtered view (combined total / products / services).
  const viewCount = view === 'product' ? products.length : view === 'service' ? services.length : total

  const typeFilter =
    total > 0 ? (
      <SidebarSelectFilter
        paramName="type"
        groupLabel="Type"
        defaultValue="all"
        basePath="/mes-favoris"
        resetPageOnSelect
        ariaShow="Afficher le filtre Type"
        ariaHide="Masquer le filtre Type"
        options={[
          { value: 'all', label: t('favorites.filter.all', lang) },
          { value: 'product', label: t('common.products_section', lang) },
          { value: 'service', label: t('common.services_section', lang) },
        ]}
      />
    ) : undefined

  return (
    <MarcheLayout user={shell.topBarUser} sidebarFilter={typeFilter}>
      <PageSubtitle
        subtitle={t('page_header.favoris.subtitle', lang)}
        emphasisWord={t('page_header.favoris.emphasis', lang)}
      />
      {viewCount > 0 && (
        <PageHeader countLabel={t('mesfavoris.count', lang, { n: viewCount })} />
      )}
      <MesFavorisView
        view={view}
        combined={combinedPage}
        products={productsPage}
        services={servicesPage}
        productTotal={products.length}
        serviceTotal={services.length}
        lang={lang}
      />
      <div className="mt-8">
        <Pagination page={safePage} totalPages={totalPages} basePath="/mes-favoris" />
      </div>
    </MarcheLayout>
  )
}
