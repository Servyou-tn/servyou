import type { Metadata } from 'next'
import { localizedMetadata } from '@/lib/i18n/metadata'
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
  Image as ImageIcon,
  MapPin,
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
import { t, tn, type Lang } from '@/lib/i18n'
import { FOCUS_RING } from '@/components/layout/styles'
import { StatTile } from './_components/StatTile'
import { Panel, PanelEmpty } from './_components/Panel'
import { AdvanceOrderButton } from './_components/AdvanceOrderButton'
import { HitArea } from '@/components/ui/interactive-surface'

export async function generateMetadata(): Promise<Metadata> {
  return localizedMetadata('meta.dashboard_seller')
}

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
// 375: measured against the m375-g4-dashboard export (Figma 1488:60277), docs/design/m375-g4-g8-deltas.md. The `derived:` notes below
// mark the values that export does not settle (the stat tiles stay one column: Q2). `max-lg:` / `max-sm:` only — desktop unchanged.

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
      <div className="flex flex-col gap-6 max-lg:gap-5 lg:gap-8">
        {/* ── Band 1: header + glance ───────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-6">
          {/* derived: stacks below-lg; measured desktop is a space-between row, cta 187×40. */}
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-col gap-1">
              <h1 className="text-h1 text-text-primary max-lg:leading-[38px]">
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
              className={`max-lg:relative inline-flex h-10 shrink-0 items-center justify-center gap-2 self-start rounded-lg bg-brand-blue-600 px-4 text-base font-semibold whitespace-nowrap text-text-inverse transition-colors hover:bg-brand-blue-700 active:bg-brand-blue-800 motion-reduce:transition-none max-lg:self-stretch lg:self-auto ${FOCUS_RING}`}
            >
              <Plus className="h-4 w-4 shrink-0" aria-hidden="true" />
              {t('seller.dashboard.cta_add_product', lang)}
              <HitArea size={40} axis="y" />
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
                  amount: data.netProfit.value.toLocaleString('fr-FR' /* both languages: the AR locale's « 1.250 » reads as millimes (#304) */),
                })}
                subtitle={
                  data.netProfit.measuredCount === data.netProfit.deliveredCount
                    ? tn('seller.dashboard.tile.profit_sub', lang, data.netProfit.deliveredCount)
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
        {/* 375: the 1.5 px stroke sits inside Figma's pad 24 / 16 → content 311. */}
        <section className="flex flex-col gap-4 rounded-xl border-[1.5px] border-brand-blue-200 bg-brand-blue-50 p-6 max-lg:px-[14.5px] max-lg:py-[22.5px]">
          <div className="flex items-center gap-2">
            <Zap className="h-[22px] w-[22px] shrink-0 text-brand-blue-600" aria-hidden="true" />
            <h2 className="text-h3 text-text-primary max-lg:leading-[26px]">{t('seller.dashboard.ac.title', lang)}</h2>
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
                    // Below sm the 375 card (OAR-*, m375-g4-dashboard): r10, 1 px border/subtle inside pad 16 (content 279), gap 16 — the
                    // placeholder thumb, the title + buyer, then the pill with the row's ONE action and « Voir détails ». Measured desktop
                    // row is 1088×83 (unchanged: the 375-only pieces are sm:hidden and their wrapper is sm:contents).
                    className="flex flex-col gap-3 rounded-lg bg-surface-base p-4 max-sm:gap-4 max-sm:rounded-[10px] max-sm:border max-sm:border-border-subtle max-sm:p-[15px] sm:flex-row sm:items-center sm:gap-4"
                  >
                    <span className="flex size-12 shrink-0 items-center justify-center rounded-md bg-surface-sunken sm:hidden">
                      <ImageIcon className="size-[22px] text-icon-muted" aria-hidden="true" />
                    </span>
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <StatusPill status={pillFor(order.status)} className="max-sm:hidden">
                          {t(`common.status_${order.status}`, lang)}
                        </StatusPill>
                        <p className="truncate text-body text-text-primary max-sm:font-semibold">{order.title}</p>
                      </div>
                      <p className="text-body-sm text-text-secondary max-sm:flex max-sm:items-center max-sm:gap-2">
                        <MapPin className="size-3.5 shrink-0 sm:hidden" aria-hidden="true" />
                        {order.buyerName}
                        {order.buyerCity ? ` · ${order.buyerCity}` : ''}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 sm:contents">
                      {/* The frame stretches the pending pill across the card; the other states hug it. */}
                      <StatusPill status={pillFor(order.status)} className={`sm:hidden ${order.status === 'pending' ? 'w-full' : ''}`}>
                        {t(`common.status_${order.status}`, lang)}
                      </StatusPill>
                      {label ? (
                        <AdvanceOrderButton
                          orderId={order.id}
                          label={label}
                          variant={order.status === 'pending' ? 'primary' : 'secondary'}
                        />
                      ) : null}
                      <Link
                        href={`/commandes-recues/${order.id}`}
                        className={`rounded text-body-sm text-brand-blue-600 hover:underline sm:hidden ${order.status === 'pending' ? 'basis-full' : ''} ${FOCUS_RING}`}
                      >
                        {t('seller.orders.view_detail', lang)}
                      </Link>
                    </div>
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
                    // Below sm the 375 List Row: pad 16, the pill beside the Semi Bold title, the buyer 8 under it.
                    className={`flex items-center gap-3 py-4 max-sm:px-4 ${i > 0 ? 'border-t border-border-subtle' : ''}`}
                  >
                    <div className="flex min-w-0 flex-1 flex-col gap-1 max-sm:gap-2">
                      <div className="flex min-w-0 items-center gap-2">
                        <p className="truncate text-body text-text-primary max-sm:font-semibold">{order.title}</p>
                        <StatusPill status={pillFor(order.status)} className="shrink-0 sm:hidden">
                          {t(`common.status_${order.status}`, lang)}
                        </StatusPill>
                      </div>
                      <p className="text-body-sm text-text-secondary">
                        {order.buyerName}
                        {order.buyerCity ? ` · ${order.buyerCity}` : ''}
                      </p>
                    </div>
                    <StatusPill status={pillFor(order.status)} className="max-sm:hidden">
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
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-sunken max-lg:rounded-md">
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
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-blue-50 max-lg:rounded-md">
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
