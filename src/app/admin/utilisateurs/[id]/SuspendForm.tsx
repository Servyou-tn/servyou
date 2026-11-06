'use client'

import { useId, useRef, useState, useTransition } from 'react'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'
import { Button } from '@/components/ui/button'
import { suspendUser } from '../actions'

// J3 header « Suspendre » (danger, as drawn). The suspension still needs the internal reason the action and the
// DB function require (admin_suspend_user RAISEs on empty), so the button opens a native modal <dialog>
// (focus trap + Escape for free, the header keeps its drawn layout): reason · « Confirmer la suspension » ·
// « Annuler ». The reason is required in three places: the disabled confirm when trimmed-empty, the action, and
// the DB function. Errors are stored as i18n keys. On success the action revalidates and the page re-renders
// into the suspended state.
export function SuspendForm({ targetUserId }: { targetUserId: string }) {
  const lang = useLang()
  const id = useId()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [reason, setReason] = useState('')
  const [errorKey, setErrorKey] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function close() {
    dialogRef.current?.close()
    setReason('')
    setErrorKey(null)
  }

  return (
    <>
      <Button variant="danger" onClick={() => dialogRef.current?.showModal()} aria-haspopup="dialog">
        {t('admin.users.action_suspend_short', lang)}
      </Button>
      <dialog
        ref={dialogRef}
        aria-labelledby={`${id}-title`}
        // Escape while the action runs would hide its outcome — the dialog stays until it settles.
        onCancel={(e) => { if (pending) e.preventDefault() }}
        onClose={() => { setReason(''); setErrorKey(null) }}
        className="m-auto w-[min(28rem,calc(100vw-2rem))] rounded-xl border border-border-subtle bg-surface-base p-6 text-text-primary shadow-lg backdrop:bg-text-primary/40"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault()
            setErrorKey(null)
            startTransition(async () => {
              const res = await suspendUser(targetUserId, reason)
              if (!res.success) setErrorKey(res.error ?? 'common.error_generic')
              else dialogRef.current?.close()
            })
          }}
          className="flex flex-col gap-4"
        >
          <h2 id={`${id}-title`} className="text-body-lg font-semibold text-text-primary">{t('admin.users.action_suspend', lang)}</h2>
          <div className="flex flex-col gap-2">
            <label htmlFor={`${id}-reason`} className="text-body-sm font-medium text-text-secondary">
              {t('admin.users.suspend_reason_label', lang)}
            </label>
            <textarea
              id={`${id}-reason`}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              required
              placeholder={t('admin.users.suspend_reason_placeholder', lang)}
              className="w-full resize-y rounded-lg border border-border-strong bg-surface-base px-3.5 py-3 text-body-sm text-text-primary placeholder:text-text-muted focus:border-brand-blue-600 focus:outline-none focus:ring-2 focus:ring-brand-blue-600 focus:ring-offset-2"
            />
          </div>
          {errorKey ? <p role="alert" className="text-body-sm text-danger-700">{t(errorKey, lang)}</p> : null}
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="ghost" disabled={pending} onClick={close}>
              {t('admin.users.suspend_cancel', lang)}
            </Button>
            <Button type="submit" variant="danger" loading={pending} disabled={reason.trim().length === 0}>
              {t('admin.users.suspend_confirm_action', lang)}
            </Button>
          </div>
        </form>
      </dialog>
    </>
  )
}
