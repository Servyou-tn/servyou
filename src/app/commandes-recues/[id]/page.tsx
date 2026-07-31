import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Package, ChevronRight } from 'lucide-react'
import { AppShell } from '@/components/shell/AppShell'
import { StatusPill } from '@/components/ui/status-pill'
import { OrderRail } from '@/components/orders/OrderRail'
import { WhatsAppContactButton } from '@/components/orders/WhatsAppContactButton'
import { requireShopOwner } from '@/lib/auth/require-seller'
import { getSellerOrderDetail, type OrderEvent } from '@/lib/marche/seller-order-detail'
import { statusPillFor, shortRef, longDate, shortDate, shortDateTime, stageTimestamps } from '@/lib/orders/order-status'
import {
  nextSellerStatus,
  isCancellable,
  lifecycleFor,
  statusLabelKey,
  type OrderStatus,
  type OrderType,
} from '@/lib/types/order-status'
import { getLang } from '@/lib/i18n/server'
import { t, type Lang } from '@/lib/i18n'
import { FOCUS_RING } from '@/components/layout/styles'
import { AdvanceOrderButton } from '../_components/AdvanceOrderButton'
import { CancelOrderButton } from '../_components/CancelOrderButton'
import { TrackingNumberForm } from '../_components/TrackingNumberForm'

export const metadata: Metadata = { title: 'Détail de la commande — Servyou' }

const LIST = '/commandes-recues'

// G9 « Détail de la commande » — Figma 495:26112, specimens 498:26471 (pending) /
// 498:26622 (in_delivery) / 498:26793 (received), modal 499:26983.
//
// Measured layout: content pad 32 → inner 1136 · topGroup (breadcrumb + titleRow + stepper panel)
// · twoCol = main 752 + rail 360, gap 24 · panels surface/base + border/subtle + radius 12 +
// pad 24.
//
// ⚑ BOTH WITHHELD PANELS NOW SHIP. panel-suivi (497:26411) and panel-historique (504:27042) were
// absent because `orders` had no carrier/tracking columns and no per-step timestamps. The schema PR
// (migrations 20260729111547 + 20260729111613) added `carrier`, `tracking_number` and `order_events`,
// so both are real rather than decorative. Measured against those two nodes in
// docs/design/g9-deltas-2.md.
//
// ⚑ STILL ABSENT, and a later pass must NOT read these as misses:
//   · The price breakdown's "Livraison" and "Total" rows (497:26388/26392) plus their Divider.
//     `delivery_fee_tnd` was cut from the schema PR pending the per-governorate rate-table
//     decision, and a COD total that omits the fee is a wrong number. Founder call: the WHOLE
//     priceBreakdown stays out, not just the two blocked rows — its third row (a bare subtotal)
//     would restate the "Prix unitaire" line directly above it and present one row as a
//     "breakdown" with nothing to break down.
//   · The print button, the print stamp and the "Bon de livraison imprimé" timeline entry
//     (504:27030 / 504:27041 / 504:27058) — the print RPC belongs to the delivery-documents PR.
//   · The "Confirmée sur WhatsApp" timeline entry (504:27052, the row named `cr` — NOT 504:27053,
//     which is only its label; the row also carries the "· 18/07 10h45" stamp) — nothing records it, and we could
//     only ever record that the seller OPENED the prefilled link, never that a message was sent.
//
// ⚑ NO MOBILE FRAME. Every below-lg value here is DERIVED, flagged `derived:` at its call site.

/**
 * One timeline row's label, or null if the event has no honest rendering.
 *
 * ⚑ NO INVENTED COPY. `created` gets its own string; a `status_change` reuses the SAME i18n key the
 * StatusPill uses for its target state (`statusLabelKey`), so "Expédiée" in the timeline is the same
 * word as "Expédiée" in the pill and the rail. The frame supplies no status-change copy at all — its
 * three specimens are one creation plus two events nothing emits — so reusing the locked lifecycle
 * vocabulary is the decision, and it beats writing seven new sentences that could drift from the
 * pills.
 *
 * `print` returns null: the CHECK admits the type but no RPC writes it yet, and the delivery-
 * documents PR owns that copy. Returning null rather than throwing means a print row appearing
 * before its PR lands degrades to "not shown", not to a crash.
 */
function eventLabel(event: OrderEvent, orderType: OrderType, lang: Lang): string | null {
  if (event.eventType === 'created') return t('seller.orderDetail.event_created', lang)
  if (event.eventType !== 'status_change' || !event.toStatus) return null
  return t('seller.orderDetail.event_status', lang, {
    status: t(statusLabelKey(event.toStatus, orderType), lang),
  })
}

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const lang = await getLang()
  const { userId, topBarUser, shop } = await requireShopOwner(`${LIST}/${id}`)

  const order = await getSellerOrderDetail(id, userId)
  // Missing, invalid id, or an order this user does not sell — all one not-found state, so the
  // response cannot be used to probe whether an order id exists.
  if (!order) notFound()

  // Stage -> ISO of the event that reached it. Empty {} for every pre-migration order.
  const stageDates = stageTimestamps(order.events)

  const pill = statusPillFor(order.status, order.orderType)
  const next = nextSellerStatus(order.status, order.orderType)
  const ref = shortRef(order.id)
  // Terminal = shipment edits are refused by enforce_order_identity_lock, so panel-suivi renders
  // read-only rather than offering an input the database will reject.
  const isTerminal = order.status === 'received' || order.status === 'cancelled'
  const waMessage = t('seller.orders.whatsapp_message', lang, {
    buyer: order.buyerName,
    shop: shop?.name ?? '',
    ref,
    product: order.itemTitle,
  })

  return (
    <AppShell user={topBarUser}>
      <div className="flex flex-col gap-6">
        {/* ── topGroup: breadcrumb · title + pill · date ── */}
        <div className="flex flex-col gap-4">
          <nav aria-label={t('seller.orderDetail.breadcrumb_aria', lang)}>
            <ol className="flex items-center gap-1 text-caption text-text-muted">
              <li>
                <Link href={LIST} className={`rounded hover:underline ${FOCUS_RING}`}>
                  {t('seller.orders.title', lang)}
                </Link>
              </li>
              <li aria-hidden="true">
                <ChevronRight className="h-3 w-3 rtl:-scale-x-100" />
              </li>
              <li aria-current="page" className="text-text-secondary">
                {ref}
              </li>
            </ol>
          </nav>

          {/* derived: stacks below-lg. Measured desktop is a space-between row. */}
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <h1 className="text-h1 text-text-primary">
                {t('seller.orderDetail.title', lang, { ref })}
              </h1>
              {pill ? (
                <StatusPill status={pill.pill}>{t(pill.labelKey, lang)}</StatusPill>
              ) : null}
            </div>
            <p className="text-body-sm text-text-secondary">
              {order.receivedAt
                ? t('seller.orderDetail.received_on', lang, { date: longDate(order.receivedAt, lang) })
                : t('seller.orderDetail.created_on', lang, { date: longDate(order.createdAt, lang) })}
            </p>
          </div>

          <section className="rounded-xl border border-border-subtle bg-surface-base p-6">
            {/* The SELLER's chain — 7 steps for a product, 4 for a service. Deliberately not
                E3's RAIL_STAGES: that is the buyer's service rail, and showing a seller four
                steps would be showing them someone else's journey. */}
            {/* Per-stage timestamps, from the event whose `to_status` is that stage. The map is
                built ONCE here rather than searched per node, so the rail stays O(stages) instead
                of O(stages x events).

                ⚑ A stage shows a date only if an event recorded it, which means the CURRENT stage
                gets one too — it has genuinely been reached and its event exists. Restricting this
                to strictly-completed stages would hide the one timestamp a seller is most likely to
                want ("when did this become my problem"). Figma settles nothing here: the frame has
                no timestamp layer at all (see the F2 retraction in docs/design/g9-deltas-2.md), so
                the rule follows the DATA — an event happened, so there is a date to show.

                The common case is NO dates at all: every one of the 14 pre-migration orders has
                zero events, so `stageTimestamps` returns {} and every node renders its label alone.
                That path is the default, not the fallback. */}
            <OrderRail
              stages={lifecycleFor(order.orderType)}
              status={order.status}
              labelKeyFor={(stage) => statusLabelKey(stage as OrderStatus, order.orderType)}
              timestampFor={(stage) => {
                const iso = stageDates[stage]
                return iso ? shortDate(iso, lang) : null
              }}
              lang={lang}
            />
          </section>
        </div>

        {/* ── twoCol: main 752 + rail 360 ── */}
        {/* derived: single column below-lg. Measured desktop is 752fr/360fr with gap 24. */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[752fr_360fr]">
          <div className="flex flex-col gap-4">
            {/* panel-produit */}
            <section className="flex flex-col gap-4 rounded-xl border border-border-subtle bg-surface-base p-6">
              <h2 className="text-h3 text-text-primary">
                {t(
                  order.orderType === 'product'
                    ? 'seller.orderDetail.product'
                    : 'seller.orderDetail.service',
                  lang,
                )}
              </h2>
              <div className="flex items-start gap-4">
                <Package className="mt-1 h-7 w-7 shrink-0 text-icon-muted" aria-hidden="true" />
                <div className="flex min-w-0 flex-col gap-1">
                  <p className="text-body font-semibold text-text-primary">{order.itemTitle}</p>
                  <p className="text-body-sm text-text-secondary">
                    {t('seller.orderDetail.quantity', lang, { n: order.quantity })}
                  </p>
                  {order.unitPrice != null ? (
                    <p className="text-body-sm text-text-secondary">
                      {t('seller.orderDetail.unit_price', lang, { price: order.unitPrice })}
                    </p>
                  ) : null}
                </div>
              </div>
              {/* The frame's Livraison + Total rows are omitted — no delivery_fee column, and a
                  total equal to the subtotal would be a wrong number on a COD invoice. */}
              <p className="text-body-sm text-text-muted">{t('seller.orderDetail.cod_note', lang)}</p>
            </section>

            {/* panel-livraison */}
            <section className="flex flex-col gap-4 rounded-xl border border-border-subtle bg-surface-base p-6">
              <h2 className="text-h3 text-text-primary">
                {t('seller.orderDetail.delivery', lang)}
              </h2>
              <dl className="flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                  <dt className="text-body-sm text-text-secondary">
                    {t('seller.orderDetail.recipient', lang)}
                  </dt>
                  <dd className="text-body text-text-primary">
                    {order.deliveryName || order.buyerName}
                  </dd>
                </div>
                <div className="flex flex-col gap-1">
                  <dt className="text-body-sm text-text-secondary">
                    {t('seller.orderDetail.address', lang)}
                  </dt>
                  <dd className="text-body text-text-primary">{order.deliveryStreet || '—'}</dd>
                </div>
                {order.deliveryGovernorate ? (
                  <div className="flex flex-col gap-1">
                    <dt className="text-body-sm text-text-secondary">
                      {t('seller.orderDetail.city', lang)}
                    </dt>
                    <dd className="text-body text-text-primary">{order.deliveryGovernorate}</dd>
                  </div>
                ) : null}
              </dl>

              {/* NOTE DU CLIENT — the frame's quote block. A product order carries free text; a
                  service order carries the folded brief E1 wrote, parsed into its three parts. */}
              {order.buyerNote ? (
                <div className="rounded-lg bg-surface-sunken p-4">
                  <p className="text-caption font-semibold uppercase tracking-wide text-text-muted">
                    {t('seller.orderDetail.buyer_note', lang)}
                  </p>
                  <p className="mt-1 text-body-sm text-text-primary">« {order.buyerNote} »</p>
                </div>
              ) : null}
              {order.serviceBrief && order.serviceBrief.description ? (
                <div className="flex flex-col gap-2 rounded-lg bg-surface-sunken p-4">
                  <p className="text-caption font-semibold uppercase tracking-wide text-text-muted">
                    {t('seller.orderDetail.buyer_brief', lang)}
                  </p>
                  <p className="text-body-sm text-text-primary">{order.serviceBrief.description}</p>
                  {order.serviceBrief.timeframe ? (
                    <p className="text-body-sm text-text-secondary">
                      {t('seller.orderDetail.brief_timeframe', lang, {
                        value: order.serviceBrief.timeframe,
                      })}
                    </p>
                  ) : null}
                  {order.serviceBrief.budget ? (
                    <p className="text-body-sm text-text-secondary">
                      {t('seller.orderDetail.brief_budget', lang, {
                        value: order.serviceBrief.budget,
                      })}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </section>

            {/* ── panel-suivi (497:26411) ──
                PRODUCT ORDERS ONLY, matching CHECK orders_shipment_requires_product: a service has
                no parcel, so a carrier or a tracking number on one is meaningless data. The panel is
                absent entirely on a service order rather than rendered empty.

                Also absent on a TERMINAL order: enforce_order_identity_lock refuses shipment edits
                once status is received/cancelled, so the input would be dead. A delivered order's
                tracking number is still shown — as read-only text via the carrier/tracking rows —
                but there is nothing left to enter. */}
            {order.orderType === 'product' ? (
              <section className="flex flex-col gap-4 rounded-xl border border-border-subtle bg-surface-base p-6">
                <h2 className="text-h3 text-text-primary">
                  {t('seller.orderDetail.shipping', lang)}
                </h2>

                {/* CARRIER IS READ-ONLY, per the frame and per the founder call. Figma renders
                    "Société de livraison" as static text in an lv block and gives an Input only to
                    the tracking number. `carrier` IS seller-writable in the schema, but no surface
                    can populate it (shops.preferred_carriers is free text with no edit route), so
                    shipping an input here would be exactly the dead field this panel was withheld to
                    avoid. Logged in docs/follow-ups.md — G3 shop edit is where it should feed from.

                    The row RENDERS WITH AN EM-DASH rather than hiding: the seller is told the
                    platform tracks a carrier and simply has none recorded yet. Hiding it would make
                    a field that exists look like a field that does not, and the value appears the
                    moment G3 can write it. */}
                <div className="flex flex-col gap-1">
                  <p className="text-body-sm text-text-muted">
                    {t('seller.orderDetail.carrier', lang)}
                  </p>
                  <p className="text-body text-text-primary">{order.carrier ?? '—'}</p>
                </div>

                {isTerminal ? (
                  <div className="flex flex-col gap-1">
                    <p className="text-body-sm text-text-muted">
                      {t('seller.orderDetail.tracking_label', lang)}
                    </p>
                    <p className="text-body text-text-primary">{order.trackingNumber ?? '—'}</p>
                  </div>
                ) : (
                  <TrackingNumberForm
                    orderId={order.id}
                    initialValue={order.trackingNumber}
                    lang={lang}
                  />
                )}
              </section>
            ) : null}

            {/* ── panel-historique (504:27042) ──
                REAL EVENTS ONLY. The frame's three specimens are "Commande créée", "Confirmée sur
                WhatsApp" and "Bon de livraison imprimé"; only the first has a data source, so the
                other two are not rendered (see the header note). What DOES render is `created` plus
                every real `status_change`, labelled with the SAME i18n keys the StatusPill uses so
                the lifecycle vocabulary is identical everywhere it appears — the frame gives no copy
                for a status-change row, so this is a decision, not a measurement.

                ⚑ THE PANEL IS ABSENT, NOT EMPTY, when there are no events. All 14 pre-migration
                orders have zero rows, and there is no empty-state frame for this panel. An empty
                "Historique" with a heading and nothing under it asserts that nothing happened to an
                order that demonstrably shipped — absence says only "not recorded", which is true.
                The cancellation entry that this panel used to render on its own is now just the
                `status_change → cancelled` event, carrying its reason in `note`. */}
            {order.events.length > 0 ? (
              <section className="flex flex-col gap-4 rounded-xl border border-border-subtle bg-surface-base p-6">
                <h2 className="text-h3 text-text-primary">
                  {t('seller.orderDetail.history', lang)}
                </h2>
                {/* Measured from Figma 504:27044: timeline gap 16 · entry = a gap-8 row of a 10px
                    dot and a gap-6 label/time pair · `timelineLine` a 2px #cbd5e1 rule running
                    through the dot centres (dot spans 0–10 so its centre is 5; a 2px rule at
                    start-1 centres on 5 too). The rule is inset 10px top and bottom so it starts
                    and stops AT the first and last dot rather than overshooting — Figma's is 74
                    tall inside a 95 timeline, i.e. half an entry short at each end. */}
                <ol className="relative flex flex-col gap-4">
                  <span
                    aria-hidden="true"
                    className="absolute inset-y-2.5 start-1 w-0.5 bg-border-strong"
                  />
                  {order.events.map((event, i) => {
                    const label = eventLabel(event, order.orderType, lang)
                    if (!label) return null
                    return (
                      <li key={`${event.createdAt}-${i}`} className="relative flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span
                            aria-hidden="true"
                            className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                              event.toStatus === 'cancelled'
                                ? 'bg-danger-500'
                                : 'bg-brand-blue-600'
                            }`}
                          />
                          {/* Figma's `cr` frame — label and time share a 6px gap, tighter than the
                              8px between the dot and the pair. */}
                          <span className="flex min-w-0 items-center gap-1.5">
                            <span className="text-body-sm text-text-primary">{label}</span>
                            <span className="text-body-sm text-text-muted">
                              · {shortDateTime(event.createdAt, lang)}
                            </span>
                          </span>
                        </div>
                        {/* The cancellation reason rides on the event's own `note`, written by
                            emit_order_event from new.cancellation_reason. */}
                        {event.note ? (
                          <p className="ms-4 ps-0.5 text-body-sm text-text-muted">
                            {t('seller.orders.cancelled_reason', lang, { reason: event.note })}
                          </p>
                        ) : null}
                      </li>
                    )
                  })}
                </ol>
              </section>
            ) : null}
          </div>

          {/* ── rail ── */}
          <div className="flex flex-col gap-4">
            {/* panel-client */}
            <section className="flex flex-col gap-4 rounded-xl border border-border-subtle bg-surface-base p-6">
              <h2 className="text-h3 text-text-primary">{t('seller.orderDetail.client', lang)}</h2>
              <div className="flex flex-col gap-1">
                <p className="text-body font-semibold text-text-primary">{order.buyerName}</p>
                {order.buyerCity ? (
                  <p className="text-body-sm text-text-secondary">{order.buyerCity}</p>
                ) : null}
              </div>
              {/* The number itself is NOT rendered — get_contact_phone is relationship-gated and
                  the reveal happens on click, inside WhatsAppContactButton. */}
              <p className="text-body-sm text-text-muted">
                {t('seller.orderDetail.phone_disclosure', lang)}
              </p>
              <WhatsAppContactButton
                buyerId={order.buyerId}
                size="lg"
                label={t('seller.orderDetail.whatsapp_cta', lang)}
                message={waMessage}
              />
            </section>

            {/* panel-action — "Prochaine étape" */}
            <section className="flex flex-col gap-4 rounded-xl border border-border-subtle bg-surface-base p-6">
              <h2 className="text-h3 text-text-primary">
                {t('seller.orderDetail.next_step', lang)}
              </h2>

              {next ? (
                <>
                  {/* Figma 497:26458 — Button 312×48, full width, filled primary. It and the
                      WhatsApp button above are the same rank in the frame, so they are the same
                      size here. `variant`/`fullWidth` keep the row's compact secondary intact. */}
                  <AdvanceOrderButton
                    orderId={order.id}
                    label={t(`seller.orders.advance.${next}`, lang)}
                    variant="primary"
                    size="lg"
                    fullWidth
                  />
                  <p className="text-body-sm text-text-muted">
                    {t(
                      order.status === 'pending'
                        ? 'seller.orderDetail.hint_pending'
                        : 'seller.orderDetail.hint_generic',
                      lang,
                    )}
                  </p>
                </>
              ) : (
                <p className="text-body-sm text-text-muted">
                  {t(
                    order.status === 'arrived'
                      ? 'seller.orders.awaiting_buyer'
                      : 'seller.orderDetail.no_action',
                    lang,
                  )}
                </p>
              )}

              {isCancellable(order.status) ? (
                <CancelOrderButton
                  orderId={order.id}
                  status={order.status}
                  orderType={order.orderType}
                  lang={lang}
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
