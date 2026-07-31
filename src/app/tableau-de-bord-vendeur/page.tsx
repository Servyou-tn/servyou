import type { Metadata } from 'next'
import Link from 'next/link'
import {
  Inbox,
  TrendingUp,
  Calendar,
  Package,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Pencil,
  Eye,
  ChevronRight,
  Store,
} from 'lucide-react'
import { AppShell } from '@/components/shell/AppShell'
import { StatusPill, type StatusValue } from '@/components/ui/status-pill'
import { requireShopOwner } from '@/lib/auth/require-seller'
import {
  getSellerDashboard,
  LOW_STOCK_THRESHOLD,
  type ActionableOrder,
} from '@/lib/marche/seller-dashboard'
import { nextSellerStatus, type OrderStatus, type OrderType } from '@/lib/types/order-status'
import { getLang } from '@/lib/i18n/server'
import { t, type Lang } from '@/lib/i18n'
import { FOCUS_RING } from '@/components/layout/styles'
import { StatTile } from './_components/StatTile'
import { Panel, PanelEmpty } from './_components/Panel'
import { AdvanceOrderButton } from './_components/AdvanceOrderButton'

export const metadata: Metadata = { title: 'Tableau de bord — Servyou' }

const ROUTE = '/tableau-de-bord-vendeur'

// G4 « Tableau de bord vendeur » — Figma 475:21134, built to the "journée calme" specimen
// 484:24205 (founder call): live data is 1 pending order and 0 in flight, so the calm-day state
// is the honest one and it is the state the design already covers.
//
// Action-first, not stat-led: Band 1 glances, Band 2 the Action Center (the heart — every row
// carries the one transition the seller owns), Band 3 a two-column monitor + rail. The Action
// Center is the surface that unblocks the order pipeline: before it, a buyer could create an
// order and nothing on the platform could move it.
//
// ⚑ NO MOBILE FRAME EXISTS for G4 — nor for any of the ten seller pages (G1-G9 + D3). Every
// below-lg value here is DERIVED, not measured, and each is flagged `derived:` at its call site.
// Logged in docs/follow-ups.md as a design item.

// Order lifecycle -> StatusPill status. The pill vocabulary is locked (Figma 41:694) and these
// are the order-lifecycle members of it; `prepared`/`dispatched` map onto the shipped French
// pills rather than inventing new ones.
const PILL: Record<string, StatusValue> = {
  pending: 'pending',
  accepted: 'acceptee',
  prepared: 'préparée',
  dispatched: 'expediee',
  in_delivery: 'in-transit',
  arrived: 'arrivee',
}

function pillFor(status: string): StatusValue {
  return PILL[status] ?? 'pending'
}

// The seller-facing verb for the hop this order is waiting on. Keyed by CURRENT status, since
// that is what the seller sees; the target is derived server-side in the action.
function actionLabel(order: ActionableOrder, lang: Lang): string | null {
  const next = nextSellerStatus(order.status as OrderStatus, order.orderType as OrderType)
  if (!next) return null
  return t(`seller.dashboard.advance.${next}`, lang)
}

export default async function TableauDeBordVendeurPage() {
  const lang = await getLang()
  const { userId, topBarUser, shop } = await requireShopOwner(ROUTE)
  const data = await getSellerDashboard(userId, shop?.id ?? null)

  const quickActions = [
    { key: 'addProduct', href: '/mes-produits/ajouter', icon: Plus },
    { key: 'viewOrders', href: '/commandes-recues', icon: Inbox },
    { key: 'editShop', href: '/ma-boutique/modifier', icon: Pencil },
    { key: 'viewPublic', href: shop ? `/boutique/${shop.id}` : '/devenir-vendeur', icon: Eye },
  ] as const

  return (
    <AppShell user={topBarUser}>
      {/* derived: below-lg the whole page collapses to one column (gap-6 ≈ the measured 32/24
          rhythm scaled down). The measured desktop grid is content 1136 = main 752 + rail 360. */}
      <div className="flex flex-col gap-6 lg:gap-8">
        {/* ── Band 1: header + glance ───────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-6">
          {/* derived: stacks below-lg; measured desktop is a space-between row, cta 187×40. */}
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-col gap-1">
              <h1 className="text-h1 text-text-primary">
                {t('seller.dashboard.title', lang, { shop: shop?.name ?? '' })}
              </h1>
              <p className="text-body-sm text-text-secondary">
                {t('seller.dashboard.subline', lang)}
              </p>
            </div>
            {/* The F3 Button is a real <button> with no asChild, and this CTA must navigate — so
                it is a Link carrying the primary/md shape (h-10 px-4, radius-lg, 16px SemiBold,
                blue-600 → blue-700 hover). Same treatment the EmptyState CTA uses. If a third
                link-shaped button appears, extract a shared `buttonClasses()` from the primitive
                rather than copying this a third time. */}
            <Link
              href="/mes-produits/ajouter"
              className={`inline-flex h-10 shrink-0 items-center justify-center gap-2 self-start rounded-lg bg-brand-blue-600 px-4 text-base font-semibold whitespace-nowrap text-text-inverse transition-colors hover:bg-brand-blue-700 active:bg-brand-blue-800 motion-reduce:transition-none lg:self-auto ${FOCUS_RING}`}
            >
              <Plus className="h-4 w-4 shrink-0" aria-hidden="true" />
              {t('seller.dashboard.cta_add_product', lang)}
            </Link>
          </div>

          {/* derived: 1-up / 2-up / 4-up. Measured desktop is 4 × 272 with gap 16. */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile
              label={t('seller.dashboard.tile.pending', lang)}
              value={String(data.pendingCount)}
              subtitle={t('seller.dashboard.tile.pending_sub', lang)}
              icon={Inbox}
              accent="blue"
            />
            {/* Bénéfice net — now sourced from the `unit_price_tnd` snapshot, per the founder ruling
                that the agency's delivery fee is not seller revenue (so net = price × qty over
                delivered orders and the fee plays no part).

                ⚑ GATED ON A SNAPSHOT EXISTING, NOT ON A NON-ZERO SUM. Every delivered order predates
                the column, so a naive SUM prints a confident "0 TND" — which claims the seller earned
                nothing rather than admitting nothing is measured. `netProfit === null` keeps the
                em-dash treatment that shipped, unchanged, until a real snapshot lands.

                ⚑ AND THE CAPTION GUARDS THE STEP AFTER THAT. The day the first snapshot-bearing order
                is delivered the tile flips to a real number that silently EXCLUDES the delivered
                orders predating the column — the same defect one step later. When `measuredCount`
                differs from `deliveredCount` the caption says how many are counted instead of letting
                the value imply completeness. */}
            {data.netProfit === null ? (
              <StatTile
                label={t('seller.dashboard.tile.profit', lang)}
                value="—"
                subtitle={t('seller.dashboard.tile.profit_soon', lang)}
                icon={TrendingUp}
                accent="success"
                muted
              />
            ) : (
              <StatTile
                label={t('seller.dashboard.tile.profit', lang)}
                value={t('seller.dashboard.tile.profit_value', lang, {
                  amount: data.netProfit.value.toLocaleString(lang === 'ar' ? 'ar-TN-u-nu-latn' : 'fr-FR'),
                })}
                subtitle={
                  data.netProfit.measuredCount === data.netProfit.deliveredCount
                    ? t('seller.dashboard.tile.profit_sub', lang, {
                        count: data.netProfit.deliveredCount,
                      })
                    : t('seller.dashboard.tile.profit_partial', lang, {
                        measured: data.netProfit.measuredCount,
                        total: data.netProfit.deliveredCount,
                      })
                }
                icon={TrendingUp}
                accent="success"
              />
            )}
            <StatTile
              label={t('seller.dashboard.tile.week', lang)}
              value={String(data.ordersThisWeek)}
              subtitle={t('seller.dashboard.tile.week_sub', lang)}
              icon={Calendar}
              accent="indigo"
            />
            <StatTile
              label={t('seller.dashboard.tile.products', lang)}
              value={String(data.activeProducts)}
              subtitle={t('seller.dashboard.tile.products_sub', lang)}
              icon={Package}
              accent="neutral"
            />
          </div>
        </div>

        {/* ── Band 2: Action Center ─────────────────────────────────────────────────────── */}
        <section className="flex flex-col gap-4 rounded-xl border-[1.5px] border-brand-blue-200 bg-brand-blue-50 p-6">
          <div className="flex items-center gap-2">
            <Zap className="h-[22px] w-[22px] shrink-0 text-brand-blue-600" aria-hidden="true" />
            <h2 className="text-h3 text-text-primary">{t('seller.dashboard.ac.title', lang)}</h2>
            {/* Count chip is hidden at zero — measured: the specimen sets ac-count hidden. */}
            {data.actionable.length > 0 ? (
              <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-blue-600 px-1 text-caption font-semibold text-text-inverse">
                {data.actionable.length}
              </span>
            ) : null}
          </div>

          {data.actionable.length === 0 ? (
            // Measured empty state (484:24389): centered, gap 12, py 24.
            <div className="flex w-full items-center justify-center gap-3 py-6">
              <CheckCircle2 className="h-6 w-6 shrink-0 text-success-700" aria-hidden="true" />
              <div className="flex flex-col gap-1">
                <p className="text-body font-semibold text-text-primary">
                  {t('seller.dashboard.ac.empty_title', lang)}
                </p>
                <p className="text-body text-text-secondary">
                  {t('seller.dashboard.ac.empty_body', lang)}
                </p>
              </div>
            </div>
          ) : (
            <ul className="flex flex-col gap-4">
              {data.actionable.map((order) => {
                const label = actionLabel(order, lang)
                return (
                  <li
                    key={order.id}
                    // derived: stacks below-sm. Measured desktop row is 1088×83.
                    className="flex flex-col gap-3 rounded-lg bg-surface-base p-4 sm:flex-row sm:items-center sm:gap-4"
                  >
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <StatusPill status={pillFor(order.status)}>
                          {t(`common.status_${order.status}`, lang)}
                        </StatusPill>
                        <p className="truncate text-body text-text-primary">{order.title}</p>
                      </div>
                      <p className="text-body-sm text-text-secondary">
                        {order.buyerName}
                        {order.buyerCity ? ` · ${order.buyerCity}` : ''}
                      </p>
                    </div>
                    {label ? (
                      <AdvanceOrderButton
                        orderId={order.id}
                        label={label}
                        variant={order.status === 'pending' ? 'primary' : 'secondary'}
                      />
                    ) : null}
                  </li>
                )
              })}
            </ul>
          )}

          <Link
            href="/commandes-recues"
            className={`rounded text-body-sm text-brand-blue-600 hover:underline ${FOCUS_RING}`}
          >
            {t('seller.dashboard.ac.footer', lang)}
          </Link>
        </section>

        {/* ── Band 3: monitor + rail ────────────────────────────────────────────────────── */}
        {/* derived: single column below-lg. Measured desktop is 752 + 360 with gap 24. */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[752fr_360fr]">
          <Panel
            title={t('seller.dashboard.monitor.title', lang)}
            link={{ href: '/commandes-recues', label: t('seller.dashboard.monitor.link', lang) }}
          >
            {data.inFlight.length === 0 ? (
              <PanelEmpty
                icon={Package}
                title={t('seller.dashboard.monitor.empty_title', lang)}
                body={t('seller.dashboard.monitor.empty_body', lang)}
              />
            ) : (
              <ul className="flex flex-col">
                {data.inFlight.map((order, i) => (
                  <li
                    key={order.id}
                    className={`flex items-center gap-3 py-4 ${i > 0 ? 'border-t border-border-subtle' : ''}`}
                  >
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <p className="truncate text-body text-text-primary">{order.title}</p>
                      <p className="text-body-sm text-text-secondary">
                        {order.buyerName}
                        {order.buyerCity ? ` · ${order.buyerCity}` : ''}
                      </p>
                    </div>
                    <StatusPill status={pillFor(order.status)}>
                      {t(`common.status_${order.status}`, lang)}
                    </StatusPill>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <div className="flex flex-col gap-4">
            <Panel
              title={t('seller.dashboard.lowstock.title', lang)}
              icon={AlertTriangle}
              iconClassName="text-warning-500"
            >
              {data.lowStock.length === 0 ? (
                <PanelEmpty
                  icon={Package}
                  title={t('seller.dashboard.lowstock.empty_title', lang)}
                  body={t('seller.dashboard.lowstock.empty_body', lang, {
                    threshold: LOW_STOCK_THRESHOLD,
                  })}
                />
              ) : (
                <ul className="flex flex-col gap-3">
                  {data.lowStock.map((p) => (
                    <li key={p.id} className="flex items-center gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-sunken">
                        <Package className="h-5 w-5 text-icon-muted" aria-hidden="true" />
                      </span>
                      <div className="flex min-w-0 flex-1 flex-col gap-1">
                        <p className="truncate text-body text-text-primary">{p.title}</p>
                        <p className="text-body-sm text-warning-700">
                          {t('seller.dashboard.lowstock.remaining', lang, { count: p.stockCount })}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            <Panel title={t('seller.dashboard.quick.title', lang)}>
              <ul className="flex flex-col gap-1">
                {quickActions.map((a) => (
                  <li key={a.key}>
                    <Link
                      href={a.href}
                      className={`flex items-center gap-3 rounded-lg py-2 transition-colors hover:bg-surface-sunken ${FOCUS_RING}`}
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-blue-50">
                        <a.icon className="h-5 w-5 text-brand-blue-600" aria-hidden="true" />
                      </span>
                      <span className="min-w-0 flex-1 text-body text-text-primary">
                        {t(`seller.dashboard.quick.${a.key}`, lang)}
                      </span>
                      {/* RTL: chevron must point at the reading direction's "forward". */}
                      <ChevronRight
                        className="h-5 w-5 shrink-0 text-icon-muted rtl:-scale-x-100"
                        aria-hidden="true"
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            </Panel>

            {/* A shop_owner who never completed G2 has no shop: the guard lets them through
                (only G2 can fix it) and the page says so instead of rendering zeros silently. */}
            {!shop ? (
              <Panel title={t('seller.dashboard.noshop.title', lang)} icon={Store}>
                <p className="text-body text-text-secondary">
                  {t('seller.dashboard.noshop.body', lang)}
                </p>
              </Panel>
            ) : null}
          </div>
        </div>
      </div>
    </AppShell>
  )
}
