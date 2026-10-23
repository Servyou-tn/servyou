'use client'

import * as React from 'react'
import { ChevronDown } from 'lucide-react'
import { FOCUS_RING } from '@/components/layout/styles'

// H6 « Catégorie » / « Sous-catégorie » — a NATIVE <select> (founder ruling D4: 13 and ≤ 9 options,
// no combobox) dressed as the measured SelectTrigger 72:1022 / 72:941 (docs/design/
// h6-measurements.md, read 1): label 14/21 Medium secondary + danger asterisk, field h 44 · ps 16 ·
// radius 10 · border-strong · bg base, 18px chevron at the end, helper 14/21 muted. Disabled =
// bg surface-subtle + border-subtle (72:941). The placeholder reads muted like the frame's
// placeholder text; a chosen value reads primary.
//
// Built here rather than on SELECT_FIELD_BASE: that string hard-codes text-text-primary, and two
// text colours on one element resolve by stylesheet order, not class order.

type Option = { value: string; label: string }

export function SelectField({
  label,
  required,
  helper,
  error,
  placeholder,
  options,
  value,
  disabled,
  onChange,
  onBlur,
}: {
  label: string
  required?: boolean
  helper?: string
  error?: string
  placeholder: string
  options: Option[]
  value: string
  disabled?: boolean
  onChange: (value: string) => void
  onBlur?: () => void
}) {
  const id = React.useId()
  const helperId = `${id}-helper`
  const errorId = `${id}-error`

  const box = disabled
    ? 'cursor-not-allowed border-border-subtle bg-surface-subtle'
    : error
      ? 'border-danger-500 bg-surface-base'
      : 'border-border-strong bg-surface-base'
  const ink = disabled || !value ? 'text-text-muted' : 'text-text-primary'

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <label htmlFor={id} className="text-sm font-medium text-text-secondary">
        {label}
        {required && <span aria-hidden="true" className="text-danger-500"> *</span>}
      </label>
      <div className="relative">
        <select
          id={id}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          aria-required={required || undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : helper ? helperId : undefined}
          className={`h-11 w-full appearance-none truncate rounded-lg border ps-4 pe-11 text-base outline-none transition-colors focus:border-brand-blue-600 ${FOCUS_RING} ${box} ${ink}`}
        >
          <option value="">{placeholder}</option>
          {options.map((o) => (
            <option key={o.value} value={o.value} className="text-text-primary">
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown
          aria-hidden="true"
          className="pointer-events-none absolute end-4 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-text-muted"
        />
      </div>
      {error ? (
        <p id={errorId} className="text-sm text-danger-500">
          {error}
        </p>
      ) : helper ? (
        <p id={helperId} className="text-sm text-text-muted">
          {helper}
        </p>
      ) : null}
    </div>
  )
}
