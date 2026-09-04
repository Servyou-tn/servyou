'use client'

import * as React from 'react'
import { X } from 'lucide-react'
import { FOCUS_RING } from '@/components/layout/styles'
import { cn } from '@/lib/utils'
import { t, type Lang } from '@/lib/i18n'
import { LANGUAGES, PROFICIENCY_LEVELS } from '@/lib/freelancer/language-options'

// "Langues" repeater — same enum-backed shape as H2's own LanguageRepeater
// (creer/competences/_components/LanguageRepeater.tsx): freelancer_languages is the SAME table
// both routes write, so the field shape (language/proficiency selects, not free text) has to
// match exactly. Duplicated route-local per "promote at the third consumer"; H3 is the second.
export type LanguageRow = { id: string; language: string; proficiency: string }

const SELECT_FIELD = `w-full min-w-0 rounded-lg border px-4 h-11 bg-surface-base text-base text-text-primary outline-none transition-colors focus:border-brand-blue-600 border-border-strong ${FOCUS_RING}`

export function LanguageRepeater({ rows, onChange, lang }: { rows: LanguageRow[]; onChange: (next: LanguageRow[]) => void; lang: Lang }) {
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
      <div className="flex flex-col gap-2">
        {rows.map((row) => {
          const takenElsewhere = new Set(rows.filter((r) => r.id !== row.id && r.language).map((r) => r.language))
          const options = LANGUAGES.filter((l) => l.value === row.language || !takenElsewhere.has(l.value))
          const currentLabel = LANGUAGES.find((l) => l.value === row.language)
          const removeLabel = t('freelance.edit.remove_language_label', lang, {
            language: currentLabel ? (lang === 'ar' ? currentLabel.ar : currentLabel.fr) : '',
          })

          return (
            <div key={row.id} className="flex items-center gap-2">
              <select
                aria-label={t('freelance.edit.langue_select_label', lang)}
                value={row.language}
                onChange={(e) => updateRow(row.id, { language: e.target.value })}
                className={SELECT_FIELD}
              >
                <option value="" disabled>
                  {t('freelance.edit.langue_select_label', lang)}
                </option>
                {options.map((l) => (
                  <option key={l.value} value={l.value}>
                    {lang === 'ar' ? l.ar : l.fr}
                  </option>
                ))}
              </select>

              <select
                aria-label={t('freelance.edit.niveau_select_label', lang)}
                value={row.proficiency}
                onChange={(e) => updateRow(row.id, { proficiency: e.target.value })}
                className={SELECT_FIELD}
              >
                <option value="" disabled>
                  {t('freelance.edit.niveau_select_label', lang)}
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
        {t('freelance.edit.add_language', lang)}
      </button>
    </div>
  )
}
