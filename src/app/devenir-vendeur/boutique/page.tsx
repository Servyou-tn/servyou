import type { Metadata } from 'next'
import { MarcheLayout } from '@/components/marche/MarcheLayout'
import { DevenirVendeurContent } from '@/components/devenir/DevenirVendeurContent'
import { getShellUser } from '@/lib/marche/shell-user'

export const metadata: Metadata = {
  title: 'Devenir vendeur — Servyou',
  description:
    'Lancez votre boutique en ligne sur Servyou. Sans commission. Paiement à la livraison. Pour vendre en Tunisie.',
}

// Moved from /devenir-vendeur (unchanged content) — the shared role-choice entry now lives
// at /devenir-vendeur and links here. The role guard that used to live on this page
// (AlreadyHaveRole for an existing shop_owner) moved upstream to the shared entry, which
// now marks this card unavailable before a visitor ever reaches this page — so it is not
// repeated here. Public: visitor → CTA to /inscription?next=…; consumer → CTA to
// /ma-boutique/creer.
export default async function DevenirVendeurBoutiquePage() {
  const shell = await getShellUser()

  return (
    <MarcheLayout user={shell?.topBarUser ?? null}>
      <DevenirVendeurContent isAuthenticated={Boolean(shell)} />
    </MarcheLayout>
  )
}
