import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { MarcheLayout } from '@/components/marche/MarcheLayout'
import { PageHeader } from '@/components/marche/PageHeader'
import { EmptyState } from '@/components/marche/EmptyState'
import { MesCommandesList } from '@/components/marche/MesCommandesList'
import { SidebarSelectFilter } from '@/components/marche/SidebarSelectFilter'
import { getShellUser } from '@/lib/marche/shell-user'
import { getMyOrders, type MyOrder } from '@/lib/marche/my-data'
import { paginate } from '@/lib/search/search-params'
import { Pagination } from '@/components/shared/Pagination'
import { getLang } from '@/lib/i18n/server'
import { t } from '@/lib/i18n'
import { ShoppingBagIcon } from '@/components/dashboard/consumer/icons'

export const metadata: Metadata = { title: 'Mes commandes — Servyou' }

// The sidebar Statut filter (?statut=) — moved here from the client list so it composes with
// pagination (filter first, then slice). Same semantics as before: active = anything not
// terminal; delivered = received; cancelled = cancelled.
type StatutFilter = 'all' | 'active' | 'delivered' | 'cancelled'
function matchesStatut(o: MyOrder, f: StatutFilter): boolean {
  if (f === 'all') return true
  if (f === 'delivered') return o.status === 'received'
  if (f === 'cancelled') return o.status === 'cancelled'
  return o.status !== 'received' && o.status !== 'cancelled'
}

// The buyer's own orders. Auth-gated (own data) → redirect to /connexion when logged out. The
// full set is fetched, filtered by ?statut=, then paginated in JS (?page=). The header count and
// the global empty-state read the UNFILTERED set, so a filter that matches nothing shows a blank
// list (never the "browse the marketplace" CTA, which only fits a buyer with no orders at all).
export default async function MesCommandesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const shell = await getShellUser()
  if (!shell) redirect('/connexion')

  const lang = await getLang()
  const orders = await getMyOrders(shell.id)

  const sp = await searchParams
  const rawStatut = Array.isArray(sp.statut) ? sp.statut[0] : sp.statut
  const statut: StatutFilter =
    rawStatut === 'active' || rawStatut === 'delivered' || rawStatut === 'cancelled'
      ? rawStatut
      : 'all'
  const filtered = orders.filter((o) => matchesStatut(o, statut))
  const rawPage = Array.isArray(sp.page) ? sp.page[0] : sp.page
  const { totalPages, safePage, start, end } = paginate(
    filtered.length,
    Math.max(1, Number.parseInt(rawPage ?? '1', 10) || 1),
  )
  const pageOrders = filtered.slice(start, end)

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
        <>
          <MesCommandesList orders={pageOrders} />
          <div className="mt-8">
            <Pagination page={safePage} totalPages={totalPages} basePath="/mes-commandes" />
          </div>
        </>
      )}
    </MarcheLayout>
  )
}
