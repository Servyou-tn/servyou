'use client'

import Link from 'next/link'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'
import { Button } from '@/components/ui/button'
import { FOCUS_RING } from '@/components/layout/styles'
import { cn } from '@/lib/utils'

// A7 banner — Figma 1478:35919 (card 720) / 1488:69171 (343), docs/design/system-pages-cookie-measurements.md. A CARD pinned to the bottom of the
// page, NOT an overlay: no scrim, no focus trap, no autofocus — the page behind it stays fully usable (the frame's blue/950 is the artboard).
// Header pad 24/24/16 · body 15/22 muted · footer `surface/subtle`, end-aligned, gap 12. At 343 the three buttons wrap onto two rows.
//
// « Refuser tout » and « Accepter tout » are IDENTICAL (same variant, same size) — equal weight, neither one nudged (decision D6; the frame
// fills « Accepter tout »). « Personnaliser » is the ghost button beside them.
// Plain class strings next to text-size tokens (twMerge footgun): sizes here are literal px, colours are separate elements.
export function CookieBanner({
  onAcceptAll,
  onRefuseAll,
  onCustomize,
}: {
  onAcceptAll: () => void
  onRefuseAll: () => void
  onCustomize: () => void
}) {
  const lang = useLang()
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-4 pb-4">
      <section
        aria-labelledby="cookie-banner-title"
        className="pointer-events-auto mx-auto w-full max-w-180 overflow-hidden rounded-2xl border border-border-subtle bg-surface-base shadow-lg"
      >
        <h2 id="cookie-banner-title" className="px-4 pb-4 pt-6 text-h3 text-text-primary sm:px-6">
          {t('cookies.banner.title', lang)}
        </h2>
        <p className="px-4 pb-6 text-[15px] leading-[22px] text-text-muted sm:px-6">
          {t('cookies.banner.body', lang)}{' '}
          <Link href="/cookies" className={cn('rounded font-medium text-brand-blue-600 underline-offset-2 hover:underline', FOCUS_RING)}>
            {t('cookies.banner.policy', lang)}
          </Link>
          .
        </p>
        <div className="flex flex-wrap items-center justify-end gap-3 bg-surface-subtle px-4 pb-6 pt-4 sm:px-6">
          <Button variant="ghost" onClick={onCustomize}>
            {t('cookies.action.customize', lang)}
          </Button>
          <Button variant="secondary" onClick={onRefuseAll}>
            {t('cookies.action.refuse_all', lang)}
          </Button>
          <Button variant="secondary" onClick={onAcceptAll}>
            {t('cookies.action.accept_all', lang)}
          </Button>
        </div>
      </section>
    </div>
  )
}
