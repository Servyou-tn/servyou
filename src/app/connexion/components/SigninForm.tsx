'use client'

import { Suspense, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'
import { isValidEmail } from '@/lib/signup-validation'
import { isValidInternalPath } from '@/lib/internal-path'
import { FOCUS_RING } from '@/components/layout/styles'
import { SuspendedBanner } from './SuspendedBanner'

// Google OAuth built but DISABLED this sprint — same gate + rationale as the
// signup form. OAuth sign-in would also need the handle_new_user trigger migration
// to create a profile on first Google sign-in. Re-enable alongside signup. See
// docs/migrations/auth-migration-supabase-dashboard-changes.md (§ Future: Google).
const ENABLE_GOOGLE_OAUTH: boolean = false

const display = 'font-[family-name:var(--font-display)]'

// Inline icons (lucide paths) kept local for now; when the new-password form
// (Commit 4) becomes the 3rd consumer, these + the field styling move to shared
// src/components/auth/ primitives (rule of three).
function EyeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}
function EyeOffIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
      <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
      <line x1="2" x2="22" y1="2" y2="22" />
    </svg>
  )
}
function SpinnerIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4} className="opacity-25" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth={4} strokeLinecap="round" />
    </svg>
  )
}
function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09A6.6 6.6 0 0 1 5.49 12c0-.73.13-1.43.35-2.09V7.07H2.18A11 11 0 0 0 1 12c0 1.78.43 3.45 1.18 4.93l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
    </svg>
  )
}

const labelClass = `${display} mb-1.5 block text-sm font-semibold text-white`
const errorClass = 'mt-1.5 text-sm text-red-300'

export function SigninForm() {
  const supabase = createClient()
  const router = useRouter()
  const lang = useLang()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [emailError, setEmailError] = useState('')
  const [formError, setFormError] = useState('')
  const [loading, setLoading] = useState(false)

  const inputBase = `${display} w-full rounded-xl border bg-white px-4 py-3 text-[15px] text-[var(--text-primary)] outline-none transition-colors placeholder:text-[var(--text-muted)]/70 ${FOCUS_RING}`

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

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
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
          <label htmlFor="password" className={labelClass}>
            {t('signin.fields.password.label', lang)}
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`${inputBase} border-[var(--border-subtle)] pe-12`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={t(showPassword ? 'signin.fields.password.hidePassword' : 'signin.fields.password.showPassword', lang)}
              aria-pressed={showPassword}
              className={`absolute inset-y-0 end-0 flex w-12 items-center justify-center rounded-e-xl text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)] ${FOCUS_RING}`}
            >
              {showPassword ? <EyeOffIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
            </button>
          </div>
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

        <button
          type="submit"
          disabled={loading}
          className={`${display} inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[var(--brand-accent)] text-[15px] font-semibold text-white transition-colors hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:opacity-70 ${FOCUS_RING}`}
        >
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
