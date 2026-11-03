'use client'

import { Button } from '@/components/ui/button'
import { ModalDialog } from '@/components/shared/ModalDialog'
import { t, type Lang } from '@/lib/i18n'

// « Confirmer la réception » is FINAL — 'arrived' → 'received', no way back (check_order_status_transition) — so it asks first
// (walk 2026-11-02 #16: one accidental tap closed the order). Shared by E4's action panel (ReceiptConfirmButton) and E3's list row
// (ConfirmReceipt). The caller owns the write: this only says yes or no, so each keeps its own pending / error handling.
export function ConfirmReceiptDialog({ lang, onConfirm, onClose }: { lang: Lang; onConfirm: () => void; onClose: () => void }) {
  return (
    <ModalDialog
      open
      onClose={onClose}
      title={t('receipt.confirm.title', lang)}
      closeLabel={t('buyerOrder.dialog.close', lang)}
      onSubmit={(e) => {
        e.preventDefault()
        onConfirm()
      }}
      footer={
        <>
          <Button type="button" variant="ghost" size="md" onClick={onClose}>
            {t('buyerOrder.cancel.back', lang)}
          </Button>
          <Button type="submit" variant="primary" size="md">
            {t('receipt.confirm.yes', lang)}
          </Button>
        </>
      }
    >
      <p className="text-body-sm text-text-secondary">{t('receipt.confirm.body', lang)}</p>
    </ModalDialog>
  )
}
