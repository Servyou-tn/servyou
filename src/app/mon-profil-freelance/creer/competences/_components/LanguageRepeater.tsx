'use client'

import * as React from 'react'
import { X } from 'lucide-react'
import { FOCUS_RING } from '@/components/layout/styles'
import { cn } from '@/lib/utils'
import { t, type Lang } from '@/lib/i18n'
import { LANGUAGES, PROFICIENCY_LEVELS } from '@/lib/freelancer/language-options'

// H2 step 2 "Langues" repeater — Figma 467:20404, measured in docs/design/h2-discovery.md §3.
// Each row: [Select langue][Select niveau][x remove], plus "+ Ajouter une langue". Option lists
// are founder-RULED not measured (§3c) — src/lib/freelancer/language-options.ts. Native <select>,
// same posture as step 1's Ville field — no shared Select component exists in this codebase.
//
// A row's langue Select excludes languages already picked in another row: freelancer_languages
// carries UNIQUE (freelancer_profile_id, language), so two rows choosing the same language would
// collide on submit (23505). Filtering it out client-side turns a server error into "the option
// simply isn't offered twice" — the row's OWN current value stays selectable in its own dropdown.

export type LanguageRow = { id: string; language: string; proficiency: string }

// min-w-0 is load-bearing: two w-full <select>s + a fixed 44px remove button in one flex row,
// with no min-w-0, refuse to shrink below their own text's intrinsic width — confirmed via a
// live 320px AR screenshot (16px horizontal overflow, gone once this was added).
const SELECT_FIELD = `w-full min-w-0 rounded-lg border px-4 h-11 bg-surface-base text-base text-text-primary outline-none transition-colors focus:border-brand-blue-600 border-border-strong ${FOCUS_RING}`

export function LanguageRepeater({
  rows,
  onChange,
  lang,
  error,
}: {
  rows: LanguageRow[]
  onChange: (next: LanguageRow[]) => void
  lang: Lang
  error?: string
}) {
  function addRow() {
    onChange([...rows, { id: crypto.randomUUID(), language: '', proficiency: '' }])
  }

  function removeRow(id: string) {
    onChange(rows.filter((r) => r.id !== id))
  }

  function updateRow(id: string, patch: Partial<Pick<LanguageRow, 'language' | 'proficiency'>>) {
    onChange(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium text-text-secondary">
        {t('freelance.create.step2.langues_label', lang)}
        <span aria-hidden="true" className="text-danger-500"> *</span>
      </span>

      <div className="flex flex-col gap-2">
        {rows.map((row) => {
          const takenElsewhere = new Set(
            rows.filter((r) => r.id !== row.id && r.language).map((r) => r.language),
          )
          const options = LANGUAGES.filter((l) => l.value === row.language || !takenElsewhere.has(l.value))
          const currentLabel = LANGUAGES.find((l) => l.value === row.language)
          const removeLabel = t('freelance.create.step2.remove_language_label', lang, {
            language: currentLabel ? (lang === 'ar' ? currentLabel.ar : currentLabel.fr) : '',
          })

          return (
            <div key={row.id} className="flex items-center gap-2">
              <select
                aria-label={t('freelance.create.step2.langue_select_label', lang)}
                value={row.language}
                onChange={(e) => updateRow(row.id, { language: e.target.value })}
                className={SELECT_FIELD}
              >
                <option value="" disabled>
                  {t('freelance.create.step2.langue_select_label', lang)}
                </option>
                {options.map((l) => (
                  <option key={l.value} value={l.value}>
                    {lang === 'ar' ? l.ar : l.fr}
                  </option>
                ))}
              </select>

              <select
                aria-label={t('freelance.create.step2.niveau_select_label', lang)}
                value={row.proficiency}
                onChange={(e) => updateRow(row.id, { proficiency: e.target.value })}
                className={SELECT_FIELD}
              >
                <option value="" disabled>
                  {t('freelance.create.step2.niveau_select_label', lang)}
                </option>
                {PROFICIENCY_LEVELS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {lang === 'ar' ? p.ar : p.fr}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => removeRow(row.id)}
                aria-label={removeLabel}
                className={cn(
                  'flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-surface-subtle hover:text-danger-500',
                  FOCUS_RING,
                )}
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          )
        })}
      </div>

      <button
        type="button"
        onClick={addRow}
        className={cn('self-start rounded text-sm font-medium text-brand-blue-600 hover:underline', FOCUS_RING)}
      >
        {t('freelance.create.step2.add_language', lang)}
      </button>

      <p className={cn('text-sm', error ? 'text-danger-500' : 'text-text-muted')}>
        {error ?? t('freelance.create.step2.langues_helper', lang)}
      </p>
    </div>
  )
}
