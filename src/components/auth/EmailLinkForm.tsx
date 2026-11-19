'use client'

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'
import { isValidEmail } from '@/lib/signup-validation'
import { sendEmailLink } from '@/lib/auth/email-link'
import { MailIcon, SpinnerIcon } from '@/components/auth/Icons'
import { display, labelClass, errorClass, inputBase, primaryBtn } from '@/components/auth/field-styles'
import { Turnstile, type TurnstileHandle } from '@/components/security/Turnstile'

// Step 1 of the two-step sign-up (name + e-mail) and « Recevoir un nouveau lien » (e-mail only): both send the e-mail
// link (src/lib/auth/email-link.ts) and then show « check your e-mail » with a resend. Every error is an i18n KEY in state,
// resolved at render (store keys, not text: a language switch re-translates).

// GoTrue refuses a second link to the same address within its own interval (60 s by default): the button waits as long.
const RESEND_COOLDOWN_SECONDS = 60

type FieldErrors = { fullName?: string; email?: string }

function Field({ id, label, error, children }: { id: string; label: string; error?: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} role="alert" className={errorClass}>
          {error}
        </p>
      ) : null}
    </div>
  )
}

export function EmailLinkForm({
  withName,
  next,
  initialEmail = '',
  submitKey,
}: {
  /** Step 1 asks for the name too; the new-link page does not. */
  withName: boolean
  /** Where the link leads once the account is complete (validated by the page). */
  next: string | null
  initialEmail?: string
  submitKey: string
}) {
  const lang = useLang()
  const turnstile = useRef<TurnstileHandle>(null)
  const inFlight = useRef(false)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState(initialEmail)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [formErrorKey, setFormErrorKey] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [cooldown, setCooldown] = useState(0)
  const [resendStatus, setResendStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const resendRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (cooldown <= 0) return
    const id = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000)
    return () => clearInterval(id)
  }, [cooldown])

  // « Check your e-mail » takes the focus target, so a keyboard / screen-reader user lands on the new state.
  useEffect(() => {
    if (sentTo) resendRef.current?.focus()
  }, [sentTo])

  async function send(address: string): Promise<string | null> {
    const captchaToken = await turnstile.current?.getToken()
    return sendEmailLink(createClient(), {
      email: address,
      fullName: withName ? fullName : undefined,
      lang,
      next,
      origin: window.location.origin,
      captchaToken,
    })
  }

  async function handleSubmit(ev: FormEvent<HTMLFormElement>) {
    ev.preventDefault()
    if (inFlight.current) return
    setFormErrorKey(null)
    const errs: FieldErrors = {}
    const name = fullName.trim()
    if (withName && name.length < 2) errs.fullName = 'signup.form.errors.fullNameTooShort'
    else if (withName && name.length > 100) errs.fullName = 'signup.form.errors.fullNameTooLong'
    if (!isValidEmail(email)) errs.email = 'signup.form.errors.emailInvalid'
    setFieldErrors(errs)
    if (Object.keys(errs).length > 0) {
      document.getElementById(errs.fullName ? 'fullName' : 'email')?.focus()
      return
    }
    inFlight.current = true
    setLoading(true)
    const address = email.trim().toLowerCase()
    const errorKey = await send(address)
    inFlight.current = false
    setLoading(false)
    if (errorKey) {
      setFormErrorKey(errorKey)
      return
    }
    setSentTo(address)
    setCooldown(RESEND_COOLDOWN_SECONDS)
  }

  async function handleResend() {
    if (!sentTo || cooldown > 0 || inFlight.current) return
    inFlight.current = true
    setResendStatus('idle')
    setCooldown(RESEND_COOLDOWN_SECONDS)
    const errorKey = await send(sentTo)
    inFlight.current = false
    setResendStatus(errorKey ? 'error' : 'success')
  }

  if (sentTo) {
    const body = t('emailLink.sent', lang).split('{email}')
    return (
      <div className="flex flex-col items-center text-center">
        <MailIcon className="mb-6 h-16 w-16 text-brand-blue-200" />
        <p className="text-body leading-relaxed text-white" aria-live="polite">
          {body[0]}
          <strong dir="ltr" className="font-semibold text-white">
            {sentTo}
          </strong>
          {body[1] ?? ''}
        </p>
        {resendStatus !== 'idle' ? (
          <p aria-live="polite" className={`mt-4 text-body-sm ${resendStatus === 'success' ? 'text-brand-blue-200' : 'text-red-300'}`}>
            {t(resendStatus === 'success' ? 'verifyEmail.state1.resendSuccess' : 'verifyEmail.state1.resendError', lang)}
          </p>
        ) : null}
        <button ref={resendRef} type="button" onClick={() => void handleResend()} disabled={cooldown > 0} className={`mt-6 ${primaryBtn}`}>
          <span aria-live="polite">
            {cooldown > 0
              ? t('verifyEmail.state1.resendCooldown', lang, { seconds: cooldown })
              : t('verifyEmail.state1.resend', lang)}
          </span>
        </button>
        <p className="mt-4 text-body-sm text-brand-blue-200">{t('verifyEmail.state1.checkSpam', lang)}</p>
        <Turnstile ref={turnstile} action="resend" />
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      {withName ? (
        <Field id="fullName" label={t('signup.form.fields.fullName.label', lang)} error={fieldErrors.fullName ? t(fieldErrors.fullName, lang) : undefined}>
          <input
            id="fullName"
            type="text"
            autoComplete="name"
            maxLength={100}
            placeholder={t('signup.form.fields.fullName.placeholder', lang)}
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            aria-invalid={!!fieldErrors.fullName}
            aria-describedby={fieldErrors.fullName ? 'fullName-error' : undefined}
            className={`${inputBase} ${fieldErrors.fullName ? 'border-red-400' : 'border-[var(--border-subtle)]'}`}
          />
        </Field>
      ) : null}

      <Field id="email" label={t('signup.form.fields.email.label', lang)} error={fieldErrors.email ? t(fieldErrors.email, lang) : undefined}>
        <input
          id="email"
          type="email"
          autoComplete="email"
          dir="ltr"
          placeholder={t('signup.form.fields.email.placeholder', lang)}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={!!fieldErrors.email}
          aria-describedby={fieldErrors.email ? 'email-error' : undefined}
          className={`${inputBase} ${fieldErrors.email ? 'border-red-400' : 'border-[var(--border-subtle)]'}`}
        />
      </Field>

      {formErrorKey ? (
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {t(formErrorKey, lang)}
        </p>
      ) : null}

      <Turnstile ref={turnstile} action={withName ? 'signup' : 'resend'} />
      <button type="submit" disabled={loading} className={primaryBtn}>
        {loading ? (
          <>
            <SpinnerIcon className="h-5 w-5 animate-spin" />
            <span className={display}>{t(submitKey, lang)}</span>
          </>
        ) : (
          t(submitKey, lang)
        )}
      </button>
    </form>
  )
}
