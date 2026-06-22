import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { MarcheLayout } from '@/components/marche/MarcheLayout'
import { PageHeader } from '@/components/marche/PageHeader'
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
// writes ?type=product|service; each tab paginates independently in JS (?page=) via the shared
// helper. The header count + the Type filter read the full set; only the rendered grid is the
// active tab's page slice. ?type values stay product|service to match SidebarSelectFilter and
// MesFavorisView (the locked note said produits/services, but those would break the tab switch).
export default async function MesFavorisPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const shell = await getShellUser()
  if (!shell) redirect('/connexion')

  const lang = await getLang()
  const { products, services } = await getMyFavorites(shell.id)
  const total = products.length + services.length

  const sp = await searchParams
  const rawType = Array.isArray(sp.type) ? sp.type[0] : sp.type
  const activeType: 'product' | 'service' = rawType === 'service' ? 'service' : 'product'
  const rawPage = Array.isArray(sp.page) ? sp.page[0] : sp.page

  const activeCount = activeType === 'service' ? services.length : products.length
  const { totalPages, safePage, start, end } = paginate(
    activeCount,
    Math.max(1, Number.parseInt(rawPage ?? '1', 10) || 1),
  )
  // Hand MesFavorisView only the active tab's page slice (it picks by ?type=); the other tab
  // renders on its own navigation, so it stays empty here. Slice each typed array in its own
  // branch so the element types stay narrow (no ProductListing | ServiceListing union).
  const productsPage = activeType === 'product' ? products.slice(start, end) : []
  const servicesPage = activeType === 'service' ? services.slice(start, end) : []

  // The Produits/Services choice lives in the sidebar (the "Mes favoris" expandable group).
  // It writes ?type=; MesFavorisView reads it. Only offered when there are favorites.
  const typeFilter =
    total > 0 ? (
      <SidebarSelectFilter
        paramName="type"
        groupLabel="Type"
        defaultValue="product"
        basePath="/mes-favoris"
        ariaShow="Afficher le filtre Type"
        ariaHide="Masquer le filtre Type"
        options={[
          { value: 'product', label: t('common.products_section', lang) },
          { value: 'service', label: t('common.services_section', lang) },
        ]}
      />
    ) : undefined

  return (
    <MarcheLayout user={shell.topBarUser} sidebarFilter={typeFilter}>
      <PageHeader
        title={t('favorites.title', lang)}
        countLabel={total > 0 ? t('mesfavoris.count', lang, { n: total }) : undefined}
      />
      <MesFavorisView products={productsPage} services={servicesPage} />
      <div className="mt-8">
        <Pagination page={safePage} totalPages={totalPages} basePath="/mes-favoris" />
      </div>
    </MarcheLayout>
  )
}
