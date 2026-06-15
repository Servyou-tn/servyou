import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { MarcheLayout } from '@/components/marche/MarcheLayout'
import { PageHeader } from '@/components/marche/PageHeader'
import { EmptyState } from '@/components/marche/EmptyState'
import { MesCommandesList } from '@/components/marche/MesCommandesList'
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

  return (
    <MarcheLayout user={shell.topBarUser}>
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
