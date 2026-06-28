import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { LayoutDashboard } from 'lucide-react'
import { AppShell } from '@/components/shell/AppShell'
import { ComingSoon } from '@/components/shell/ComingSoon'
import { getShellUser } from '@/lib/marche/shell-user'
import { getLang } from '@/lib/i18n/server'
import { t } from '@/lib/i18n'

export const metadata: Metadata = { title: 'Tableau de bord — Servyou' }

// Freelance dashboard stub (PR-DS-2). The real designed dashboard ships in
// PR-PAGE-DASHBOARD-FREELANCER; for now the sidebar item resolves to an honest placeholder
// inside the new shell instead of a 404.
export default async function TableauDeBordPage() {
  const shell = await getShellUser()
  if (!shell) redirect('/connexion')
  const lang = await getLang()
  return (
    <AppShell user={shell.topBarUser}>
      <ComingSoon
        icon={<LayoutDashboard className="h-12 w-12" aria-hidden="true" />}
        title={t('placeholders.comingSoon.title', lang)}
        description={t('placeholders.comingSoon.freelanceWorkspace', lang)}
      />
    </AppShell>
  )
}
