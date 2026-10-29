'use client'

import { useState } from 'react'
import { Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FOCUS_RING } from '@/components/layout/styles'
import { ReceiptConfirmButton } from '@/components/ReceiptConfirmButton'
import { CancelOrderDialog } from '@/components/orders/CancelOrderButton'
import { ReportProblemDialog } from '@/components/orders/ReportProblemDialog'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'
import { BUYER_CANCEL_REASONS } from '@/lib/orders/cancel-reasons'
import {
  buyerCanCancel,
  buyerCancelIsButton,
  buyerCanDispute,
  buyerPanelState,
} from '@/lib/orders/buyer-order'
import type { OrderStatus, OrderType } from '@/lib/types/order-status'

// The E4 rail's action panel — one card whose title, copy and buttons follow the status (Figma 1469:23519 Arrivée, 1472:23919
// En attente, 1472:24760 Reçue, 1472:25035 Annulée, 1475:25384 Service). The decisions (which state, which buttons) are the pure
// functions in `@/lib/orders/buyer-order`; this file only paints them.
//
// ⚑ Text-size + colour are plain template strings, never cn() (the twMerge eviction recorded on OrderRail).

const PANEL = 'flex flex-col gap-4 rounded-xl border border-border-subtle bg-surface-base p-6'

export function BuyerOrderActions({
  orderId,
  status,
  orderType,
  activeDispute,
  cancellationBy,
  cancellationReason,
  receivedOn,
  cancelledOn,
}: {
  orderId: string
  status: OrderStatus
  orderType: OrderType
  /** An open / under-review dispute already exists on this order — the button gives way to a note. */
  activeDispute: boolean
  /** Who cancelled, when the order is cancelled. */
  cancellationBy: 'buyer' | 'seller' | null
  cancellationReason: string | null
  /** Pre-formatted long dates (server-side, Tunis time) for the Reçue / Annulée helper lines. */
  receivedOn: string
  cancelledOn: string
}) {
  const lang = useLang()
  const [dialog, setDialog] = useState<'cancel' | 'report' | null>(null)
  const state = buyerPanelState(status)
  const product = orderType === 'product'
  const close = () => setDialog(null)

  const showCancelButton = buyerCanCancel(status, orderType) && buyerCancelIsButton(status)
  const showCancelLink = buyerCanCancel(status, orderType) && !buyerCancelIsButton(status)
  const canDispute = buyerCanDispute(status)

  const title =
    state === 'pending'
      ? t(product ? 'buyerOrder.action.pending_title_product' : 'buyerOrder.action.pending_title_service', lang)
      : state === 'confirm'
        ? t(product ? 'buyerOrder.action.confirm_title_product' : 'buyerOrder.action.confirm_title_service', lang)
        : state === 'received'
          ? t('buyerOrder.action.received_title', lang)
          : state === 'cancelled'
            ? t('buyerOrder.action.cancelled_title', lang)
            : t(product ? 'buyerOrder.action.progress_title_product' : 'buyerOrder.action.progress_title_service', lang)

  const body =
    state === 'pending'
      ? t(product ? 'buyerOrder.action.pending_body_product' : 'buyerOrder.action.pending_body_service', lang)
      : state === 'confirm'
        ? t(product ? 'buyerOrder.action.confirm_body_product' : 'buyerOrder.action.confirm_body_service', lang)
        : state === 'received'
          ? t(product ? 'buyerOrder.action.received_body_product' : 'buyerOrder.action.received_body_service', lang, {
              date: receivedOn,
            })
          : state === 'cancelled'
            ? t(
                cancellationBy === 'buyer'
                  ? 'buyerOrder.action.cancelled_body_buyer'
                  : product
                    ? 'buyerOrder.action.cancelled_body_shop'
                    : 'buyerOrder.action.cancelled_body_freelancer',
                lang,
                { date: cancelledOn },
              )
            : t(product ? 'buyerOrder.action.progress_body_product' : 'buyerOrder.action.progress_body_service', lang)

  return (
    <section className={PANEL}>
      <h2 className="text-h3 text-text-primary">{title}</h2>

      <p className="text-body-sm text-text-secondary">{body}</p>

      {state === 'cancelled' && cancellationReason ? (
        <p className="text-body-sm text-text-muted">{t('seller.orders.cancelled_reason', lang, { reason: cancellationReason })}</p>
      ) : null}

      {state === 'confirm' ? <ReceiptConfirmButton orderId={orderId} panel /> : null}

      {showCancelButton ? (
        <Button variant="danger" size="lg" className="w-full" onClick={() => setDialog('cancel')}>
          {t('seller.orderDetail.cancel_link', lang)}
        </Button>
      ) : null}

      {canDispute ? (
        activeDispute ? (
          <p className="flex items-start gap-2 rounded-lg bg-surface-subtle p-3 text-body-sm text-text-secondary">
            <Clock className="mt-0.5 size-4 shrink-0 text-icon-muted" aria-hidden="true" />
            {t('buyerOrder.dispute.active', lang)}
          </p>
        ) : (
          <Button variant="secondary" size="lg" className="w-full" onClick={() => setDialog('report')}>
            {t('buyerOrder.dispute.open', lang)}
          </Button>
        )
      ) : null}

      {showCancelLink ? (
        <button
          type="button"
          onClick={() => setDialog('cancel')}
          className={`w-full rounded text-center text-body-sm text-danger-500 hover:underline ${FOCUS_RING}`}
        >
          {t('seller.orderDetail.cancel_link', lang)}
        </button>
      ) : null}

      {dialog === 'cancel' ? (
        <CancelOrderDialog
          orderId={orderId}
          status={status}
          orderType={orderType}
          lang={lang}
          reasons={BUYER_CANCEL_REASONS}
          bodyKey="mesCommandes.cancel.body"
          layout="select"
          onClose={close}
        />
      ) : null}
      {dialog === 'report' ? <ReportProblemDialog orderId={orderId} orderType={orderType} onClose={close} /> : null}
    </section>
  )
}
