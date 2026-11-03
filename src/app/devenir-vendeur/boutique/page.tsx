import type { Metadata } from 'next'
import { localizedMetadata } from '@/lib/i18n/metadata'
import { AppShell } from '@/components/shell/AppShell'
import { DevenirVendeurContent } from '@/components/devenir/DevenirVendeurContent'
import { getShellUser } from '@/lib/marche/shell-user'

export async function generateMetadata(): Promise<Metadata> {
  return localizedMetadata('meta.become_seller_shop', {}, 'meta.desc.become_seller_shop')
}

// Moved from /devenir-vendeur (unchanged content) — the shared role-choice entry now lives
// at /devenir-vendeur and links here. The role guard that used to live on this page
// (AlreadyHaveRole for an existing shop_owner) moved upstream to the shared entry, which
// now marks this card unavailable before a visitor ever reaches this page — so it is not
// repeated here. Public: visitor → CTA to /inscription?next=…; consumer → CTA to
// /ma-boutique/creer.
//
// SHELL — migrated off MarcheLayout onto AppShell: the parent /devenir-vendeur is already
// AppShell, so a Freelance/Boutique click was landing on a visibly different sidebar+topbar
// one level in. Static content, `user` prop only — no `--marche-topbar-h`, no MarcheSidebar
// dependency, so this is a straight shell swap, not a rebuild.
export default async function DevenirVendeurBoutiquePage() {
  const shell = await getShellUser()

  return (
    <AppShell user={shell?.topBarUser ?? null}>
      <DevenirVendeurContent isAuthenticated={Boolean(shell)} />
    </AppShell>
  )
}
