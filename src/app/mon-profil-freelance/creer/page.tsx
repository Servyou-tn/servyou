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
// shop_owner-with-no-shop. Five outcomes now (H2 step 3 added a second signal on top of the
// mid-wizard branch G2 never needed — see below):
//   profile exists,
//     freelancer_languages   -> check freelancer_profiles.working_hours (step 3's own signal,
//     has a row already         see creer/details/page.tsx's guard comment for why this column):
//                                  IS NOT NULL -> redirect /tableau-de-bord (NOT
//                                    /tableau-de-bord-vendeur — that route calls requireShopOwner,
//                                    which redirects any non-shop_owner to /devenir-vendeur; a real
//                                    freelancer visiting it bounces straight back to the role
//                                    chooser. Caught live during the QA walk, 2026-08-14 —
//                                    /tableau-de-bord's own guard is just "logged in",
//                                    seller_type-agnostic, so it is the one destination that
//                                    actually renders for a freelancer today, even as its own
//                                    ComingSoon stub)
//                                  IS NULL -> redirect /mon-profil-freelance/creer/details
//                                    (step 2 done, step 3 never submitted)
//   profile exists,
//     no freelancer_languages -> render the form PRE-FILLED from the existing freelancer_profiles
//     row yet (mid-wizard)        row — "Retour" from step 2 lands here, and so does browser-back
//                                  or a bare URL revisit; all three are the same state
//   seller_type shop_owner    -> AlreadyHaveRole (mirrors G2's freelancer-blocked branch,
//     (only reachable when         inverted) — unreachable when a profile exists, since a
//     no profile exists yet)       freelancer_profiles row implies seller_type is already
//                                  'freelancer' (step 1's own action flips it in the same write
//                                  that inserts the row)
//   otherwise (null OR
//     freelancer-no-profile)    -> render the form blank
//
// WHY freelancer_languages (not freelancer_skills) is the "finished step 2" signal: step 2's own
// action (competences/actions.ts) writes skills BEFORE languages, deliberately — languages is the
// LAST table it touches. If skills succeed but languages fail partway through a submit, this
// guard must still treat the profile as unfinished and route back into the wizard, not to the
// dashboard; gating on the last-written table is what makes that recoverable.
//
// 🔴 Behavior change for existing accounts: 10 freelancer_profiles rows exist live today (2026-08-
// 14), 0 with any freelancer_skills or freelancer_languages rows — every one of them now renders
// this prefilled form on a visit to this route instead of redirecting to /tableau-de-bord. They
// are, factually, mid-wizard (never did step 2) — this is "resume where you left off" working as
// intended for them too, not a regression, but it is a real behavior change worth naming rather
// than letting it land as a silent side effect of the Retour feature.
export default async function CreerProfilFreelancePage() {
  const shell = await getShellUser()
  if (!shell) redirect(`/connexion?next=${encodeURIComponent(ROUTE)}`)

  const lang = await getLang()
  const supabase = await createClient()

  const existing = await resolveOwnedFreelancerProfileId(supabase, shell.id)
  if (!existing.ok && existing.reason === 'query_failed') {
    throw new Error('freelancer profile fetch failed while guarding /mon-profil-freelance/creer')
  }

  if (existing.ok) {
    const { data: languageRow, error: langErr } = await supabase
      .from('freelancer_languages')
      .select('id')
      .eq('freelancer_profile_id', existing.freelancerProfileId)
      .limit(1)
      .maybeSingle()
    if (langErr) {
      console.error('[creer-profil-freelance] freelancer_languages check failed:', langErr.message, langErr.code, langErr.details)
      throw new Error('freelancer_languages fetch failed while guarding /mon-profil-freelance/creer')
    }

    if (languageRow) {
      // Step 2 done — extend with the step-3 signal, same existence-based shape as the languages
      // check above. working_hours is the ONE freelancer_profiles column steps 1/2 never touch,
      // and step 3's own action (creer/details/actions.ts) is the only writer, unconditionally
      // (even '' on an empty submit) and LAST in its own write order — so `IS NOT NULL` is a true
      // "step 3 was submitted at least once" signal, not an inference from optional content.
      const { data: detailsProfile, error: detailsErr } = await supabase
        .from('freelancer_profiles')
        .select('working_hours')
        .eq('id', existing.freelancerProfileId)
        .maybeSingle()
      if (detailsErr) {
        console.error('[creer-profil-freelance] working_hours check failed:', detailsErr.message, detailsErr.code, detailsErr.details)
        throw new Error('freelancer_profiles working_hours fetch failed while guarding /mon-profil-freelance/creer')
      }
      redirect(detailsProfile?.working_hours != null ? '/tableau-de-bord' : '/mon-profil-freelance/creer/details')
    }

    const { data: profileRow, error: profileErr } = await supabase
      .from('freelancer_profiles')
      .select('headline, bio, city')
      .eq('id', existing.freelancerProfileId)
      .single()
    if (profileErr || !profileRow) {
      console.error('[creer-profil-freelance] freelancer_profiles fetch failed:', profileErr?.message, profileErr?.code, profileErr?.details)
      throw new Error('freelancer_profiles fetch failed while guarding /mon-profil-freelance/creer')
    }

    return (
      <AppShell user={shell.topBarUser}>
        <CreateFreelancerProfileForm
          fullName={shell.topBarUser.full_name}
          avatarUrl={shell.topBarUser.avatar_url ?? null}
          initial={{
            headline: profileRow.headline ?? '',
            bio: profileRow.bio ?? '',
            city: profileRow.city ?? '',
          }}
        />
      </AppShell>
    )
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
