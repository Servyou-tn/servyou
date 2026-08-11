'use client'

import { useRef } from 'react'
import { Camera } from 'lucide-react'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'
import { FOCUS_RING } from '@/components/layout/styles'

// field-logo — Figma 555:37453, 712×100 (docs/design/g2-discovery.md §2a). Two upload affordances,
// both measured, not one applied twice: the avatar-ring's own camera badge, and a separate
// secondary Button beside the helper text.
//
// ⚑ avatar-ring is 128×128 against the field's own 100px height — it overflows by 14px, measured,
// not an artifact. This build doesn't fight it: the ring sizes to its content (h-30/w-30, matching
// ui/avatar.tsx's own `2xl`) inside a plain flex row with no fixed field height and no
// overflow-hidden anywhere in the chain, so the same proportion falls out naturally instead of
// being clipped to fit.
export function LogoField({
  previewUrl,
  onPick,
  error,
}: {
  previewUrl: string | null
  onPick: (file: File) => void
  error?: string | null
}) {
  const lang = useLang()
  const inputRef = useRef<HTMLInputElement>(null)
  const openPicker = () => inputRef.current?.click()

  return (
    <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
      <div className="relative h-30 w-30 shrink-0">
        {previewUrl ? (
          <div className="h-full w-full overflow-hidden rounded-full">
            {/* eslint-disable-next-line @next/next/no-img-element -- blob: preview, no upload has happened yet */}
            <img src={previewUrl} alt="" className="h-full w-full object-cover" />
          </div>
        ) : (
          <Avatar size="2xl" decorative className="h-full w-full" />
        )}
        <button
          type="button"
          onClick={openPicker}
          aria-label={t(previewUrl ? 'shop.create.logo_replace' : 'shop.create.logo_choose', lang)}
          className={`absolute bottom-0 end-0 grid h-8 w-8 place-items-center rounded-full border-2 border-surface-base bg-brand-blue-600 text-white transition-colors hover:bg-brand-blue-700 ${FOCUS_RING}`}
        >
          <Camera className="h-4 w-4" aria-hidden="true" />
        </button>
        <input
          ref={inputRef}
          id="shop-logo-input"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          aria-label={t('shop.create.logo_choose', lang)}
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) onPick(file)
            if (inputRef.current) inputRef.current.value = ''
          }}
        />
      </div>

      <div className="flex flex-col items-start gap-2">
        <Button type="button" variant="secondary" size="sm" onClick={openPicker}>
          {t(previewUrl ? 'shop.create.logo_replace' : 'shop.create.logo_choose', lang)}
        </Button>
        <p className="text-sm text-text-muted">{t('shop.create.logo_helper', lang)}</p>
        {error && (
          <p role="alert" className="text-sm text-danger-500">
            {error}
          </p>
        )}
      </div>
    </div>
  )
}
