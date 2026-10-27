import type { Metadata } from 'next'
import { CheckCircle2 } from 'lucide-react'
import { HomeLink, SystemStateScreen } from '@/components/system/SystemStateScreen'
import { getLang } from '@/lib/i18n/server'
import { t } from '@/lib/i18n'

export const metadata: Metadata = { title: 'À bientôt — Servyou', robots: { index: false } }

// K1 — where /auth/signout lands (Figma 731:64370 / 734:64501). Shell-less and anonymous: the session
// is already gone, so it is excluded from the middleware matcher like the other signed-out pages.
export default async function ABientotPage() {
  const lang = await getLang()
  return (
    <SystemStateScreen
      tone="info"
      icon={<CheckCircle2 className="size-16" strokeWidth={1.5} />}
      title={t('system.goodbye.title', lang)}
      body={t('system.goodbye.body', lang)}
      cta={{ href: '/connexion', label: t('system.goodbye.cta', lang) }}
      link={<HomeLink lang={lang} />}
    />
  )
}
