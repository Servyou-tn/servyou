import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { BarChart3 } from 'lucide-react'
import { AppShell } from '@/components/shell/AppShell'
import { ComingSoon } from '@/components/shell/ComingSoon'
import { getShellUser } from '@/lib/marche/shell-user'
import { getLang } from '@/lib/i18n/server'
import { t } from '@/lib/i18n'

export const metadata: Metadata = { title: 'Statistiques — Servyou' }

// Statistics placeholder (PR-DS-2). The performance dashboard is a later PR; the metrics it will
// show are phase-deferred, so no fake numbers here — an honest "coming soon".
export default async function StatistiquesPage() {
  const shell = await getShellUser()
  if (!shell) redirect('/connexion')
  const lang = await getLang()
  return (
    <AppShell user={shell.topBarUser}>
      <ComingSoon
        icon={<BarChart3 className="h-12 w-12" aria-hidden="true" />}
        title={t('placeholders.comingSoon.title', lang)}
        description={t('placeholders.comingSoon.statistics', lang)}
      />
    </AppShell>
  )
}
