import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { AppShell } from '@/components/shell/AppShell'
import { AlreadyHaveRole } from '@/components/devenir/AlreadyHaveRole'
import { CreateShopForm } from './_components/CreateShopForm'
import { getShellUser } from '@/lib/marche/shell-user'
import { resolveOwnedShopId } from '@/lib/shops/owner-shop'
import { createClient } from '@/lib/supabase/server'
import { getLang } from '@/lib/i18n/server'
import { t } from '@/lib/i18n'

export const metadata: Metadata = { title: 'Créer ma boutique — Servyou' }

const ROUTE = '/ma-boutique/creer'

// G2 step 1 "Bases" — Figma 555:37234/555:37236, full reasoning in docs/design/g2-discovery.md.
//
// Guard is keyed on SHOP EXISTENCE, not on seller_type — a shop_owner with no shop (an abandoned
// attempt where the insert failed, or an account seeded directly) is a legitimate retry state
// (require-seller.ts's own "shop_owner who never completed G2" comment) and must reach the form,
// not bounce. Three outcomes:
//   has a shop already    -> redirect /tableau-de-bord-vendeur (not /ma-boutique — roles.ts:71
//                             records that path has never existed)
//   seller_type freelancer -> AlreadyHaveRole (g2-discovery.md §7c — the switch-and-delete cascade
//                             CLAUDE.md describes isn't built anywhere in the schema; blocking
//                             entry here is cheaper and safer than leaving a live account in a
//                             silently-inconsistent state — 11 profiles are seller_type=freelancer
//                             today (live count, 2026-08-14), this is not a theoretical case)
//   otherwise (null OR
//     shop_owner-no-shop)  -> render the form
export default async function CreerBoutiquePage() {
  const shell = await getShellUser()
  if (!shell) redirect(`/connexion?next=${encodeURIComponent(ROUTE)}`)

  const lang = await getLang()
  const supabase = await createClient()

  const existing = await resolveOwnedShopId(supabase, shell.id)
  if (existing.ok) redirect('/tableau-de-bord-vendeur')
  if (existing.reason === 'query_failed') {
    throw new Error('shop fetch failed while guarding /ma-boutique/creer')
  }

  if (shell.topBarUser.seller_type === 'freelancer') {
    return (
      <AppShell user={shell.topBarUser}>
        <AlreadyHaveRole
          headline={t('shop.create.freelancerBlocked.headline', lang)}
          subheadline={t('shop.create.freelancerBlocked.subheadline', lang)}
          manageHref="/mon-profil-freelance"
          manageLabel={t('shop.create.freelancerBlocked.manage', lang)}
        />
      </AppShell>
    )
  }

  return (
    <AppShell user={shell.topBarUser}>
      <CreateShopForm />
    </AppShell>
  )
}
