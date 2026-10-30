import Link from 'next/link'
import { SearchX } from 'lucide-react'
import { SYSTEM_LINK_CLASS, SystemStateScreen } from '@/components/system/SystemStateScreen'
import { getLang } from '@/lib/i18n/server'
import { t } from '@/lib/i18n'

// A9 — Figma 1478:35813 (1440) / 1478:35859 (375): the K1–K4 shell-less card — Lockup → warning icon → « Erreur 404 » → « Page introuvable » → body →
// « Retour à l’accueil » (primary lg) → « Parcourir la marketplace » (link). Replaces the MarketingShell page (docs/design/system-pages-cookie-deltas.md D1).
export default async function NotFound() {
  const lang = await getLang()
  return (
    <SystemStateScreen
      tone="warning"
      icon={<SearchX className="size-16" strokeWidth={1.5} />}
      eyebrow={t('system.notFound.eyebrow', lang)}
      title={t('system.notFound.title', lang)}
      body={t('system.notFound.body', lang)}
      cta={{ href: '/', label: t('system.notFound.home', lang) }}
      link={
        <Link href="/marche" className={SYSTEM_LINK_CLASS}>
          {t('system.notFound.marche', lang)}
        </Link>
      }
    />
  )
}
