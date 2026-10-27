'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { requestAccountDeletionAction } from '@/app/mon-compte/actions'
import { t, type Lang } from '@/lib/i18n'
import { ModalShell } from './ModalShell'

const REASON_MAX = 500

// Deletion is a REQUEST the team processes (architect ruling 4): nothing is deleted here, so the copy
// never says « irréversible » / « supprimé » and there is no typed-confirm word. Open orders are
// advice, not a gate — a hard block would be a business rule, which belongs in the database.
export function DeleteAccountModal({
  lang,
  openOrders,
  onClose,
}: {
  lang: Lang
  openOrders: number
  onClose: () => void
}) {
  const router = useRouter()
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function submit() {
    setError(null)
    startTransition(async () => {
      const res = await requestAccountDeletionAction(reason)
      if (!res.ok) {
        setError(res.error)
        // « Already pending »: the page behind still shows the enabled button — re-read it.
        router.refresh()
        return
      }
      toast.success(t('monCompte.toast.deleteRequested', lang))
      onClose()
      router.refresh()
    })
  }

  return (
    <ModalShell titleId="delete-account-title" title={t('monCompte.delete.modalTitle', lang)} busy={pending} onClose={onClose}>
      <p className="text-sm text-text-muted">{t('monCompte.delete.modalBody', lang)}</p>

      {openOrders > 0 && (
        <p role="note" className="rounded-lg bg-warning-100 px-3 py-2 text-sm text-text-primary">
          {t('monCompte.delete.openOrders', lang, { count: openOrders })}
        </p>
      )}

      <Textarea
        label={t('monCompte.delete.reasonLabel', lang)}
        placeholder={t('monCompte.delete.reason_ph', lang)}
        maxLength={REASON_MAX}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
      />

      {error && (
        <p role="alert" className="text-sm text-danger-500">
          {error}
        </p>
      )}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button type="button" variant="secondary" size="md" onClick={onClose} disabled={pending}>
          {t('monCompte.delete.cancel', lang)}
        </Button>
        <Button type="button" variant="danger" size="md" loading={pending} onClick={submit}>
          {t('monCompte.delete.confirm', lang)}
        </Button>
      </div>
    </ModalShell>
  )
}
