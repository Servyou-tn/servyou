import type { Metadata } from 'next'
import { Store } from 'lucide-react'
import { AppShell } from '@/components/shell/AppShell'
import { ComingSoon } from '@/components/shell/ComingSoon'
import { getShellUser } from '@/lib/marche/shell-user'
import { getLang } from '@/lib/i18n/server'
import { t } from '@/lib/i18n'

export const metadata: Metadata = { title: 'Produits — Servyou' }

// Legacy consumer browse UI stripped (chore/strip-legacy-consumer-ui). The designed
// marketplace is rebuilt from Figma in a later PR; for now the route resolves to an honest
// placeholder inside the v2 shell. Public — nullable shell user, no auth gate.
export default async function ProduitsPage() {
  const shell = await getShellUser()
  const lang = await getLang()
  return (
    <AppShell user={shell?.topBarUser ?? null}>
      <ComingSoon
        icon={<Store className="h-12 w-12" aria-hidden="true" />}
        title={t('placeholders.comingSoon.title', lang)}
        description={t('placeholders.comingSoon.marketplace', lang)}
      />
    </AppShell>
  )
}
