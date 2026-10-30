'use client'

import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'
import { FOCUS_RING } from '@/components/layout/styles'
import { useConsent } from './CookieConsent'

// « Gérer les cookies » — the footer entry that reopens the settings modal: withdrawing consent must be as easy as giving it. A <button>, not a
// link: it opens a dialog, it does not navigate. Styled as the footer's own links.
export function ManageCookiesButton() {
  const lang = useLang()
  const { openSettings } = useConsent()
  return (
    <button
      type="button"
      onClick={openSettings}
      className={`cursor-pointer rounded text-start text-sm text-slate-300 transition-colors hover:text-white ${FOCUS_RING}`}
    >
      {t('cookies.action.manage', lang)}
    </button>
  )
}
