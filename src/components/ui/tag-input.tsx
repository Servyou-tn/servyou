'use client'

import * as React from 'react'
import { Search, X } from 'lucide-react'
import { FOCUS_RING } from '@/components/layout/styles'
import { MENU_CONTENT } from '@/components/ui/menu-styles'
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
//
// Type-ahead (H6 « Compétences », founder ruling D5, 2026-10-23) — opt-in, every new prop optional,
// so the two free-text consumers above render and behave exactly as before:
//   • `suggestions` turns the input into an ARIA combobox: focusing it lists the pool, typing filters
//     it, ↑/↓ + Enter or a click picks one. The panel reuses the shipped menu tokens
//     (MENU_CONTENT) — the open state is not in any measured frame.
//   • `getLabel` renders a stored value (e.g. a skill id) as its display label on chips/options.
//   • `normalize` maps typed text to the value to store (e.g. a typed pool label → its id) before the
//     duplicate check, so « React » typed and « React » picked can't both land.
//   • `getAddLabel` adds a last « Ajouter « … » » option when the typed text matches no suggestion.
//   • `showCount={false}` hides the N/M counter (H6's frame draws none).
//   • `maxLength` caps one typed tag (H6: the autosave schema refuses a skill over 50 characters, so
//     an uncapped chip would make every later save fail).

export type TagSuggestion = { value: string; label: string }

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
  /** Pool offered as the user types (turns the field into a combobox). */
  suggestions?: TagSuggestion[]
  /** Display label for a stored value (chips). Defaults to the value itself. */
  getLabel?: (value: string) => string
  /** Maps typed text to the value stored. Defaults to the trimmed text. */
  normalize?: (text: string) => string
  /** Label of the « add what I typed » option, shown when the text matches no suggestion. */
  getAddLabel?: (text: string) => string
  /** Show the N/M counter next to the label. Default true. */
  showCount?: boolean
  /** Fired when focus leaves the field — lets a form mark it touched. */
  onBlur?: () => void
  /** Longest single tag the input accepts (typed characters). */
  maxLength?: number
}

const SUGGESTION_LIMIT = 50

const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLocaleLowerCase('fr')

export function TagInput({
  value,
  onChange,
  min,
  max,
  label,
  placeholder,
  helper,
  error,
  getRemoveLabel,
  suggestions,
  getLabel,
  normalize,
  getAddLabel,
  showCount = true,
  onBlur,
  maxLength,
}: TagInputProps) {
  const [draft, setDraft] = React.useState('')
  const [open, setOpen] = React.useState(false)
  const [active, setActive] = React.useState(-1)
  const inputId = React.useId()
  const helperId = `${inputId}-helper`
  const listId = `${inputId}-list`
  const atMax = value.length >= max
  const labelOf = getLabel ?? ((v: string) => v)

  const combobox = suggestions !== undefined
  const typed = draft.trim()
  const options: { value: string; label: string; add?: boolean }[] = []
  if (combobox && !atMax) {
    const needle = fold(typed)
    for (const s of suggestions) {
      if (value.includes(s.value)) continue
      if (needle && !fold(s.label).includes(needle)) continue
      options.push(s)
      if (options.length >= SUGGESTION_LIMIT) break
    }
    if (typed && getAddLabel && !suggestions.some((s) => fold(s.label) === fold(typed))) {
      options.push({ value: typed, label: getAddLabel(typed), add: true })
    }
  }
  const listOpen = combobox && open && options.length > 0

  function add(text: string) {
    const trimmed = text.trim()
    if (!trimmed || atMax) return
    const next = normalize ? normalize(trimmed) : trimmed
    if (value.some((v) => v.toLowerCase() === next.toLowerCase())) return
    onChange([...value, next])
    setDraft('')
    setActive(-1)
  }

  function commit() {
    add(draft)
  }

  function remove(tag: string) {
    onChange(value.filter((v) => v !== tag))
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (listOpen && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      e.preventDefault()
      const last = options.length - 1
      setActive((i) => (e.key === 'ArrowDown' ? (i >= last ? 0 : i + 1) : i <= 0 ? last : i - 1))
      return
    }
    if (e.key === 'Escape' && listOpen) {
      e.preventDefault()
      setOpen(false)
      setActive(-1)
      return
    }
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      if (listOpen && active >= 0 && active < options.length) add(options[active].value)
      else commit()
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
        {showCount && (
          <span dir="ltr" className="text-sm text-text-muted tabular-nums" aria-hidden="true">
            {value.length}/{max}
          </span>
        )}
      </div>

      <div className="relative">
        <div
          className={cn(
            'flex h-11 items-center gap-2 rounded-lg border bg-surface-base px-4 transition-colors',
            'focus-within:border-brand-blue-600 focus-within:ring-2 focus-within:ring-brand-blue-600 focus-within:ring-offset-2 focus-within:ring-offset-surface-base',
            error ? 'border-danger-500' : 'border-border-strong',
          )}
        >
          <Search className="h-4.5 w-4.5 shrink-0 text-text-muted" aria-hidden="true" />
          <input
            id={inputId}
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value)
              setActive(-1)
              setOpen(true)
            }}
            onKeyDown={onKeyDown}
            onFocus={combobox ? () => setOpen(true) : undefined}
            onBlur={() => {
              commit()
              setOpen(false)
              setActive(-1)
              onBlur?.()
            }}
            disabled={atMax}
            maxLength={maxLength}
            placeholder={atMax ? undefined : placeholder}
            aria-describedby={helperId}
            aria-invalid={error ? true : undefined}
            {...(combobox
              ? {
                  // The browser's own autofill list would open on top of the suggestion list.
                  autoComplete: 'off',
                  role: 'combobox',
                  'aria-autocomplete': 'list' as const,
                  'aria-expanded': listOpen,
                  'aria-controls': listId,
                  'aria-activedescendant': listOpen && active >= 0 ? `${listId}-${active}` : undefined,
                }
              : {})}
            className="w-full min-w-0 bg-transparent text-base text-text-primary outline-none placeholder:text-text-muted disabled:cursor-not-allowed"
          />
        </div>

        {listOpen && (
          <ul
            id={listId}
            role="listbox"
            aria-label={label}
            className={`absolute inset-x-0 top-full z-20 mt-1 max-h-64 overflow-y-auto overscroll-contain ${MENU_CONTENT}`}
          >
            {options.map((option, i) => (
              <li
                key={option.add ? `add:${option.value}` : option.value}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === active}
                // mousedown, not click: keeps focus in the input, so its blur doesn't commit the
                // half-typed draft before the pick lands.
                onMouseDown={(e) => {
                  e.preventDefault()
                  add(option.value)
                }}
                onMouseEnter={() => setActive(i)}
                className={`cursor-pointer rounded-lg px-2 py-1.5 text-body-sm ${i === active ? 'bg-surface-subtle' : ''} ${
                  option.add ? 'font-medium text-brand-blue-600' : 'text-text-primary'
                }`}
              >
                {option.label}
              </li>
            ))}
          </ul>
        )}
      </div>

      {value.length > 0 && (
        <ul className="flex flex-wrap gap-2" aria-label={label}>
          {value.map((tag) => (
            <li key={tag}>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-blue-50 py-1 ps-3 pe-2 text-sm text-brand-blue-600">
                {labelOf(tag)}
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
