import type { Metadata } from 'next'
import { getLang } from '@/lib/i18n/server'
import { t } from '@/lib/i18n'
import { CARD_SHADOW } from '@/components/layout/styles'

export const metadata: Metadata = { title: 'Paramètres — Servyou' }

// Stub page so the /marche top bar's Settings gear (and the profile dropdown's
// "Paramètres" item) resolve to a real route instead of a 404. The full settings
// surface returns in a follow-up commit; until then this mirrors the sidebar's
// "Bientôt disponible" treatment of the same item.
export default async function ParametresPage() {
  const lang = await getLang()
  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <div className={`rounded-2xl bg-white p-12 text-center ${CARD_SHADOW}`}>
        <h1 className="text-lg font-semibold text-text-primary">
          {t('marche.sidebar.parametres', lang)}
        </h1>
        <p className="mt-2 text-sm text-text-muted">{t('marche.sidebar.coming_soon', lang)}</p>
      </div>
    </main>
  )
}
