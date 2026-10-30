'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { TriangleAlert } from 'lucide-react'
import { useLang } from '@/components/LangProvider'
import { SYSTEM_LINK_CLASS, SystemStateScreen } from '@/components/system/SystemStateScreen'
import { t } from '@/lib/i18n'

// A10 — Figma 1478:35837 (1440) / 1478:35890 (375): the shell-less card with the 2 px danger outline — Lockup → danger icon → « Erreur 500 · réf. … »
// → « Une erreur s’est produite de notre côté » → body → « Réessayer » (primary lg, a button) → « Retour à l’accueil » (link). Route-segment error
// boundary (500); kept dependency-light so the error render itself can't easily cascade into a worse failure.
//
// The reference is the REAL `error.digest` — the id that ties this page to the server log line — shown only when Next provides one.
//
// « Réessayer » calls `retry`, not `reset`: reset() only re-renders the client subtree, so it could never recover from a failed server read (a loader
// that threw); retry() re-fetches and re-renders the segment. Next 16.4 names the stable prop `retry` (it was `unstable_retry` in 16.2) — see
// node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/error.md.
export default function Error({
  error,
  retry,
}: {
  error: Error & { digest?: string }
  retry: () => void
}) {
  const lang = useLang()

  useEffect(() => {
    // The digest ties this to the server log line; never the raw error object.
    console.error('[error boundary]', error.message, error.digest)
  }, [error])

  return (
    <SystemStateScreen
      tone="danger"
      outlined
      icon={<TriangleAlert className="size-16" strokeWidth={1.5} />}
      eyebrow={error.digest ? t('system.error.eyebrow_ref', lang, { ref: error.digest }) : t('system.error.eyebrow', lang)}
      title={t('system.error.title', lang)}
      body={t('system.error.body', lang)}
      cta={{ onClick: () => retry(), label: t('system.error.retry', lang) }}
      link={
        <Link href="/" className={SYSTEM_LINK_CLASS}>
          {t('system.error.home', lang)}
        </Link>
      }
    />
  )
}
