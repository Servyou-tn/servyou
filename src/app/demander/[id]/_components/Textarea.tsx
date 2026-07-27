'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

// Textarea — measured from Figma COMPONENT_SET 86:2299 (the Input primitive's sibling; no code
// counterpart existed). Route-local: E1 is its first consumer. Promote to components/ui at the
// third (H6/H7 service create/edit are the likely next two).
//
// Anatomy (86:2299): Label row (14/21 Medium + danger asterisk, gap 2) → field (min-h 120,
// pad 12/16, 1px border-strong, r 10, value 16/26) → helperRow (SPACE_BETWEEN: helper 14/21
// muted ⟷ counter 12/17 Medium muted). Stack gap 8.
//
// Two deliberate departures from the Figma component:
//   • helperRow is HUG here, not the component's FIXED 16 — a wrapped helper must reserve its
//     own height instead of overflowing into the next field. The E1 instances already carry a
//     per-instance HUG override for exactly this; code has no reason to inherit the bug.
//   • The resize grip is the browser's own (resize-y), not a drawn vector.
//
// a11y mirrors Input (docs/design/accessibility.md §Input): label always linked via useId,
// error → aria-invalid + aria-describedby, required → aria-required + visual asterisk.

export type TextareaProps = {
  label?: string
  helper?: string
  /** Replaces the helper, reddens the border, sets aria-invalid. */
  error?: string
  required?: boolean
  /** Shows `length / maxLength` at the end of the helper row. Needs maxLength + a string value. */
  counter?: boolean
} & React.TextareaHTMLAttributes<HTMLTextAreaElement>

export function Textarea({
  label,
  helper,
  error,
  required,
  counter,
  id,
  className,
  disabled,
  ...props
}: TextareaProps) {
  const reactId = React.useId()
  const areaId = id ?? `${reactId}-textarea`
  const helperId = `${reactId}-helper`
  const errorId = `${reactId}-error`
  const describedBy = error ? errorId : helper ? helperId : undefined

  const count = counter && props.maxLength != null ? String(props.value ?? '').length : null

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {label && (
        <label htmlFor={areaId} className="text-sm font-medium text-text-secondary">
          {label}
          {required && <span aria-hidden="true" className="text-danger-500"> *</span>}
        </label>
      )}

      <textarea
        {...props}
        id={areaId}
        disabled={disabled}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        aria-required={required || undefined}
        className={cn(
          'min-h-30 w-full resize-y rounded-lg border bg-surface-base px-4 py-3',
          'text-base leading-relaxed text-text-primary outline-none placeholder:text-text-muted',
          'transition-colors motion-reduce:transition-none',
          'focus:border-brand-blue-600 focus:ring-2 focus:ring-brand-blue-600',
          'focus:ring-offset-2 focus:ring-offset-surface-base',
          'disabled:cursor-not-allowed disabled:bg-surface-subtle',
          error ? 'border-danger-500' : 'border-border-strong',
        )}
      />

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
            <span className="shrink-0 text-caption font-medium text-text-muted tabular-nums">
              {count}/{props.maxLength}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
