'use client'

import * as React from 'react'
import Image from 'next/image'
import { X, ImageIcon, Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { FOCUS_RING } from '@/components/layout/styles'
import { cn } from '@/lib/utils'
import { t, type Lang } from '@/lib/i18n'
import { MAX_INPUT_BYTES, MAX_INPUT_MB } from '@/lib/images/limits'
import { PORTFOLIO_CAP } from '@/lib/marche/freelancer-profile-edit'
import { uploadPortfolioImageAction } from '../actions'

// "Portfolio" repeater — 413:15949 (canonical "Portfolio rempli" specimen, registry-confirmed),
// cap 6. THREE fields per row, not two: [thumb 120x120][Input title-shaped][Input url-shaped]
// [Textarea description]. The two short Inputs and the description Textarea never got real
// captions in the file (unedited "label" placeholders on all three) — labels are founder-ruled
// from content shape, not measured. Row can't be added without an image: image_url is NOT NULL
// (freelancer_portfolio_items) because a row only reaches the DB after its image clears the
// provenance gate (trg_enforce_portfolio_image_provenance) — so "Ajouter un projet" here uploads
// first, then reveals the row's text fields, rather than adding a blank row up front.
export type PortfolioRow = { id: string; imageUrl: string; title: string; url: string; description: string }

export function PortfolioRepeater({ rows, onChange, lang }: { rows: PortfolioRow[]; onChange: (next: PortfolioRow[]) => void; lang: Lang }) {
  const [uploading, setUploading] = React.useState(false)
  const [uploadError, setUploadError] = React.useState<string | null>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)

  function removeRow(id: string) {
    onChange(rows.filter((r) => r.id !== id))
  }
  function updateRow(id: string, patch: Partial<Omit<PortfolioRow, 'id' | 'imageUrl'>>) {
    onChange(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  }

  async function pickImage(file: File) {
    setUploadError(null)
    if (file.size > MAX_INPUT_BYTES) {
      setUploadError(t('product.image.error.tooLarge', lang, { max: MAX_INPUT_MB }))
      if (inputRef.current) inputRef.current.value = ''
      return
    }
    setUploading(true)
    const formData = new FormData()
    formData.append('image', file)
    const result = await uploadPortfolioImageAction(formData)
    setUploading(false)
    if (inputRef.current) inputRef.current.value = ''
    if (!result.ok) {
      setUploadError(result.error)
      return
    }
    onChange([...rows, { id: crypto.randomUUID(), imageUrl: result.url, title: '', url: '', description: '' }])
  }

  return (
    <div className="flex flex-col gap-4">
      {rows.map((row, i) => (
        <div key={row.id} className="flex flex-col gap-3 rounded-lg border border-border-subtle p-4 sm:flex-row">
          <div className="relative h-[120px] w-[120px] shrink-0 overflow-hidden rounded-lg bg-surface-sunken">
            <Image src={row.imageUrl} alt="" fill sizes="120px" className="object-cover" />
          </div>
          <div className="flex flex-1 flex-col gap-3">
            <div className="flex items-start justify-between gap-2">
              <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2">
                <Input
                  aria-label={t('freelance.edit.portfolio_title_field', lang)}
                  placeholder={t('freelance.edit.portfolio_title_field', lang)}
                  maxLength={200}
                  value={row.title}
                  onChange={(e) => updateRow(row.id, { title: e.target.value })}
                />
                <Input
                  dir="ltr"
                  aria-label={t('freelance.edit.portfolio_url_field', lang)}
                  placeholder={t('freelance.edit.portfolio_url_field', lang)}
                  maxLength={500}
                  value={row.url}
                  onChange={(e) => updateRow(row.id, { url: e.target.value })}
                />
              </div>
              <button
                type="button"
                onClick={() => removeRow(row.id)}
                aria-label={t('freelance.edit.remove_portfolio_item', lang, { index: String(i + 1) })}
                className={cn(
                  'flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-surface-subtle hover:text-danger-500',
                  FOCUS_RING,
                )}
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <Textarea
              aria-label={t('freelance.edit.portfolio_description_field', lang)}
              placeholder={t('freelance.edit.portfolio_description_field', lang)}
              maxLength={2000}
              value={row.description}
              onChange={(e) => updateRow(row.id, { description: e.target.value })}
            />
          </div>
        </div>
      ))}

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={rows.length >= PORTFOLIO_CAP || uploading}
          className={cn(
            'flex items-center gap-2 self-start rounded text-sm font-medium text-brand-blue-600 hover:underline disabled:cursor-not-allowed disabled:text-text-muted disabled:no-underline',
            FOCUS_RING,
          )}
        >
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <ImageIcon className="h-4 w-4" aria-hidden="true" />}
          {t('freelance.edit.add_portfolio_item', lang)}
        </button>
        <span className="text-sm tabular-nums text-text-muted">{rows.length}/{PORTFOLIO_CAP}</span>
      </div>
      <p className="text-sm text-text-muted">{t('freelance.edit.portfolio_helper', lang)}</p>
      {uploadError ? (
        <p role="alert" className="text-sm text-danger-500">
          {uploadError}
        </p>
      ) : null}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif"
        aria-label={t('freelance.edit.add_portfolio_item', lang)}
        className={`sr-only ${FOCUS_RING}`}
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) void pickImage(file)
        }}
      />
    </div>
  )
}
