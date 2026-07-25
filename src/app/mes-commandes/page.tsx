import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { ShoppingBag } from 'lucide-react'
import { AppShell } from '@/components/shell/AppShell'
import { ComingSoon } from '@/components/shell/ComingSoon'
import { getShellUser } from '@/lib/marche/shell-user'
import { getLang } from '@/lib/i18n/server'
import { t } from '@/lib/i18n'

export const metadata: Metadata = { title: 'Mes commandes — Servyou' }

// Legacy orders-list UI stripped (chore/strip-legacy-consumer-ui). Rebuilt from Figma (E3)
// in a later PR. Auth-gated as before — logged-out visitors go to /connexion.
export default async function MesCommandesPage() {
  const shell = await getShellUser()
  if (!shell) redirect('/connexion')
  const lang = await getLang()
  return (
    <AppShell user={shell.topBarUser}>
      <ComingSoon
        icon={<ShoppingBag className="h-12 w-12" aria-hidden="true" />}
        title={t('placeholders.comingSoon.title', lang)}
        description={t('placeholders.comingSoon.orders', lang)}
      />
    </AppShell>
  )
}
