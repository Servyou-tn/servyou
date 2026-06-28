import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { Briefcase } from 'lucide-react'
import { AppShell } from '@/components/shell/AppShell'
import { ComingSoon } from '@/components/shell/ComingSoon'
import { getShellUser } from '@/lib/marche/shell-user'
import { getLang } from '@/lib/i18n/server'
import { t } from '@/lib/i18n'

export const metadata: Metadata = { title: 'Mes services — Servyou' }

// Freelance-workspace placeholder (PR-DS-2). The real surface ships in a later PR; for now the
// sidebar item resolves to an honest "coming soon" inside the new shell. No role gate — a
// consumer who lands here just sees the placeholder.
export default async function MesServicesPage() {
  const shell = await getShellUser()
  if (!shell) redirect('/connexion')
  const lang = await getLang()
  return (
    <AppShell user={shell.topBarUser}>
      <ComingSoon
        icon={<Briefcase className="h-12 w-12" aria-hidden="true" />}
        title={t('placeholders.comingSoon.title', lang)}
        description={t('placeholders.comingSoon.freelanceWorkspace', lang)}
      />
    </AppShell>
  )
}
