'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'
import { FOCUS_RING } from '@/components/layout/styles'
import { MarketingShell } from '@/components/layout/MarketingShell'

// Route-segment error boundary (500). Composed with the marketing chrome. Kept dependency-
// light so the error render itself can't easily cascade into a worse failure.
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const lang = useLang()

  useEffect(() => {
    console.error('[error boundary]', error)
  }, [error])

  return (
    <MarketingShell lang={lang}>
      <div className="mx-auto max-w-2xl px-6 py-24 text-center">
        <AlertTriangle className="mx-auto h-12 w-12 text-icon-muted" aria-hidden="true" />
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-text-primary">
          {t('system.error.title', lang)}
        </h1>
        <p className="mx-auto mt-3 max-w-md text-base leading-relaxed text-text-muted">
          {t('system.error.subtitle', lang)}
        </p>
        {/* TODO Phase 10: display error reference ID (error.digest) here when monitoring is wired. */}

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => reset()}
            className={`inline-flex h-12 items-center justify-center rounded-full bg-brand-blue-600 px-6 text-sm font-semibold text-white transition-colors hover:bg-brand-blue-800 ${FOCUS_RING}`}
          >
            {t('system.error.retry', lang)}
          </button>
          <Link
            href="/"
            className={`inline-flex h-12 items-center justify-center rounded-full border border-border-subtle bg-white px-6 text-sm font-semibold text-text-primary transition-colors hover:bg-slate-50 ${FOCUS_RING}`}
          >
            {t('system.error.home', lang)}
          </Link>
          <Link
            href="/contact"
            className={`rounded text-sm font-medium text-text-muted hover:underline ${FOCUS_RING}`}
          >
            {t('system.error.contact', lang)}
          </Link>
        </div>
      </div>
    </MarketingShell>
  )
}
