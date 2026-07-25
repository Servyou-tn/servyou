import type { Metadata } from 'next'
import { Package } from 'lucide-react'
import { AppShell } from '@/components/shell/AppShell'
import { ComingSoon } from '@/components/shell/ComingSoon'
import { getShellUser } from '@/lib/marche/shell-user'
import { getLang } from '@/lib/i18n/server'
import { t } from '@/lib/i18n'

export const metadata: Metadata = { title: 'Produit — Servyou' }

// Legacy product-detail UI stripped (chore/strip-legacy-consumer-ui). Rebuilt from Figma
// (D1) in a later PR; the route resolves to an honest placeholder in the v2 shell. Public —
// nullable shell user, no auth gate. The `[id]` segment is ignored by the stub.
export default async function ProduitPage() {
  const shell = await getShellUser()
  const lang = await getLang()
  return (
    <AppShell user={shell?.topBarUser ?? null}>
      <ComingSoon
        icon={<Package className="h-12 w-12" aria-hidden="true" />}
        title={t('placeholders.comingSoon.title', lang)}
        description={t('placeholders.comingSoon.marketplace', lang)}
      />
    </AppShell>
  )
}
