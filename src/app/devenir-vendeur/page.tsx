import type { Metadata } from 'next'
import { MarcheLayout } from '@/components/marche/MarcheLayout'
import { DevenirVendeurContent } from '@/components/devenir/DevenirVendeurContent'
import { AlreadyHaveRole } from '@/components/devenir/AlreadyHaveRole'
import { getShellUser } from '@/lib/marche/shell-user'
import { getCurrentProfile } from '@/lib/marche/mon-compte'
import { getLang } from '@/lib/i18n/server'
import { t } from '@/lib/i18n'

export const metadata: Metadata = {
  title: 'Devenir vendeur — Servyou',
  description:
    'Lancez votre boutique en ligne sur Servyou. Sans commission. Paiement à la livraison. Pour vendre en Tunisie.',
}

// Public role-upgrade page. Three states: visitor → CTA to /inscription?next=…;
// consumer (seller_type null) → CTA to /ma-boutique/creer; existing shop owner →
// AlreadyHaveRole.
export default async function DevenirVendeurPage() {
  const shell = await getShellUser()
  const lang = await getLang()
  const profile = shell ? await getCurrentProfile() : null

  return (
    <MarcheLayout user={shell?.topBarUser ?? null}>
      {profile?.seller_type === 'shop_owner' ? (
        <AlreadyHaveRole
          headline={t('devenir.vendeur.already.headline', lang)}
          subheadline={t('devenir.vendeur.already.subheadline', lang)}
          manageHref="/ma-boutique"
          manageLabel={t('devenir.vendeur.already.manage', lang)}
        />
      ) : (
        <DevenirVendeurContent isAuthenticated={Boolean(shell)} />
      )}
    </MarcheLayout>
  )
}
