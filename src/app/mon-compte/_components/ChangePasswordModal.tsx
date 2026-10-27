'use client'

import { useState, useTransition, type FormEvent } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { changePasswordAction } from '@/app/mon-compte/actions'
import { isValidPassword } from '@/lib/signup-validation'
import { t, type Lang } from '@/lib/i18n'
import { ModalShell } from './ModalShell'

// Errors are held as i18n KEYS and resolved at render, so switching language with the modal open
// re-translates them. Server messages (already in the caller's language) are the one exception and
// are shown as returned.
type FieldError = { key: string } | { text: string }

export function ChangePasswordModal({ lang, onClose }: { lang: Lang; onClose: () => void }) {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [currentError, setCurrentError] = useState<FieldError | null>(null)
  const [nextError, setNextError] = useState<FieldError | null>(null)
  const [confirmError, setConfirmError] = useState<FieldError | null>(null)
  const [formError, setFormError] = useState<FieldError | null>(null)
  const [pending, startTransition] = useTransition()

  const say = (e: FieldError | null) => (e ? ('key' in e ? t(e.key, lang) : e.text) : undefined)

  function submit(ev: FormEvent) {
    ev.preventDefault()
    setCurrentError(null)
    setNextError(null)
    setConfirmError(null)
    setFormError(null)

    let bad = false
    if (!current) {
      setCurrentError({ key: 'monCompte.password.required' })
      bad = true
    }
    if (!isValidPassword(next)) {
      setNextError({ key: 'monCompte.password.invalid' })
      bad = true
    }
    if (next !== confirm) {
      setConfirmError({ key: 'monCompte.password.mismatch' })
      bad = true
    }
    if (bad) return

    startTransition(async () => {
      const res = await changePasswordAction({ currentPassword: current, newPassword: next })
      if (res.ok) {
        toast.success(t('monCompte.toast.passwordUpdated', lang))
        onClose()
        return
      }
      const err = { text: res.error }
      if (res.field === 'currentPassword') setCurrentError(err)
      else if (res.field === 'newPassword') setNextError(err)
      else setFormError(err)
    })
  }

  return (
    <ModalShell titleId="change-password-title" title={t('monCompte.password.modalTitle', lang)} busy={pending} onClose={onClose}>
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        <Input
          label={t('monCompte.field.currentPassword', lang)}
          type="password"
          autoComplete="current-password"
          required
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          error={say(currentError)}
        />
        <Input
          label={t('monCompte.field.newPassword', lang)}
          type="password"
          autoComplete="new-password"
          required
          value={next}
          onChange={(e) => setNext(e.target.value)}
          helper={t('monCompte.password.invalid', lang)}
          error={say(nextError)}
        />
        <Input
          label={t('monCompte.field.confirmPassword', lang)}
          type="password"
          autoComplete="new-password"
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          error={say(confirmError)}
        />

        {formError && (
          <p role="alert" className="text-sm text-danger-500">
            {say(formError)}
          </p>
        )}

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" size="md" onClick={onClose} disabled={pending}>
            {t('monCompte.password.cancel', lang)}
          </Button>
          <Button type="submit" variant="primary" size="md" loading={pending}>
            {t('monCompte.password.submit', lang)}
          </Button>
        </div>
      </form>
    </ModalShell>
  )
}
