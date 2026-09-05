'use client'

import * as React from 'react'
import { X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { FOCUS_RING } from '@/components/layout/styles'
import { cn } from '@/lib/utils'
import { t, type Lang } from '@/lib/i18n'
import { LINKS_CAP } from '@/lib/marche/freelancer-profile-edit'

// "Liens externes" repeater — 404:12327, cap 3 (measured, counter shows "3/3" at cap). Two
// free-text inputs per row, no type/platform selector — the frame never named these two fields
// (unedited component placeholders); labels are founder-ruled from content shape, not measured.
export type LinkRow = { id: string; label: string; url: string }

export function LinksRepeater({ rows, onChange, lang }: { rows: LinkRow[]; onChange: (next: LinkRow[]) => void; lang: Lang }) {
  function addRow() {
    if (rows.length >= LINKS_CAP) return
    onChange([...rows, { id: crypto.randomUUID(), label: '', url: '' }])
  }
  function removeRow(id: string) {
    onChange(rows.filter((r) => r.id !== id))
  }
  function updateRow(id: string, patch: Partial<Omit<LinkRow, 'id'>>) {
    onChange(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-text-muted">{t('freelance.edit.links_helper', lang)}</p>

      {rows.map((row, i) => (
        <div key={row.id} className="flex flex-col gap-2 sm:flex-row sm:items-start">
          <div className="grid flex-1 grid-cols-1 gap-2 sm:grid-cols-2">
            <Input
              aria-label={t('freelance.edit.link_label_field', lang)}
              placeholder={t('freelance.edit.link_label_field', lang)}
              value={row.label}
              onChange={(e) => updateRow(row.id, { label: e.target.value })}
            />
            <Input
              dir="ltr"
              aria-label={t('freelance.edit.link_url_field', lang)}
              placeholder={t('freelance.edit.link_url_field', lang)}
              value={row.url}
              onChange={(e) => updateRow(row.id, { url: e.target.value })}
            />
          </div>
          <button
            type="button"
            onClick={() => removeRow(row.id)}
            aria-label={t('freelance.edit.remove_link', lang, { index: String(i + 1) })}
            className={cn(
              'flex h-11 w-11 shrink-0 items-center justify-center self-center rounded-lg text-text-muted transition-colors hover:bg-surface-subtle hover:text-danger-500',
              FOCUS_RING,
            )}
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      ))}

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={addRow}
          disabled={rows.length >= LINKS_CAP}
          className={cn(
            'self-start rounded text-sm font-medium text-brand-blue-600 hover:underline disabled:cursor-not-allowed disabled:text-text-muted disabled:no-underline',
            FOCUS_RING,
          )}
        >
          {t('freelance.edit.add_link', lang)}
        </button>
        <span className="text-sm tabular-nums text-text-muted">{rows.length}/{LINKS_CAP}</span>
      </div>
    </div>
  )
}
