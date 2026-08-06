'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { FOCUS_RING } from '@/components/layout/styles'

// Toggle (Switch) — Figma COMPONENT_SET 75:1840 (12 variants = size[md,sm] × state[default, hover,
// focus, disabled] × on[off,on]; props showLabel(bool) + label(text)).
//
// ⚑ The Figma component existed; the REACT one did not. G6 shipped a bare <input type="checkbox">
// because there was nothing to import — this is that missing primitive, built when the first real
// consumer needed it rather than speculatively.
//
// a11y contract (docs/design/accessibility.md §Toggle) — none of which Figma can express:
//   • role="switch" + aria-checked. A checkbox conveys "in a set"; a switch conveys "on/off", and
//     that is what a screen reader must announce for `tracks_stock`.
//   • Space toggles. Free from a real <button>, which is why this is not a styled <div>.
//   • Focus is the shared 2px ring — identical across Button / Input / Toggle.
//   • ⚑ "State must not rely on color alone." The knob TRANSLATES as well as the track recolouring,
//     so the state survives greyscale and low-vision rendering. Do not reduce this to a fill swap.
//
// The label is a real <label> bound by id, so clicking the text toggles too. `showLabel={false}`
// keeps the switch bare, and then the caller MUST supply aria-label.

export type ToggleProps = {
  checked: boolean
  onCheckedChange: (next: boolean) => void
  /** Visible, clickable label text. */
  label?: string
  /** Render the label. When false the caller must pass aria-label. */
  showLabel?: boolean
  /** Helper text under the row. */
  helper?: string
  size?: 'md' | 'sm'
  disabled?: boolean
  id?: string
  className?: string
  'aria-label'?: string
}

const TRACK = {
  md: 'h-6 w-11',
  sm: 'h-5 w-9',
} as const

const KNOB = {
  md: 'h-5 w-5',
  sm: 'h-4 w-4',
} as const

// Translation distance = track width − knob width − (2 × inset).
const KNOB_ON = {
  md: 'translate-x-5 rtl:-translate-x-5',
  sm: 'translate-x-4 rtl:-translate-x-4',
} as const

export function Toggle({
  checked,
  onCheckedChange,
  label,
  showLabel = true,
  helper,
  size = 'md',
  disabled,
  id,
  className,
  ...aria
}: ToggleProps) {
  const reactId = React.useId()
  const switchId = id ?? `${reactId}-switch`
  const helperId = `${reactId}-helper`

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div className="flex items-center gap-3">
        <button
          type="button"
          role="switch"
          id={switchId}
          aria-checked={checked}
          aria-describedby={helper ? helperId : undefined}
          aria-label={showLabel ? undefined : (aria['aria-label'] ?? label)}
          disabled={disabled}
          onClick={() => onCheckedChange(!checked)}
          className={cn(
            'relative inline-flex shrink-0 items-center rounded-full p-0.5',
            'transition-colors motion-reduce:transition-none disabled:cursor-not-allowed',
            TRACK[size],
            checked ? 'bg-brand-blue-600' : 'bg-surface-sunken',
            disabled && 'opacity-60',
            FOCUS_RING,
          )}
        >
          <span
            aria-hidden="true"
            className={cn(
              'inline-block rounded-full bg-white shadow-sm',
              'transition-transform motion-reduce:transition-none',
              KNOB[size],
              checked ? KNOB_ON[size] : 'translate-x-0',
            )}
          />
        </button>

        {showLabel && label && (
          <label htmlFor={switchId} className="cursor-pointer text-sm font-medium text-text-primary">
            {label}
          </label>
        )}
      </div>

      {helper && (
        <p id={helperId} className="text-sm text-text-muted">
          {helper}
        </p>
      )}
    </div>
  )
}
