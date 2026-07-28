'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { cancelOrderAction } from '@/app/actions/orders'
import { requiresCancellationReason, type OrderStatus, type OrderType } from '@/lib/types/order-status'
import { t, type Lang } from '@/lib/i18n'

// Seller cancellation — Figma G8 modal specimen 490:26058 (480×660).
//
// Rebuilt on the F3 primitives rather than reusing `components/CancelOrderModal.tsx`: that one
// predates them, renders a bespoke shell, and — the actual reason — writes with a direct
// browser `supabase.update()`. G4 set the counter-precedent that seller mutations go through a
// server action. Its REASON MODEL is kept verbatim (the five seller presets + free text) and so is
// `requiresCancellationReason`, which encodes the trigger's post-pivot rule.
//
// The old modal keeps its three buyer-side call sites (it has none today) until those migrate onto
// `cancelOrderAction`, which is already written role-aware for exactly that. Logged.
const SELLER_REASONS = [
  'common.cancel_reason_seller_out_of_stock',
  'common.cancel_reason_seller_invalid_address',
  'common.cancel_reason_seller_unreachable',
  'common.cancel_reason_seller_product_error',
  'common.cancel_reason_seller_other',
] as const

export function CancelOrderButton({
  orderId,
  status,
  orderType,
  lang,
}: {
  orderId: string
  status: OrderStatus
  orderType: OrderType
  lang: Lang
}) {
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<string>('')
  const [custom, setCustom] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  // After the pivot the trigger REQUIRES a reason; before it, one is optional. Surfacing the rule
  // here keeps the write from bouncing off the database for something the UI already knew.
  const reasonRequired = requiresCancellationReason(status, orderType)
  const isOther = selected === 'common.cancel_reason_seller_other'
  const resolved = isOther ? custom.trim() : selected ? t(selected, lang) : ''
  const blocked = reasonRequired && resolved === ''

  const submit = () => {
    setError(null)
    startTransition(async () => {
      const result = await cancelOrderAction({
        orderId,
        reason: resolved === '' ? undefined : resolved,
        revalidate: '/commandes-recues',
      })
      if (result.ok) {
        setOpen(false)
        router.refresh()
      } else {
        setError(result.error)
      }
    })
  }

  if (!open) {
    return (
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
        {t('seller.orders.cancel', lang)}
      </Button>
    )
  }

  return (
    // derived: no mobile frame for G8. The desktop modal is 480 wide; below-sm it fills the
    // viewport with the same padding rhythm.
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('seller.orders.cancel_title', lang)}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
    >
      <div className="flex w-full max-w-[480px] flex-col gap-4 rounded-xl bg-surface-base p-6">
        <h2 className="text-h3 text-text-primary">{t('seller.orders.cancel_title', lang)}</h2>
        <p className="text-body-sm text-text-secondary">
          {reasonRequired
            ? t('seller.orders.cancel_reason_required', lang)
            : t('seller.orders.cancel_body', lang)}
        </p>

        <fieldset className="flex flex-col gap-2">
          <legend className="sr-only">{t('seller.orders.cancel_reason_legend', lang)}</legend>
          {SELLER_REASONS.map((key) => (
            <label key={key} className="flex items-center gap-2 text-body text-text-primary">
              <input
                type="radio"
                name="cancel-reason"
                value={key}
                checked={selected === key}
                onChange={() => setSelected(key)}
                className="h-4 w-4 accent-brand-blue-600"
              />
              {t(key, lang)}
            </label>
          ))}
        </fieldset>

        {isOther ? (
          <textarea
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            maxLength={500}
            rows={3}
            aria-label={t('seller.orders.cancel_reason_legend', lang)}
            className="w-full rounded-lg border border-border-strong p-3 text-body text-text-primary"
          />
        ) : null}

        {error ? (
          <p role="alert" className="text-body-sm text-danger-500">
            {error}
          </p>
        ) : null}

        <div className="flex justify-end gap-3">
          <Button variant="ghost" size="md" onClick={() => setOpen(false)} disabled={pending}>
            {t('common.back', lang)}
          </Button>
          <Button
            variant="danger"
            size="md"
            loading={pending}
            disabled={blocked}
            onClick={submit}
          >
            {t('seller.orders.cancel_confirm', lang)}
          </Button>
        </div>
      </div>
    </div>
  )
}
