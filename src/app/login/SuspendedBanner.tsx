'use client'

import { useSearchParams } from 'next/navigation'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'

// Renders a generic banner when the user was bounced here by middleware.ts after
// being suspended (/login?suspended=1). Deliberately generic — the specific
// suspended_reason is the admin's internal note and is never shown to the user.
// Extracted into its own component so the useSearchParams() call sits behind a
// <Suspense> boundary (required, else next build fails on the login page).
export function SuspendedBanner() {
  const params = useSearchParams()
  const lang = useLang()
  if (params.get('suspended') !== '1') return null
  return (
    <div className="mb-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
      {t('auth.suspended_banner', lang)}
    </div>
  )
}
