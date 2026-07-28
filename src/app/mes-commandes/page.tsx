import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ShoppingBag } from 'lucide-react'
import { AppShell } from '@/components/shell/AppShell'
import { Pagination } from '@/components/shared/Pagination'
import { buildSearchQuery } from '@/components/recherche/search-url'
import { getShellUser } from '@/lib/marche/shell-user'
import { getMyServiceOrders } from '@/lib/marche/my-orders'
import { parseOrdersParams } from '@/lib/marche/my-orders-params'
import { getLang } from '@/lib/i18n/server'
import { t } from '@/lib/i18n'
import { FOCUS_RING } from '@/components/layout/styles'
import { OrdersTabs } from './_components/OrdersTabs'
import { OrdersFilterBar } from './_components/OrdersFilterBar'
import { OrdersList } from './_components/OrdersList'

// E3 — /mes-commandes, SERVICES tab, rebuilt from Figma 709:59662 (1440) / 710:59945 (375).
// Replaces the ComingSoon stub left by chore/strip-legacy-consumer-ui.
//
// Services only. The Produits tab is a later PR: the toggle renders it disabled with a "Bientôt"
// badge and NOTHING here can render a product order — getMyServiceOrders filters on
// order_type='service' at the query level, so there is no code path that would.
//
// URL contract, mirroring /marche/services so the back button replays state:
//   ?tab=services (canonical; ?tab=produits falls back here rather than 404-ing)
//   ?q= &statut= &tri= &page=
//
// The accordion carries the whole detail in place, which is why no /mes-commandes/[id] link is
// rendered. That route stays a stub on purpose — the three things this design drops (buyer
// cancellation, the buyer's own brief, the cancellation reason) are logged follow-ups and [id]
// is where they land.

const BASE = '/mes-commandes'

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLang()
  return { title: `${t('mesCommandes.title', lang)} — Servyou` }
}

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> }

export default async function MesCommandesPage({ searchParams }: Props) {
  const shell = await getShellUser()
  if (!shell) redirect('/connexion')

  const [sp, lang] = await Promise.all([searchParams, getLang()])
  const params = parseOrdersParams(sp)
  // A failed query throws (my-orders.ts) rather than degrading to "you have no orders".
  const result = await getMyServiceOrders(shell.id, params)

  const hasFilters = params.q.trim() !== '' || params.statut !== 'all'
  const clearQs = buildSearchQuery('', { tab: 'services' })
  const clearHref = clearQs ? `${BASE}?${clearQs}` : BASE

  return (
    <AppShell user={shell.topBarUser}>
      <div className="flex flex-col gap-4 lg:gap-6">
        {/* 22/28 on mobile (710:59946), 28/36 on desktop (709:59667). */}
        <h1 className="text-[22px] font-semibold leading-7 text-text-primary lg:text-[28px] lg:leading-9">
          {t('mesCommandes.title', lang)}
        </h1>

        <OrdersTabs lang={lang} />

        <OrdersFilterBar q={params.q} statut={params.statut} tri={params.tri} basePath={BASE} />

        {result.totalCount === 0 ? (
          <div className="flex flex-col items-center gap-5 rounded-2xl border border-border-subtle bg-surface-base px-6 py-12 text-center lg:px-10">
            <span className="flex h-28 w-28 items-center justify-center rounded-full bg-surface-pill">
              <ShoppingBag className="h-16 w-16 text-icon-muted" aria-hidden="true" />
            </span>
            <div className="flex max-w-md flex-col gap-2">
              <p className="text-xl font-semibold text-text-primary">
                {t(hasFilters ? 'mesCommandes.empty.filtered' : 'mesCommandes.empty', lang)}
              </p>
              <p className="text-base text-text-muted">
                {t(hasFilters ? 'mesCommandes.empty.filteredSubtitle' : 'mesCommandes.empty.subtitle', lang)}
              </p>
            </div>
            <Link
              href={hasFilters ? clearHref : '/marche/services'}
              className={`inline-flex h-10 items-center gap-2 rounded-[10px] bg-brand-blue-600 px-4 text-base font-semibold text-text-inverse transition-colors hover:bg-brand-blue-700 ${FOCUS_RING}`}
            >
              {t(hasFilters ? 'mesCommandes.empty.reset' : 'mesCommandes.empty.cta', lang)}
            </Link>
          </div>
        ) : (
          <>
            <OrdersList orders={result.orders} />
            <Pagination
              page={result.page}
              totalPages={result.totalPages}
              basePath={BASE}
              totalItems={result.totalCount}
              perPage={result.perPage}
            />
          </>
        )}
      </div>
    </AppShell>
  )
}
