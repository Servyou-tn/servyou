'use client'

import { useEffect, useRef, useState, type RefObject } from 'react'
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

const CONCEAL_EVENT = 'servyou:conceal-passwords'

/**
 * Puts every password field of `form` back to hidden. A form calls it once it REALLY sends: after its own checks
 * (isValidPassword, the confirmation match, …) passed, right before the request goes out — so the browser never records
 * the password as an ordinary text value. A submit that any check stops never calls it, and every field stays exactly as
 * the person left it (Moatez's rule, like every familiar app). The browser's own required / minLength checks need
 * nothing extra: when they fail, the submit event never fires, so the form's handler — and this call — never runs.
 * Synchronous: when it returns, every field is already `type="password"`, before React re-renders.
 */
export function concealPasswords(form: HTMLFormElement): void {
  form.dispatchEvent(new Event(CONCEAL_EVENT))
}

/**
 * The reveal state of one password field. It changes only when the person presses the eye, and when the form calls
 * concealPasswords (a real send). The switch is written on the element too (not only React state), so the field is
 * hidden the moment concealPasswords returns.
 *
 * The form is found through the eye button (`button.form`), then the input by id INSIDE that form: two forms on a page
 * that reuse the same input id can never bind to each other's field.
 */
export function usePasswordReveal(inputId: string): {
  shown: boolean
  toggle: () => void
  buttonRef: RefObject<HTMLButtonElement | null>
} {
  const [shown, setShown] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const form = buttonRef.current?.form
    const input = form ? [...form.querySelectorAll('input')].find((el) => el.id === inputId) : null
    if (!form || !input) return
    const hide = () => {
      input.type = 'password'
      setShown(false)
    }
    form.addEventListener(CONCEAL_EVENT, hide)
    return () => form.removeEventListener(CONCEAL_EVENT, hide)
  }, [inputId])

  return { shown, toggle: () => setShown((s) => !s), buttonRef }
}

/** The eye button. The caller positions it (`className`) inside its field; the box is at least 44 × 44. */
export function PasswordRevealButton({
  controls,
  shown,
  onToggle,
  buttonRef,
  disabled,
  className,
}: {
  /** The password input's id. */
  controls: string
  shown: boolean
  onToggle: () => void
  /** usePasswordReveal's buttonRef: the hook finds the form through it. */
  buttonRef: RefObject<HTMLButtonElement | null>
  /** The field is disabled: the eye cannot reveal it either. */
  disabled?: boolean
  className?: string
}) {
  const lang = useLang()
  const Icon = shown ? EyeOff : Eye
  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={onToggle}
      // A tap on the eye keeps the focus (and a phone's keyboard) in the password field.
      onMouseDown={(e) => e.preventDefault()}
      disabled={disabled}
      aria-controls={controls}
      aria-label={t(shown ? 'signup.form.fields.password.toggleHide' : 'signup.form.fields.password.toggleShow', lang)}
      className={cn(
        'flex min-h-11 min-w-11 shrink-0 items-center justify-center text-text-muted transition-colors hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-50',
        FOCUS_RING,
        className,
      )}
    >
      <Icon className="size-5" aria-hidden="true" />
    </button>
  )
}
