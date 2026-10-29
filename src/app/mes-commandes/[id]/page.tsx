import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ChevronRight } from 'lucide-react'
import { AppShell } from '@/components/shell/AppShell'
import { ErrorState } from '@/components/marche/ErrorState'
import { StatusPill } from '@/components/ui/status-pill'
import { FOCUS_RING } from '@/components/layout/styles'
import { OrderRail } from '@/components/orders/OrderRail'
import { OrderTimeline } from '@/components/orders/OrderTimeline'
import { getShellUser } from '@/lib/marche/shell-user'
import { getOrderDetail, getSellerContactPhone, hasActiveDispute } from '@/lib/marche/order-detail'
import { settle } from '@/lib/supabase/query-error'
import { buyerCanDispute, buyerEventLabel, cancelledAfterStage } from '@/lib/orders/buyer-order'
import { longDate, shortDate, shortRef, stageTimestamps, statusPillFor } from '@/lib/orders/order-status'
import { lifecycleFor, statusLabelKey, type OrderStatus } from '@/lib/types/order-status'
import { getLang } from '@/lib/i18n/server'
import { t } from '@/lib/i18n'
import { BuyerOrderActions } from './_components/BuyerOrderActions'
import { DeliveryPanel, ItemPanel, RequestPanel, SellerPanel, TrackingPanel } from './_components/OrderPanels'

export const metadata: Metadata = { title: 'Détail de ma commande — Servyou' }

const LIST = '/mes-commandes'

// E4 « Détail de ma commande » — Figma 1469:23519 (Arrivée, main), 1472:23919 (En attente), 1472:24760 (Reçue), 1472:25035
// (Annulée), 1475:25384 (service, 4 steps), 1475:25872 (mobile 375). Every measurement is in
// docs/design/e4-order-detail-measurements.md. The seller-side twin is /commandes-recues/[id] (G9).
//
// Ownership: getOrderDetail re-checks buyer_id === auth.uid() and answers null otherwise, so a stranger's order id is the same
// not-found as a missing one. Layout: a 752 + 360 two-column on desktop; on mobile the action panel jumps up to sit right after
// the stepper (the mobile frame), then product → seller → delivery → tracking → history.

export default async function BuyerOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const shell = await getShellUser()
  if (!shell) redirect(`/connexion?next=${encodeURIComponent(`${LIST}/${id}`)}`)
  const lang = await getLang()

  // A failed read is an inline error state (retryable), never the not-found of a missing order.
  const loaded = await settle('mes-commandes/[id] order', getOrderDetail(id, shell.id))
  if (!loaded.ok) {
    return (
      <AppShell user={shell.topBarUser}>
        <ErrorState lang={lang} />
      </AppShell>
    )
  }
  const order = loaded.data
  if (!order) notFound()

  const product = order.orderType === 'product'
  const status = order.status as OrderStatus
  const ref = shortRef(order.id)
  // The « #A4F729 » inside an Arabic sentence: wrapped in a left-to-right isolate so the # stays in front of the code.
  const titleRef = `⁦${ref}⁩`
  const pill = statusPillFor(order.status, order.orderType)
  const cancelled = order.status === 'cancelled'

  // The seller's number and the open-dispute flag are SECONDARY reads (each degrades quietly: no phone row / the button shows).
  const [phone, activeDispute] = await Promise.all([
    getSellerContactPhone(order.seller.id),
    buyerCanDispute(order.status) ? hasActiveDispute(order.id) : Promise.resolve(false),
  ])

  const chain = lifecycleFor(order.orderType)
  const stageDates = stageTimestamps(order.events)
  const cancelEvent = [...order.events].reverse().find((e) => e.eventType === 'status_change' && e.toStatus === 'cancelled')
  const cancelledOn = longDate(cancelEvent?.createdAt ?? order.updatedAt, lang)
  const receivedOn = longDate(order.receivedAt ?? order.updatedAt, lang)

  return (
    <AppShell user={shell.topBarUser}>
      <div className="flex flex-col gap-6">
        {/* ── topGroup: breadcrumb · title + pill · date · stepper ── */}
        <div className="flex flex-col gap-4">
          <nav aria-label={t('seller.orderDetail.breadcrumb_aria', lang)}>
            <ol className="flex items-center gap-1 text-caption text-text-muted">
              <li>
                <Link href={LIST} className={`rounded hover:underline ${FOCUS_RING}`}>
                  {t('mesCommandes.title', lang)}
                </Link>
              </li>
              <li aria-hidden="true">
                <ChevronRight className="h-3 w-3 rtl:-scale-x-100" />
              </li>
              <li aria-current="page" className="text-text-secondary">
                {t('buyerOrder.title', lang, { ref: titleRef })}
              </li>
            </ol>
          </nav>

          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-h1 text-text-primary">{t('buyerOrder.title', lang, { ref: titleRef })}</h1>
              {pill ? <StatusPill status={pill.pill}>{t(pill.labelKey, lang)}</StatusPill> : null}
            </div>
            <p className="text-body-sm text-text-secondary">
              {t(product ? 'buyerOrder.placed_on' : 'buyerOrder.requested_on', lang, { date: longDate(order.createdAt, lang) })}
            </p>
          </div>

          <section className="rounded-xl border border-border-subtle bg-surface-base p-6">
            <OrderRail
              look="detail"
              ariaLabel={t('buyerOrder.stepper_aria', lang)}
              stages={chain}
              status={order.status}
              labelKeyFor={(stage) => statusLabelKey(stage as OrderStatus, order.orderType)}
              timestampFor={(stage) => {
                const iso = stageDates[stage]
                return iso ? shortDate(iso, lang) : null
              }}
              lang={lang}
              cancelledAfter={cancelled ? cancelledAfterStage(order.events, chain) : undefined}
              cancelledLabelKey="common.status_cancelled"
            />
          </section>
        </div>

        {/* ── twoCol: main 752 + rail 360 (desktop); below lg the wrappers dissolve and `order-*` sets the mobile sequence ── */}
        <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[752fr_360fr] lg:gap-6">
          {/* DOM order = reading / tab order: the action panel and the seller come FIRST (a keyboard user on a phone must not tab through every static panel to reach « Confirmer la réception »); `lg:order-*` restores main-left / rail-right. */}
          <div className="contents lg:order-2 lg:flex lg:flex-col lg:gap-4">
            <div className="order-1 lg:order-2">
              <BuyerOrderActions
                orderId={order.id}
                status={status}
                orderType={order.orderType}
                activeDispute={activeDispute}
                cancellationBy={order.cancelledBy}
                cancellationReason={order.cancellationReason}
                receivedOn={receivedOn}
                cancelledOn={cancelledOn}
              />
            </div>
            <div className="order-3 lg:order-1">
              <SellerPanel order={order} phone={phone} lang={lang} />
            </div>
          </div>
          <div className="contents lg:order-1 lg:flex lg:flex-col lg:gap-4">
            <div className="order-2 lg:order-none">
              <ItemPanel order={order} lang={lang} />
            </div>
            {product ? (
              <div className="order-4 lg:order-none">
                <DeliveryPanel order={order} lang={lang} />
              </div>
            ) : (
              <div className="order-4 lg:order-none">
                <RequestPanel order={order} lang={lang} />
              </div>
            )}
            {product && !cancelled ? (
              <div className="order-5 lg:order-none">
                <TrackingPanel order={order} lang={lang} />
              </div>
            ) : null}
            <div className="order-6 lg:order-none">
              <OrderTimeline
                events={order.events}
                orderType={order.orderType}
                heading={t('buyerOrder.history', lang)}
                createdLabel={t(product ? 'buyerOrder.event.created_product' : 'buyerOrder.event.created_service', lang)}
                lang={lang}
                showNotes={false}
                labelOf={(event) =>
                  buyerEventLabel(
                    event,
                    { orderType: order.orderType, carrier: order.carrier },
                    (key, vars) => t(key, lang, vars),
                  )
                }
              />
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
