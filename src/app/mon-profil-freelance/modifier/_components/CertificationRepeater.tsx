'use client'

import * as React from 'react'
import { X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { FOCUS_RING } from '@/components/layout/styles'
import { cn } from '@/lib/utils'
import { t, type Lang } from '@/lib/i18n'
import { CERTIFICATIONS_CAP } from '@/lib/marche/freelancer-profile-edit'

// "Certifications" repeater — same field shape as freelancer_certifications' own four columns
// (name, issuing_org, year_obtained, credential_url) — matches the measured row exactly (name /
// org+year / credential URL). Duplicated from creer/details/_components/CertificationRepeater.tsx
// (route-local per "promote at the third consumer"; H3 is the second) — same shape, H3's own caps
// and i18n keys.
export type CertificationRow = { id: string; name: string; issuingOrg: string; yearObtained: string; credentialUrl: string }

export function CertificationRepeater({
  rows,
  onChange,
  lang,
  error,
}: {
  rows: CertificationRow[]
  onChange: (next: CertificationRow[]) => void
  lang: Lang
  error?: Record<string, string>
}) {
  function addRow() {
    if (rows.length >= CERTIFICATIONS_CAP) return
    onChange([...rows, { id: crypto.randomUUID(), name: '', issuingOrg: '', yearObtained: '', credentialUrl: '' }])
  }
  function removeRow(id: string) {
    onChange(rows.filter((r) => r.id !== id))
  }
  function updateRow(id: string, patch: Partial<Omit<CertificationRow, 'id'>>) {
    onChange(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  }

  return (
    <div className="flex flex-col gap-4">
      {rows.map((row, i) => (
        <div key={row.id} className="flex flex-col gap-3 rounded-lg border border-border-subtle p-4">
          <div className="flex items-start justify-between gap-2">
            <span className="pt-3 text-sm font-medium text-text-secondary">
              {t('freelance.edit.certification_entry', lang, { index: String(i + 1) })}
            </span>
            <button
              type="button"
              onClick={() => removeRow(row.id)}
              aria-label={t('freelance.edit.remove_certification', lang, { index: String(i + 1) })}
              className={cn(
                'flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-surface-subtle hover:text-danger-500',
                FOCUS_RING,
              )}
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <Input
            label={t('freelance.edit.cert_name_label', lang)}
            required
            placeholder={t('freelance.edit.cert_name_ph', lang)}
            value={row.name}
            onChange={(e) => updateRow(row.id, { name: e.target.value })}
          />

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input
              label={t('freelance.edit.issuing_org_label', lang)}
              placeholder={t('freelance.edit.issuing_org_ph', lang)}
              value={row.issuingOrg}
              onChange={(e) => updateRow(row.id, { issuingOrg: e.target.value })}
            />
            <Input
              type="number"
              dir="ltr"
              label={t('freelance.edit.year_obtained_label', lang)}
              value={row.yearObtained}
              onChange={(e) => updateRow(row.id, { yearObtained: e.target.value })}
            />
          </div>

          <Input
            dir="ltr"
            label={t('freelance.edit.credential_url_label', lang)}
            placeholder={t('freelance.edit.credential_url_ph', lang)}
            value={row.credentialUrl}
            onChange={(e) => updateRow(row.id, { credentialUrl: e.target.value })}
            error={error?.[row.id]}
          />
        </div>
      ))}

      <button
        type="button"
        onClick={addRow}
        disabled={rows.length >= CERTIFICATIONS_CAP}
        className={cn(
          'self-start rounded text-sm font-medium text-brand-blue-600 hover:underline disabled:cursor-not-allowed disabled:text-text-muted disabled:no-underline',
          FOCUS_RING,
        )}
      >
        {t('freelance.edit.add_certification', lang)}
      </button>
    </div>
  )
}
