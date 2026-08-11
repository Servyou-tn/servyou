'use client'

import { useRef, useState } from 'react'
import { Camera, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { FOCUS_RING } from '@/components/layout/styles'

// field-banner — Figma 555:37476, 712×200 (docs/design/g2-discovery.md §2b): a CENTRED drop-zone
// (icon → button → caption, all centre-aligned), not a side-by-side row like field-logo. The
// filled state (preview + change/remove) is not in the measured frame — the empty state is the
// only one Figma draws — and is a necessary, low-risk addition once a file is picked, structurally
// closer to ImageUploadGrid's own empty/filled split than to anything invented from nothing.
export function BannerField({
  previewUrl,
  onPick,
  onRemove,
  error,
}: {
  previewUrl: string | null
  onPick: (file: File) => void
  onRemove: () => void
  error?: string | null
}) {
  const lang = useLang()
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const openPicker = () => inputRef.current?.click()

  function handleFiles(files: FileList | null) {
    const file = files?.[0]
    if (file) onPick(file)
  }

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          handleFiles(e.dataTransfer.files)
        }}
        className={cn(
          'relative flex h-50 w-full flex-col items-center justify-center gap-3 overflow-hidden rounded-xl border-2 border-dashed transition-colors',
          dragging ? 'border-brand-blue-600 bg-brand-blue-50' : 'border-border-strong bg-surface-subtle',
        )}
      >
        {previewUrl ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element -- blob: preview, no upload has happened yet */}
            <img src={previewUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0 bg-black/25" aria-hidden="true" />
            <Button type="button" variant="secondary" size="sm" onClick={openPicker} className="relative">
              {t('shop.create.banner_replace', lang)}
            </Button>
            <button
              type="button"
              onClick={onRemove}
              aria-label={t('shop.create.banner_remove', lang)}
              className={`absolute end-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-black/60 text-white transition-colors hover:bg-black/80 ${FOCUS_RING}`}
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </>
        ) : (
          <>
            <Camera className="h-7 w-7 text-text-muted" aria-hidden="true" />
            <Button type="button" variant="secondary" size="sm" onClick={openPicker}>
              {t('shop.create.banner_choose', lang)}
            </Button>
            <p className="px-6 text-center text-sm text-text-muted">{t('shop.create.banner_helper', lang)}</p>
          </>
        )}
      </div>

      <input
        ref={inputRef}
        id="shop-banner-input"
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif"
        aria-label={t('shop.create.banner_choose', lang)}
        className="sr-only"
        onChange={(e) => {
          handleFiles(e.target.files)
          if (inputRef.current) inputRef.current.value = ''
        }}
      />

      {error && (
        <p role="alert" className="mt-2 text-sm text-danger-500">
          {error}
        </p>
      )}
    </div>
  )
}
