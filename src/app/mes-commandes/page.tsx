import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ShoppingBag } from 'lucide-react'
import { AppShell } from '@/components/shell/AppShell'
import { Pagination } from '@/components/shared/Pagination'
import { buildSearchQuery } from '@/components/recherche/search-url'
import { getShellUser } from '@/lib/marche/shell-user'
import { getMyProductOrders, getMyServiceOrders } from '@/lib/marche/my-orders'
import { parseOrdersParams } from '@/lib/marche/my-orders-params'
import { getLang } from '@/lib/i18n/server'
import { t } from '@/lib/i18n'
import { FOCUS_RING } from '@/components/layout/styles'
import { OrdersTabs } from './_components/OrdersTabs'
import { OrdersFilterBar } from './_components/OrdersFilterBar'
import { MARCHE_ENGINE_PATHS } from '@/lib/marche/marche-routing'
import { OrdersList } from './_components/OrdersList'
import { ProductOrdersList } from './_components/ProductOrdersList'

// E3 — /mes-commandes. Services tab rebuilt from Figma 709:59662 (1440) / 710:59945 (375); Produits tab from
// 704:58976 (1440) / 706:59409 (375). Replaces the ComingSoon stub left by chore/strip-legacy-consumer-ui.
//
// Both tabs are real: `?tab=produits|services` picks one (an unknown value falls back to DEFAULT_ORDERS_TAB —
// Produits, as the frame draws it). Until the Produits tab existed, a buyer who ordered a PRODUCT could not see the
// order anywhere.
//
// URL contract, mirroring /marche/services so the back button replays state:
//   ?tab= &q= &statut= &tri= &page=
//
// The accordion carries the whole detail in place, so no « Voir le détail » link is rendered. /mes-commandes/[id]
// stays a placeholder on purpose — E4 needs a Figma design first (docs/design/e3-produits-measurements.md).

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
  const products = params.tab === 'produits'
  const result = products ? await getMyProductOrders(shell.id, params) : await getMyServiceOrders(shell.id, params)

  const hasFilters = params.q.trim() !== '' || params.statut !== 'all'
  const clearQs = buildSearchQuery('', { tab: params.tab })
  const clearHref = clearQs ? `${BASE}?${clearQs}` : BASE

  return (
    <AppShell user={shell.topBarUser}>
      <div className="flex flex-col gap-4 lg:gap-6">
        {/* 22/28 on mobile (710:59946), 28/36 on desktop (709:59667). */}
        <h1 className="text-[22px] font-semibold leading-7 text-text-primary lg:text-[28px] lg:leading-9">
          {t('mesCommandes.title', lang)}
        </h1>

        <OrdersTabs lang={lang} tab={params.tab} />

        <OrdersFilterBar key={`${params.tab}|${params.q}`} tab={params.tab} q={params.q} statut={params.statut} tri={params.tri} basePath={BASE} />

        {result.totalCount === 0 ? (
          <div className="flex flex-col items-center gap-5 rounded-2xl border border-border-subtle bg-surface-base px-6 py-12 text-center lg:px-10">
            <span className="flex h-28 w-28 items-center justify-center rounded-full bg-surface-pill">
              <ShoppingBag className="h-16 w-16 text-icon-muted" aria-hidden="true" />
            </span>
            <div className="flex max-w-md flex-col gap-2">
              <p className="text-xl font-semibold text-text-primary">
                {t(hasFilters ? 'mesCommandes.empty.filtered' : products ? 'mesCommandes.empty.produits' : 'mesCommandes.empty', lang)}
              </p>
              <p className="text-base text-text-muted">
                {t(hasFilters ? 'mesCommandes.empty.filteredSubtitle' : products ? 'mesCommandes.empty.produits.subtitle' : 'mesCommandes.empty.subtitle', lang)}
              </p>
            </div>
            <Link
              href={hasFilters ? clearHref : products ? MARCHE_ENGINE_PATHS.product : MARCHE_ENGINE_PATHS.service}
              className={`inline-flex h-10 items-center gap-2 rounded-[10px] bg-brand-blue-600 px-4 text-base font-semibold text-text-inverse transition-colors hover:bg-brand-blue-700 ${FOCUS_RING}`}
            >
              {t(hasFilters ? 'mesCommandes.empty.reset' : products ? 'mesCommandes.empty.produits.cta' : 'mesCommandes.empty.cta', lang)}
            </Link>
          </div>
        ) : (
          <>
            {products ? (
              <ProductOrdersList orders={(result as Awaited<ReturnType<typeof getMyProductOrders>>).orders} />
            ) : (
              <OrdersList orders={(result as Awaited<ReturnType<typeof getMyServiceOrders>>).orders} />
            )}
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
