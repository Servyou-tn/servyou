'use client'

import { useEffect, useRef, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'
import { isValidEmail } from '@/lib/signup-validation'
import { CheckCircleIcon, SpinnerIcon } from '@/components/auth/Icons'
import { labelClass, errorClass, inputBase, primaryBtn } from '@/components/auth/field-styles'

// Box content for /mot-de-passe-oublie. One email field → resetPasswordForEmail.
// ALWAYS shows the same generic success regardless of whether the email exists
// (anti-enumeration); real errors are logged, never surfaced.
export function ForgotPasswordForm() {
  const supabase = createClient()
  const lang = useLang()
  const [email, setEmail] = useState('')
  const [emailError, setEmailError] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const backLinkRef = useRef<HTMLAnchorElement>(null)

  // On success, move focus to the back-to-sign-in link (the only action left).
  useEffect(() => {
    if (submitted) backLinkRef.current?.focus()
  }, [submitted])

  async function handleSubmit(ev: FormEvent) {
    ev.preventDefault()
    setEmailError('')
    if (!isValidEmail(email)) {
      setEmailError(t('signup.form.errors.emailInvalid', lang))
      document.getElementById('forgot-email')?.focus()
      return
    }
    setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: `${window.location.origin}/nouveau-mot-de-passe`,
    })
    if (error) console.error('[ForgotPasswordForm] reset error:', error)
    setLoading(false)
    setSubmitted(true) // same success state whether or not the email exists
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center text-center">
        <CheckCircleIcon className="mb-5 h-12 w-12 text-blue-200" />
        <h2 className="text-lg font-semibold text-white">{t('forgotPassword.success.title', lang)}</h2>
        <p className="mt-2 text-[15px] leading-relaxed text-white">{t('forgotPassword.success.body', lang)}</p>
        <p className="mt-4 text-[13px] text-blue-200">{t('forgotPassword.success.checkSpam', lang)}</p>
        <Link ref={backLinkRef} href="/connexion" className="mt-6 text-[13px] font-medium text-blue-300 hover:underline">
          {t('forgotPassword.success.backToSignin', lang)}
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <div>
        <label htmlFor="forgot-email" className={labelClass}>
          {t('forgotPassword.fields.email.label', lang)}
        </label>
        <input
          id="forgot-email"
          type="email"
          dir="ltr"
          autoComplete="email"
          placeholder={t('forgotPassword.fields.email.placeholder', lang)}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={!!emailError}
          aria-describedby={emailError ? 'forgot-email-error' : undefined}
          className={`${inputBase} ${emailError ? 'border-red-400' : 'border-[var(--border-subtle)]'}`}
        />
        {emailError ? (
          <p id="forgot-email-error" role="alert" className={errorClass}>
            {emailError}
          </p>
        ) : null}
      </div>
      <button type="submit" disabled={loading} className={primaryBtn}>
        {loading ? (
          <>
            <SpinnerIcon className="h-5 w-5 animate-spin" />
            {t('forgotPassword.submitting', lang)}
          </>
        ) : (
          t('forgotPassword.submit', lang)
        )}
      </button>
    </form>
  )
}
