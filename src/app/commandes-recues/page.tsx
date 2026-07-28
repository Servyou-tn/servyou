import type { Metadata } from 'next'
import Link from 'next/link'
import { Inbox } from 'lucide-react'
import { AppShell } from '@/components/shell/AppShell'
import { Pagination } from '@/components/shared/Pagination'
import { requireShopOwner } from '@/lib/auth/require-seller'
import {
  getSellerOrders,
  ORDER_TABS,
  ORDERS_PER_PAGE,
  DEFAULT_ORDER_TAB,
  type OrderTab,
  type SellerOrderSort,
} from '@/lib/marche/seller-orders'
import { getLang } from '@/lib/i18n/server'
import { t } from '@/lib/i18n'
import { FOCUS_RING } from '@/components/layout/styles'
import { cn } from '@/lib/utils'
import { OrderActionRow } from './_components/OrderActionRow'
import { SortSelect } from './_components/SortSelect'

export const metadata: Metadata = { title: 'Commandes reçues — Servyou' }

const ROUTE = '/commandes-recues'

// G8 « Commandes reçues » — Figma 489:25211, built to the `filtre` specimen 490:25690 (the
// no-multi-select layout) plus the empty state 490:26034 and the cancel modal 490:26058.
//
// The seller's inbox and, with G4's action centre, the other half of what unblocks the order
// pipeline: every seller-owned transition is reachable from a row here.
//
// ⚑ MULTI-SELECT IS DELIBERATELY ABSENT. The main frame bakes in a checkbox column and a
// "Tout sélectionner" header (508:27221), but that exists to feed the bordereau de ramassage,
// and the delivery documents are deferred to their own PR pending the schema work
// (delivery_fee / carrier / slip reference). Building multi-select now would mean defining
// partial-failure semantics for a feature with no destination. The `filtre` specimen is the
// same list WITHOUT the checkbox column, so it is the honest target. See docs/follow-ups.md.
//
// ⚑ NO MOBILE FRAME EXISTS for G8 (nor for any of the ten seller pages). Every below-lg value
// here is DERIVED, not measured, and flagged `derived:` at its call site.

function parseTab(v: string | undefined): OrderTab {
  return (ORDER_TABS as readonly string[]).includes(v ?? '') ? (v as OrderTab) : DEFAULT_ORDER_TAB
}

function parseSort(v: string | undefined): SellerOrderSort {
  return v === 'oldest' ? 'oldest' : 'recent'
}

function first(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v
}

export default async function CommandesRecuesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  const lang = await getLang()
  const { userId, topBarUser, shop } = await requireShopOwner(ROUTE)

  const tab = parseTab(first(sp.statut))
  const sort = parseSort(first(sp.tri))
  const page = Math.max(1, Number(first(sp.page) ?? '1') || 1)

  const data = await getSellerOrders(userId, { tab, sort, page })

  const hrefFor = (next: { statut?: OrderTab; tri?: SellerOrderSort; page?: number }) => {
    const q = new URLSearchParams()
    const s = next.statut ?? tab
    const o = next.tri ?? sort
    if (s !== DEFAULT_ORDER_TAB) q.set('statut', s)
    if (o !== 'recent') q.set('tri', o)
    // Changing tab or sort resets to page 1 — keeping the old page number would land the seller
    // on an out-of-range page of a different result set.
    const p = next.page ?? 1
    if (p > 1) q.set('page', String(p))
    const qs = q.toString()
    return qs ? `${ROUTE}?${qs}` : ROUTE
  }

  return (
    <AppShell user={topBarUser}>
      <div className="flex flex-col gap-6">
        {/* ── header (measured 1136×63: title 32/38 over a 14/21 subline, gap 4) ── */}
        <div className="flex flex-col gap-1">
          <h1 className="text-h1 text-text-primary">{t('seller.orders.title', lang)}</h1>
          <p className="text-body-sm text-text-secondary">{t('seller.orders.subline', lang)}</p>
        </div>

        {/* ── filterArea: status tabs over a metaRow (count ⟷ sort). Measured gap 16. ── */}
        <div className="flex flex-col gap-4">
          {/* derived: the tab strip scrolls horizontally below-lg rather than wrapping, so the
              active tab stays reachable on a narrow viewport. Desktop is a 1136-wide row. */}
          {/* Underlined text tabs, measured from Figma 489:25351: a 1px border/subtle rule under
              the strip, Tab Item h44 px16, active = blue/600 Semi Bold with a 2px blue/600 bottom
              indicator, inactive = text/muted Medium 16/26. NO count chips on any tab — the frame
              has none, not even on the active one.
              derived: the strip scrolls horizontally below-lg so the active tab stays reachable. */}
          <div
            role="tablist"
            aria-label={t('seller.orders.tabs_aria', lang)}
            className="flex overflow-x-auto border-b border-border-subtle"
          >
            {ORDER_TABS.map((key) => {
              const active = key === tab
              return (
                <Link
                  key={key}
                  href={hrefFor({ statut: key })}
                  role="tab"
                  aria-selected={active}
                  className={cn(
                    'relative flex h-11 shrink-0 items-center justify-center px-4 text-body whitespace-nowrap transition-colors',
                    active
                      ? 'font-semibold text-brand-blue-600'
                      : 'font-medium text-text-muted hover:text-text-primary',
                    FOCUS_RING,
                  )}
                >
                  {t(`seller.orders.tab.${key}`, lang)}
                  {active ? (
                    <span
                      aria-hidden="true"
                      className="absolute inset-x-0 bottom-0 h-0.5 bg-brand-blue-600"
                    />
                  ) : null}
                </Link>
              )
            })}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-body-sm text-text-secondary">
              {t('seller.orders.count', lang, { count: data.totalCount })}
            </p>
            <SortSelect
              value={sort}
              options={(['recent', 'oldest'] as const).map((o) => ({
                value: o,
                label: t(`seller.orders.sort.${o}`, lang),
                href: hrefFor({ tri: o }),
              }))}
              label={t('seller.orders.sort_aria', lang)}
            />
          </div>
        </div>

        {/* ── list, or the measured empty state (490:26038) ── */}
        {data.orders.length === 0 ? (
          <div className="flex flex-col items-center gap-5 rounded-2xl border border-border-subtle bg-surface-base px-10 py-12 text-center">
            <span className="flex h-28 w-28 items-center justify-center rounded-full bg-surface-pill">
              <Inbox className="h-16 w-16 text-icon-muted" aria-hidden="true" />
            </span>
            <div className="flex flex-col gap-2">
              <p className="text-h3 text-text-primary">
                {t(
                  tab === 'a_traiter'
                    ? 'seller.orders.empty_actionable_title'
                    : 'seller.orders.empty_title',
                  lang,
                )}
              </p>
              <p className="text-body text-text-secondary">
                {t(
                  tab === 'a_traiter'
                    ? 'seller.orders.empty_actionable_body'
                    : 'seller.orders.empty_body',
                  lang,
                )}
              </p>
            </div>
          </div>
        ) : (
          <ul className="flex flex-col gap-4">
            {data.orders.map((order) => (
              <OrderActionRow
                key={order.id}
                order={order}
                lang={lang}
                detailHref={`${ROUTE}/${order.id}`}
                shopName={shop?.name ?? ''}
              />
            ))}
          </ul>
        )}

        {/* Shared Pagination preserves every other search param itself (it reads useSearchParams),
            so `statut` and `tri` survive a page change without being threaded through. */}
        <Pagination
          page={data.page}
          totalPages={data.totalPages}
          basePath={ROUTE}
          totalItems={data.totalCount}
          perPage={ORDERS_PER_PAGE}
        />
      </div>
    </AppShell>
  )
}
