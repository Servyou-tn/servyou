'use client'

import { Suspense, useEffect, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'
import { isValidEmail } from '@/lib/signup-validation'
import { isValidInternalPath } from '@/lib/internal-path'
import { SpinnerIcon, GoogleIcon, CheckCircleIcon } from '@/components/auth/Icons'
import { PasswordField } from '@/components/auth/PasswordField'
import { display, labelClass, errorClass, inputBase, primaryBtn } from '@/components/auth/field-styles'
import { FOCUS_RING } from '@/components/layout/styles'
import { SuspendedBanner } from './SuspendedBanner'

// Google OAuth built but DISABLED this sprint — same gate + rationale as the
// signup form. OAuth sign-in would also need the handle_new_user trigger migration
// to create a profile on first Google sign-in. Re-enable alongside signup. See
// docs/migrations/auth-migration-supabase-dashboard-changes.md (§ Future: Google).
const ENABLE_GOOGLE_OAUTH: boolean = false

export function SigninForm({ showResetSuccess = false }: { showResetSuccess?: boolean }) {
  const supabase = createClient()
  const router = useRouter()
  const lang = useLang()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [emailError, setEmailError] = useState('')
  const [formError, setFormError] = useState('')
  const [loading, setLoading] = useState(false)

  // Success banner after a password reset (redirected here from /nouveau-mot-de-passe
  // with ?passwordReset=success — read server-side and passed as a prop, so it's
  // SSR-correct). Auto-hides after 8s; also dismissed on first form interaction
  // (onFocusCapture below). The setState lives in the timeout callback, not the
  // effect body, so it doesn't trip react-hooks/set-state-in-effect.
  const [bannerDismissed, setBannerDismissed] = useState(false)
  const showResetBanner = showResetSuccess && !bannerDismissed
  useEffect(() => {
    if (!showResetBanner) return
    const id = setTimeout(() => setBannerDismissed(true), 8000)
    return () => clearTimeout(id)
  }, [showResetBanner])

  async function handleSubmit(ev: FormEvent) {
    ev.preventDefault()
    setFormError('')
    setEmailError('')

    if (!isValidEmail(email)) {
      setEmailError(t('signin.errors.invalidEmail', lang))
      document.getElementById('email')?.focus()
      return
    }

    setLoading(true)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      })

      if (error) {
        // Anti-enumeration: ONE generic message for every failure (wrong password,
        // unknown email, unconfirmed email) so an attacker can't probe which
        // accounts exist. The real error is not surfaced.
        setFormError(t('signin.errors.invalidCredentials', lang))
        setLoading(false)
        return
      }

      // 1) Honour a safe ?redirect= (set when a guarded page bounced the user here).
      //    Guarded against open redirect; an unsafe value is ignored.
      const redirectParam = new URLSearchParams(window.location.search).get('redirect')
      if (redirectParam && isValidInternalPath(redirectParam)) {
        router.push(redirectParam)
        return
      }

      // 2) Otherwise route by role. seller_type is owner-readable under RLS.
      const userId = data.user?.id
      if (userId) {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('seller_type')
          .eq('id', userId)
          .single()
        if (profileError) console.error('[SigninForm] profile fetch error:', profileError)
        if (profile?.seller_type === 'shop_owner') {
          router.push('/ma-boutique')
          return
        }
        if (profile?.seller_type === 'freelancer') {
          router.push('/mon-profil-freelance')
          return
        }
      }
      router.push('/')
    } catch (err) {
      console.error('[SigninForm] signin error:', err)
      setFormError(t('signin.errors.generic', lang))
      setLoading(false)
    }
  }

  async function handleGoogle() {
    setFormError('')
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    if (error) {
      console.error('[SigninForm] Google OAuth error:', error)
      setFormError(t('signin.errors.generic', lang))
    }
  }

  return (
    <>
      <Suspense fallback={null}>
        <SuspendedBanner />
      </Suspense>

      {showResetBanner ? (
        <div role="status" className="mb-5 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <CheckCircleIcon className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
          <div>
            <p className="font-semibold">{t('signin.passwordResetSuccess.title', lang)}</p>
            <p className="mt-0.5 text-emerald-700">{t('signin.passwordResetSuccess.message', lang)}</p>
          </div>
        </div>
      ) : null}

      {ENABLE_GOOGLE_OAUTH ? (
        <>
          <button
            type="button"
            onClick={handleGoogle}
            className={`${display} inline-flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-[var(--border-subtle)] bg-white text-[15px] font-semibold text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-subtle)] ${FOCUS_RING}`}
          >
            <GoogleIcon className="h-5 w-5" />
            {t('signup.form.googleButton', lang)}
          </button>
          <div className="my-5 flex items-center gap-3" aria-hidden="true">
            <span className="h-px flex-1 bg-white/20" />
            <span className="text-[13px] font-medium uppercase tracking-wide text-blue-200">{t('signup.form.divider', lang)}</span>
            <span className="h-px flex-1 bg-white/20" />
          </div>
        </>
      ) : null}

      <form onSubmit={handleSubmit} noValidate className="space-y-4" onFocusCapture={() => setBannerDismissed(true)}>
        <div>
          <label htmlFor="email" className={labelClass}>
            {t('signin.fields.email.label', lang)}
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            dir="ltr"
            placeholder={t('signin.fields.email.placeholder', lang)}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={!!emailError}
            aria-describedby={emailError ? 'email-error' : undefined}
            className={`${inputBase} ${emailError ? 'border-red-400' : 'border-[var(--border-subtle)]'}`}
          />
          {emailError ? (
            <p id="email-error" role="alert" className={errorClass}>
              {emailError}
            </p>
          ) : null}
        </div>

        <div>
          <PasswordField
            id="password"
            label={t('signin.fields.password.label', lang)}
            value={password}
            onChange={setPassword}
            autoComplete="current-password"
          />
          <div className="mt-2 text-end">
            <Link href="/mot-de-passe-oublie" className="text-[13px] font-medium text-blue-300 hover:underline">
              {t('signin.forgotPassword', lang)}
            </Link>
          </div>
        </div>

        {formError ? (
          <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {formError}
          </p>
        ) : null}

        <button type="submit" disabled={loading} className={primaryBtn}>
          {loading ? (
            <>
              <SpinnerIcon className="h-5 w-5 animate-spin" />
              {t('signin.submitting', lang)}
            </>
          ) : (
            t('signin.submit', lang)
          )}
        </button>
      </form>
    </>
  )
}
