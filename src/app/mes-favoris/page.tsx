import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { MarcheLayout } from '@/components/marche/MarcheLayout'
import { PageHeader } from '@/components/marche/PageHeader'
import { MesFavorisView } from '@/components/marche/MesFavorisView'
import { SidebarSelectFilter } from '@/components/marche/SidebarSelectFilter'
import { getShellUser } from '@/lib/marche/shell-user'
import { getMyFavorites } from '@/lib/marche/my-data'
import { getLang } from '@/lib/i18n/server'
import { t } from '@/lib/i18n'

export const metadata: Metadata = { title: 'Mes favoris — Servyou' }

// The user's favorited products + services. Auth-gated (own data).
export default async function MesFavorisPage() {
  const shell = await getShellUser()
  if (!shell) redirect('/connexion')

  const lang = await getLang()
  const { products, services } = await getMyFavorites(shell.id)
  const total = products.length + services.length

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
      <MesFavorisView products={products} services={services} />
    </MarcheLayout>
  )
}
