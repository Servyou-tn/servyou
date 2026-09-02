import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { AppShell } from '@/components/shell/AppShell'
import { DetailsForm } from './_components/DetailsForm'
import { getShellUser } from '@/lib/marche/shell-user'
import { resolveOwnedFreelancerProfileId } from '@/lib/freelancer/owner-profile'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = { title: 'Détails de mon profil — Servyou' }

const ROUTE = '/mon-profil-freelance/creer/details'

// H2 step 3 "Détails (facultatif)" — Figma 468:20481/468:20502. The frame measures the lede +
// four collapsed accordion HEADERS only; the bodies were never authored (see actions.ts's header
// comment). Field shapes are a founder ruling, not a measurement.
//
// GUARD mirrors competences/page.tsx exactly (itself mirroring G2's ConfigurationPage): keyed on
// `freelancer_languages` existence (step 2 done), the same key step 1's guard uses to decide
// whether THIS route is even reachable. A direct URL hit with no profile or no languages bounces
// to step 1, which owns the full branching — this route doesn't re-derive it. Always renders
// pre-filled once reachable, regardless of whether working_hours is already set — same
// "always re-fillable, safe to resubmit" posture G2's configuration page uses, and doubles as the
// only way to edit these four fields until H3 ships.
export default async function DetailsPage() {
  const shell = await getShellUser()
  if (!shell) redirect(`/connexion?next=${encodeURIComponent(ROUTE)}`)

  const supabase = await createClient()

  const owned = await resolveOwnedFreelancerProfileId(supabase, shell.id)
  if (!owned.ok) {
    if (owned.reason === 'query_failed') {
      throw new Error('freelancer profile fetch failed while guarding /mon-profil-freelance/creer/details')
    }
    redirect('/mon-profil-freelance/creer')
  }
  const freelancerProfileId = owned.freelancerProfileId

  const { data: languageRow, error: langErr } = await supabase
    .from('freelancer_languages')
    .select('id')
    .eq('freelancer_profile_id', freelancerProfileId)
    .limit(1)
    .maybeSingle()
  if (langErr) {
    console.error('[details] freelancer_languages check failed:', langErr.message, langErr.code, langErr.details)
    throw new Error('freelancer_languages fetch failed while guarding /mon-profil-freelance/creer/details')
  }
  if (!languageRow) {
    // Step 2 not finished yet — step 1's own guard decides the right destination.
    redirect('/mon-profil-freelance/creer')
  }

  const [
    { data: educationRows, error: eduErr },
    { data: certificationRows, error: certErr },
    { data: toolRows, error: toolsErr },
    { data: profileRow, error: profileErr },
  ] = await Promise.all([
    supabase
      .from('freelancer_education')
      .select('id, institution, degree, field, year_start, year_end')
      .eq('freelancer_id', freelancerProfileId)
      .order('created_at', { ascending: true }),
    supabase
      .from('freelancer_certifications')
      .select('id, name, issuing_org, year_obtained, credential_url')
      .eq('freelancer_id', freelancerProfileId)
      .order('created_at', { ascending: true }),
    supabase.from('freelancer_tools').select('name').eq('freelancer_id', freelancerProfileId),
    supabase.from('freelancer_profiles').select('working_hours').eq('id', freelancerProfileId).single(),
  ])

  if (eduErr || certErr || toolsErr || profileErr || !profileRow) {
    console.error(
      '[details] prefill fetch failed:',
      (eduErr ?? certErr ?? toolsErr ?? profileErr)?.message,
      (eduErr ?? certErr ?? toolsErr ?? profileErr)?.code,
      (eduErr ?? certErr ?? toolsErr ?? profileErr)?.details,
    )
    throw new Error('details prefill fetch failed')
  }

  return (
    <AppShell user={shell.topBarUser}>
      <DetailsForm
        initial={{
          education: (educationRows ?? []).map((r) => ({
            institution: r.institution as string,
            degree: (r.degree as string | null) ?? '',
            field: (r.field as string | null) ?? '',
            yearStart: r.year_start != null ? String(r.year_start) : '',
            yearEnd: r.year_end != null ? String(r.year_end) : '',
          })),
          certifications: (certificationRows ?? []).map((r) => ({
            name: r.name as string,
            issuingOrg: (r.issuing_org as string | null) ?? '',
            yearObtained: r.year_obtained != null ? String(r.year_obtained) : '',
            credentialUrl: (r.credential_url as string | null) ?? '',
          })),
          tools: (toolRows ?? []).map((r) => r.name as string),
          workingHours: profileRow.working_hours ?? '',
        }}
      />
    </AppShell>
  )
}
