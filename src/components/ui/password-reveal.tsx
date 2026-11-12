'use client'

import { useEffect, useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { FOCUS_RING } from '@/components/layout/styles'

// The show / hide eye shared by every password field (PasswordInput below the design-system Input, and the auth funnel's
// PasswordField). Founder request while testing #358: each password field gets its own toggle, hidden by default.
//
// a11y: a real <button type="button"> (never submits), aria-controls → the input, and an aria-label that SWITCHES between
// « Afficher le mot de passe » and « Masquer le mot de passe ». Deliberately no aria-pressed: a pressed toggle must keep a
// fixed label, and here the label itself says what the next press does. 44 × 44 touch target, the shared focus ring.

/** Attributes every password input carries: a revealed password is a text field, so phones must not capitalise or
 *  autocorrect it, and the browser must not send it to a cloud spellchecker. */
export const PASSWORD_INPUT_ATTRS = { spellCheck: false, autoCapitalize: 'off', autoCorrect: 'off' } as const

/**
 * The reveal state of one password field, by the input's id. The field goes back to hidden when its form is submitted,
 * so the browser never records the password as an ordinary text value (autofill history). The switch is made directly
 * on the element, synchronously, at the three moments a submission can start — Enter in a field (implicit submit), a
 * click on a submit control, and the submit event itself — so it is already `type="password"` whichever of them the
 * browser reads the form at, and before React re-renders.
 */
export function usePasswordReveal(inputId: string): { shown: boolean; toggle: () => void } {
  const [shown, setShown] = useState(false)

  useEffect(() => {
    const input = document.getElementById(inputId)
    if (!(input instanceof HTMLInputElement) || !input.form) return
    const form = input.form
    const hide = () => {
      input.type = 'password'
      setShown(false)
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && e.target instanceof HTMLInputElement) hide()
    }
    const onClick = (e: MouseEvent) => {
      const control = e.target instanceof Element ? e.target.closest('button, input') : null
      if ((control instanceof HTMLButtonElement || control instanceof HTMLInputElement) && control.type === 'submit') hide()
    }
    form.addEventListener('keydown', onKeyDown, true)
    form.addEventListener('click', onClick, true)
    form.addEventListener('submit', hide, true)
    return () => {
      form.removeEventListener('keydown', onKeyDown, true)
      form.removeEventListener('click', onClick, true)
      form.removeEventListener('submit', hide, true)
    }
  }, [inputId])

  return { shown, toggle: () => setShown((s) => !s) }
}

/** The eye button. The caller positions it (`className`) inside its field; the box is at least 44 × 44. */
export function PasswordRevealButton({
  controls,
  shown,
  onToggle,
  className,
}: {
  /** The password input's id. */
  controls: string
  shown: boolean
  onToggle: () => void
  className?: string
}) {
  const lang = useLang()
  const Icon = shown ? EyeOff : Eye
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-controls={controls}
      aria-label={t(shown ? 'signup.form.fields.password.toggleHide' : 'signup.form.fields.password.toggleShow', lang)}
      className={cn(
        'flex min-h-11 min-w-11 shrink-0 items-center justify-center text-text-muted transition-colors hover:text-text-primary',
        FOCUS_RING,
        className,
      )}
    >
      <Icon className="size-5" aria-hidden="true" />
    </button>
  )
}
