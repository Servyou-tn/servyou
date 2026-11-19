'use client'

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import Link from 'next/link'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'
import { GOVERNORATES } from '@/lib/tunisia-governorates'
import { pickLabel } from '@/lib/i18n/pick-label'
import { completeAccountFieldErrors, type CompleteAccountField, type FieldErrors } from '@/lib/auth/complete-account'
import { PasswordField } from '@/components/auth/PasswordField'
import { concealPasswords } from '@/components/ui/password-reveal'
import { SpinnerIcon } from '@/components/auth/Icons'
import { EmailLinkForm } from '@/components/auth/EmailLinkForm'
import { display, labelClass, helpClass, errorClass, inputBase, primaryBtn } from '@/components/auth/field-styles'
import { FOCUS_RING } from '@/components/layout/styles'
import { completeAccount } from '../actions'

const FIELD_ORDER: CompleteAccountField[] = ['fullName', 'password', 'dateOfBirth', 'city', 'terms']

function Field({ id, label, error, help, children }: { id: string; label: string; error?: string; help?: string; children: ReactNode }) {
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

/** « Recevoir un nouveau lien » in place of the form: this session cannot finish the account. */
function StuckPanel({ email, next }: { email: string; next: string | null }) {
  const lang = useLang()
  // The form it replaces held the focus (its submit button): move it here, so keyboard and screen-reader users follow.
  const messageRef = useRef<HTMLParagraphElement>(null)
  useEffect(() => messageRef.current?.focus(), [])
  return (
    <div className="space-y-5">
      <p ref={messageRef} tabIndex={-1} className="text-body leading-relaxed text-white outline-none">
        {t('completeAccount.stuck', lang)}
      </p>
      <EmailLinkForm withName={false} next={next} initialEmail={email} submitKey="newLink.submit" />
    </div>
  )
}

export function CompleteAccountForm({
  initialName,
  email,
  next,
  termsVersion,
  maxBirthDate,
  fromEmailLink,
}: {
  initialName: string
  email: string
  /** Today minus 16 years, computed by the server (no SSR / hydration mismatch); the native picker's max. */
  maxBirthDate: string
  next: string | null
  /** The version the page shows; complete_my_account refuses a stale one (terms_outdated). */
  termsVersion: string
  /** The session came from an e-mailed link (amr otp): only such a session can finish. */
  fromEmailLink: boolean
}) {
  const lang = useLang()
  const [fullName, setFullName] = useState(initialName)
  const [password, setPassword] = useState('')
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [city, setCity] = useState('')
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [formErrorKey, setFormErrorKey] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState<string | null>(null)
  const [stuck, setStuck] = useState(!fromEmailLink)
  const [loading, setLoading] = useState(false)

  if (stuck) return <StuckPanel email={email} next={next} />

  const err = (field: CompleteAccountField) => (fieldErrors[field] ? t(fieldErrors[field], lang) : undefined)
  const describedBy = (field: CompleteAccountField, hasHelp = false) =>
    fieldErrors[field] ? `${field}-error` : hasHelp ? `${field}-help` : undefined
  const fieldClass = (field: CompleteAccountField) =>
    `${inputBase} ${fieldErrors[field] ? 'border-red-400' : 'border-[var(--border-subtle)]'}`

  function showFieldErrors(errs: FieldErrors) {
    setFieldErrors(errs)
    const first = FIELD_ORDER.find((f) => errs[f])
    if (first) document.getElementById(first)?.focus()
  }

  async function handleSubmit(ev: FormEvent<HTMLFormElement>) {
    ev.preventDefault()
    if (loading) return
    setFormErrorKey(null)
    const values = { fullName, password, dateOfBirth, city, termsAccepted }
    const errs = completeAccountFieldErrors(values)
    if (Object.keys(errs).length > 0) {
      showFieldErrors(errs)
      return
    }
    // The checks passed: the form really sends, so the password goes back to hidden now (never on a blocked submit).
    concealPasswords(ev.currentTarget)
    setFieldErrors({})
    setLoading(true)
    let result: Awaited<ReturnType<typeof completeAccount>>
    try {
      result = await completeAccount({ ...values, termsVersion, next })
    } catch (e) {
      // A network drop or a server error: never a button stuck on its spinner.
      console.error('[CompleteAccountForm] completeAccount threw:', e instanceof Error ? e.message : String(e))
      setLoading(false)
      setFormErrorKey('signup.form.errors.generic')
      return
    }
    if (result.ok) {
      // A full load: the middleware and every Server Component then read the completed profile.
      window.location.assign(result.destination)
      return
    }
    setLoading(false)
    if ('fieldErrors' in result) {
      showFieldErrors(result.fieldErrors)
      return
    }
    const outcome = result.outcome
    if (outcome.kind === 'new_link') setStuck(true)
    else if (outcome.kind === 'reload') setReloadKey(outcome.key)
    else if (outcome.kind === 'field') showFieldErrors({ [outcome.field]: outcome.key })
    else setFormErrorKey(outcome.key)
  }

  // « J'accepte les {terms} et la {privacy}. » — the two links open the live pages in a new tab; the middleware keeps them
  // reachable while the account is incomplete.
  const termsLabel = t('completeAccount.terms', lang)
    .split(/(\{terms\}|\{privacy\})/g)
    .map((part, i) =>
      part === '{terms}' ? (
        <Link key={i} href="/conditions" target="_blank" rel="noopener noreferrer" className="font-semibold text-brand-blue-300 underline-offset-2 hover:underline">
          {t('signup.form.legalTerms', lang)}
        </Link>
      ) : part === '{privacy}' ? (
        <Link key={i} href="/confidentialite" target="_blank" rel="noopener noreferrer" className="font-semibold text-brand-blue-300 underline-offset-2 hover:underline">
          {t('signup.form.legalPrivacy', lang)}
        </Link>
      ) : (
        <span key={i}>{part}</span>
      ),
    )

  // « Connecté en tant que {email} »: a person who opened someone else's link (or was sent one) sees whose account this is.
  const signedInAs = t('completeAccount.signedInAs', lang).split('{email}')

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <p className="text-body-sm text-brand-blue-200">
        {signedInAs[0]}
        <bdi dir="ltr" className="font-semibold text-white">
          {email}
        </bdi>
        {signedInAs[1] ?? ''}
      </p>
      <Field id="fullName" label={t('signup.form.fields.fullName.label', lang)} error={err('fullName')}>
        <input
          id="fullName"
          type="text"
          autoComplete="name"
          maxLength={100}
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          aria-invalid={!!fieldErrors.fullName}
          aria-describedby={describedBy('fullName')}
          className={fieldClass('fullName')}
        />
      </Field>

      <PasswordField
        id="password"
        label={t('signup.form.fields.password.label', lang)}
        value={password}
        onChange={setPassword}
        error={err('password')}
        helperText={t('signup.form.fields.password.helper', lang)}
        showStrengthMeter
        autoComplete="new-password"
      />

      <Field id="dateOfBirth" label={t('signup.form.fields.dateOfBirth.label', lang)} error={err('dateOfBirth')} help={t('signup.form.fields.dateOfBirth.helper.consumer', lang)}>
        <input
          id="dateOfBirth"
          type="date"
          autoComplete="bday"
          max={maxBirthDate}
          value={dateOfBirth}
          onChange={(e) => setDateOfBirth(e.target.value)}
          aria-invalid={!!fieldErrors.dateOfBirth}
          aria-describedby={describedBy('dateOfBirth', true)}
          className={fieldClass('dateOfBirth')}
        />
      </Field>

      <Field id="city" label={t('signup.form.fields.city.label', lang)} error={err('city')}>
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
              {pickLabel(g, lang)}
            </option>
          ))}
        </select>
      </Field>

      {/* The whole row is the tap target (≥ 44 px), not only the 20 px box. */}
      <div>
        <label htmlFor="terms" className={`${display} flex min-h-11 cursor-pointer items-start gap-3 py-2 text-body-sm leading-relaxed text-white/85`}>
          <input
            id="terms"
            type="checkbox"
            checked={termsAccepted}
            onChange={(e) => setTermsAccepted(e.target.checked)}
            aria-invalid={!!fieldErrors.terms}
            aria-describedby={describedBy('terms')}
            className={`mt-0.5 size-5 shrink-0 cursor-pointer accent-[var(--brand-blue-600)] ${FOCUS_RING}`}
          />
          <span>{termsLabel}</span>
        </label>
        {fieldErrors.terms ? (
          <p id="terms-error" role="alert" className={errorClass}>
            {t(fieldErrors.terms, lang)}
          </p>
        ) : null}
      </div>

      {reloadKey ? (
        <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p>{t(reloadKey, lang)}</p>
          <button type="button" onClick={() => window.location.reload()} className={`mt-1 inline-flex min-h-11 items-center font-semibold underline ${FOCUS_RING}`}>
            {t('completeAccount.reload', lang)}
          </button>
        </div>
      ) : null}
      {formErrorKey ? (
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {t(formErrorKey, lang)}
        </p>
      ) : null}

      <button type="submit" disabled={loading} className={primaryBtn}>
        {loading ? <SpinnerIcon className="h-5 w-5 animate-spin" /> : null}
        {t('completeAccount.submit', lang)}
      </button>
    </form>
  )
}
