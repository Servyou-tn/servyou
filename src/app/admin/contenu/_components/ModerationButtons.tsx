'use client'

import { useId, useRef, useState, useTransition } from 'react'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'
import { Button } from '@/components/ui/button'
import { hideContentItem, unhideContentItem } from '../actions'

// J4 row actions. « Masquer » (secondary sm, as drawn) opens a native modal <dialog> for the moderation reason the
// DB function requires (it RAISEs on empty); « Réafficher » (ghost) confirms first, like the report page's restore.
// Errors are stored as i18n keys; each action revalidates /admin/contenu on success.

export function HideContentButton({ targetType, targetId, title }: { targetType: string; targetId: string; title: string }) {
  const lang = useLang()
  const id = useId()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [reason, setReason] = useState('')
  const [errorKey, setErrorKey] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  return (
    <>
      <Button variant="secondary" size="sm" onClick={() => dialogRef.current?.showModal()} aria-haspopup="dialog">
        {t('admin.content.action_hide', lang)}
        <span className="sr-only"> — {title}</span>
      </Button>
      <dialog
        ref={dialogRef}
        aria-labelledby={`${id}-title`}
        onCancel={(e) => { if (pending) e.preventDefault() }}
        onClose={() => { setReason(''); setErrorKey(null) }}
        className="m-auto w-[min(28rem,calc(100vw-2rem))] rounded-xl border border-border-subtle bg-surface-base p-6 text-start text-text-primary shadow-lg backdrop:bg-text-primary/40"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault()
            setErrorKey(null)
            startTransition(async () => {
              const res = await hideContentItem(targetType, targetId, reason)
              if (!res.success) setErrorKey(res.error ?? 'common.error_generic')
              else dialogRef.current?.close()
            })
          }}
          className="flex flex-col gap-4"
        >
          <h2 id={`${id}-title`} className="text-body-lg font-semibold text-text-primary">{t('admin.moderation.action_hide', lang)}</h2>
          <p className="text-body-sm text-text-secondary"><bdi>{title}</bdi></p>
          <div className="flex flex-col gap-2">
            <label htmlFor={`${id}-reason`} className="text-body-sm font-medium text-text-secondary">{t('admin.moderation.hide_reason_label', lang)}</label>
            <textarea
              id={`${id}-reason`}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              required
              placeholder={t('admin.moderation.hide_reason_placeholder', lang)}
              className="w-full resize-y rounded-lg border border-border-strong bg-surface-base px-3.5 py-3 text-body-sm text-text-primary placeholder:text-text-muted focus:border-brand-blue-600 focus:outline-none focus:ring-2 focus:ring-brand-blue-600 focus:ring-offset-2"
            />
          </div>
          {errorKey ? <p role="alert" className="text-body-sm text-danger-700">{t(errorKey, lang)}</p> : null}
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="ghost" disabled={pending} onClick={() => dialogRef.current?.close()}>{t('admin.content.cancel', lang)}</Button>
            <Button type="submit" variant="danger" loading={pending} disabled={reason.trim().length === 0}>{t('admin.content.action_hide_confirm', lang)}</Button>
          </div>
        </form>
      </dialog>
    </>
  )
}

export function UnhideContentButton({ targetType, targetId, title }: { targetType: string; targetId: string; title: string }) {
  const lang = useLang()
  const [errorKey, setErrorKey] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        variant="ghost"
        size="sm"
        loading={pending}
        onClick={() => {
          if (!window.confirm(t('admin.moderation.unhide_confirm', lang))) return
          setErrorKey(null)
          startTransition(async () => {
            const res = await unhideContentItem(targetType, targetId)
            if (!res.success) setErrorKey(res.error ?? 'common.error_generic')
          })
        }}
      >
        {t('admin.content.action_unhide', lang)}
        <span className="sr-only"> — {title}</span>
      </Button>
      {errorKey ? <p role="alert" className="text-caption text-danger-700">{t(errorKey, lang)}</p> : null}
    </div>
  )
}
