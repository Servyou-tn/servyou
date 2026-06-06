'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'
import { requiresCancellationReason, type OrderStatus, type OrderType } from '@/lib/types/order-status'

type Props = {
  orderId: string
  cancelledBy: 'buyer' | 'seller'
  currentStatus: OrderStatus
  orderType: OrderType
}

// Common reason options per role. Keys resolve to French labels in fr.ts.
// The '*_other' option pre-fills an empty textarea so the user writes their own.
const BUYER_REASONS = [
  'common.cancel_reason_buyer_changed_mind',
  'common.cancel_reason_buyer_too_slow',
  'common.cancel_reason_buyer_unavailable',
  'common.cancel_reason_buyer_found_cheaper',
  'common.cancel_reason_buyer_order_error',
  'common.cancel_reason_buyer_other',
]

const SELLER_REASONS = [
  'common.cancel_reason_seller_out_of_stock',
  'common.cancel_reason_seller_invalid_address',
  'common.cancel_reason_seller_unreachable',
  'common.cancel_reason_seller_product_error',
  'common.cancel_reason_seller_other',
]

// Shared cancellation UI used on all three surfaces (buyer detail, shop-owner
// orders, freelancer requests). Mirrors ReceiptConfirmButton: direct browser
// write, router.refresh on success, inline error state. The DB trigger
// (check_order_status_transition) is the authoritative guard — this modal
// writes cancelled_by (the caller's role) and cancellation_reason, and surfaces
// the post-pivot reason requirement so the write doesn't bounce off the trigger.
export function CancelOrderModal({ orderId, cancelledBy, currentStatus, orderType }: Props) {
  const supabase = createClient()
  const router = useRouter()
  const lang = useLang()

  const [isOpen, setIsOpen] = useState(false)
  const [selectedReason, setSelectedReason] = useState('')
  const [customReason, setCustomReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reasonRequired = requiresCancellationReason(currentStatus, orderType)
  const reasonKeys = cancelledBy === 'buyer' ? BUYER_REASONS : SELLER_REASONS
  const canSubmit = !isSubmitting && (!reasonRequired || customReason.trim().length > 0)

  function close() {
    setIsOpen(false)
    setSelectedReason('')
    setCustomReason('')
    setError(null)
    setIsSubmitting(false)
  }

  function onReasonChange(key: string) {
    setSelectedReason(key)
    // Pre-fill the textarea with the chosen label, except "Autre raison" which
    // leaves it blank for the user to write their own.
    setCustomReason(key.endsWith('_other') || key === '' ? '' : t(key, lang))
  }

  async function submit() {
    if (reasonRequired && customReason.trim().length === 0) {
      setError(t('common.cancel_reason_empty_error', lang))
      return
    }
    setIsSubmitting(true)
    setError(null)
    const { error } = await supabase
      .from('orders')
      .update({
        status: 'cancelled',
        cancelled_by: cancelledBy,
        cancellation_reason: customReason.trim() || null,
      })
      .eq('id', orderId)
    if (error) {
      console.error('[CancelOrderModal] cancel error:', error)
      setError(t('common.cancel_submit_error', lang))
      setIsSubmitting(false)
      return
    }
    setIsOpen(false)
    router.refresh()
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="border border-red-300 hover:bg-red-50 text-red-600 text-xs font-medium px-3 py-1.5 rounded transition-colors"
      >
        {t('common.cancel', lang)}
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md space-y-4 rounded-lg bg-white p-6 shadow-xl">
            <h2 className="text-lg font-bold text-gray-800">{t('orders.cancel_modal_title', lang)}</h2>

            <p className="text-sm text-gray-500">
              {reasonRequired
                ? t('common.cancel_reason_required_hint', lang)
                : t('common.cancel_reason_optional_hint', lang)}
            </p>

            <div className="space-y-1">
              <label htmlFor="cancel-reason-select" className="block text-sm font-medium text-gray-600">
                {t('common.cancel_reason_dropdown_label', lang)}
              </label>
              <select
                id="cancel-reason-select"
                value={selectedReason}
                onChange={e => onReasonChange(e.target.value)}
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="">{t('common.cancel_reason_dropdown_default', lang)}</option>
                {reasonKeys.map(key => (
                  <option key={key} value={key}>{t(key, lang)}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label htmlFor="cancel-reason-text" className="block text-sm font-medium text-gray-600">
                {t('common.cancel_reason_label', lang)}
              </label>
              <textarea
                id="cancel-reason-text"
                value={customReason}
                onChange={e => setCustomReason(e.target.value)}
                placeholder={t('common.cancel_reason_placeholder', lang)}
                rows={3}
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
              />
            </div>

            {error && <p className="text-xs text-red-600">{error}</p>}

            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={close}
                disabled={isSubmitting}
                className="border border-gray-300 hover:bg-gray-50 disabled:opacity-60 text-gray-700 text-sm font-medium px-4 py-2 rounded transition-colors"
              >
                {t('common.cancel_keep_action', lang)}
              </button>
              <button
                onClick={submit}
                disabled={!canSubmit}
                className="bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white text-sm font-medium px-4 py-2 rounded transition-colors"
              >
                {isSubmitting ? t('common.submitting', lang) : t('common.cancel_confirm_action', lang)}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
