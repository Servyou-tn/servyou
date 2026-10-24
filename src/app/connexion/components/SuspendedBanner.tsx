'use client'

import { useSearchParams } from 'next/navigation'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'

// Shown when middleware bounces a suspended user here (/connexion?suspended=1), or
// when SigninForm's sign-in comes back user_banned (`show` — the auth ban that
// mirrors a suspension). Deliberately generic — the specific suspended_reason is the
// admin's internal note and is never shown to the user (privacy/dignity). A light
// contained alert reads clearly inside the navy box. The useSearchParams() call sits
// behind a <Suspense> in SigninForm (required so `next build` doesn't de-opt the route).
export function SuspendedBanner({ show = false }: { show?: boolean }) {
  const params = useSearchParams()
  const lang = useLang()
  if (!show && params.get('suspended') !== '1') return null
  return (
    <div role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
      <p className="font-semibold">{t('signin.suspended.title', lang)}</p>
      <p className="mt-1 text-red-700">{t('signin.suspended.message', lang)}</p>
      <p className="mt-1 text-red-700">{t('signin.suspended.contact', lang)}</p>
    </div>
  )
}
