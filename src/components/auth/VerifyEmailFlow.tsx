'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'
import { isValidEmail } from '@/lib/signup-validation'
import { SIGNUP_ROLE_KEY, asSignupRole } from '@/lib/signup-role'
import { nextDestinationAfterVerify } from '@/lib/verify-email'
import { resolveRole } from '@/lib/roles'
import type { SellerType } from '@/lib/layout/select-variant'
import { AuthShell } from '@/components/auth/AuthShell'
import { MailIcon, CheckCircleIcon, AlertCircleIcon, SpinnerIcon } from '@/components/auth/Icons'
import { display, labelClass, inputBase, primaryBtn } from '@/components/auth/field-styles'

// Initial state is decided server-side from the URL (?error / ?code / ?email) so
// the first paint is correct; the client listener then flips to 'verified' once a
// session exists. 'loading' = a verification link (?code) is being exchanged.
export type VerifyInitialView = 'pending' | 'loading' | 'failed'
type View = VerifyInitialView | 'verified'

const AUTO_REDIRECT_SECONDS = 3
const RESEND_COOLDOWN_SECONDS = 30

// Resend-with-cooldown: shared by State 1 and State 3. Starts the 30s cooldown on
// every attempt (spam-resistant even on error) and auto-hides success after 5s.
function useResend() {
  const supabase = createClient()
  const [cooldown, setCooldown] = useState(0)
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')

  useEffect(() => {
    if (cooldown <= 0) return
    const id = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000)
    return () => clearInterval(id)
  }, [cooldown])

  useEffect(() => {
    if (status !== 'success') return
    const id = setTimeout(() => setStatus('idle'), 5000)
    return () => clearTimeout(id)
  }, [status])

  async function resend(email: string) {
    if (cooldown > 0) return
    setStatus('idle')
    setCooldown(RESEND_COOLDOWN_SECONDS)
    const { error } = await supabase.auth.resend({ type: 'signup', email: email.trim().toLowerCase() })
    if (error) {
      console.error('[VerifyEmail] resend error:', error)
      setStatus('error')
      return
    }
    setStatus('success')
  }

  return { cooldown, status, resend }
}

export function VerifyEmailFlow({
  initialView,
  initialEmail,
}: {
  initialView: VerifyInitialView
  initialEmail: string
}) {
  const supabase = createClient()
  const router = useRouter()
  const lang = useLang()

  const [view, setView] = useState<View>(initialView)
  const [userId, setUserId] = useState<string | null>(null)
  const [autoSeconds, setAutoSeconds] = useState(AUTO_REDIRECT_SECONDS)
  const redirectingRef = useRef(false)
  const continueRef = useRef<HTMLButtonElement>(null)
  const resendEmailRef = useRef<HTMLInputElement>(null)

  // State 3 resend input (prefilled from ?email when Supabase preserves it).
  const [resendEmail, setResendEmail] = useState(initialEmail)
  const [resendEmailError, setResendEmailError] = useState('')
  const resend = useResend()

  const emailDisplay = initialEmail || t('verifyEmail.state1.emailFallback', lang)

  // Auth listener: any event carrying a session means the user is authenticated →
  // verified (covers both SIGNED_IN from a fresh link exchange and INITIAL_SESSION
  // for an already-signed-in visit). Null events are ignored: a 'loading' link
  // waits for the exchange (→ verified) or the timeout (→ failed); 'pending'/'failed'
  // are already correct. NEVER getSession() synchronously (stale cookie).
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setUserId(session.user.id)
        setView('verified')
      }
    })
    // A ?code link that never produces a session (e.g. cross-device PKCE) → treat
    // as an expired/invalid link so the user can resend.
    const timer = setTimeout(() => setView((v) => (v === 'loading' ? 'failed' : v)), 8000)
    return () => {
      subscription.unsubscribe()
      clearTimeout(timer)
    }
  }, [supabase])

  // Where to go after verification: role intent (sessionStorage) wins; else the
  // actual seller_type (cross-device). Guarded against double-fire (button + auto).
  async function doContinue() {
    if (redirectingRef.current) return
    redirectingRef.current = true
    const role = asSignupRole(typeof window !== 'undefined' ? sessionStorage.getItem(SIGNUP_ROLE_KEY) : null)
    let sellerType: SellerType = null
    if (!role && userId) {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('seller_type')
        .eq('id', userId)
        .single()
      if (error) console.error('[VerifyEmail] profile fetch error:', error)
      sellerType = resolveRole(profile)
    }
    try {
      sessionStorage.removeItem(SIGNUP_ROLE_KEY)
    } catch {
      // storage disabled — nothing to clear
    }
    router.push(nextDestinationAfterVerify(role, sellerType))
  }

  // On reaching State 2, move focus to Continue and run the 3s auto-redirect.
  useEffect(() => {
    if (view !== 'verified') return
    continueRef.current?.focus()
  }, [view])
  useEffect(() => {
    if (view !== 'verified') return
    if (autoSeconds <= 0) {
      void doContinue()
      return
    }
    const id = setTimeout(() => setAutoSeconds((s) => s - 1), 1000)
    return () => clearTimeout(id)
    // doContinue is stable enough for this countdown; re-running on autoSeconds is intended.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, autoSeconds])
  // On reaching State 3, focus the resend email input.
  useEffect(() => {
    if (view === 'failed') resendEmailRef.current?.focus()
  }, [view])

  function handleState3Resend() {
    setResendEmailError('')
    if (!isValidEmail(resendEmail)) {
      setResendEmailError(t('signup.form.errors.emailInvalid', lang))
      resendEmailRef.current?.focus()
      return
    }
    void resend.resend(resendEmail)
  }

  // Per-state header (on white, above the box).
  const header =
    view === 'verified'
      ? { title: t('verifyEmail.state2.title', lang), subtitle: t('verifyEmail.state2.subtitle', lang) }
      : view === 'failed'
        ? { title: t('verifyEmail.state3.title', lang), subtitle: t('verifyEmail.state3.subtitle', lang) }
        : { title: t('verifyEmail.title', lang), subtitle: t('verifyEmail.state1.subtitle', lang) }

  const resendStatus =
    resend.status === 'success' ? (
      <p aria-live="polite" className="mt-4 text-body-sm text-brand-blue-200">
        {t('verifyEmail.state1.resendSuccess', lang)}
      </p>
    ) : resend.status === 'error' ? (
      <p aria-live="polite" className="mt-4 text-body-sm text-red-300">
        {t('verifyEmail.state1.resendError', lang)}
      </p>
    ) : null

  const state1Body = t('verifyEmail.state1.body', lang).split('{email}')

  return (
    <>
      <header className="px-4 pt-12 text-center md:pt-16">
        {/* responsive pair retained: md:text-[40px] has no clean tier; half-tokenizing would break the mobile→desktop ramp (DS-3b-3) */}
        <h1 className={`${display} mx-auto max-w-[720px] text-balance text-[30px] font-bold leading-[1.15] tracking-[-0.025em] text-[var(--text-primary)] md:text-[40px]`}>
          {header.title}
        </h1>
        <p className={`${display} mx-auto mt-2 max-w-[560px] text-base font-medium text-[var(--text-muted)] md:text-lg`}>
          {header.subtitle}
        </p>
      </header>

      <div className="mt-8 flex justify-center px-4 md:mt-10">
        <AuthShell variant="navy" maxWidthClass="max-w-[480px]">
          {view === 'loading' ? (
            <div className="flex flex-col items-center text-center">
              <SpinnerIcon className="h-10 w-10 animate-spin text-brand-blue-200" />
              <p className="mt-4 text-sm text-brand-blue-200">{t('common.loading', lang)}</p>
            </div>
          ) : view === 'verified' ? (
            <div className="flex flex-col items-center text-center">
              <CheckCircleIcon className="mb-6 h-16 w-16 text-green-400" />
              <p className="text-body leading-relaxed text-white">{t('verifyEmail.state2.body', lang)}</p>
              <button ref={continueRef} type="button" onClick={() => void doContinue()} className={`mt-6 ${primaryBtn}`}>
                {t('verifyEmail.state2.continue', lang)}
              </button>
              <p aria-live="polite" className="mt-4 text-body-sm text-brand-blue-200">
                {t('verifyEmail.state2.autoRedirect', lang, { seconds: autoSeconds })}
              </p>
            </div>
          ) : view === 'failed' ? (
            <div className="flex flex-col items-center text-center">
              <AlertCircleIcon className="mb-6 h-16 w-16 text-amber-400" />
              <p className="text-body leading-relaxed text-white">{t('verifyEmail.state3.body', lang)}</p>
              <div className="mt-6 w-full text-start">
                <label htmlFor="resend-email" className={labelClass}>
                  {t('verifyEmail.state3.emailLabel', lang)}
                </label>
                <input
                  ref={resendEmailRef}
                  id="resend-email"
                  type="email"
                  dir="ltr"
                  autoComplete="email"
                  placeholder={t('verifyEmail.state3.emailPlaceholder', lang)}
                  value={resendEmail}
                  onChange={(e) => setResendEmail(e.target.value)}
                  aria-invalid={!!resendEmailError}
                  aria-describedby={resendEmailError ? 'resend-email-error' : undefined}
                  className={`${inputBase} ${resendEmailError ? 'border-red-400' : 'border-[var(--border-subtle)]'}`}
                />
                {resendEmailError ? (
                  <p id="resend-email-error" role="alert" className="mt-1.5 text-sm text-red-300">
                    {resendEmailError}
                  </p>
                ) : null}
              </div>
              {resendStatus}
              <button type="button" onClick={handleState3Resend} disabled={resend.cooldown > 0} className={`mt-4 ${primaryBtn}`}>
                <span aria-live="polite">
                  {resend.cooldown > 0
                    ? t('verifyEmail.state1.resendCooldown', lang, { seconds: resend.cooldown })
                    : t('verifyEmail.state3.resend', lang)}
                </span>
              </button>
              <Link href="/connexion" className="mt-4 text-body-sm font-medium text-brand-blue-300 hover:underline">
                {t('verifyEmail.state3.backToSignin', lang)}
              </Link>
            </div>
          ) : (
            // 'pending' — State 1
            <div className="flex flex-col items-center text-center">
              <MailIcon className="mb-6 h-16 w-16 text-brand-blue-200" />
              <p className="text-body leading-relaxed text-white">
                {state1Body[0]}
                <strong className="font-semibold text-white">{emailDisplay}</strong>
                {state1Body[1] ?? ''}
              </p>
              {resendStatus}
              <button
                type="button"
                onClick={() => void resend.resend(initialEmail)}
                disabled={resend.cooldown > 0 || !initialEmail}
                className={`mt-6 ${primaryBtn}`}
              >
                <span aria-live="polite">
                  {resend.cooldown > 0
                    ? t('verifyEmail.state1.resendCooldown', lang, { seconds: resend.cooldown })
                    : t('verifyEmail.state1.resend', lang)}
                </span>
              </button>
              <p className="mt-4 text-body-sm text-brand-blue-200">{t('verifyEmail.state1.checkSpam', lang)}</p>
            </div>
          )}
        </AuthShell>
      </div>
    </>
  )
}
