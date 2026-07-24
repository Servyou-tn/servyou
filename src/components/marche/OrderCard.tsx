'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'
import { OrderStatusBadge } from './OrderStatusBadge'
import { OrderLifecycleStepper } from '@/components/OrderLifecycleStepper'
import { statusLabelKey, type OrderStatus } from '@/lib/types/order-status'
import { PackageIcon } from '@/components/dashboard/consumer/icons'
import { FOCUS_RING } from '@/components/layout/styles'
import type { MyOrder } from '@/lib/marche/my-data'

function amount(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(2)
}

// Full-width order row (buyer view). The orders table stores no price snapshot, so the
// amount is best-effort: products show price × quantity (~X TND), services show their
// "from" starting price, and a now-unreadable item shows "Prix indisponible". The whole
// row links to the order-detail page (/mes-commandes/[id]).
export function OrderCard({ order }: { order: MyOrder }) {
  const lang = useLang()

  const title = order.title ?? t('mescommandes.item_unavailable', lang)
  const statusLabel = t(statusLabelKey(order.status as OrderStatus, order.order_type), lang)
  const dateLabel = new Date(order.created_at).toLocaleDateString('fr-TN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
  const meta = [order.seller_name, order.seller_city].filter(Boolean).join(' · ')

  let priceLabel: string
  if (order.price_kind === 'total' && order.total != null) {
    priceLabel = t('mescommandes.total_approx', lang, { price: amount(order.total) })
  } else if (order.price_kind === 'from' && order.unit_price != null) {
    priceLabel = t('listing.service.startingPrice', lang, { price: amount(order.unit_price) })
  } else if (order.price_kind === 'from') {
    priceLabel = t('listing.service.priceOnRequest', lang)
  } else {
    priceLabel = t('mescommandes.price_unavailable', lang)
  }

  return (
    <Link
      href={`/mes-commandes/${order.id}`}
      className={`card-premium block cursor-pointer p-6 transition hover:bg-slate-50 ${FOCUS_RING}`}
    >
      <div className="flex flex-col gap-4 sm:flex-row">
        {/* Left — product thumbnail or service "S" avatar (consistent with /marche). */}
        <div className="shrink-0">
          {order.order_type === 'product' ? (
            order.image_url ? (
              <div className="relative h-16 w-16 overflow-hidden rounded-xl bg-[#F4F4F4]">
                <Image src={order.image_url} alt="" fill sizes="64px" className="object-cover" />
              </div>
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-[#F4F4F4]">
                <PackageIcon className="h-7 w-7 text-icon-muted" aria-hidden="true" />
              </div>
            )
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-linear-to-br from-[#F4F4F4] to-[#E8E8E8] text-xl font-bold text-text-primary">
              S
            </div>
          )}
        </div>

        {/* Middle — category chip, title, seller meta, date. */}
        <div className="min-w-0 flex-1">
          {order.category && (
            <span className="inline-block rounded-full bg-[#F4F4F4] px-3 py-1 text-caption font-medium text-text-primary">
              {order.category}
            </span>
          )}
          <p className="mt-1 truncate text-base font-semibold text-text-primary">{title}</p>
          {meta && <p className="mt-0.5 truncate text-sm text-text-muted">{meta}</p>}
          <p className="mt-0.5 text-xs text-text-muted">
            {dateLabel}
            {order.order_type === 'product' && order.quantity > 1 ? ` · ×${order.quantity}` : ''}
          </p>
        </div>

        {/* Right — amount + status badge. */}
        <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
          <p className="text-body font-bold text-brand-primary">{priceLabel}</p>
          <OrderStatusBadge status={order.status} label={statusLabel} />
        </div>
      </div>

      {/* Lifecycle stepper (reused). */}
      <div className="mt-4 border-t border-border-subtle pt-4">
        <OrderLifecycleStepper
          status={order.status}
          order_type={order.order_type}
          cancelled_by={order.cancelled_by}
          cancellation_reason={order.cancellation_reason}
          received_at={order.received_at}
        />
      </div>
    </Link>
  )
}
