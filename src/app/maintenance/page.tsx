import type { Metadata } from 'next'
import { Settings } from 'lucide-react'
import { SystemStateScreen } from '@/components/system/SystemStateScreen'
import { getLang } from '@/lib/i18n/server'
import { t } from '@/lib/i18n'

export const metadata: Metadata = { title: 'Maintenance — Servyou', robots: { index: false } }

// K4 — Figma 731:64476 / 734:64528. Shown by the middleware for every page while MAINTENANCE_MODE=1.
// The CTA is the secondary « Réessayer » (back to the home page, which the middleware sends straight
// back here while the flag is on); no secondary link. The muted social line below the card is not
// built: no Facebook URL exists anywhere in the codebase to point it at (D17).
export default async function MaintenancePage() {
  const lang = await getLang()
  return (
    <SystemStateScreen
      tone="accent"
      icon={<Settings className="size-16" strokeWidth={1.5} />}
      title={t('system.maintenance.title', lang)}
      body={t('system.maintenance.body', lang)}
      cta={{ href: '/', label: t('system.maintenance.cta', lang) }}
      secondaryCta
    />
  )
}
