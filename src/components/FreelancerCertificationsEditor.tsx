'use client'

import type { CertificationRow } from '@/lib/types/freelancer-config'

type Props = {
  certifications: CertificationRow[]
  setCertifications: (rows: CertificationRow[]) => void
  t: (key: string) => string
}

function parseYear(v: string): number | null {
  const n = parseInt(v, 10)
  return v.trim() === '' || Number.isNaN(n) ? null : n
}

const labelCls = 'block text-xs font-medium text-gray-600 mb-1'
const inputCls = 'w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

export function FreelancerCertificationsEditor({ certifications, setCertifications, t }: Props) {
  function addRow() {
    setCertifications([...certifications, { name: '', issuing_org: '', year_obtained: null, credential_url: '' }])
  }
  function removeAt(idx: number) {
    setCertifications(certifications.filter((_, i) => i !== idx))
  }
  function update(idx: number, patch: Partial<CertificationRow>) {
    setCertifications(certifications.map((row, i) => (i === idx ? { ...row, ...patch } : row)))
  }

  return (
    <div className="space-y-3 border-t border-gray-100 pt-5">
      <div>
        <p className="text-sm font-medium text-gray-700">{t('freelance.section_certifications')}</p>
        <p className="text-xs text-gray-400 mt-0.5">{t('freelance.hint_certifications')}</p>
      </div>

      {certifications.map((row, idx) => {
        const showError =
          !row.name.trim() &&
          Boolean(row.issuing_org.trim() || row.year_obtained !== null || row.credential_url.trim())
        return (
          <div key={row.id || `new-${idx}`} className="relative rounded-md border border-gray-200 bg-gray-50 p-4 space-y-3">
            <button type="button" onClick={() => removeAt(idx)}
              className="absolute top-2 right-3 text-xs text-red-500 hover:text-red-700">
              {t('common.delete')}
            </button>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className={labelCls}>{t('freelance.field_certification_name')} <span className="text-red-500">*</span></label>
                <input type="text" value={row.name} onChange={e => update(idx, { name: e.target.value })} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>{t('freelance.field_issuing_org')}</label>
                <input type="text" value={row.issuing_org} onChange={e => update(idx, { issuing_org: e.target.value })} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>{t('freelance.field_year_obtained')}</label>
                <input type="number" min="1950" max="2100" step="1" value={row.year_obtained ?? ''}
                  onChange={e => update(idx, { year_obtained: parseYear(e.target.value) })} className={inputCls} />
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls}>{t('freelance.field_credential_url')}</label>
                <input type="url" value={row.credential_url} onChange={e => update(idx, { credential_url: e.target.value })}
                  placeholder={t('freelance.hint_credential_url')} className={inputCls} />
              </div>
            </div>
            {showError && <p className="text-xs text-red-600">{t('freelance.error_certification_name_required')}</p>}
          </div>
        )
      })}

      <button type="button" onClick={addRow}
        className="text-sm font-medium text-blue-600 hover:text-blue-700">
        {t('freelance.action_add_certification')}
      </button>
    </div>
  )
}
