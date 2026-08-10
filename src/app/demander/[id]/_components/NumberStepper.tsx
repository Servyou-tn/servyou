'use client'

import { Minus, Plus } from 'lucide-react'
import { FOCUS_RING } from '@/components/layout/styles'
import { cn } from '@/lib/utils'

// Number Stepper — Figma `589:44212`, 136×40. Genuinely new: grepped the whole component tree
// (`Stepper`/`NumberStepper`/`QuantityStepper` under any casing) and nothing exists. Route-local,
// same posture as `./Textarea` — E1-product is its first consumer, promote to `components/ui` at
// the third.
//
// Internal geometry (button/display split within the 136×40 box) is NOT Figma-measured —
// get_metadata doesn't expand an instance's internals, and a second read wasn't spent on it. Built
// to a standard 40/56/40 split (two square buttons flanking the count) as the most common shape
// for this control; revisit if a future read finds the frame drew it differently.
//
// Button-only, deliberately — no free-typing `<input type="number">`. The measured width has no
// room for a number field plus spinner controls, and a bounded quantity (1..stock) is exactly the
// case a stepper is for. The displayed count is a bare number with no separator character, so it
// carries none of D1's gallery-counter bidi risk (`{n}` alone, not `{a} / {b}`) — confirmed in the
// AR pass rather than assumed.

export function NumberStepper({
  value,
  onChange,
  min = 1,
  max,
  label,
  decreaseLabel,
  increaseLabel,
  className,
}: {
  value: number
  onChange: (next: number) => void
  min?: number
  /** undefined = unlimited (tracks_stock === false, "Toujours disponible"). */
  max?: number
  /** Accessible group label, e.g. "Quantité". */
  label: string
  decreaseLabel: string
  increaseLabel: string
  className?: string
}) {
  const atMin = value <= min
  const atMax = max != null && value >= max

  return (
    <div
      role="group"
      aria-label={label}
      className={cn(
        'inline-flex h-10 w-[136px] items-stretch overflow-hidden rounded-lg border border-border-strong bg-surface-base',
        className,
      )}
    >
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={atMin}
        aria-label={decreaseLabel}
        className={cn(
          'flex w-10 shrink-0 items-center justify-center text-text-secondary transition-colors',
          'hover:bg-surface-subtle disabled:cursor-not-allowed disabled:text-text-muted disabled:hover:bg-transparent',
          FOCUS_RING,
        )}
      >
        <Minus className="h-4 w-4" aria-hidden="true" />
      </button>

      <span
        aria-live="polite"
        className="flex flex-1 items-center justify-center border-x border-border-subtle text-base font-medium tabular-nums text-text-primary"
      >
        {value}
      </span>

      <button
        type="button"
        onClick={() => onChange(max != null ? Math.min(max, value + 1) : value + 1)}
        disabled={atMax}
        aria-label={increaseLabel}
        className={cn(
          'flex w-10 shrink-0 items-center justify-center text-text-secondary transition-colors',
          'hover:bg-surface-subtle disabled:cursor-not-allowed disabled:text-text-muted disabled:hover:bg-transparent',
          FOCUS_RING,
        )}
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  )
}
