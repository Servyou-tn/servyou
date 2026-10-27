import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft, Clock, Globe, MapPin, ShieldAlert } from 'lucide-react'
import { AppShell } from '@/components/shell/AppShell'
import { ClientCard } from '@/components/missions/ClientCard'
import { MissionFacts } from '@/components/missions/MissionFacts'
import { CategoryChip, NewChip } from '@/components/missions/MissionChips'
import { FOCUS_RING } from '@/components/layout/styles'
import { checkAdmin } from '@/lib/auth/require-admin'
import { getShellUser } from '@/lib/marche/shell-user'
import { createClient } from '@/lib/supabase/server'
import { resolveOwnedFreelancerProfileId } from '@/lib/freelancer/owner-profile'
import { resolveRole } from '@/lib/roles'
import { getLang } from '@/lib/i18n/server'
import { t, tn } from '@/lib/i18n'
import { localizeCity } from '@/lib/marche/missions'
import { getMissionDetail, type MissionViewer } from '@/lib/marche/mission-detail-query'
import { relativeTimeLabel } from '@/app/tableau-de-bord/_components/relative-time'
import { MissionCta } from './_components/MissionCta'

export const metadata: Metadata = { title: 'Mission — Servyou' }

// H10 « Mission detail » — Figma 322:11550, measured in docs/design/h9-h13-measurements.md §2 (read side; the
// proposal form H12 and its result H13 are PR-2). Layout: back-link → full-width header → two columns, left
// FILL (the description) and right FIXED 376 (client-card, then decision-card with the CTA). Because the
// header spans both columns, both columns start at the same Y whatever the title's length.
//
// Who may open it (D10): a freelancer (read + the CTA state machine) or an ADMIN (read-only, no CTA — the
// moderation report links job_post targets to /missions/{id}). Logged out → sign-in; anyone else →
// /devenir-vendeur, the same funnel requireFreelancer uses. A freelancer who is also an admin gets the freelancer
// view. A malformed id, a missing post and a post RLS hides all end in notFound().
export default async function MissionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const lang = await getLang()

  const shell = await getShellUser()
  if (!shell) redirect(`/connexion?next=${encodeURIComponent(`/missions/${id}`)}`)

  const supabase = await createClient()
  let viewer: MissionViewer
  if (resolveRole(shell.topBarUser) === 'freelancer') {
    const profile = await resolveOwnedFreelancerProfileId(supabase, shell.id)
    // A failed lookup is not « no profile » — that would show a working freelancer a « complete your profile » wall.
    if (!profile.ok && profile.reason === 'query_failed') throw new Error('freelancer profile fetch failed')
    viewer = { userId: shell.id, kind: 'freelancer', hasFreelancerProfile: profile.ok }
  } else {
    const admin = await checkAdmin(supabase)
    if (admin.ok) viewer = { userId: shell.id, kind: 'admin' }
    else if (admin.reason === 'query_failed') throw new Error('admin check failed')
    else redirect('/devenir-vendeur')
  }

  const mission = await getMissionDetail(id, viewer)
  if (!mission) notFound()

  const published = relativeTimeLabel(mission.createdAt, lang)
  const place = mission.isRemote ? t('missioncard.remote', lang) : localizeCity(mission.city, lang)

  return (
    <AppShell user={shell.topBarUser}>
      <div className="flex flex-col gap-6">
        <Link
          href="/trouver-des-missions"
          className={`inline-flex w-fit items-center gap-1.5 rounded-sm text-body-sm font-semibold text-brand-blue-600 hover:underline ${FOCUS_RING}`}
        >
          <ArrowLeft className="size-5 rtl:rotate-180" aria-hidden="true" />
          {t('missiondetail.back', lang)}
        </Link>

        {viewer.kind === 'admin' ? (
          <p className="flex items-center gap-2 rounded-md bg-warning-50 px-4 py-3 text-body-sm font-medium text-warning-700">
            <ShieldAlert className="size-5 shrink-0" aria-hidden="true" />
            {mission.hidden ? t('missiondetail.hidden_notice', lang) : t('missiondetail.admin_notice', lang)}
          </p>
        ) : null}

        {/* ── post-header (322:11734) ── */}
        <header className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <CategoryChip slug={mission.categorySlug} nameFr={mission.categoryNameFr} nameAr={mission.categoryNameAr} lang={lang} />
            {mission.isNew ? <NewChip lang={lang} /> : null}
          </div>
          <h1 className="text-h1 leading-10 text-text-primary">{mission.title}</h1>
          <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 text-body-sm font-medium text-text-muted">
            <li className="inline-flex items-center gap-1.5">
              <Clock className="size-4 shrink-0" aria-hidden="true" />
              {t('missiondetail.published', lang, { when: lang === 'fr' ? lowerFirst(published) : published })}
            </li>
            {place ? (
              <li className="inline-flex items-center gap-1.5">
                {mission.isRemote ? <Globe className="size-4 shrink-0" aria-hidden="true" /> : <MapPin className="size-4 shrink-0" aria-hidden="true" />}
                {place}
              </li>
            ) : null}
            {mission.daysLeft != null ? (
              <li className="inline-flex items-center gap-1.5">
                <Clock className="size-4 shrink-0" aria-hidden="true" />
                {tn('missiondetail.expires', lang, mission.daysLeft)}
              </li>
            ) : null}
          </ul>
        </header>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_376px] lg:items-start">
          {/* ── description-panel (322:11768): plain text, width capped at 640 (D-H10-1: no markdown, no raw HTML) ── */}
          <section className="flex flex-col gap-3 rounded-xl border border-border-subtle bg-surface-base p-6">
            <h2 className="text-body-sm font-semibold text-text-secondary">{t('missiondetail.description_label', lang)}</h2>
            <p className="max-w-[640px] text-body whitespace-pre-line text-text-primary [overflow-wrap:anywhere]">{mission.description}</p>
          </section>

          {/* ── right-col (FIXED 376): the sticky track. top = topbar 64 + 24 so it never sits under the topbar (WCAG 2.2 focus not obscured). ── */}
          <aside className="flex flex-col gap-6 lg:sticky lg:top-[88px]">
            <ClientCard firstName={mission.client.firstName} city={mission.client.city} avatarUrl={mission.client.avatarUrl} lang={lang} />
            <MissionFacts mission={mission} lang={lang}>
              {mission.cta ? <MissionCta state={mission.cta} missionId={mission.id} answeredAt={mission.answeredAt} lang={lang} /> : null}
            </MissionFacts>
          </aside>
        </div>
      </div>
    </AppShell>
  )
}

function lowerFirst(s: string): string {
  return s.charAt(0).toLocaleLowerCase() + s.slice(1)
}
