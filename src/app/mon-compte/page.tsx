import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { UserCircle } from 'lucide-react'
import { AppShell } from '@/components/shell/AppShell'
import { ComingSoon } from '@/components/shell/ComingSoon'
import { getShellUser } from '@/lib/marche/shell-user'
import { getLang } from '@/lib/i18n/server'
import { t } from '@/lib/i18n'

export const metadata: Metadata = { title: 'Mon compte — Servyou' }

// Legacy account UI stripped (chore/strip-legacy-consumer-ui). Rebuilt from Figma (I1) in a
// later PR. Auth-gated as before — logged-out visitors go to /connexion with the return path
// preserved.
export default async function MonComptePage() {
  const shell = await getShellUser()
  if (!shell) redirect('/connexion?next=/mon-compte')
  const lang = await getLang()
  return (
    <AppShell user={shell.topBarUser}>
      <ComingSoon
        icon={<UserCircle className="h-12 w-12" aria-hidden="true" />}
        title={t('placeholders.comingSoon.title', lang)}
        description={t('placeholders.comingSoon.account', lang)}
      />
    </AppShell>
  )
}
