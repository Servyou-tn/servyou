'use client'

import { FOCUS_RING } from '@/components/layout/styles'
import { cn } from '@/lib/utils'

// Route-local Checkbox/Radio rows — no shared `ui/checkbox` or `ui/radio` exists yet (same gap
// Toggle.tsx's own header notes for switches: "the Figma component existed; the REACT one did
// not"). Native inputs styled with `accent-brand-blue-600`, the same token-bound pattern already
// proven at `commandes-recues/_components/CancelOrderButton.tsx:129`.

export function CheckboxRow({
  id,
  label,
  checked,
  disabled,
  onChange,
  caption,
}: {
  id: string
  label: string
  checked: boolean
  disabled?: boolean
  onChange?: (checked: boolean) => void
  caption?: string
}) {
  return (
    <label
      htmlFor={id}
      className={cn('flex items-center gap-2.5 py-1.5', disabled ? 'cursor-not-allowed' : 'cursor-pointer')}
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange?.(e.target.checked)}
        className={cn(
          'h-4 w-4 shrink-0 rounded border-border-strong accent-brand-blue-600 disabled:cursor-not-allowed',
          FOCUS_RING,
        )}
      />
      <span className={cn('text-sm', disabled ? 'text-text-muted' : 'text-text-primary')}>{label}</span>
      {caption && <span className="text-sm text-text-muted">({caption})</span>}
    </label>
  )
}

export function RadioRow({
  id,
  name,
  label,
  checked,
  onChange,
}: {
  id: string
  name: string
  label: string
  checked: boolean
  onChange: () => void
}) {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-center gap-2.5 py-1.5">
      <input
        id={id}
        type="radio"
        name={name}
        checked={checked}
        onChange={onChange}
        className={cn('h-4 w-4 shrink-0 border-border-strong accent-brand-blue-600', FOCUS_RING)}
      />
      <span className="text-sm text-text-primary">{label}</span>
    </label>
  )
}
