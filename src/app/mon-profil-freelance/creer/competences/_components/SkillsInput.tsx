'use client'

import * as React from 'react'
import { Search, X } from 'lucide-react'
import { FOCUS_RING } from '@/components/layout/styles'
import { cn } from '@/lib/utils'
import { t, type Lang } from '@/lib/i18n'

// H2 step 2 "Compétences" — Figma 467:20404, measured in docs/design/h2-discovery.md §3. Free
// text, no catalog table (freelancer_skills.skill is bare `text`) — see the discovery report's
// skills-input answer. Route-local: no shared Chip/Tag/MultiSelect/Combobox exists in
// src/components/ui (popover.tsx is untouched shadcn boilerplate on non-Servyou tokens, and step
// 1's own Ville field is a bare native <select> — same posture). Logged in docs/follow-ups.md as
// a component now worth promoting once the job-posting rebuild needs the identical shape.
//
// Built on the F3 Input field box (border/focus-ring/error styling) rather than the actual Input
// component — Input's own `counter` prop counts STRING LENGTH of a single value against
// maxLength (e.g. headline's 0/100 chars), which doesn't fit a chip-count "3/15". The count here
// is a route-local span in the same position/style as Input's own counter row, not the prop.
//
// dir="ltr" on the counter — reference_rtl_numeric_run_reversal: a bare "N/M" numeric run
// reverses under RTL layout ("15/3" instead of "3/15") because spaces/slashes are bidi-neutral,
// not digits. Confirmed needed by AR screenshot before shipping (docs/design/h2-discovery.md).

export const SKILLS_MIN = 3
export const SKILLS_MAX = 15

export function SkillsInput({
  skills,
  onChange,
  lang,
  error,
}: {
  skills: string[]
  onChange: (next: string[]) => void
  lang: Lang
  error?: string
}) {
  const [draft, setDraft] = React.useState('')
  const inputId = React.useId()
  const helperId = `${inputId}-helper`
  const atMax = skills.length >= SKILLS_MAX

  function commit() {
    const value = draft.trim()
    if (!value || atMax) return
    if (skills.some((s) => s.toLowerCase() === value.toLowerCase())) return
    onChange([...skills, value])
    setDraft('')
  }

  function remove(skill: string) {
    onChange(skills.filter((s) => s !== skill))
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      commit()
    } else if (e.key === 'Backspace' && draft === '' && skills.length > 0) {
      remove(skills[skills.length - 1])
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={inputId} className="text-sm font-medium text-text-secondary">
          {t('freelance.create.step2.competences_label', lang)}
          <span aria-hidden="true" className="text-danger-500"> *</span>
        </label>
        <span dir="ltr" className="text-sm text-text-muted tabular-nums" aria-hidden="true">
          {skills.length}/{SKILLS_MAX}
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
          placeholder={atMax ? undefined : t('freelance.create.step2.competences_ph', lang)}
          aria-describedby={helperId}
          aria-invalid={error ? true : undefined}
          className="w-full min-w-0 bg-transparent text-base text-text-primary outline-none placeholder:text-text-muted disabled:cursor-not-allowed"
        />
      </div>

      {skills.length > 0 && (
        <ul className="flex flex-wrap gap-2" aria-label={t('freelance.create.step2.competences_label', lang)}>
          {skills.map((skill) => (
            <li key={skill}>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-blue-50 py-1 ps-3 pe-2 text-sm text-brand-blue-600">
                {skill}
                <button
                  type="button"
                  onClick={() => remove(skill)}
                  aria-label={t('freelance.delete_skill_label', lang, { name: skill })}
                  className={cn('rounded-full p-0.5 hover:bg-brand-blue-100', FOCUS_RING)}
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}

      <p id={helperId} className={cn('text-sm', error ? 'text-danger-500' : 'text-text-muted')}>
        {error ?? t('freelance.create.step2.competences_helper', lang)}
      </p>
    </div>
  )
}
