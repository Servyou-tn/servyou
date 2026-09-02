'use client'

import * as React from 'react'
import { X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { FOCUS_RING } from '@/components/layout/styles'
import { cn } from '@/lib/utils'
import { t, type Lang } from '@/lib/i18n'

// "Formation" repeater — field shapes are a founder ruling (not measured, see actions.ts's header
// comment), targeting freelancer_education. Cap 5. Mirrors LanguageRepeater's row-management
// shape (client id per row, addRow/removeRow/updateRow) — the field layout itself is bespoke
// (5 text/number fields per row vs. two selects), so this is not a generic extraction of that
// component, matching this codebase's "no premature abstraction" posture (reconcile.ts vs.
// diff-languages.ts already declined to unify on a shared shape for a similar reason).
//
// year_start/year_end are plain number Inputs (founder ruling: not the NumberStepper step 2
// uses for years_experience) — kept as string state until submit, matching a controlled
// <input type="number">'s own value contract; parsed to number|null at the form's submit
// boundary, not here.

export type EducationRow = {
  id: string
  institution: string
  degree: string
  field: string
  yearStart: string
  yearEnd: string
}

const CAP = 5

export function EducationRepeater({
  rows,
  onChange,
  lang,
}: {
  rows: EducationRow[]
  onChange: (next: EducationRow[]) => void
  lang: Lang
}) {
  function addRow() {
    if (rows.length >= CAP) return
    onChange([...rows, { id: crypto.randomUUID(), institution: '', degree: '', field: '', yearStart: '', yearEnd: '' }])
  }

  function removeRow(id: string) {
    onChange(rows.filter((r) => r.id !== id))
  }

  function updateRow(id: string, patch: Partial<Omit<EducationRow, 'id'>>) {
    onChange(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  }

  return (
    <div className="flex flex-col gap-4">
      {rows.map((row, i) => (
        <div key={row.id} className="flex flex-col gap-3 rounded-lg border border-border-subtle p-4">
          <div className="flex items-start justify-between gap-2">
            <span className="pt-3 text-sm font-medium text-text-secondary">
              {t('freelance.create.step3.education_entry', lang, { index: String(i + 1) })}
            </span>
            <button
              type="button"
              onClick={() => removeRow(row.id)}
              aria-label={t('freelance.create.step3.remove_education', lang, { index: String(i + 1) })}
              className={cn(
                'flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-surface-subtle hover:text-danger-500',
                FOCUS_RING,
              )}
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <Input
            label={t('freelance.create.step3.institution_label', lang)}
            required
            placeholder={t('freelance.create.step3.institution_ph', lang)}
            value={row.institution}
            onChange={(e) => updateRow(row.id, { institution: e.target.value })}
          />

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input
              label={t('freelance.create.step3.degree_label', lang)}
              placeholder={t('freelance.create.step3.degree_ph', lang)}
              value={row.degree}
              onChange={(e) => updateRow(row.id, { degree: e.target.value })}
            />
            <Input
              label={t('freelance.create.step3.field_label', lang)}
              placeholder={t('freelance.create.step3.field_ph', lang)}
              value={row.field}
              onChange={(e) => updateRow(row.id, { field: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input
              type="number"
              dir="ltr"
              label={t('freelance.create.step3.year_start_label', lang)}
              value={row.yearStart}
              onChange={(e) => updateRow(row.id, { yearStart: e.target.value })}
            />
            <Input
              type="number"
              dir="ltr"
              label={t('freelance.create.step3.year_end_label', lang)}
              helper={t('freelance.create.step3.year_end_helper', lang)}
              value={row.yearEnd}
              onChange={(e) => updateRow(row.id, { yearEnd: e.target.value })}
            />
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={addRow}
        disabled={rows.length >= CAP}
        className={cn(
          'self-start rounded text-sm font-medium text-brand-blue-600 hover:underline disabled:cursor-not-allowed disabled:text-text-muted disabled:no-underline',
          FOCUS_RING,
        )}
      >
        {t('freelance.create.step3.add_education', lang)}
      </button>
    </div>
  )
}
