'use client'

import * as React from 'react'

// H6 « Unité » (step 3) and « Mode de prestation » (step 4) — Figma 459:19004 / 459:19053
// (docs/design/h6-measurements.md, reads 3–4), founder ruling D19: a page-local radio group, NOT the
// shared SegmentedControl, which is a tablist (wrong for a form value) and sizes options to content
// by an earlier founder ruling, where the frame draws equal flex-1 segments.
//
// Native radios in a fieldset: the legend names the group, arrow keys move AND select within it, Tab
// lands on the checked one — no key handling of our own. The radio itself is visually hidden; its
// label is the segment.
//
// Paint as measured: track surface-sunken, radius 10, p 4, gap 4; segment radius 8, px 16 / py 8,
// equal width; selected = surface-base + shadow-xs (the frame's 0 1 2 / .06 has no token; shadow-xs
// is .04) + Medium 14 primary; others Regular 14 secondary. The frame's segment boxes are a fixed
// h 100 — an authoring artefact; built to content (≈ 45 with the track, beside the 44 fields).
// Columns come from the caller (Unité: 2 × 2 below `sm`, ruling D19). Label + helper follow the F3
// field style (ruling D20), not the frame's Medium 16 primary.
// Touch target: a segment is 37 tall, under the 44 mobile minimum, so — as Button md does — an
// invisible aria-hidden child extends the hit region 4px above and below without painting anything.
// Class strings are plain templates, not cn(): twMerge evicts text-body-sm next to a text colour
// (reference_twmerge_text_size_color_footgun).

export type SegmentedRadioOption<T extends string> = { value: T; label: string }

export function SegmentedRadio<T extends string>({
  legend,
  options,
  value,
  onChange,
  required,
  helper,
  error,
  columnsClassName,
}: {
  legend: string
  options: readonly SegmentedRadioOption<T>[]
  value: T
  onChange: (value: T) => void
  required?: boolean
  helper?: string
  error?: string
  /** Grid columns for the track, e.g. `grid-cols-2 sm:grid-cols-4`. */
  columnsClassName: string
}) {
  const id = React.useId()
  const name = `${id}-segmented`
  const noteId = `${id}-note`
  const note = error ?? helper

  return (
    <fieldset aria-describedby={note ? noteId : undefined}>
      <legend className="mb-2 text-sm font-medium text-text-secondary">
        {legend}
        {required && <span aria-hidden="true" className="text-danger-500"> *</span>}
      </legend>
      <div className={`grid gap-1 rounded-lg bg-surface-sunken p-1 ${columnsClassName}`}>
        {options.map((option) => {
          const checked = option.value === value
          return (
            <label
              key={option.value}
              className={`relative flex cursor-pointer items-center justify-center rounded-md px-4 py-2 text-center text-body-sm transition-colors motion-reduce:transition-none has-focus-visible:ring-2 has-focus-visible:ring-brand-blue-600 has-focus-visible:ring-offset-2 has-focus-visible:ring-offset-surface-sunken ${
                checked ? 'bg-surface-base font-medium text-text-primary shadow-xs' : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <input
                type="radio"
                name={name}
                value={option.value}
                checked={checked}
                onChange={() => onChange(option.value)}
                className="sr-only"
              />
              {option.label}
              <span aria-hidden="true" className="absolute inset-x-0 -inset-y-1" />
            </label>
          )
        })}
      </div>
      {note && (
        <p id={noteId} className={`mt-2 text-sm ${error ? 'text-danger-500' : 'text-text-muted'}`}>
          {note}
        </p>
      )}
    </fieldset>
  )
}
