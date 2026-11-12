'use client'

import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'
import { passwordStrength } from '@/lib/signup-validation'
import { PasswordRevealButton, PASSWORD_INPUT_ATTRS, usePasswordReveal } from '@/components/ui/password-reveal'
import { labelClass, helpClass, errorClass, inputBase } from './field-styles'

// Reusable password input: label + white input with a show/hide eye toggle, an
// optional helper line, an optional error, and an optional red/amber/green strength
// meter. Toggle aria-labels and the strength words use the shared
// signup.form.fields.password.* strings (label/helper/error come in as already-
// translated props). Markup matches the original SignupForm password field verbatim.
// The eye is the shared PasswordRevealButton (src/components/ui/password-reveal.tsx): hidden by default, back to hidden
// when the form submits, aria-controls → the input, no aria-pressed. Same 48 px box at the field's end as before.
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
  const { shown: show, toggle } = usePasswordReveal(id)

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
          {...PASSWORD_INPUT_ATTRS}
          id={id}
          type={show ? 'text' : 'password'}
          autoComplete={autoComplete}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={!!error}
          aria-describedby={describedBy}
          className={`${inputBase} ${error ? 'border-red-400' : 'border-[var(--border-subtle)]'} pe-12 [&::-ms-reveal]:hidden`}
        />
        <PasswordRevealButton controls={id} shown={show} onToggle={toggle} className="absolute inset-y-0 end-0 w-12 rounded-e-xl" />
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
          <p className="mt-1 text-body-sm text-brand-blue-200">
            {t('signup.form.fields.password.strengthLabel', lang)}{' '}
            <span className="font-semibold text-white">{t(`signup.form.fields.password.strength.${strength}`, lang)}</span>
          </p>
        </div>
      ) : null}
    </div>
  )
}
