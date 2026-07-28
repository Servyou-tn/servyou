import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Package, ChevronRight } from 'lucide-react'
import { AppShell } from '@/components/shell/AppShell'
import { StatusPill } from '@/components/ui/status-pill'
import { OrderLifecycleStepper } from '@/components/OrderLifecycleStepper'
import { WhatsAppContactButton } from '@/components/orders/WhatsAppContactButton'
import { requireShopOwner } from '@/lib/auth/require-seller'
import { getSellerOrderDetail } from '@/lib/marche/seller-order-detail'
import { statusPillFor, shortRef, longDate } from '@/lib/orders/order-status'
import { nextSellerStatus, isCancellable } from '@/lib/types/order-status'
import { getLang } from '@/lib/i18n/server'
import { t } from '@/lib/i18n'
import { FOCUS_RING } from '@/components/layout/styles'
import { AdvanceOrderButton } from '../_components/AdvanceOrderButton'
import { CancelOrderButton } from '../_components/CancelOrderButton'

export const metadata: Metadata = { title: 'Détail de la commande — Servyou' }

const LIST = '/commandes-recues'

// G9 « Détail de la commande » — Figma 495:26112, specimens 498:26471 (pending) /
// 498:26622 (in_delivery) / 498:26793 (received), modal 499:26983.
//
// Measured layout: content pad 32 → inner 1136 · topGroup (breadcrumb + titleRow + stepper panel)
// · twoCol = main 752 + rail 360, gap 24 · panels surface/base + border/subtle + radius 12 +
// pad 24.
//
// ⚑ TWO PANELS FROM THE FRAME ARE DELIBERATELY ABSENT, founder call:
//   panel-suivi (497:26411)      — "Société de livraison" + a tracking-number INPUT. There is no
//                                  carrier column and no tracking column, so the field would be a
//                                  dead input. An empty Suivi panel teaches a seller the feature
//                                  is broken; absence teaches nothing false.
//   panel-historique (504:27042) — a timeline of EVENTS ("Confirmée sur WhatsApp", "Bon de
//                                  livraison imprimé"). None is derivable: `orders` has no
//                                  per-step timestamps and nothing records a WhatsApp
//                                  confirmation or a print.
// EXCEPTION: the cancellation entry IS rendered, because cancelled_by, cancellation_reason and
// cancelled_at all exist. One real entry beats a panel of nothing.
// Both return with the schema PR (delivery_fee · carrier · tracking · print stamp · order_events).
//
// Also absent for the same reason: the price breakdown's "Livraison" and "Total" rows — there is
// no delivery_fee, and a total that silently equals the subtotal would be a wrong number on a COD
// invoice. The unit price and quantity ARE shown.
//
// ⚑ NO MOBILE FRAME. Every below-lg value here is DERIVED, flagged `derived:` at its call site.

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

  const pill = statusPillFor(order.status, order.orderType)
  const next = nextSellerStatus(order.status, order.orderType)
  const ref = shortRef(order.id)
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
            <OrderLifecycleStepper
              status={order.status}
              order_type={order.orderType}
              cancelled_by={order.cancelledBy}
              cancellation_reason={order.cancellationReason}
              received_at={order.receivedAt}
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

            {/* panel-historique — ONLY the cancellation entry (see the header note). */}
            {order.status === 'cancelled' && order.cancelledAt ? (
              <section className="flex flex-col gap-4 rounded-xl border border-border-subtle bg-surface-base p-6">
                <h2 className="text-h3 text-text-primary">
                  {t('seller.orderDetail.history', lang)}
                </h2>
                <div className="flex items-start gap-3">
                  <span
                    aria-hidden="true"
                    className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-danger-500"
                  />
                  <div className="flex flex-col gap-1">
                    <p className="text-body-sm text-text-primary">
                      {t(
                        order.cancelledBy === 'buyer'
                          ? 'seller.orderDetail.cancelled_by_buyer'
                          : 'seller.orderDetail.cancelled_by_seller',
                        lang,
                        { date: longDate(order.cancelledAt, lang) },
                      )}
                    </p>
                    {order.cancellationReason ? (
                      <p className="text-body-sm text-text-muted">
                        {t('seller.orders.cancelled_reason', lang, {
                          reason: order.cancellationReason,
                        })}
                      </p>
                    ) : null}
                  </div>
                </div>
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
                  <AdvanceOrderButton
                    orderId={order.id}
                    label={t(`seller.orders.advance.${next}`, lang)}
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
                />
              ) : null}
            </section>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
