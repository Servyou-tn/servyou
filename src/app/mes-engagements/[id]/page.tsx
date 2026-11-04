import type { Metadata } from 'next'
import { localizedMetadata } from '@/lib/i18n/metadata'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Briefcase, ChevronRight } from 'lucide-react'
import { AppShell } from '@/components/shell/AppShell'
import { StatusPill } from '@/components/ui/status-pill'
import { OrderRail } from '@/components/orders/OrderRail'
import { OrderTimeline } from '@/components/orders/OrderTimeline'
import { WhatsAppContactButton } from '@/components/orders/WhatsAppContactButton'
import { AdvanceOrderButton } from '@/components/orders/AdvanceOrderButton'
import { CancelOrderButton } from '@/components/orders/CancelOrderButton'
import { FOCUS_RING } from '@/components/layout/styles'
import { requireFreelancer } from '@/lib/auth/require-seller'
import { getSellerOrderDetail } from '@/lib/marche/seller-order-detail'
import {
  engagementReceivedAt,
  headerDateFor,
  isEngagementOrder,
  nextStepHintKey,
  requestRows,
  showCancelReasonInRail,
} from '@/lib/marche/engagement-detail'
import { isUuid } from '@/lib/uuid'
import { formatServicePrice, servicePriceLabel } from '@/lib/freelance/service-price'
import { SERVICE_CANCEL_REASONS } from '@/lib/orders/cancel-reasons'
import { cancelledAfterStage } from '@/lib/orders/buyer-order'
import { longDate, shortDate, shortRef, stageTimestamps, statusPillFor } from '@/lib/orders/order-status'
import { isCancellable, lifecycleFor, nextSellerStatus, statusLabelKey, type OrderStatus } from '@/lib/types/order-status'
import { getLang } from '@/lib/i18n/server'
import { t } from '@/lib/i18n'

export async function generateMetadata(): Promise<Metadata> {
  return localizedMetadata('meta.engagement_detail')
}

const LIST = '/mes-engagements'

// H8 PR-2 « Détail d'un engagement » — /mes-engagements/[id]. Built first from G9's page (495:26112) under the D↔H mirror
// principle, then aligned on its own frames: 1596:40690 (1440) and 1596:41132 (375) — measured in
// docs/design/h8-h6-deltas.md. Two-column body (main 752 + rail 360, gap 24), panels `surface/base` + `border/subtle` +
// radius 12 + pad 24 (24/16 below lg).
//
// What is DIFFERENT from G9, on purpose:
//   • the rail is the SERVICE chain (4 stages: pending → accepted → arrived → received), « Travail livré » for
//     `arrived`;
//   • no shipping panel, no COD note, no price breakdown, no delivery address — a service has no parcel
//     (CHECK orders_shipment_requires_product / orders_delivery_fee_requires_product);
//   • « Demande du client » carries the BUYER'S stated budget and timeframe from the brief (architect ruling D3:
//     the list says « Dès X TND », the detail says what the client wrote);
//   • the cancel presets are the freelancer's (SERVICE_CANCEL_REASONS) and every transition revalidates
//     /mes-engagements.
//
// Guard: requireFreelancer + getSellerOrderDetail (scoped on orders.seller_id, the column the transition trigger
// authorises on). A malformed id, an unknown id, someone else's order and a non-service order are ONE 404, so the
// response cannot be used to probe which ids exist.
//
// Below lg (1596:41132): one column, content gap 20, panels pad 24/16, the stepper vertical.

export default async function EngagementDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  // Before the session is touched: a malformed id is a 404 for everyone and never reaches the sign-in `next`.
  if (!isUuid(id)) notFound()
  const [lang, { userId, topBarUser }] = await Promise.all([getLang(), requireFreelancer(`${LIST}/${id}`)])

  // A failed query throws (an error page), it is NOT a 404 — only a missing / foreign order is.
  const order = await getSellerOrderDetail(id, userId)
  if (!order || !isEngagementOrder(order)) notFound()

  const stageDates = stageTimestamps(order.events)
  const receivedAt = engagementReceivedAt(order)
  const header = headerDateFor(order, receivedAt)
  const pill = statusPillFor(order.status, 'service')
  const next = nextSellerStatus(order.status, 'service')
  const ref = shortRef(order.id)
  // « #DC1D6B » inside an Arabic sentence is reordered by the bidi algorithm (« DC1D6B# »): LRI … PDI isolates it as
  // one left-to-right run. Only for what is DISPLAYED — the WhatsApp text keeps the plain ref.
  const refShown = `\u2066${ref}\u2069`
  const request = requestRows(order.serviceBrief)
  const clientName = order.buyerName || t('engagements.client_unknown', lang)
  const whatsappMessage = t('engagements.whatsapp_message', lang, { buyer: clientName, ref, service: order.itemTitle })

  return (
    <AppShell user={topBarUser}>
      <div className="flex flex-col gap-8 max-lg:gap-5">
        {/* ── topGroup: header (breadcrumb · title + pill · date, gap 12) · stepper — gap 24 ── */}
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-3">
            {/* Breadcrumb: Medium 14, chevron 14, gap 8 — the link blue/600, the current crumb text/primary. */}
            <nav aria-label={t('seller.orderDetail.breadcrumb_aria', lang)}>
              <ol className="flex items-center gap-2 text-sm font-medium">
                <li>
                  <Link href={LIST} className={`rounded text-brand-blue-600 hover:underline ${FOCUS_RING}`}>
                    {t('engagements.title', lang)}
                  </Link>
                </li>
                <li aria-hidden="true" className="text-text-muted">
                  <ChevronRight className="h-3.5 w-3.5 rtl:-scale-x-100" />
                </li>
                <li aria-current="page" className="text-text-primary">
                  {refShown}
                </li>
              </ol>
            </nav>

            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-h1 text-text-primary">{t('engagements.detail.title', lang, { ref: refShown })}</h1>
                {pill ? <StatusPill status={pill.pill}>{t(pill.labelKey, lang)}</StatusPill> : null}
              </div>
              <p className="text-body-sm text-text-secondary">
                {t(`engagements.detail.${header.key}_on`, lang, { date: longDate(header.iso, lang) })}
              </p>
            </div>
          </div>

          <section className="rounded-xl border border-border-subtle bg-surface-base p-6 max-lg:px-4">
            {/* The seller's chain for a service: 4 stages, in the « Order Stepper » look the frame draws (14 px labels, the
                connector blue behind a completed stage, no date on desktop — the date layer is hidden). A stage shows a date
                only if an event recorded it (stageTimestamps). */}
            {/* The frame's « Order Stepper » is a fixed 544×77 band: the 56 px nodes plus the hidden date row's room. */}
            <div className="lg:min-h-19.25">
              <OrderRail
                look="detail"
                ariaLabel={t('buyerOrder.stepper_aria', lang)}
                stages={lifecycleFor('service')}
                status={order.status}
                labelKeyFor={(stage) => statusLabelKey(stage as OrderStatus, 'service')}
                timestampFor={(stage) => {
                  const iso = stageDates[stage]
                  return iso ? shortDate(iso, lang) : null
                }}
                lang={lang}
                // A cancelled engagement: E4's red « Annulée » node in place of the stage after the last one reached
                // (founder ruling, PR-2). OrderRail's detail look and cancelledAfterStage already handle the service chain.
                cancelledAfter={order.status === 'cancelled' ? cancelledAfterStage(order.events, lifecycleFor('service')) : undefined}
                cancelledLabelKey="common.status_cancelled"
              />
            </div>
          </section>
        </div>

        {/* ── twoCol: main 752 + rail 360, gap 24 (one column below lg, gap 20) ── */}
        <div className="grid grid-cols-1 gap-6 max-lg:gap-5 lg:grid-cols-[752fr_360fr]">
          <div className="flex flex-col gap-4">
            {/* panel-service */}
            <section className="flex flex-col gap-4 rounded-xl border border-border-subtle bg-surface-base p-6 max-lg:px-4">
              <h2 className="text-h3 text-text-primary">{t('engagements.detail.service_panel', lang)}</h2>
              <div className="flex items-start gap-4">
                {/* thumb: a 28 px sunken tile (border/subtle, radius 8) — drawn 28×80 at 1440 (the row's height), 28×28 at
                    375. The frame's icon-package is a Figma slip (a package reads as a parcel): founder ruling, the Briefcase. */}
                <span
                  aria-hidden="true"
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-border-subtle bg-surface-sunken lg:h-20"
                >
                  <Briefcase className="h-7 w-7 text-icon-muted" />
                </span>
                <div className="flex min-w-0 flex-col gap-1">
                  <p dir="auto" className="text-body font-semibold text-text-primary">
                    {order.itemTitle}
                  </p>
                  {order.unitPrice != null ? (
                    <p className="text-body-sm text-text-secondary">
                      {t('engagements.detail.starting_price', lang, {
                        price: servicePriceLabel(formatServicePrice(order.unitPrice, lang), order.priceUnit, lang),
                      })}
                    </p>
                  ) : null}
                </div>
              </div>
            </section>

            {/* panel-demande — what the CLIENT wrote (E1 folds it into buyer_note; getSellerOrderDetail parses it).
                The budget and the timeframe are the buyer's own words, shown as such — never as a price. */}
            <section className="flex flex-col gap-4 rounded-xl border border-border-subtle bg-surface-base p-6 max-lg:px-4">
              <h2 className="text-h3 text-text-primary">{t('engagements.detail.request_panel', lang)}</h2>
              {request.empty ? (
                <p className="text-body-sm text-text-muted">{t('engagements.detail.request_empty', lang)}</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {/* noteQuote: surface/subtle, a 3 px blue/200 start rule (sampled from the PNG), radius 8, pad 12/12/12/16 measured
                      from the outer edge (so 13 inside the rule); caption Medium 12 muted,
                      the client's words body-sm secondary, gap 4. */}
                  {request.description ? (
                    <div className="flex flex-col gap-1 rounded-lg border-s-3 border-brand-blue-200 bg-surface-subtle py-3 ps-3.25 pe-3">
                      <p className="text-caption font-medium uppercase text-text-muted">
                        {t('seller.orderDetail.buyer_brief', lang)}
                      </p>
                      <p dir="auto" className="whitespace-pre-line text-body-sm text-text-secondary">
                        {request.description}
                      </p>
                    </div>
                  ) : null}
                  <dl className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
                    <div className="flex flex-col gap-1">
                      <dt className="text-body-sm text-text-muted">{t('engagements.detail.stated_budget', lang)}</dt>
                      <dd className="text-body text-text-primary">
                        {request.budget ? (
                          <bdi>{t('engagements.detail.amount', lang, { value: request.budget })}</bdi>
                        ) : (
                          <span className="text-text-muted">{t('engagements.detail.not_specified', lang)}</span>
                        )}
                      </dd>
                    </div>
                    <div className="flex flex-col gap-1">
                      <dt className="text-body-sm text-text-muted">{t('engagements.detail.stated_timeframe', lang)}</dt>
                      <dd className="text-body text-text-primary">
                        {request.timeframe ? (
                          <bdi>{request.timeframe}</bdi>
                        ) : (
                          <span className="text-text-muted">{t('engagements.detail.not_specified', lang)}</span>
                        )}
                      </dd>
                    </div>
                  </dl>
                </div>
              )}
            </section>

            {/* panel-historique — real events only; absent (not empty) for orders that predate order_events. */}
            <OrderTimeline
              events={order.events}
              orderType="service"
              heading={t('engagements.detail.history', lang)}
              createdLabel={t('engagements.detail.event_created', lang)}
              lang={lang}
            />
          </div>

          {/* ── rail ── */}
          <div className="flex flex-col gap-4">
            {/* panel-client */}
            <section className="flex flex-col gap-4 rounded-xl border border-border-subtle bg-surface-base p-6 max-lg:px-4">
              <h2 className="text-h3 text-text-primary">{t('seller.orderDetail.client', lang)}</h2>
              {/* clientRow: name Semi Bold 16 over the city body-sm muted, gap 4 — no avatar in the frame. */}
              <div className="flex min-w-0 flex-col gap-1">
                {/* <bdi>, not dir="auto": a Latin name stays one isolated run but the line keeps the page's start (right in AR). */}
                <p className="truncate text-body font-semibold text-text-primary">
                  <bdi>{clientName}</bdi>
                </p>
                {order.buyerCity ? <p className="text-body-sm text-text-muted">{order.buyerCity}</p> : null}
              </div>
              {/* The number is NOT rendered — get_contact_phone is relationship-gated and revealed on click. */}
              <p className="text-caption font-medium text-text-muted">{t('seller.orderDetail.phone_disclosure', lang)}</p>
              <WhatsAppContactButton
                targetId={order.buyerId}
                size="lg"
                glyphClassName=""
                label={t('seller.orderDetail.whatsapp_cta', lang)}
                message={whatsappMessage}
              />
            </section>

            {/* panel-action — « Prochaine étape » */}
            <section className="flex flex-col gap-4 rounded-xl border border-border-subtle bg-surface-base p-6 max-lg:px-4">
              <h2 className="text-h3 text-text-primary">{t('seller.orderDetail.next_step', lang)}</h2>

              {next ? (
                <AdvanceOrderButton
                  orderId={order.id}
                  label={t(`engagements.advance.${next}`, lang)}
                  revalidate="/mes-engagements"
                  variant="primary"
                  size="lg"
                  fullWidth
                />
              ) : null}
              <p className="text-body-sm text-text-secondary">{t(nextStepHintKey(order.status), lang)}</p>

              {showCancelReasonInRail(order) ? (
                <p className="text-body-sm text-text-muted">
                  {t('seller.orders.cancelled_reason', lang, { reason: order.cancellationReason ?? '' })}
                </p>
              ) : null}

              {isCancellable(order.status) ? (
                <CancelOrderButton
                  orderId={order.id}
                  status={order.status}
                  orderType="service"
                  lang={lang}
                  reasons={SERVICE_CANCEL_REASONS}
                  revalidate="/mes-engagements"
                  asLink
                />
              ) : null}
            </section>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
