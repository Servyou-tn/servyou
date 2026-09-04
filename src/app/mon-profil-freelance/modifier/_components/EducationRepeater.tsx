'use client'

import * as React from 'react'
import { X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { FOCUS_RING } from '@/components/layout/styles'
import { cn } from '@/lib/utils'
import { t, type Lang } from '@/lib/i18n'
import { EDUCATION_CAP } from '@/lib/marche/freelancer-profile-edit'

// "Formation" repeater — 406:13799, cap 5. ONE text field between institution and the year
// range, not two (H2's own EducationRepeater, creer/details/_components/EducationRepeater.tsx,
// draws degree AND field separately — that shape does not match this measured row). Founder
// ruling: build the one input the frame draws, mapped to `degree`; freelancer_education.field
// stays unused by this form.
export type EducationRow = { id: string; institution: string; degree: string; yearStart: string; yearEnd: string }

export function EducationRepeater({ rows, onChange, lang }: { rows: EducationRow[]; onChange: (next: EducationRow[]) => void; lang: Lang }) {
  function addRow() {
    if (rows.length >= EDUCATION_CAP) return
    onChange([...rows, { id: crypto.randomUUID(), institution: '', degree: '', yearStart: '', yearEnd: '' }])
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
              {t('freelance.edit.education_entry', lang, { index: String(i + 1) })}
            </span>
            <button
              type="button"
              onClick={() => removeRow(row.id)}
              aria-label={t('freelance.edit.remove_education', lang, { index: String(i + 1) })}
              className={cn(
                'flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-surface-subtle hover:text-danger-500',
                FOCUS_RING,
              )}
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <Input
            label={t('freelance.edit.institution_label', lang)}
            required
            placeholder={t('freelance.edit.institution_ph', lang)}
            value={row.institution}
            onChange={(e) => updateRow(row.id, { institution: e.target.value })}
          />
          <Input
            label={t('freelance.edit.degree_label', lang)}
            placeholder={t('freelance.edit.degree_ph', lang)}
            value={row.degree}
            onChange={(e) => updateRow(row.id, { degree: e.target.value })}
          />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input
              type="number"
              dir="ltr"
              label={t('freelance.edit.year_start_label', lang)}
              value={row.yearStart}
              onChange={(e) => updateRow(row.id, { yearStart: e.target.value })}
            />
            <Input
              type="number"
              dir="ltr"
              label={t('freelance.edit.year_end_label', lang)}
              value={row.yearEnd}
              onChange={(e) => updateRow(row.id, { yearEnd: e.target.value })}
            />
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={addRow}
        disabled={rows.length >= EDUCATION_CAP}
        className={cn(
          'self-start rounded text-sm font-medium text-brand-blue-600 hover:underline disabled:cursor-not-allowed disabled:text-text-muted disabled:no-underline',
          FOCUS_RING,
        )}
      >
        {t('freelance.edit.add_education', lang)}
      </button>
    </div>
  )
}
