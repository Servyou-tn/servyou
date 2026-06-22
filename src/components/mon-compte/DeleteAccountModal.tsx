'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { toast } from 'sonner'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { FOCUS_RING } from '@/components/layout/styles'
import { requestAccountDeletionAction } from '@/app/mon-compte/actions'

// Destructive confirmation modal: requires typing the exact confirm word before the
// delete button enables. Records a deletion request (admin-mediated) — does not delete.
// The parent mounts this only while open ({deleteOpen && <DeleteAccountModal .../>}), so
// its state resets naturally on close (unmount) — no reset effect needed.
export function DeleteAccountModal({ onClose }: { onClose: () => void }) {
  const lang = useLang()
  const [reason, setReason] = useState('')
  const [confirmText, setConfirmText] = useState('')
  const [pending, startTransition] = useTransition()
  const confirmRef = useRef<HTMLInputElement>(null)

  const confirmWord = t('monCompte.delete.confirmWord', lang)
  const canConfirm = confirmText === confirmWord && !pending

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    confirmRef.current?.focus()
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  function onConfirm() {
    startTransition(async () => {
      const res = await requestAccountDeletionAction(reason)
      if (res.ok) {
        toast.success(t('monCompte.toast.deleteRequested', lang))
        onClose()
      } else {
        toast.error(res.error)
      }
    })
  }

  const fieldBase = `w-full rounded-xl border border-border-subtle bg-white px-4 py-2.5 text-sm text-text-primary outline-none transition-colors placeholder:text-text-muted focus:border-brand-accent ${FOCUS_RING}`

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-modal-title"
        className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
      >
        <h2 id="delete-modal-title" className="text-xl font-bold text-text-primary">
          {t('monCompte.delete.modalTitle', lang)}
        </h2>
        <p className="mt-2 text-sm text-text-muted">{t('monCompte.delete.modalBody', lang)}</p>

        <label htmlFor="delete-reason" className="mt-4 block text-sm font-medium text-text-primary">
          {t('monCompte.delete.reasonLabel', lang)}
        </label>
        <textarea
          id="delete-reason"
          rows={3}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder={t('monCompte.delete.reason_ph', lang)}
          className={cn(fieldBase, 'mt-1.5 resize-y')}
        />

        <label htmlFor="delete-confirm" className="mt-4 block text-sm font-medium text-text-primary">
          {t('monCompte.delete.confirmPrompt', lang, { word: confirmWord })}
        </label>
        <input
          id="delete-confirm"
          ref={confirmRef}
          type="text"
          autoComplete="off"
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          className={cn(fieldBase, 'mt-1.5')}
        />

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className={cn(
              'inline-flex h-10 items-center rounded-full border border-border-subtle bg-white px-4 text-sm font-medium text-text-primary transition-colors hover:bg-slate-50',
              FOCUS_RING,
            )}
          >
            {t('monCompte.delete.cancel', lang)}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={!canConfirm}
            className={cn(
              'inline-flex h-10 items-center rounded-full bg-red-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50',
              FOCUS_RING,
            )}
          >
            {t('monCompte.delete.confirm', lang)}
          </button>
        </div>
      </div>
    </div>
  )
}
