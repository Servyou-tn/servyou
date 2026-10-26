import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { AppShell } from '@/components/shell/AppShell'
import { ClientCard } from '@/components/missions/ClientCard'
import { CategoryChip } from '@/components/missions/MissionChips'
import { MissionFacts } from '@/components/missions/MissionFacts'
import { FOCUS_RING } from '@/components/layout/styles'
import { createClient } from '@/lib/supabase/server'
import { getMissionDetail } from '@/lib/marche/mission-detail-query'
import { getMyProfileSkills } from '@/lib/marche/missions-query'
import { getShellUser } from '@/lib/marche/shell-user'
import { resolveOwnedFreelancerProfileId } from '@/lib/freelancer/owner-profile'
import { resolveRole } from '@/lib/roles'
import { getLang } from '@/lib/i18n/server'
import { t } from '@/lib/i18n'
import { ProposalForm } from './_components/ProposalForm'

export const metadata: Metadata = { title: 'Envoyer ma proposition — Servyou' }

// H12 « Envoyer ma proposition » — Figma 350:12007 (docs/design/h9-h13-measurements.md §3). Same skeleton as H10:
// back-link → full-width header → two columns, the form on the left and the sticky recap + client on the right.
//
// Prevention first (D-H12-6, layers L1/L2): H10 already blocks the CTA, and this page RE-CHECKS on load with the same
// state machine — anything but « can respond » goes back to the mission (or on to H13 when already answered), so a
// stale tab or a typed URL cannot open a form that cannot succeed. The DB triggers are the last line.
export default async function ProposerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const lang = await getLang()

  const shell = await getShellUser()
  if (!shell) redirect(`/connexion?next=${encodeURIComponent(`/missions/${id}/proposer`)}`)
  // Only a freelancer can propose. An admin (read-only view) goes back to the mission; everyone else to the funnel.
  if (resolveRole(shell.topBarUser) !== 'freelancer') redirect(`/missions/${id}`)

  const supabase = await createClient()
  const profile = await resolveOwnedFreelancerProfileId(supabase, shell.id)
  if (!profile.ok && profile.reason === 'query_failed') throw new Error('freelancer profile fetch failed')

  const mission = await getMissionDetail(id, { userId: shell.id, kind: 'freelancer', hasFreelancerProfile: profile.ok })
  if (!mission) notFound()
  if (mission.cta === 'answered') redirect(`/missions/${id}/proposition-envoyee`)
  if (mission.cta !== 'can_respond') redirect(`/missions/${id}`)

  const mySkills = profile.ok ? await getMyProfileSkills(supabase, profile.freelancerProfileId) : []
  const name = mission.client.firstName || t('proposal.form.client_fallback', lang)

  return (
    <AppShell user={shell.topBarUser}>
      <div className="flex flex-col gap-6">
        <Link
          href={`/missions/${id}`}
          className={`inline-flex w-fit items-center gap-1.5 rounded-sm text-body-sm font-semibold text-brand-blue-600 hover:underline ${FOCUS_RING}`}
        >
          <ArrowLeft className="size-5 rtl:rotate-180" aria-hidden="true" />
          {t('proposal.back', lang)}
        </Link>

        <header className="flex flex-col gap-2">
          <h1 className="text-h1 leading-10 text-text-primary">{t('missiondetail.cta.send', lang)}</h1>
          <p className="text-body text-text-muted">{t('proposal.subtitle', lang, { name })}</p>
        </header>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_376px] lg:items-start">
          <ProposalForm
            jobPostId={mission.id}
            clientFirstName={mission.client.firstName}
            budgetMin={mission.budgetMin}
            budgetMax={mission.budgetMax}
            requiredSkills={mission.skills}
            mySkills={mySkills}
          />

          <aside className="flex flex-col gap-6 lg:sticky lg:top-[88px]">
            <MissionFacts
              mission={mission}
              lang={lang}
              lead={
                <div className="flex flex-col gap-2">
                  <p className="text-caption font-semibold tracking-[0.48px] text-text-muted uppercase">{t('proposal.recap.mission', lang)}</p>
                  <div>
                    <CategoryChip slug={mission.categorySlug} nameFr={mission.categoryNameFr} nameAr={mission.categoryNameAr} lang={lang} />
                  </div>
                  <p className="text-body-lg leading-[26px] font-semibold text-text-primary [overflow-wrap:anywhere]">{mission.title}</p>
                </div>
              }
            >
              <Link href={`/missions/${id}`} className={`w-fit rounded-sm text-caption font-medium text-brand-blue-600 hover:underline ${FOCUS_RING}`}>
                {t('proposal.recap.view', lang)}
              </Link>
            </MissionFacts>
            <ClientCard firstName={mission.client.firstName} city={mission.client.city} avatarUrl={mission.client.avatarUrl} lang={lang} />
          </aside>
        </div>
      </div>
    </AppShell>
  )
}
