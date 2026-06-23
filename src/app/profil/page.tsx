import type { Metadata } from 'next'
import { getLang } from '@/lib/i18n/server'
import { t } from '@/lib/i18n'
import { CARD_SHADOW } from '@/components/layout/styles'
import { Footer } from '@/components/layout/Footer'
import { PageHeader } from '@/components/shared/PageHeader'

export const metadata: Metadata = { title: 'Mon profil — Servyou' }

// Stub page so the /marche profile dropdown's "Mon profil" item resolves to a real
// route instead of a 404. The full profile surface returns in a follow-up commit. This stub
// doesn't use MarcheLayout, so the shared Footer is dropped in directly (per the dashboard-wide
// footer decision); the navbar/sidebar arrive when the real surface is built.
export default async function ProfilPage() {
  const lang = await getLang()
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 pb-16">
        <PageHeader
          subtitle={t('page_header.profil.subtitle', lang)}
          emphasisWord={t('page_header.profil.emphasis', lang)}
        />
        <div className={`mt-8 rounded-2xl bg-white p-12 text-center ${CARD_SHADOW}`}>
          <h1 className="text-lg font-semibold text-text-primary">{t('nav.profile', lang)}</h1>
          <p className="mt-2 text-sm text-text-muted">{t('marche.sidebar.coming_soon', lang)}</p>
        </div>
      </main>
      <Footer lang={lang} />
    </div>
  )
}
