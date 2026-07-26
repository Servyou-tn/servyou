'use client'

import { motion, useReducedMotion } from 'motion/react'
import { useId } from 'react'
import { FOCUS_RING } from '@/components/layout/styles'

export type SegmentedControlOption<T extends string = string> = {
  value: T
  label: string
}

type Props<T extends string> = {
  options: SegmentedControlOption<T>[]
  value: T
  onChange: (value: T) => void
  ariaLabel: string
  className?: string
}

// Shared animated segmented control with a sliding pill indicator (Motion layoutId —
// the Linear/Vercel/Notion pattern). Controlled (value + onChange) so it drives both
// URL-state callers (the search toggle) and local-useState callers (favoris tab,
// commandes filter). useId() gives each instance a unique layoutId so two controls on
// the same page never animate into each other. Uniform option width within the track
// (flex-1 + min-w — the iOS pattern). Reduced motion snaps instead of springing.
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  className = '',
}: Props<T>) {
  const indicatorId = useId()
  const reduce = useReducedMotion()

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={`inline-flex items-center rounded-full bg-surface-pill p-1 ${className}`}
    >
      {options.map((option) => {
        const isActive = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(option.value)}
            className={`relative min-w-20 flex-1 rounded-full px-4 py-1.5 text-sm font-medium transition-colors duration-200 ${FOCUS_RING} ${
              isActive ? 'text-white' : 'text-text-muted hover:text-text-primary'
            }`}
          >
            {isActive && (
              <motion.span
                layoutId={`segmented-pill-${indicatorId}`}
                className="absolute inset-0 rounded-full bg-brand-blue-600"
                transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 380, damping: 30 }}
                aria-hidden="true"
              />
            )}
            <span className="relative z-10">{option.label}</span>
          </button>
        )
      })}
    </div>
  )
}
