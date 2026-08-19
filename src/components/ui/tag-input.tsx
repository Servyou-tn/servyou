'use client'

import * as React from 'react'
import { Search, X } from 'lucide-react'
import { FOCUS_RING } from '@/components/layout/styles'
import { cn } from '@/lib/utils'

// TagInput — measured from Figma 467:20404 (H2 step 2 "Compétences"), promoted to components/ui
// on its second real consumer (PR-D, /mes-annonces/nouvelle's skills field) — H2 was first, as
// `SkillsInput.tsx`. Anticipated by docs/follow-ups.md's "Shared tag-input now wanted" entry.
//
// Built on the F3 Input field box (border/focus-ring/error styling) rather than the actual Input
// component — Input's own `counter` prop counts STRING LENGTH of a single value against
// maxLength (e.g. headline's 0/100 chars), which doesn't fit a chip-count "3/15" or "0/8". The
// count here is a route-local span in the same position/style as Input's own counter row, not
// the prop.
//
// Generalized from the route-local original: all copy (label/placeholder/helper/remove label) is
// now caller-supplied, so `lang` is no longer a prop — the component has no i18n key of its own.
// `min`/`max` replace the hardcoded 3/15 (H2's own SKILLS_MIN/SKILLS_MAX constants now live in
// CompetencesForm.tsx, the consumer, not here). The visible danger-asterisk renders only when
// `min` is truthy (> 0) — H2 passes min=3 and keeps its asterisk; a caller with no minimum (the
// annonces skills field, optional/no-min) passes no `min` and gets none. This is a DERIVED
// convention, not a `required` prop: see docs/follow-ups.md's field-marking entry for why (this
// form's own HYBRID rule bakes "(optionnel)"/no-asterisk into the label text instead).
//
// dir="ltr" on the counter — reference_rtl_numeric_run_reversal: a bare "N/M" numeric run
// reverses under RTL layout ("15/3" instead of "3/15") because spaces/slashes are bidi-neutral,
// not digits.

export type TagInputProps = {
  value: string[]
  onChange: (next: string[]) => void
  /** Below this, the field is short — no internal validation; the caller's own validate() checks it. */
  min?: number
  max: number
  label: string
  placeholder?: string
  helper?: string
  error?: string
  /** Builds the accessible name for a chip's remove button, e.g. `(tag) => t('...delete', lang, { name: tag })`. */
  getRemoveLabel: (tag: string) => string
}

export function TagInput({ value, onChange, min, max, label, placeholder, helper, error, getRemoveLabel }: TagInputProps) {
  const [draft, setDraft] = React.useState('')
  const inputId = React.useId()
  const helperId = `${inputId}-helper`
  const atMax = value.length >= max

  function commit() {
    const next = draft.trim()
    if (!next || atMax) return
    if (value.some((v) => v.toLowerCase() === next.toLowerCase())) return
    onChange([...value, next])
    setDraft('')
  }

  function remove(tag: string) {
    onChange(value.filter((v) => v !== tag))
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      commit()
    } else if (e.key === 'Backspace' && draft === '' && value.length > 0) {
      remove(value[value.length - 1])
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={inputId} className="text-sm font-medium text-text-secondary">
          {label}
          {min ? <span aria-hidden="true" className="text-danger-500"> *</span> : null}
        </label>
        <span dir="ltr" className="text-sm text-text-muted tabular-nums" aria-hidden="true">
          {value.length}/{max}
        </span>
      </div>

      <div
        className={cn(
          'flex h-11 items-center gap-2 rounded-lg border bg-surface-base px-4 transition-colors',
          'focus-within:border-brand-blue-600 focus-within:ring-2 focus-within:ring-brand-blue-600 focus-within:ring-offset-2 focus-within:ring-offset-surface-base',
          error ? 'border-danger-500' : 'border-border-strong',
        )}
      >
        <Search className="h-[18px] w-[18px] shrink-0 text-text-muted" aria-hidden="true" />
        <input
          id={inputId}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={commit}
          disabled={atMax}
          placeholder={atMax ? undefined : placeholder}
          aria-describedby={helperId}
          aria-invalid={error ? true : undefined}
          className="w-full min-w-0 bg-transparent text-base text-text-primary outline-none placeholder:text-text-muted disabled:cursor-not-allowed"
        />
      </div>

      {value.length > 0 && (
        <ul className="flex flex-wrap gap-2" aria-label={label}>
          {value.map((tag) => (
            <li key={tag}>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-blue-50 py-1 ps-3 pe-2 text-sm text-brand-blue-600">
                {tag}
                <button
                  type="button"
                  onClick={() => remove(tag)}
                  aria-label={getRemoveLabel(tag)}
                  className={cn('rounded-full p-0.5 hover:bg-brand-blue-100', FOCUS_RING)}
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}

      {helper !== undefined && (
        <p id={helperId} className={cn('text-sm', error ? 'text-danger-500' : 'text-text-muted')}>
          {error ?? helper}
        </p>
      )}
    </div>
  )
}
