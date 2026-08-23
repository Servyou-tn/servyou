'use client'

import Link from 'next/link'
import { BlurFade } from '@/components/magicui/blur-fade'
import { useLang } from '@/components/LangProvider'
import { t, tn } from '@/lib/i18n'
import { FOCUS_RING } from '@/components/layout/styles'
import { primaryBtn } from '@/components/auth/field-styles'
import { ArrowRightIcon } from '@/components/landing/icons'
import { ReceiptConfirmButton } from '@/components/ReceiptConfirmButton'
import {
  bucketOrders,
  statusLabelKey,
  STATUS_BADGE_CLASS,
  type OrderStatus,
} from './order-buckets'
import { PackageIcon, BriefcaseIcon, ChevronRightIcon, ShoppingBagIcon } from './icons'

const display = 'font-[family-name:var(--font-display)]'

// Plain, server-resolved data for one order card (no functions crossing the
// server/client boundary; the date is preformatted server-side).
export type OrderCardData = {
  id: string
  title: string
  status: string
  order_type: string
  dateLabel: string
}

function StatusBadge({ status, orderType }: { status: string; orderType: string }) {
  const lang = useLang()
  const className = STATUS_BADGE_CLASS[status as OrderStatus] ?? 'bg-slate-100 text-slate-700'
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-caption font-medium leading-snug ${className}`}
    >
      {t(statusLabelKey(status, orderType), lang)}
    </span>
  )
}

function OrderCard({ order }: { order: OrderCardData }) {
  const lang = useLang()
  const Thumb = order.order_type === 'service' ? BriefcaseIcon : PackageIcon
  const isArrived = order.status === 'arrived'

  return (
    <div className="flex flex-wrap items-center gap-4 rounded-xl bg-white p-4 shadow-[0_24px_64px_rgba(15,23,42,0.08)] transition-colors hover:bg-[var(--surface-subtle)] md:p-5">
      {/* Quiet placeholder thumb — the marketplace has no product imagery yet. */}
      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-[var(--surface-subtle)]">
        <Thumb className="h-7 w-7 text-[var(--text-muted)]" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-body font-semibold text-[var(--text-primary)]">{order.title}</p>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-body-sm text-[var(--text-muted)]">
          <StatusBadge status={order.status} orderType={order.order_type} />
          <span>{order.dateLabel}</span>
        </div>
      </div>

      <div className="shrink-0">
        {isArrived ? (
          <ReceiptConfirmButton orderId={order.id} />
        ) : (
          <Link
            href={`/demande/confirmation/${order.id}`}
            aria-label={t('orders.buyer_detail_title', lang)}
            className={`inline-flex h-9 w-9 items-center justify-center rounded-lg text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-subtle)] hover:text-[var(--text-primary)] ${FOCUS_RING}`}
          >
            <ChevronRightIcon className="h-5 w-5" />
          </Link>
        )}
      </div>
    </div>
  )
}

function EmptyState() {
  const lang = useLang()
  return (
    <div className="rounded-xl bg-white p-8 text-center shadow-[0_24px_64px_rgba(15,23,42,0.08)]">
      <ShoppingBagIcon className="mx-auto h-12 w-12 text-[var(--text-muted)]" />
      <p className="mt-4 text-base font-semibold text-[var(--text-primary)]">
        {t('consumer.dashboard.orders.empty_title', lang)}
      </p>
      <p className="mx-auto mt-1 max-w-md text-sm text-[var(--text-muted)]">
        {t('consumer.dashboard.orders.empty_subtitle', lang)}
      </p>
      <div className="mx-auto mt-5 max-w-xs">
        <Link href="/" className={primaryBtn}>
          {t('consumer.dashboard.orders.empty_cta', lang)}
        </Link>
      </div>
    </div>
  )
}

// Section 2 — active-orders snapshot. Counts come from bucketOrders; the list shows
// the three most-recent active orders (the page passes them already sorted).
export function ActiveOrdersSnapshot({ orders }: { orders: OrderCardData[] }) {
  const lang = useLang()
  const { enCours, aConfirmer } = bucketOrders(orders)

  const parts: string[] = []
  if (enCours > 0) {
    parts.push(tn('consumer.dashboard.orders.count', lang, enCours))
  }
  if (aConfirmer > 0) {
    parts.push(t('consumer.dashboard.orders.confirm_count', lang, { n: aConfirmer }))
  }
  const countsLine = parts.join(' · ')

  return (
    <BlurFade delay={0.1} inView>
      <section className="mb-10 md:mb-12">
        {/* responsive pair retained: md:text-[28px] has no clean tier; half-tokenizing would break the mobile→desktop ramp (DS-3b-3) */}
        <h2 className={`${display} mb-2 text-[22px] font-bold text-[var(--text-primary)] md:text-[28px]`}>
          {t('consumer.dashboard.orders.heading', lang)}
        </h2>

        {orders.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            {countsLine ? <p className="text-sm text-[var(--text-muted)]">{countsLine}</p> : null}
            <div className="mt-4 space-y-3">
              {orders.slice(0, 3).map((o) => (
                <OrderCard key={o.id} order={o} />
              ))}
            </div>
            <div className="mt-4">
              <Link
                href="/mes-demandes"
                className={`inline-flex items-center gap-1 rounded text-sm font-medium text-[var(--brand-blue-600)] hover:underline ${FOCUS_RING}`}
              >
                {t('consumer.dashboard.orders.viewAll', lang)}
                <ArrowRightIcon className="h-4 w-4" />
              </Link>
            </div>
          </>
        )}
      </section>
    </BlurFade>
  )
}
