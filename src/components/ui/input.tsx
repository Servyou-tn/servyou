'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

// Input — F3 primitive, measured from Figma COMPONENT_SET 22:905 (42 variants = 6 types × 7 states),
// token-bound, boundary-compliant. Appearance is Figma's; behaviour/a11y is the app's + the contract.
//
// Anatomy (Figma): Label → Field (44px) → Helper/Error, stacked gap-2. The field is a bordered box so
// leading/trailing slots (search glyph, password eye, +216 prefix) sit inside the same border.
//
// a11y contract (docs/design/accessibility.md §Input) — Figma cannot express any of this:
//   • The label is ALWAYS programmatically linked (htmlFor/id via useId) — the placeholder is never
//     the label.
//   • error → aria-invalid + aria-describedby to the error text; helper → aria-describedby to it.
//   • required → aria-required + a visual asterisk (no native browser-validation UI, since the app
//     validates with Zod).
//   • Focus is the shared ring (2px brand-blue-600 offset) via focus-within on the field box, matching
//     Figma's blue-focus intent while satisfying the "identical focus ring across components" rule.
// 'use client' is required for useId (stable id across SSR/hydration); inputs are interactive anyway.
//
// Stays presentational: type=password renders dots; the show/hide eye is composed by the caller via
// iconEnd (the existing PasswordField pattern), so Input needs no internal state.

const FIELD_BASE = cn(
  'flex items-center gap-2 h-11 rounded-lg border px-4 bg-surface-base',
  'transition-colors motion-reduce:transition-none',
  'focus-within:border-brand-blue-600 focus-within:ring-2 focus-within:ring-brand-blue-600',
  'focus-within:ring-offset-2 focus-within:ring-offset-surface-base',
)

export type InputProps = {
  /** Visible, programmatically-linked label. Omit only for a control that supplies its own aria-label. */
  label?: string
  /** Helper text under the field. */
  helper?: string
  /** Error message — replaces the helper, reddens the border, and sets aria-invalid. */
  error?: string
  /** Adds an asterisk + aria-required (no native `required`, so no browser validation popup). */
  required?: boolean
  /** Leading slot inside the field (e.g. a search glyph or +216 prefix). */
  iconStart?: React.ReactNode
  /** Trailing slot inside the field (e.g. a password-visibility toggle). */
  iconEnd?: React.ReactNode
  /** Shows a `length / maxLength` counter in the helper row (needs `maxLength` + a string `value`). */
  counter?: boolean
} & React.InputHTMLAttributes<HTMLInputElement>

export function Input({
  label,
  helper,
  error,
  required,
  iconStart,
  iconEnd,
  counter,
  id,
  className,
  disabled,
  readOnly,
  ...props
}: InputProps) {
  const reactId = React.useId()
  const inputId = id ?? `${reactId}-input`
  const helperId = `${reactId}-helper`
  const errorId = `${reactId}-error`
  const describedBy = error ? errorId : helper ? helperId : undefined

  const stateBorder =
    disabled || readOnly
      ? 'border-border-subtle bg-surface-subtle'
      : error
        ? 'border-danger-500'
        : 'border-border-strong'

  const count = counter && props.maxLength != null ? String(props.value ?? '').length : null

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-text-secondary">
          {label}
          {required && <span aria-hidden="true" className="text-danger-500"> *</span>}
        </label>
      )}

      <div className={cn(FIELD_BASE, stateBorder)}>
        {iconStart}
        <input
          {...props}
          id={inputId}
          disabled={disabled}
          readOnly={readOnly}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          aria-required={required || undefined}
          className="w-full min-w-0 bg-transparent text-base text-text-primary outline-none placeholder:text-text-muted disabled:cursor-not-allowed"
        />
        {iconEnd}
      </div>

      {(error || helper || count != null) && (
        <div className="flex items-start justify-between gap-2">
          {error ? (
            <p id={errorId} className="text-sm text-danger-500">{error}</p>
          ) : helper ? (
            <p id={helperId} className="text-sm text-text-muted">{helper}</p>
          ) : (
            <span />
          )}
          {count != null && (
            <span className="shrink-0 text-sm text-text-muted tabular-nums">
              {count}/{props.maxLength}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
