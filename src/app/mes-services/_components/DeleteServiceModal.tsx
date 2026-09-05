'use client'

import { useState, useTransition } from 'react'
import { t, type Lang } from '@/lib/i18n'
import { Button } from '@/components/ui/button'
import { FOCUS_RING } from '@/components/layout/styles'
import { deleteServiceAction } from '@/app/actions/services'

// H7's own measured typed-confirm delete modal (Figma 464:19890), mirroring DeleteProductModal.tsx
// exactly — same reasoning applies: ONLY EVER RENDERED FOR A ZERO-ORDER SERVICE (ServiceRow.tsx's
// kebab disables "Supprimer" with a tooltip when `hasOrders` is true, and this modal is reached
// only through that gate, directly or via CascadeWarningModal's delete variant first). The body
// copy deliberately drops the frame's "vos engagements en cours ne sont pas affectés" line — see
// service.delete_modal.body's own comment in fr.ts/ar.ts for why that line doesn't survive contact
// with `enforce_order_identity_lock`.
export function DeleteServiceModal({
  serviceId,
  serviceTitle,
  lang,
  onCancel,
  onDeleted,
}: {
  serviceId: string
  serviceTitle: string
  lang: Lang
  onCancel: () => void
  onDeleted: () => void
}) {
  const [keyword, setKeyword] = useState('')
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const requiredKeyword = t('service.delete_modal.keyword', lang)
  const matches = keyword.trim() === requiredKeyword

  const runDelete = () => {
    if (!matches || pending) return
    setError(null)
    startTransition(async () => {
      const result = await deleteServiceAction({ serviceId })
      if (!result.ok) {
        setError(result.error)
        return
      }
      onDeleted()
    })
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('service.delete_modal.title', lang)}
      className="fixed inset-0 z-50 flex items-center justify-center bg-overlay-scrim p-4"
    >
      <div className="flex w-full max-w-[420px] flex-col gap-4 rounded-xl bg-surface-base p-6">
        <div className="flex flex-col gap-1.5">
          <p className="text-body font-semibold text-text-primary">
            {t('service.delete_modal.title', lang)}
          </p>
          <p className="text-body-sm text-text-secondary">
            {t('service.delete_modal.body', lang, { title: serviceTitle })}
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="service-delete-confirm-input" className="text-body-sm text-text-secondary">
            {t('service.delete_modal.confirm_label', lang, { keyword: requiredKeyword })}
          </label>
          <input
            id="service-delete-confirm-input"
            type="text"
            autoComplete="off"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            className={`h-11 rounded-lg border border-border-strong bg-surface-base px-4 text-base text-text-primary outline-none transition-colors focus:border-brand-blue-600 ${FOCUS_RING}`}
          />
        </div>

        {error && (
          <p role="alert" className="text-sm text-danger-500">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-3">
          <Button variant="ghost" size="md" onClick={onCancel} disabled={pending}>
            {t('common.cancel', lang)}
          </Button>
          <Button variant="danger" size="md" loading={pending} disabled={!matches} onClick={runDelete}>
            {t('service.delete_modal.confirm_cta', lang)}
          </Button>
        </div>
      </div>
    </div>
  )
}
