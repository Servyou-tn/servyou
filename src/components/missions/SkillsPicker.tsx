'use client'

import { useId, useMemo, useState } from 'react'
import { ChevronDown, Plus, Search, X } from 'lucide-react'
import { FilterControl } from '@/components/ui/filter-control'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { POPOVER_CONTENT } from '@/components/ui/menu-styles'
import { FOCUS_RING } from '@/components/layout/styles'
import { skillKey } from '@/lib/marche/skills-match'

// SkillsPicker — multi-select of skills as SEPARATE tags (H12 « Vos compétences pour cette mission », specimens 368:2682 /
// 369:2696 / 374:10479; docs/design/h9-h13-measurements.md D-H12-3). There was no multi-select in code (TagInput is
// free text + type-ahead), and the free-text field is what let « higsfild claude adobe » be saved as ONE skill.
//
// Anatomy (369:2696 is a drawn panel only — no Figma component exists, flagged in the PR): a trigger like the app's Select
// (h 44, border-strong, radius 10) that reads « 3 compétences sélectionnées » or the placeholder; a panel (radius 10,
// border-subtle, shadow, pad 8) with a search row and one SECTION per `sections` entry, each option a FilterControl
// checkbox row; and below the trigger the chosen skills as dismissible blue chips (blue/50 pill, Medium 14 blue/600, ✕ 14).
//
// Two modes, one component:
//   · closed pool (H12): you can only pick what the sections offer;
//   · `custom` (the annonce form): a typed text that matches nothing offers « Ajouter « … » », stored as ONE trimmed skill.
//
// Selection is matched accent- and case-insensitively (skillKey), so « React » and « react » can never both be chosen.
// Chips remove with a ≥ 44 px hit area. No raw text is rendered as HTML.

export type SkillSection = { id: string; label: string; options: string[] }

export function SkillsPicker({
  sections,
  value,
  onChange,
  label,
  helper,
  placeholder,
  selectedLabel,
  removeLabel,
  searchPlaceholder,
  emptyLabel,
  error,
  disabled = false,
  max,
  custom,
}: {
  sections: SkillSection[]
  value: string[]
  onChange: (next: string[]) => void
  label: string
  helper?: string
  /** Trigger text with nothing selected. */
  placeholder: string
  /** Trigger text with n selected (« 3 compétences sélectionnées »). */
  selectedLabel: (n: number) => string
  removeLabel: (skill: string) => string
  searchPlaceholder: string
  /** Shown when the search matches nothing and custom entry is off. */
  emptyLabel: string
  error?: string
  disabled?: boolean
  /** Most skills selectable; the rest stay unchecked-and-disabled once reached. */
  max?: number
  custom?: { addLabel: (text: string) => string; maxLength: number }
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const reactId = useId()
  const triggerId = `${reactId}-trigger`
  const labelId = `${reactId}-label`
  const valueId = `${reactId}-value`
  const helperId = `${reactId}-helper`
  const errorId = `${reactId}-error`

  const selectedKeys = useMemo(() => new Set(value.map(skillKey)), [value])
  const atMax = max != null && value.length >= max
  const needle = skillKey(query)

  const visible = sections
    .map((s) => ({ ...s, options: s.options.filter((o) => !needle || skillKey(o).includes(needle)) }))
    .filter((s) => s.options.length > 0)
  const typed = query.trim()
  const canAddTyped =
    custom != null &&
    typed !== '' &&
    typed.length <= custom.maxLength &&
    !selectedKeys.has(skillKey(typed)) &&
    !sections.some((s) => s.options.some((o) => skillKey(o) === skillKey(typed)))

  function toggle(skill: string) {
    if (selectedKeys.has(skillKey(skill))) onChange(value.filter((v) => skillKey(v) !== skillKey(skill)))
    else if (!atMax) onChange([...value, skill])
  }

  function addTyped() {
    if (!canAddTyped || atMax) return
    onChange([...value, typed])
    setQuery('')
  }

  return (
    <div className="flex flex-col gap-2">
      <label id={labelId} htmlFor={triggerId} className="text-sm font-medium text-text-secondary">
        {label}
      </label>
      {helper ? (
        <p id={helperId} className="text-caption text-text-muted">
          {helper}
        </p>
      ) : null}

      <Popover open={open} onOpenChange={(o) => {
          setOpen(o)
          if (!o) setQuery('')
        }}>
        <PopoverTrigger
          id={triggerId}
          type="button"
          disabled={disabled}
          // Name = the field label AND the current value (« Compétences — 3 compétences sélectionnées »): a bare <label for> would
          // replace the button text, so a screen reader would never hear what is selected.
          aria-labelledby={`${labelId} ${valueId}`}
          aria-describedby={error ? errorId : helper ? helperId : undefined}
          aria-invalid={error ? true : undefined}
          className={`inline-flex h-11 w-full items-center justify-between gap-2 rounded-[10px] border bg-surface-base px-4 text-start text-body transition-colors hover:border-text-muted disabled:cursor-not-allowed disabled:bg-surface-subtle ${
            error ? 'border-danger-500' : 'border-border-strong'
          } ${value.length > 0 ? 'text-text-primary' : 'text-text-muted'} ${FOCUS_RING}`}
        >
          <span id={valueId} className="truncate">
            {value.length > 0 ? selectedLabel(value.length) : placeholder}
          </span>
          <ChevronDown className="size-[18px] shrink-0 text-text-muted" aria-hidden="true" />
        </PopoverTrigger>
        <PopoverContent align="start" className={`w-[var(--radix-popover-trigger-width)] max-w-[320px] min-w-[240px] p-2 ${POPOVER_CONTENT}`}>
          <div className="flex h-9 items-center gap-2 rounded-lg border border-border-subtle bg-surface-subtle px-3">
            <Search className="size-4 shrink-0 text-text-muted" aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addTyped()
                }
              }}
              placeholder={searchPlaceholder}
              aria-label={searchPlaceholder}
              className="min-w-0 flex-1 bg-transparent text-body-sm text-text-primary outline-none placeholder:text-text-muted"
            />
          </div>

          <div className="mt-2 flex max-h-64 flex-col gap-2 overflow-y-auto">
            {visible.map((section) => (
              <div key={section.id} role="group" aria-label={section.label} className="flex flex-col">
                <p className="px-2 py-1 text-caption font-semibold text-text-muted">{section.label}</p>
                {section.options.map((option) => {
                  const checked = selectedKeys.has(skillKey(option))
                  return (
                    <label
                      key={option}
                      className={`flex min-h-9 cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-body-sm text-text-primary hover:bg-surface-subtle ${
                        !checked && atMax ? 'cursor-not-allowed opacity-50' : ''
                      }`}
                    >
                      <FilterControl type="checkbox" checked={checked} onChange={() => toggle(option)} />
                      <span className="min-w-0 truncate">{option}</span>
                    </label>
                  )
                })}
              </div>
            ))}

            {canAddTyped ? (
              <button
                type="button"
                onClick={addTyped}
                disabled={atMax}
                className={`flex min-h-9 items-center gap-2 rounded-lg px-2 py-1.5 text-start text-body-sm font-medium text-brand-blue-600 hover:bg-surface-subtle disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS_RING}`}
              >
                <Plus className="size-4 shrink-0" aria-hidden="true" />
                <span className="truncate">{custom.addLabel(typed)}</span>
              </button>
            ) : null}

            {visible.length === 0 && !canAddTyped ? (
              <p className="px-2 py-3 text-center text-body-sm text-text-muted">{emptyLabel}</p>
            ) : null}
          </div>
        </PopoverContent>
      </Popover>

      {value.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {value.map((skill) => (
            <li key={skillKey(skill)}>
              <span className="inline-flex items-center rounded-full bg-brand-blue-50 py-1 ps-3 pe-1 text-body-sm font-medium text-brand-blue-600">
                <span className="max-w-[200px] truncate">{skill}</span>
                <button
                  type="button"
                  onClick={() => toggle(skill)}
                  disabled={disabled}
                  aria-label={removeLabel(skill)}
                  className={`relative ms-0.5 inline-flex size-6 items-center justify-center rounded-full hover:bg-brand-blue-100 disabled:cursor-not-allowed ${FOCUS_RING}`}
                >
                  <X className="size-3.5" aria-hidden="true" />
                  {/* 44 px hit area around the 24 px visible target (touch-target rule). */}
                  <span aria-hidden="true" className="absolute -inset-2.5" />
                </button>
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      {error ? (
        <p id={errorId} role="alert" className="text-sm text-danger-500">
          {error}
        </p>
      ) : null}
    </div>
  )
}
