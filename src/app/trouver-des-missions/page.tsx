import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { Compass } from 'lucide-react'
import { AppShell } from '@/components/shell/AppShell'
import { ComingSoon } from '@/components/shell/ComingSoon'
import { getShellUser } from '@/lib/marche/shell-user'
import { getLang } from '@/lib/i18n/server'
import { t } from '@/lib/i18n'

export const metadata: Metadata = { title: 'Trouver des missions — Servyou' }

// Freelance-workspace placeholder (PR-DS-2). No existing /emplois route to link to, so this is a
// fresh placeholder; the real mission-discovery surface ships in a later PR.
export default async function TrouverDesMissionsPage() {
  const shell = await getShellUser()
  if (!shell) redirect('/connexion')
  const lang = await getLang()
  return (
    <AppShell user={shell.topBarUser}>
      <ComingSoon
        icon={<Compass className="h-12 w-12" aria-hidden="true" />}
        title={t('placeholders.comingSoon.title', lang)}
        description={t('placeholders.comingSoon.freelanceWorkspace', lang)}
      />
    </AppShell>
  )
}
