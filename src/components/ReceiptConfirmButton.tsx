'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'

type Props = { orderId: string }

// Buyer-only receipt confirmation — the final 'arrived' → 'received' hop the
// seller dashboards deliberately leave open. Mirrors the seller advance
// buttons in ma-boutique/commandes: a direct client-side write, gated
// authoritatively by the check_order_status_transition DB trigger
// (buyer-only, only from 'arrived'). received_at is stamped here in app code
// because the trigger does not set it (decision: client clock is acceptable
// at MVP; a server-clock DB default is a future migration if disputes ever
// need that precision).
export function ReceiptConfirmButton({ orderId }: Props) {
  const supabase = createClient()
  const router = useRouter()
  const lang = useLang()

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function confirmReceipt() {
    setIsSubmitting(true)
    setError(null)
    const { error } = await supabase
      .from('orders')
      .update({ status: 'received', received_at: new Date().toISOString() })
      .eq('id', orderId)
    if (error) {
      console.error('[ReceiptConfirmButton] confirmReceipt error:', error)
      setError(t('common.receipt_confirm_error', lang))
      setIsSubmitting(false)
      return
    }
    setConfirmed(true)
    router.refresh()
  }

  if (confirmed) {
    return (
      <p className="text-sm font-medium text-green-700">
        {t('common.receipt_confirmed_success', lang)}
      </p>
    )
  }

  return (
    <div className="space-y-1">
      <button
        onClick={confirmReceipt}
        disabled={isSubmitting}
        className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium px-4 py-2 rounded transition-colors"
      >
        {isSubmitting ? t('common.submitting', lang) : t('common.confirm_receipt_action', lang)}
      </button>
      <p className="text-xs text-gray-500">{t('common.confirm_receipt_help', lang)}</p>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
