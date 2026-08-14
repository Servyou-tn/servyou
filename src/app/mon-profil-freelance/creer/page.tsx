import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { AppShell } from '@/components/shell/AppShell'
import { AlreadyHaveRole } from '@/components/devenir/AlreadyHaveRole'
import { CreateFreelancerProfileForm } from './_components/CreateFreelancerProfileForm'
import { getShellUser } from '@/lib/marche/shell-user'
import { resolveOwnedFreelancerProfileId } from '@/lib/freelancer/owner-profile'
import { createClient } from '@/lib/supabase/server'
import { getLang } from '@/lib/i18n/server'
import { t } from '@/lib/i18n'

export const metadata: Metadata = { title: 'Créer mon profil freelance — Servyou' }

const ROUTE = '/mon-profil-freelance/creer'

// H2 step 1 "Bases" — Figma 466:20244, full reasoning in docs/design/h2-discovery.md.
//
// Guard mirrors G2's (ma-boutique/creer/page.tsx): keyed on freelancer_profiles EXISTENCE, not
// seller_type — a freelancer with no profile row (an abandoned attempt, or an account
// seeded/flipped directly) is a legitimate retry state and must reach the form, not bounce.
// Confirmed live, 2026-08-14: 1 of 11 seller_type='freelancer' profiles has no freelancer_profiles
// row — "has the role" and "has a profile" are provably not the same state here, same as G2's
// shop_owner-with-no-shop. Three outcomes:
//   has a profile already   -> redirect /tableau-de-bord (NOT /tableau-de-bord-vendeur — that
//                              route calls requireShopOwner, which redirects any non-shop_owner
//                              to /devenir-vendeur; a real freelancer visiting it bounces
//                              straight back to the role chooser. Caught live during the QA walk,
//                              2026-08-14 — /tableau-de-bord's own guard is just "logged in",
//                              seller_type-agnostic, so it is the one destination that actually
//                              renders for a freelancer today, even as its own ComingSoon stub)
//   seller_type shop_owner  -> AlreadyHaveRole (mirrors G2's freelancer-blocked branch, inverted)
//   otherwise (null OR
//     freelancer-no-profile) -> render the form
export default async function CreerProfilFreelancePage() {
  const shell = await getShellUser()
  if (!shell) redirect(`/connexion?next=${encodeURIComponent(ROUTE)}`)

  const lang = await getLang()
  const supabase = await createClient()

  const existing = await resolveOwnedFreelancerProfileId(supabase, shell.id)
  if (existing.ok) redirect('/tableau-de-bord')
  if (existing.reason === 'query_failed') {
    throw new Error('freelancer profile fetch failed while guarding /mon-profil-freelance/creer')
  }

  if (shell.topBarUser.seller_type === 'shop_owner') {
    return (
      <AppShell user={shell.topBarUser}>
        <AlreadyHaveRole
          headline={t('freelance.create.shopOwnerBlocked.headline', lang)}
          subheadline={t('freelance.create.shopOwnerBlocked.subheadline', lang)}
          manageHref="/tableau-de-bord-vendeur"
          manageLabel={t('freelance.create.shopOwnerBlocked.manage', lang)}
        />
      </AppShell>
    )
  }

  return (
    <AppShell user={shell.topBarUser}>
      <CreateFreelancerProfileForm
        fullName={shell.topBarUser.full_name}
        avatarUrl={shell.topBarUser.avatar_url ?? null}
      />
    </AppShell>
  )
}
