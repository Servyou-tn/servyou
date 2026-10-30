'use client'

import { useEffect } from 'react'
import { TriangleAlert } from 'lucide-react'
import { BASE, SIZE, VARIANT_BASE, VARIANT_STATE } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { t } from '@/lib/i18n'
import './globals.css'

// A10 for the case the root layout itself crashes — Figma 1478:35837, docs/design/system-pages-cookie-deltas.md D4. This file REPLACES the root
// layout when it renders, so it depends on nothing the layout provides: its own <html><body>, its own stylesheet import, no LangProvider / MarketingShell /
// next/image / router context / data fetching. Plain `<a href>` (a full page load is exactly what we want here), the wordmark as text, French only
// (the language cookie is a layout concern), strings read straight from the pure dictionary. « Réessayer » = `retry` (Next 16.4), as in error.tsx.
export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string }
  retry: () => void
}) {
  useEffect(() => {
    // The digest ties this to the server log line; never the raw error object.
    console.error('[global error boundary]', error.message, error.digest)
  }, [error])

  return (
    <html lang="fr" dir="ltr">
      <body>
        <main id="main-content" className="flex min-h-screen items-center justify-center bg-surface-subtle px-4 py-10">
          <div className="flex w-full max-w-120 flex-col items-center gap-6 rounded-xl border-2 border-danger-500 bg-surface-base p-8">
            <span className="text-xl font-bold">
              <span className="text-brand-blue-800">Serv</span>
              <span className="text-brand-blue-600">You</span>
            </span>

            <div className="flex size-28 items-center justify-center rounded-full bg-danger-100 text-danger-500" aria-hidden="true">
              <TriangleAlert className="size-16" strokeWidth={1.5} />
            </div>

            <p className="text-center text-[15px] leading-[22px] text-text-muted">
              {error.digest ? t('system.error.eyebrow_ref', 'fr', { ref: error.digest }) : t('system.error.eyebrow', 'fr')}
            </p>
            <h1 className="text-center text-[22px] leading-[27px] font-semibold text-text-primary">{t('system.error.title', 'fr')}</h1>
            <p className="text-center text-[15px] leading-[22px] text-text-muted">{t('system.error.body', 'fr')}</p>

            <button
              type="button"
              onClick={() => retry()}
              className={cn(BASE, SIZE.lg, VARIANT_BASE.primary, VARIANT_STATE.primary, 'w-full cursor-pointer')}
            >
              {t('system.error.retry', 'fr')}
            </button>
            {/* A plain anchor ON PURPOSE: the router (and the layout above it) is what just crashed — a full page load is the way out. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/" className={cn(BASE, SIZE.md, VARIANT_BASE.link, VARIANT_STATE.link)}>
              {t('system.error.home', 'fr')}
            </a>
          </div>
        </main>
      </body>
    </html>
  )
}
