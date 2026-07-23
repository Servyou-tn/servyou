'use client'

import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'
import {
  type OrderStatus,
  type OrderType,
  lifecycleFor,
  statusLabelKey,
} from '@/lib/types/order-status'

type Props = {
  status: string
  order_type: 'product' | 'service'
  cancelled_by: string | null
  cancellation_reason: string | null
  received_at: string | null
}

// Read-only visual of where an order sits in its lifecycle chain.
// Product orders show the full 7-state chain; service requests show the
// reduced 4-state chain. Past states are checked, the current state is
// highlighted, future states are dimmed. Polish is deferred to the Pillar 2
// redesign pass; this is the function-first version.
export function OrderLifecycleStepper({
  status,
  order_type,
  cancelled_by,
  cancellation_reason,
  received_at,
}: Props) {
  const lang = useLang()
  const orderType = order_type as OrderType
  const chain = lifecycleFor(orderType)
  const isCancelled = status === 'cancelled'
  const currentIndex = chain.indexOf(status as OrderStatus)

  return (
    <div className="space-y-3">
      <ol className="flex flex-col gap-y-2 sm:flex-row sm:items-start sm:gap-y-0">
        {chain.map((s, i) => {
          const done = !isCancelled && i < currentIndex
          const current = !isCancelled && i === currentIndex
          const nodeCls = current
            ? 'bg-brand-blue-600 text-white border-brand-blue-600'
            : done
            ? 'bg-green-100 text-green-700 border-green-300'
            : 'bg-gray-100 text-gray-400 border-gray-200'
          const labelCls = current
            ? 'text-brand-blue-700 font-medium'
            : done
            ? 'text-green-700'
            : 'text-gray-400'
          return (
            <li key={s} className="flex items-center gap-2 sm:flex-1 sm:flex-col sm:gap-1 sm:text-center">
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs ${nodeCls}`}
                aria-current={current ? 'step' : undefined}
              >
                {done ? '✓' : i + 1}
              </span>
              <span className={`text-xs ${labelCls}`}>
                {t(statusLabelKey(s, orderType), lang)}
              </span>
            </li>
          )
        })}
      </ol>

      {isCancelled && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2">
          <p className="text-sm font-medium text-red-700">
            {cancelled_by === 'buyer'
              ? t('common.cancelled_by_buyer', lang)
              : cancelled_by === 'seller'
              ? t('common.cancelled_by_seller', lang)
              : t('common.status_cancelled', lang)}
          </p>
          {cancellation_reason && (
            <p className="mt-0.5 text-xs text-red-600">
              <span className="font-medium">{t('common.cancel_reason_label', lang)}</span> {cancellation_reason}
            </p>
          )}
        </div>
      )}

      {status === 'received' && received_at && (
        <p className="text-xs text-green-700">
          <span className="font-medium">{t('common.received_on_label', lang)}</span>{' '}
          {new Date(received_at).toLocaleDateString('fr-TN', { day: '2-digit', month: 'short', year: 'numeric' })}
        </p>
      )}
    </div>
  )
}
