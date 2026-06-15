import type { Metadata } from 'next'
import { getLang } from '@/lib/i18n/server'
import { t } from '@/lib/i18n'
import { CARD_SHADOW } from '@/components/layout/styles'

export const metadata: Metadata = { title: 'Mon profil — Servyou' }

// Stub page so the /marche profile dropdown's "Mon profil" item resolves to a real
// route instead of a 404. The full profile surface returns in a follow-up commit.
export default async function ProfilPage() {
  const lang = await getLang()
  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <div className={`rounded-2xl bg-white p-12 text-center ${CARD_SHADOW}`}>
        <h1 className="text-lg font-semibold text-text-primary">{t('nav.profile', lang)}</h1>
        <p className="mt-2 text-sm text-text-muted">{t('marche.sidebar.coming_soon', lang)}</p>
      </div>
    </main>
  )
}
