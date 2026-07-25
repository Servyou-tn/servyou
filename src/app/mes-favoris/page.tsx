import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { Heart } from 'lucide-react'
import { AppShell } from '@/components/shell/AppShell'
import { ComingSoon } from '@/components/shell/ComingSoon'
import { getShellUser } from '@/lib/marche/shell-user'
import { getLang } from '@/lib/i18n/server'
import { t } from '@/lib/i18n'

export const metadata: Metadata = { title: 'Mes favoris — Servyou' }

// Legacy favorites UI stripped (chore/strip-legacy-consumer-ui). Rebuilt from Figma (F1) in a
// later PR. Auth-gated as before — logged-out visitors go to /connexion.
export default async function MesFavorisPage() {
  const shell = await getShellUser()
  if (!shell) redirect('/connexion')
  const lang = await getLang()
  return (
    <AppShell user={shell.topBarUser}>
      <ComingSoon
        icon={<Heart className="h-12 w-12" aria-hidden="true" />}
        title={t('placeholders.comingSoon.title', lang)}
        description={t('placeholders.comingSoon.favorites', lang)}
      />
    </AppShell>
  )
}
