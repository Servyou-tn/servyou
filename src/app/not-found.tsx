import { SearchX } from 'lucide-react'
import { SystemStateScreen } from '@/components/system/SystemStateScreen'
import { getLang } from '@/lib/i18n/server'
import { t } from '@/lib/i18n'
import { ButtonLink } from '@/components/ui/button'

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
        <ButtonLink href="/marche" variant="link" size="md">
          {t('system.notFound.marche', lang)}
        </ButtonLink>
      }
    />
  )
}
