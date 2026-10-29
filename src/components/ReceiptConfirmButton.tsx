'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'

type Props = {
  orderId: string
  /**
   * E4's action panel (Figma 1469:23519): a full-width primary lg Button, no inline help (the panel carries its own helper line),
   * the error shown inline. Default `false` = the legacy inline button every other caller (E3, the dashboard snapshot) renders.
   */
  panel?: boolean
}

// Buyer-only receipt confirmation — the final 'arrived' → 'received' hop the
// seller dashboards deliberately leave open. Mirrors the seller advance
// buttons in ma-boutique/commandes: a direct client-side write, gated
// authoritatively by the check_order_status_transition DB trigger
// (buyer-only, only from 'arrived').
//
// This writes ONLY the status. `received_at` is no longer sent from the browser (H8 PR-2, DB-batch ruling #12):
// a client clock is forgeable and the column was seller-writable too, so the database stamps it on the
// status transition. Do not add it back to the payload.
export function ReceiptConfirmButton({ orderId, panel = false }: Props) {
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
      .update({ status: 'received' })
      .eq('id', orderId)
    if (error) {
      console.error('[ReceiptConfirmButton] confirmReceipt error:', error.message, error.code, error.details)
      setError(t('common.receipt_confirm_error', lang))
      setIsSubmitting(false)
      return
    }
    setConfirmed(true)
    router.refresh()
    // Panel mode stays busy only until the refreshed server tree replaces it; if the refresh stalls the user is not left
    // looking at a spinner, and the write already succeeded so a retry is a harmless no-op on the DB side.
    if (panel) setTimeout(() => setIsSubmitting(false), 8000)
  }

  if (panel) {
    // After a successful write the button stays busy until router.refresh() swaps the panel for « Commande terminée ».
    return (
      <div className="flex flex-col gap-2">
        <Button variant="primary" size="lg" className="w-full" loading={isSubmitting} onClick={confirmReceipt}>
          {t('common.confirm_receipt_action', lang)}
        </Button>
        {error && (
          <p role="alert" className="text-body-sm text-danger-500">
            {error}
          </p>
        )}
      </div>
    )
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
        className="bg-brand-blue-600 hover:bg-brand-blue-700 disabled:opacity-60 text-white text-sm font-medium px-4 py-2 rounded transition-colors"
      >
        {isSubmitting ? t('common.submitting', lang) : t('common.confirm_receipt_action', lang)}
      </button>
      <p className="text-xs text-gray-500">{t('common.confirm_receipt_help', lang)}</p>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
