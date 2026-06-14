'use client'

import { useMemo, useState, type FormEvent, type ReactNode } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'
import { GOVERNORATES } from '@/lib/tunisia-governorates'
import { SIGNUP_ROLE_KEY, roleConfig, type SignupRole } from '@/lib/signup-role'
import { computeAge, isValidEmail, isValidPassword } from '@/lib/signup-validation'
import { CheckIcon, SpinnerIcon, GoogleIcon } from '@/components/auth/Icons'
import { PasswordField } from '@/components/auth/PasswordField'
import { display, labelClass, helpClass, errorClass, inputBase, primaryBtn } from '@/components/auth/field-styles'
import { FOCUS_RING } from '@/components/layout/styles'

// ── Google OAuth: built but DISABLED this sprint ──────────────────────────────
// The handle_new_user trigger casts raw_user_meta_data.date_of_birth into the
// NOT NULL profiles.date_of_birth. Google OAuth users carry no date_of_birth, so
// the trigger INSERT fails and the whole signup transaction rolls back — no
// account is created. Email/password is unaffected (this form collects DOB).
// TODO: re-enable after handle_new_user is migrated to tolerate OAuth signups
// (nullable DOB + a post-OAuth complete-profile gate). Flip to true once the
// migration + Google provider config are live — see
// docs/migrations/auth-migration-supabase-dashboard-changes.md (§ Future: Google
// OAuth Enablement). Typed `boolean` so the OAuth branch stays type-reachable.
const ENABLE_GOOGLE_OAUTH: boolean = false

// label + control + helper/error molecule for the non-password fields. Helper
// hides once an error shows. (Password uses the shared PasswordField instead.)
function Field({
  id,
  label,
  error,
  help,
  children,
}: {
  id: string
  label: string
  error?: string
  help?: string
  children: ReactNode
}) {
  return (
    <div>
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      {children}
      {help && !error ? (
        <p id={`${id}-help`} className={helpClass}>
          {help}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} role="alert" className={errorClass}>
          {error}
        </p>
      ) : null}
    </div>
  )
}

export function SignupForm({ role }: { role: SignupRole }) {
  const supabase = createClient()
  const router = useRouter()
  const lang = useLang()
  const isRtl = lang === 'ar'
  const config = roleConfig(role)

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [city, setCity] = useState('')
  const [language, setLanguage] = useState<'fr' | 'ar'>(lang)

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  // Latest selectable DOB is today − minAge (16 consumer / 18 seller), so the
  // native picker nudges toward the role's age gate (validation still enforces it).
  const maxDob = useMemo(() => {
    const d = new Date()
    d.setFullYear(d.getFullYear() - config.minAge)
    return d.toISOString().slice(0, 10)
  }, [config.minAge])

  const fieldClass = (id: string) =>
    `${inputBase} ${fieldErrors[id] ? 'border-red-400' : 'border-[var(--border-subtle)]'}`
  // Only point aria-describedby at an element that actually renders: the error
  // (any field) or the helper (dateOfBirth only) — never a dangling id. (Password
  // manages its own describedBy inside PasswordField.)
  const HELP_FIELDS = new Set(['dateOfBirth'])
  const describedBy = (id: string): string | undefined =>
    fieldErrors[id] ? `${id}-error` : HELP_FIELDS.has(id) ? `${id}-help` : undefined

  function validate(): Record<string, string> {
    const e: Record<string, string> = {}
    const name = fullName.trim()
    if (name.length < 2) e.fullName = t('signup.form.errors.fullNameTooShort', lang)
    else if (name.length > 100) e.fullName = t('signup.form.errors.fullNameTooLong', lang)

    if (!isValidEmail(email)) e.email = t('signup.form.errors.emailInvalid', lang)

    if (password.length < 8) e.password = t('signup.form.errors.passwordTooShort', lang)
    else if (!isValidPassword(password)) e.password = t('signup.form.errors.passwordWeak', lang)

    if (!dateOfBirth || Number.isNaN(new Date(dateOfBirth).getTime()))
      e.dateOfBirth = t('signup.form.errors.dateOfBirthInvalid', lang)
    else if (computeAge(dateOfBirth) < config.minAge)
      e.dateOfBirth = t(config.ageErrorKey, lang)

    if (!city) e.city = t('signup.form.errors.cityRequired', lang)
    return e
  }

  function focusFirstError(errs: Record<string, string>) {
    const order = ['fullName', 'email', 'password', 'dateOfBirth', 'city']
    const first = order.find((id) => errs[id])
    if (first) document.getElementById(first)?.focus()
  }

  async function handleSubmit(ev: FormEvent) {
    ev.preventDefault()
    setFormError('')
    const errs = validate()
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs)
      focusFirstError(errs)
      return
    }
    setFieldErrors({})
    setLoading(true)

    try {
      // Exactly mirrors the legacy /signup metadata contract: the 4 keys the
      // handle_new_user trigger reads. Dropping any of them breaks the trigger.
      const { error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: {
            full_name: fullName.trim(),
            date_of_birth: dateOfBirth,
            city,
            language,
          },
        },
      })

      if (error) {
        const msg = error.message.toLowerCase()
        if (msg.includes('already registered') || msg.includes('already been registered') || msg.includes('already exists') || msg.includes('user already')) {
          setFormError(t('signup.form.errors.emailExists', lang))
        } else if (msg.includes('password')) {
          setFormError(t('signup.form.errors.passwordWeak', lang))
        } else if (msg.includes('rate') || msg.includes('many requests')) {
          setFormError(t('common.rate_limit', lang))
        } else {
          console.error('[SignupForm] signUp error:', error)
          setFormError(t('signup.form.errors.generic', lang))
        }
        setLoading(false)
        return
      }

      // Remember the role intent for the post-verification redirect, then move to
      // the "check your email" page. seller_type stays null — role is UI-only.
      try {
        sessionStorage.setItem(SIGNUP_ROLE_KEY, role)
      } catch {
        // Private mode / storage disabled — /verifier-email falls back to '/'.
      }
      setSuccess(true)
      setTimeout(() => {
        router.push(`/verifier-email?email=${encodeURIComponent(email.trim().toLowerCase())}`)
      }, 700)
    } catch (err) {
      console.error('[SignupForm] unexpected signup error:', err)
      setFormError(t('signup.form.errors.generic', lang))
      setLoading(false)
    }
  }

  async function handleGoogle() {
    setFormError('')
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(config.destination)}`,
      },
    })
    if (error) {
      console.error('[SignupForm] Google OAuth error:', error)
      setFormError(t('signup.form.errors.googleFailed', lang))
    }
  }

  // Legal sentence with two inline links. Split on the {terms}/{privacy} tokens so
  // each locale places the links per its own grammar (the i18n parity test keeps
  // both tokens present in the AR string). Target pages are Phase-10 placeholders.
  function renderLegal(): ReactNode[] {
    return t('signup.form.legal', lang)
      .split(/(\{terms\}|\{privacy\})/g)
      .map((part, i) => {
        if (part === '{terms}')
          return (
            <Link key={i} href="/conditions-utilisation" target="_blank" rel="noopener noreferrer" className="font-semibold text-blue-300 hover:underline">
              {t('signup.form.legalTerms', lang)}
            </Link>
          )
        if (part === '{privacy}')
          return (
            <Link key={i} href="/politique-confidentialite" target="_blank" rel="noopener noreferrer" className="font-semibold text-blue-300 hover:underline">
              {t('signup.form.legalPrivacy', lang)}
            </Link>
          )
        return <span key={i}>{part}</span>
      })
  }

  return (
    <>
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
        <Field id="fullName" label={t('signup.form.fields.fullName.label', lang)} error={fieldErrors.fullName}>
          <input
            id="fullName"
            type="text"
            autoComplete="name"
            placeholder={t('signup.form.fields.fullName.placeholder', lang)}
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            aria-invalid={!!fieldErrors.fullName}
            aria-describedby={describedBy('fullName')}
            className={fieldClass('fullName')}
          />
        </Field>

        <Field id="email" label={t('signup.form.fields.email.label', lang)} error={fieldErrors.email}>
          <input
            id="email"
            type="email"
            autoComplete="email"
            dir="ltr"
            placeholder={t('signup.form.fields.email.placeholder', lang)}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={!!fieldErrors.email}
            aria-describedby={describedBy('email')}
            className={fieldClass('email')}
          />
        </Field>

        <PasswordField
          id="password"
          label={t('signup.form.fields.password.label', lang)}
          value={password}
          onChange={setPassword}
          error={fieldErrors.password}
          helperText={t('signup.form.fields.password.helper', lang)}
          showStrengthMeter
          autoComplete="new-password"
        />

        <Field
          id="dateOfBirth"
          label={t('signup.form.fields.dateOfBirth.label', lang)}
          error={fieldErrors.dateOfBirth}
          help={t(config.ageHelperKey, lang)}
        >
          <input
            id="dateOfBirth"
            type="date"
            autoComplete="bday"
            max={maxDob}
            value={dateOfBirth}
            onChange={(e) => setDateOfBirth(e.target.value)}
            aria-invalid={!!fieldErrors.dateOfBirth}
            aria-describedby={describedBy('dateOfBirth')}
            className={fieldClass('dateOfBirth')}
          />
        </Field>

        <Field id="city" label={t('signup.form.fields.city.label', lang)} error={fieldErrors.city}>
          <select
            id="city"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            aria-invalid={!!fieldErrors.city}
            aria-describedby={describedBy('city')}
            className={`${fieldClass('city')} appearance-none`}
          >
            <option value="">{t('signup.form.fields.city.placeholder', lang)}</option>
            {GOVERNORATES.map((g) => (
              <option key={g.value} value={g.value}>
                {isRtl ? g.ar : g.fr}
              </option>
            ))}
          </select>
        </Field>

        <Field id="language" label={t('signup.form.fields.language.label', lang)}>
          <select
            id="language"
            value={language}
            onChange={(e) => setLanguage(e.target.value === 'ar' ? 'ar' : 'fr')}
            className={`${inputBase} appearance-none border-[var(--border-subtle)]`}
          >
            <option value="fr">{t('signup.form.fields.language.fr', lang)}</option>
            <option value="ar">{t('signup.form.fields.language.ar', lang)}</option>
          </select>
        </Field>

        <p className={`${display} pt-1 text-[13px] leading-relaxed text-white/75`}>{renderLegal()}</p>

        {formError ? (
          <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {formError}
          </p>
        ) : null}

        <button type="submit" disabled={loading || success} className={primaryBtn}>
          {success ? (
            <CheckIcon className="h-5 w-5" />
          ) : loading ? (
            <>
              <SpinnerIcon className="h-5 w-5 animate-spin" />
              {t('common.creating', lang)}
            </>
          ) : (
            t('signup.form.submit', lang)
          )}
        </button>
      </form>
    </>
  )
}
