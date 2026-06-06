'use client'

import type { EducationRow } from '@/lib/types/freelancer-config'

type Props = {
  education: EducationRow[]
  setEducation: (rows: EducationRow[]) => void
  t: (key: string) => string
}

function parseYear(v: string): number | null {
  const n = parseInt(v, 10)
  return v.trim() === '' || Number.isNaN(n) ? null : n
}

const labelCls = 'block text-xs font-medium text-gray-600 mb-1'
const inputCls = 'w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

export function FreelancerEducationEditor({ education, setEducation, t }: Props) {
  function addRow() {
    setEducation([...education, { institution: '', degree: '', field: '', year_start: null, year_end: null }])
  }
  function removeAt(idx: number) {
    setEducation(education.filter((_, i) => i !== idx))
  }
  function update(idx: number, patch: Partial<EducationRow>) {
    setEducation(education.map((row, i) => (i === idx ? { ...row, ...patch } : row)))
  }

  return (
    <div className="space-y-3 border-t border-gray-100 pt-5">
      <div>
        <p className="text-sm font-medium text-gray-700">{t('freelance.section_education')}</p>
        <p className="text-xs text-gray-400 mt-0.5">{t('freelance.hint_education')}</p>
      </div>

      {education.map((row, idx) => {
        const showError =
          !row.institution.trim() &&
          Boolean(row.degree.trim() || row.field.trim() || row.year_start !== null || row.year_end !== null)
        return (
          <div key={row.id || `new-${idx}`} className="relative rounded-md border border-gray-200 bg-gray-50 p-4 space-y-3">
            <button type="button" onClick={() => removeAt(idx)}
              className="absolute top-2 right-3 text-xs text-red-500 hover:text-red-700">
              {t('common.delete')}
            </button>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className={labelCls}>{t('freelance.field_institution')} <span className="text-red-500">*</span></label>
                <input type="text" value={row.institution} onChange={e => update(idx, { institution: e.target.value })} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>{t('freelance.field_degree')}</label>
                <input type="text" value={row.degree} onChange={e => update(idx, { degree: e.target.value })} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>{t('freelance.field_field_of_study')}</label>
                <input type="text" value={row.field} onChange={e => update(idx, { field: e.target.value })} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>{t('freelance.field_year_start')}</label>
                <input type="number" min="1950" max="2100" step="1" value={row.year_start ?? ''}
                  onChange={e => update(idx, { year_start: parseYear(e.target.value) })} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>{t('freelance.field_year_end')}</label>
                <input type="number" min="1950" max="2100" step="1" value={row.year_end ?? ''}
                  onChange={e => update(idx, { year_end: parseYear(e.target.value) })} className={inputCls} />
                <p className="text-xs text-gray-400 mt-1">{t('freelance.hint_year_end_ongoing')}</p>
              </div>
            </div>
            {showError && <p className="text-xs text-red-600">{t('freelance.error_institution_required')}</p>}
          </div>
        )
      })}

      <button type="button" onClick={addRow}
        className="text-sm font-medium text-blue-600 hover:text-blue-700">
        {t('freelance.action_add_education')}
      </button>
    </div>
  )
}
