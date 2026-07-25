'use client'

import { useEffect, useTransition } from 'react'
import { toast } from 'sonner'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { FOCUS_RING } from '@/components/layout/styles'
import { requestDataExportAction } from '@/app/parametres/actions'

// Simple confirm modal (no typed confirmation) for the data-export request. Mounted only
// while open by the parent, so no reset effect is needed.
export function ExportDataModal({ email, onClose }: { email: string; onClose: () => void }) {
  const lang = useLang()
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  function onConfirm() {
    startTransition(async () => {
      const res = await requestDataExportAction()
      if (res.ok) {
        toast.success(t('parametres.toast.exportSuccess', lang))
        onClose()
      } else if (res.reason === 'already_pending') {
        toast.error(t('parametres.toast.exportPending', lang))
        onClose()
      } else {
        toast.error(t('parametres.toast.exportError', lang))
        // keep the modal open so the user can retry
      }
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="export-modal-title"
        className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
      >
        <h2 id="export-modal-title" className="text-xl font-bold text-text-primary">
          {t('parametres.export.modalTitle', lang)}
        </h2>
        <p className="mt-2 text-sm text-text-muted">{t('parametres.export.modalBody', lang, { email })}</p>
        <p className="mt-2 text-sm text-text-muted">{t('parametres.export.modalNote', lang)}</p>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className={cn(
              'inline-flex h-10 items-center rounded-full border border-border-subtle bg-white px-4 text-sm font-medium text-text-primary transition-colors hover:bg-slate-50',
              FOCUS_RING,
            )}
          >
            {t('parametres.export.cancel', lang)}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={pending}
            className={cn(
              'inline-flex h-10 items-center rounded-full bg-brand-blue-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-brand-blue-500 disabled:opacity-60',
              FOCUS_RING,
            )}
          >
            {pending ? t('parametres.export.confirming', lang) : t('parametres.export.confirm', lang)}
          </button>
        </div>
      </div>
    </div>
  )
}
