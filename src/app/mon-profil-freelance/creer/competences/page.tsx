import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { AppShell } from '@/components/shell/AppShell'
import { CompetencesForm } from './_components/CompetencesForm'
import { getShellUser } from '@/lib/marche/shell-user'
import { resolveOwnedFreelancerProfileId } from '@/lib/freelancer/owner-profile'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = { title: 'Compétences et langues — Servyou' }

const ROUTE = '/mon-profil-freelance/creer/competences'

// H2 step 2 "Compétences & langues" — Figma 467:20404, full reasoning in
// docs/design/h2-discovery.md §3.
//
// UPDATE/reconcile, not insert — the freelancer_profiles row already exists by the time this page
// renders (step 1's job). Guard is keyed on that existence only, same key step 1 uses — mirrors
// G2's ConfigurationPage (ma-boutique/creer/configuration/page.tsx): a direct URL hit with no
// profile bounces to step 1, which already owns the full consumer/freelancer/shop_owner
// branching — this route doesn't re-derive any of that.
export default async function CompetencesPage() {
  const shell = await getShellUser()
  if (!shell) redirect(`/connexion?next=${encodeURIComponent(ROUTE)}`)

  const supabase = await createClient()

  const owned = await resolveOwnedFreelancerProfileId(supabase, shell.id)
  if (!owned.ok) {
    if (owned.reason === 'query_failed') {
      throw new Error('freelancer profile fetch failed while guarding /mon-profil-freelance/creer/competences')
    }
    // No profile yet (never finished step 1, or a cold direct URL hit) — step 1's own guard
    // decides the right destination (form vs AlreadyHaveRole vs redirect), this route doesn't.
    redirect('/mon-profil-freelance/creer')
  }
  const freelancerProfileId = owned.freelancerProfileId

  const [{ data: skillRows, error: skillsErr }, { data: languageRows, error: langErr }, { data: profileRow, error: profileErr }] =
    await Promise.all([
      supabase.from('freelancer_skills').select('skill').eq('freelancer_profile_id', freelancerProfileId),
      supabase.from('freelancer_languages').select('language, proficiency').eq('freelancer_profile_id', freelancerProfileId),
      supabase.from('freelancer_profiles').select('years_experience, portfolio_link').eq('id', freelancerProfileId).single(),
    ])

  if (skillsErr || langErr || profileErr || !profileRow) {
    console.error(
      '[competences] prefill fetch failed:',
      (skillsErr ?? langErr ?? profileErr)?.message,
      (skillsErr ?? langErr ?? profileErr)?.code,
      (skillsErr ?? langErr ?? profileErr)?.details,
    )
    throw new Error('competences prefill fetch failed')
  }

  return (
    <AppShell user={shell.topBarUser}>
      <CompetencesForm
        initial={{
          skills: (skillRows ?? []).map((r) => r.skill as string),
          languages: (languageRows ?? []) as { language: string; proficiency: string }[],
          yearsExperience: profileRow.years_experience ?? 0,
          portfolioLink: profileRow.portfolio_link ?? '',
        }}
      />
    </AppShell>
  )
}
