'use client'

import { Check } from 'lucide-react'
import { FOCUS_RING } from '@/components/layout/styles'

// The one filter control used by every consumer filter — the Marché Catégorie/Ville
// checkboxes and the Statut/Type radios. An appearance-none square outline box with a small
// brand-accent Check icon centred when selected, and NO background fill. Checkboxes and radios
// render IDENTICALLY (same square, size, border, and check) — modern filter UX drops the radio
// circle; single- vs multi-select is purely behavioural and never shown in the shape. Single
// source of truth so the controls never drift apart again.
//
// The input must sit inside a <label> that also holds the option text — that wrapping label
// provides the accessible name (so no aria-label is needed here).
export function FilterControl({
  type,
  checked,
  onChange,
  name,
}: {
  type: 'checkbox' | 'radio'
  checked: boolean
  onChange: () => void
  // Radios in the same group share a name for native single-select semantics.
  name?: string
}) {
  return (
    <span className="relative inline-flex h-4 w-4 shrink-0">
      <input
        type={type}
        name={name}
        checked={checked}
        onChange={onChange}
        // Always a square outline — both checkboxes and radios render identically (modern
        // filter UX drops the radio circle; single- vs multi-select stays purely behavioural).
        // `type` still drives the real input semantics; only the visual is unified.
        className={`peer h-4 w-4 cursor-pointer appearance-none rounded-sm border border-border-subtle bg-white transition-colors checked:border-brand-accent ${FOCUS_RING}`}
      />
      <Check
        className="pointer-events-none absolute inset-0 m-auto h-3 w-3 text-brand-accent opacity-0 transition-opacity peer-checked:opacity-100"
        strokeWidth={3}
        aria-hidden="true"
      />
    </span>
  )
}
