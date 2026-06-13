'use client'

import { useState } from 'react'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'
import { passwordStrength } from '@/lib/signup-validation'
import { EyeIcon, EyeOffIcon } from './Icons'
import { labelClass, helpClass, errorClass, inputBase } from './field-styles'
import { FOCUS_RING } from '@/components/layout/styles'

// Reusable password input: label + white input with a show/hide eye toggle, an
// optional helper line, an optional error, and an optional red/amber/green strength
// meter. Toggle aria-labels and the strength words use the shared
// signup.form.fields.password.* strings (label/helper/error come in as already-
// translated props). Markup matches the original SignupForm password field verbatim.
export function PasswordField({
  id,
  label,
  value,
  onChange,
  error,
  helperText,
  showStrengthMeter = false,
  autoComplete = 'new-password',
  placeholder,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  error?: string
  helperText?: string
  showStrengthMeter?: boolean
  autoComplete?: string
  placeholder?: string
}) {
  const lang = useLang()
  const [show, setShow] = useState(false)

  const strength = showStrengthMeter && value ? passwordStrength(value) : null
  const strengthColor = strength === 'strong' ? 'bg-emerald-500' : strength === 'medium' ? 'bg-amber-400' : 'bg-red-400'
  const describedBy = error ? `${id}-error` : helperText ? `${id}-help` : undefined

  return (
    <div>
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={show ? 'text' : 'password'}
          autoComplete={autoComplete}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={!!error}
          aria-describedby={describedBy}
          className={`${inputBase} ${error ? 'border-red-400' : 'border-[var(--border-subtle)]'} pe-12`}
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          aria-label={t(show ? 'signup.form.fields.password.toggleHide' : 'signup.form.fields.password.toggleShow', lang)}
          aria-pressed={show}
          className={`absolute inset-y-0 end-0 flex w-12 items-center justify-center rounded-e-xl text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)] ${FOCUS_RING}`}
        >
          {show ? <EyeOffIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
        </button>
      </div>
      {helperText && !error ? (
        <p id={`${id}-help`} className={helpClass}>
          {helperText}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} role="alert" aria-live="polite" className={errorClass}>
          {error}
        </p>
      ) : null}
      {strength ? (
        <div className="mt-2">
          <div className="flex gap-1.5">
            {[0, 1, 2].map((i) => {
              const filled = (strength === 'weak' && i === 0) || (strength === 'medium' && i <= 1) || strength === 'strong'
              return <span key={i} className={`h-1.5 flex-1 rounded-full ${filled ? strengthColor : 'bg-[var(--border-subtle)]'}`} />
            })}
          </div>
          <p className="mt-1 text-[13px] text-blue-200">
            {t('signup.form.fields.password.strengthLabel', lang)}{' '}
            <span className="font-semibold text-white">{t(`signup.form.fields.password.strength.${strength}`, lang)}</span>
          </p>
        </div>
      ) : null}
    </div>
  )
}
