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
import { AuthShell } from '@/components/auth/AuthShell'
import { display, primaryBtn } from '@/components/auth/field-styles'

// Initial state is decided server-side (?error → invalid; else checking). The
// client listener flips to the reset form once Supabase establishes a recovery
// session (PASSWORD_RECOVERY event, or any session present). If no session arrives
// within 2s, the link is treated as invalid/expired.
export type NewPasswordInitialView = 'checking' | 'invalid'
type View = NewPasswordInitialView | 'form'

export function NewPasswordForm({ initialView }: { initialView: NewPasswordInitialView }) {
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
  const requestNewRef = useRef<HTMLAnchorElement>(null)

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || session) setView('form')
    })
    // No recovery session within 2s → the link is invalid/expired (State B).
    const timer = setTimeout(() => setView((v) => (v === 'checking' ? 'invalid' : v)), 2000)
    return () => {
      subscription.unsubscribe()
      clearTimeout(timer)
    }
  }, [supabase])

  useEffect(() => {
    if (view === 'invalid') requestNewRef.current?.focus()
  }, [view])

  async function handleSubmit(ev: FormEvent) {
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

    setLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) {
        console.error('[NewPasswordForm] updateUser error:', error)
        setFormError(t('newPassword.errors.updateFailed', lang))
        setLoading(false)
        return
      }
      // Drop the one-time recovery session, then send them to sign in fresh.
      await supabase.auth.signOut()
      router.push('/connexion?passwordReset=success')
    } catch (err) {
      console.error('[NewPasswordForm] unexpected error:', err)
      setFormError(t('newPassword.errors.updateFailed', lang))
      setLoading(false)
    }
  }

  const header =
    view === 'form'
      ? { title: t('newPassword.title', lang), subtitle: t('newPassword.subtitle', lang) }
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
          ) : view === 'invalid' ? (
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
