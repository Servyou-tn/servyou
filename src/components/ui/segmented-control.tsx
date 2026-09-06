'use client'

import { motion, useReducedMotion } from 'motion/react'
import { useId } from 'react'
import { FOCUS_RING } from '@/components/layout/styles'

export type SegmentedControlOption<T extends string = string> = {
  value: T
  label: string
  // Renders the option as a non-interactive, out-of-tab-order button with a "Bientôt" badge
  // instead of wiring it to onChange. Badge classes match the established disabled-tab
  // convention (OrdersTabs, ProduitsLensToggle) exactly, so every deferred-tab affordance in
  // the app looks the same. Additive: existing callers (search toggle, commandes filter) never
  // set this, so their options are unaffected.
  disabled?: boolean
  // Accessible/tooltip text for a disabled option (e.g. "Bientôt disponible"). Required when
  // disabled is true.
  disabledTitle?: string
  soonLabel?: string
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
// the same page never animate into each other. Options size to content (shrink-0 +
// whitespace-nowrap, same as the disabled branch below) — a longer label on a narrow
// track was breaking across two lines under the old flex-1 + min-w-20 uniform-width rule
// (founder ruling, 2026-09-06); fixing that wrap is this component's only sanctioned
// change here — the pill fill and container stay exactly as shipped. Reduced motion
// snaps instead of springing.
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
        if (option.disabled) {
          return (
            <button
              key={option.value}
              type="button"
              role="tab"
              disabled
              aria-disabled="true"
              aria-selected={false}
              title={option.disabledTitle}
              className="relative flex shrink-0 cursor-not-allowed items-center justify-center gap-1 whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium text-text-muted"
            >
              <span>{option.label}</span>
              {option.soonLabel && (
                <span className="rounded-full bg-brand-blue-100 px-1.5 py-0.5 text-caption font-semibold text-brand-blue-600">
                  {option.soonLabel}
                </span>
              )}
            </button>
          )
        }

        const isActive = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(option.value)}
            className={`relative shrink-0 whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition-colors duration-200 ${FOCUS_RING} ${
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
