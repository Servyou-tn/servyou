'use client'

import { useEffect, useRef, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'
import { isValidPassword } from '@/lib/signup-validation'
import { AlertCircleIcon, SpinnerIcon } from '@/components/auth/Icons'
import { PasswordField } from '@/components/auth/PasswordField'
import { concealPasswords } from '@/components/ui/password-reveal'
import { AuthShell } from '@/components/auth/AuthShell'
import { display, primaryBtn } from '@/components/auth/field-styles'

// Initial state is decided server-side (?error_code=otp_expired → expired; other
// ?error → invalid; a ?token_hash recovery link → confirm; else checking). Expired
// is the invalid state headed « Lien expiré, demandez-en un nouveau »
// (lib/auth/expired-link.ts). Confirm spends the token_hash with verifyOtp only on
// the « Continuer » click (lib/auth/recovery-link.ts): no code verifier needed, so
// the link works cross-device, and a mail scanner's GET cannot use it up. The
// client listener flips to the reset form only for a RECOVERY session: the
// PASSWORD_RECOVERY event the reset link's code exchange fires, or a reload of this
// tab after it (RECOVERY_FLAG). An ordinary signed-in session no longer gets a
// password form without re-authentication (pre-launch audit pass 3) — that path is
// Mon compte › Sécurité (changePasswordAction re-checks the current password). If no
// recovery session arrives within 2s, the link is treated as invalid/expired.
// UI gate only: the server-side guard is GoTrue's « Secure password change » setting.
export type NewPasswordInitialView = 'checking' | 'invalid' | 'expired' | 'confirm'
type View = NewPasswordInitialView | 'form'

const RECOVERY_FLAG = 'servyou:password-recovery'

function readRecoveryFlag(): string | null {
  try {
    return sessionStorage.getItem(RECOVERY_FLAG)
  } catch {
    return null
  }
}

export function NewPasswordForm({
  initialView,
  tokenHash,
}: {
  initialView: NewPasswordInitialView
  tokenHash?: string
}) {
  const supabase = createClient()
  const router = useRouter()
  const lang = useLang()

  const [view, setView] = useState<View>(initialView)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [confirmError, setConfirmError] = useState('')
  const [formError, setFormError] = useState('')
  const [loading, setLoading] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const requestNewRef = useRef<HTMLAnchorElement>(null)

  useEffect(() => {
    // A new link (token_hash or expired) supersedes an unfinished recovery remembered in this tab.
    const resumesRecovery = initialView !== 'confirm' && initialView !== 'expired'
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) return
      if (event === 'PASSWORD_RECOVERY') {
        try {
          sessionStorage.setItem(RECOVERY_FLAG, session.user.id)
        } catch {
          // storage disabled — this tab just cannot survive a reload of the form
        }
        setView('form')
      } else if (resumesRecovery && readRecoveryFlag() === session.user.id) {
        setView('form')
      }
    })
    // No recovery session within 2s → the link is invalid/expired (State B).
    const timer = setTimeout(() => setView((v) => (v === 'checking' ? 'invalid' : v)), 2000)
    return () => {
      subscription.unsubscribe()
      clearTimeout(timer)
    }
  }, [supabase, initialView])

  const isInvalid = view === 'invalid' || view === 'expired'

  useEffect(() => {
    if (isInvalid) requestNewRef.current?.focus()
  }, [isInvalid])

  // The token is single-use: the button stays disabled while verifying, so a double click cannot spend it twice.
  // otp_expired = used or expired → the expired state; any other failure (network, rate limit) did not consume the
  // token, so the button stays for a retry. On success the PASSWORD_RECOVERY listener remembers the recovery for
  // this tab, and the hash leaves the address bar so a reload resumes the form instead of re-spending it.
  async function handleConfirm() {
    if (!tokenHash || verifying) return
    setVerifying(true)
    setFormError('')
    try {
      const { data, error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'recovery' })
      if (error) {
        console.error('[NewPasswordForm] verifyOtp error:', error.message, error.code, error.status)
        setVerifying(false)
        if (error.code === 'otp_expired') {
          window.history.replaceState(null, '', '/nouveau-mot-de-passe?error=access_denied&error_code=otp_expired')
          setView((v) => (v === 'form' ? v : 'expired'))
        } else {
          setFormError(t('newPassword.errors.verifyFailed', lang))
        }
        return
      }
      if (!data.session) {
        console.error('[NewPasswordForm] verifyOtp returned no session')
        setFormError(t('newPassword.errors.verifyFailed', lang))
        setVerifying(false)
        return
      }
      window.history.replaceState(null, '', '/nouveau-mot-de-passe')
      setView('form')
    } catch (err) {
      console.error('[NewPasswordForm] unexpected verify error:', err instanceof Error ? err.message : String(err))
      setFormError(t('newPassword.errors.verifyFailed', lang))
      setVerifying(false)
    }
  }

  async function handleSubmit(ev: FormEvent<HTMLFormElement>) {
    ev.preventDefault()
    setPasswordError('')
    setConfirmError('')
    setFormError('')
    let bad = false
    if (!isValidPassword(password)) {
      setPasswordError(t('newPassword.errors.weakPassword', lang))
      bad = true
    }
    if (password !== confirm) {
      setConfirmError(t('newPassword.errors.mismatch', lang))
      bad = true
    }
    if (bad) return

    // The checks passed: the form really sends, so both fields go back to hidden now (never on a blocked submit).
    concealPasswords(ev.currentTarget)
    setLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) {
        console.error('[NewPasswordForm] updateUser error:', error.message, error.code, error.status)
        setFormError(t('newPassword.errors.updateFailed', lang))
        setLoading(false)
        return
      }
      try {
        sessionStorage.removeItem(RECOVERY_FLAG)
      } catch {
        // storage disabled — nothing to clear
      }
      // Drop the one-time recovery session (global: other devices' refresh tokens too), then sign in fresh.
      const { error: signOutError } = await supabase.auth.signOut()
      if (signOutError) {
        console.error('[NewPasswordForm] signOut after reset failed:', signOutError.message, signOutError.code, signOutError.status)
      }
      router.push('/connexion?passwordReset=success')
    } catch (err) {
      console.error('[NewPasswordForm] unexpected error:', err instanceof Error ? err.message : String(err))
      setFormError(t('newPassword.errors.updateFailed', lang))
      setLoading(false)
    }
  }

  const header =
    view === 'form'
      ? { title: t('newPassword.title', lang), subtitle: t('newPassword.subtitle', lang) }
      : view === 'expired'
        ? { title: t('newPassword.expired.title', lang), subtitle: t('newPassword.invalid.subtitle', lang) }
        : view === 'invalid'
          ? { title: t('newPassword.invalid.title', lang), subtitle: t('newPassword.invalid.subtitle', lang) }
          : { title: t('newPassword.title', lang), subtitle: t('newPassword.subtitle', lang) }

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
          {view === 'checking' ? (
            <div className="flex flex-col items-center text-center">
              <SpinnerIcon className="h-10 w-10 animate-spin text-brand-blue-200" />
              <p className="mt-4 text-sm text-brand-blue-200">{t('common.loading', lang)}</p>
            </div>
          ) : view === 'confirm' ? (
            <div className="flex flex-col items-center text-center">
              <p className="text-body leading-relaxed text-white">{t('newPassword.confirm.body', lang)}</p>
              {formError ? (
                <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {formError}
                </p>
              ) : null}
              <button type="button" onClick={handleConfirm} disabled={verifying} className={`mt-6 ${primaryBtn}`}>
                {verifying ? (
                  <>
                    <SpinnerIcon className="h-5 w-5 animate-spin" />
                    {t('newPassword.confirm.verifying', lang)}
                  </>
                ) : (
                  t('newPassword.confirm.cta', lang)
                )}
              </button>
            </div>
          ) : isInvalid ? (
            <div className="flex flex-col items-center text-center">
              <AlertCircleIcon className="mb-6 h-16 w-16 text-amber-400" />
              <p className="text-body leading-relaxed text-white">{t('newPassword.invalid.body', lang)}</p>
              <Link ref={requestNewRef} href="/mot-de-passe-oublie" className={`mt-6 ${primaryBtn}`}>
                {t('newPassword.invalid.requestNew', lang)}
              </Link>
              <Link href="/connexion" className="mt-4 text-body-sm font-medium text-brand-blue-300 hover:underline">
                {t('newPassword.invalid.backToSignin', lang)}
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              <PasswordField
                id="new-password"
                label={t('newPassword.fields.password.label', lang)}
                value={password}
                onChange={setPassword}
                error={passwordError}
                helperText={t('newPassword.fields.password.helper', lang)}
                showStrengthMeter
                autoComplete="new-password"
              />
              <PasswordField
                id="confirm-password"
                label={t('newPassword.fields.confirmPassword.label', lang)}
                value={confirm}
                onChange={setConfirm}
                error={confirmError}
                autoComplete="new-password"
              />
              {formError ? (
                <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {formError}
                </p>
              ) : null}
              <button type="submit" disabled={loading} className={primaryBtn}>
                {loading ? (
                  <>
                    <SpinnerIcon className="h-5 w-5 animate-spin" />
                    {t('newPassword.submitting', lang)}
                  </>
                ) : (
                  t('newPassword.submit', lang)
                )}
              </button>
            </form>
          )}
        </AuthShell>
      </div>
    </>
  )
}
