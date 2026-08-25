'use client'

import * as React from 'react'
import { ChevronDown, ChevronRight, Lock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { FOCUS_RING } from '@/components/layout/styles'
import { Toggle } from './toggle'

// Setting Row — Figma COMPONENT_SET 181:12870 (4 variants: toggle/select/link/ToggleLocked, props
// label + description), measured from real usage in Paramètres (see the PR-parent measurement
// report — no isolated pull of 181:12870 itself was spent; every variant below is copied from a
// real instance: toggle from 423:17126's email rows, ToggleLocked from "Alertes de sécurité",
// link from "Exporter mes données" (558:38990), select from "Langue" (423:17328)).
//
// The Figma export gives every row instance its OWN border-b AND wraps a separate 1px Divider
// between rows in the panel — stacking both would double the line. Collapsed here: SettingRow
// carries no border of its own; the list wrapper applies `divide-y divide-border-subtle` instead.
// Same 1px border-subtle result between rows, no doubled line.
//
// Variant naming normalized to kebab-case ('toggle-locked', not Figma's 'ToggleLocked') — TS prop
// unions read consistently that way elsewhere in this codebase.
//
// Hover/focus: unmeasured — the Figma export shows no pseudo-state for any variant. Toggle already
// carries the shared FOCUS_RING; the link and select controls below get it too, per convention
// rather than measurement.

type BaseProps = {
  label: string
  description?: string
  className?: string
}

export type ToggleRowProps = BaseProps & {
  variant: 'toggle'
  checked: boolean
  onCheckedChange: (next: boolean) => void
  disabled?: boolean
}

export type ToggleLockedRowProps = BaseProps & {
  variant: 'toggle-locked'
  /** Always true in every measured instance (a locked-on security default) — kept as a prop rather
   *  than hardcoded so a future locked-off case isn't blocked. */
  checked?: boolean
}

export type LinkRowProps = BaseProps & {
  variant: 'link'
  actionLabel: string
  onAction: () => void
}

export type SelectOption = { value: string; label: string }

export type SelectRowProps = BaseProps & {
  variant: 'select'
  value: string
  options: SelectOption[]
  onChange: (next: string) => void
  'aria-label'?: string
}

export type SettingRowProps = ToggleRowProps | ToggleLockedRowProps | LinkRowProps | SelectRowProps

// Measured shell: 72px min-height (min-h-18 on the --spacing token scale), py-16, flex
// items-center justify-between, full width. Left block flex-1 flex-col gap-2, padding-END 40
// (was pr-[40px] in the export — converted to the logical side per the app's bilingual-RTL rule)
// before the control.
export function SettingRow(props: SettingRowProps) {
  const { label, description, className } = props

  return (
    <div className={cn('flex min-h-18 w-full items-center justify-between py-4', className)}>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5 pe-10">
        <p className="text-base font-semibold text-text-primary">{label}</p>
        {description && <p className="text-sm text-text-muted">{description}</p>}
      </div>
      <SettingRowControl {...props} />
    </div>
  )
}

function SettingRowControl(props: SettingRowProps) {
  switch (props.variant) {
    case 'toggle':
      return (
        <Toggle
          checked={props.checked}
          onCheckedChange={props.onCheckedChange}
          disabled={props.disabled}
          showLabel={false}
          aria-label={props.label}
          className="shrink-0"
        />
      )

    case 'toggle-locked':
      // 44×24 track at opacity-60, a 16×16 lock icon leading it, gap-8 between — exactly what a
      // "bientôt disponible" row looks like. Replaces every opacity-50 bare-switch hack.
      return (
        <div className="flex shrink-0 items-center gap-2">
          <Lock className="size-4 text-text-muted" aria-hidden="true" />
          <Toggle
            checked={props.checked ?? true}
            onCheckedChange={() => {}}
            disabled
            showLabel={false}
            aria-label={props.label}
          />
        </div>
      )

    case 'link':
      return (
        <button
          type="button"
          onClick={props.onAction}
          className={cn(
            'inline-flex shrink-0 items-center gap-1 rounded text-sm font-medium text-brand-blue-600 hover:underline',
            FOCUS_RING,
          )}
        >
          {props.actionLabel}
          <ChevronRight className="size-4 rtl:rotate-180" aria-hidden="true" />
        </button>
      )

    case 'select':
      // Native <select> over a Radix/DropdownMenu build: this app has no shared Select primitive
      // yet (SELECT_FIELD_BASE in layout/styles.ts is a 44px form-field shape, not this measured
      // 40px one — reused elsewhere, not reused here since the height doesn't match), and a native
      // element keeps this a two-option field fully accessible with no extra wiring.
      return (
        <div className="relative w-30.5 shrink-0">
          <select
            value={props.value}
            onChange={(e) => props.onChange(e.target.value)}
            aria-label={props['aria-label'] ?? props.label}
            className={cn(
              'h-10 w-full appearance-none rounded-lg border border-border-strong bg-surface-base ps-4 pe-9 text-base text-text-muted outline-none transition-colors',
              'focus:border-brand-blue-600',
              FOCUS_RING,
            )}
          >
            {props.options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown
            className="pointer-events-none absolute end-3 top-1/2 size-4.5 -translate-y-1/2 text-text-muted"
            aria-hidden="true"
          />
        </div>
      )
  }
}

// A single 1px border-subtle line between consecutive SettingRows in a panel — apply
// `divide-y divide-border-subtle` on the wrapping list container instead of giving each row its
// own border (see the file-header note on why).
export const SETTING_ROW_LIST = 'flex flex-col divide-y divide-border-subtle'
