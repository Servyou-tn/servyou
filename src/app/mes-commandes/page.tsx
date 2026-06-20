import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { MarcheLayout } from '@/components/marche/MarcheLayout'
import { PageHeader } from '@/components/marche/PageHeader'
import { EmptyState } from '@/components/marche/EmptyState'
import { MesCommandesList } from '@/components/marche/MesCommandesList'
import { SidebarSelectFilter } from '@/components/marche/SidebarSelectFilter'
import { getShellUser } from '@/lib/marche/shell-user'
import { getMyOrders } from '@/lib/marche/my-data'
import { getLang } from '@/lib/i18n/server'
import { t } from '@/lib/i18n'
import { ShoppingBagIcon } from '@/components/dashboard/consumer/icons'

export const metadata: Metadata = { title: 'Mes commandes — Servyou' }

// The buyer's own orders. Auth-gated (own data) → redirect to /connexion when logged out.
export default async function MesCommandesPage() {
  const shell = await getShellUser()
  if (!shell) redirect('/connexion')

  const lang = await getLang()
  const orders = await getMyOrders(shell.id)

  // The status filter lives in the sidebar (the "Mes commandes" expandable group). It writes
  // ?statut=; MesCommandesList reads it. Only offered when there are orders to filter.
  const statutFilter =
    orders.length > 0 ? (
      <SidebarSelectFilter
        paramName="statut"
        groupLabel="Statut"
        defaultValue="all"
        basePath="/mes-commandes"
        ariaShow="Afficher le filtre Statut"
        ariaHide="Masquer le filtre Statut"
        options={[
          { value: 'all', label: t('mescommandes.filter.all', lang) },
          { value: 'active', label: t('mescommandes.filter.active', lang) },
          { value: 'delivered', label: t('mescommandes.filter.delivered', lang) },
          { value: 'cancelled', label: t('mescommandes.filter.cancelled', lang) },
        ]}
      />
    ) : undefined

  return (
    <MarcheLayout user={shell.topBarUser} sidebarFilter={statutFilter}>
      <PageHeader
        title={t('marche.sidebar.commandes', lang)}
        countLabel={orders.length > 0 ? t('mescommandes.count', lang, { n: orders.length }) : undefined}
      />

      {orders.length === 0 ? (
        <EmptyState
          icon={<ShoppingBagIcon className="mx-auto h-12 w-12" />}
          message={t('mescommandes.empty', lang)}
          cta={{ label: t('marche.browse_cta', lang), href: '/marche' }}
        />
      ) : (
        <MesCommandesList orders={orders} />
      )}
    </MarcheLayout>
  )
}
