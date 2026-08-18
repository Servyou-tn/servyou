import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { AppShell } from '@/components/shell/AppShell'
import { MissionDetail } from '@/components/marche/MissionDetail'
import { getShellUser } from '@/lib/marche/shell-user'
import { getMissionDetail } from '@/lib/marche/mission-detail'
import { getLang } from '@/lib/i18n/server'
import { t } from '@/lib/i18n'
import { CARD_SHADOW, FOCUS_RING } from '@/components/layout/styles'

type Props = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const shell = await getShellUser()
  const mission = shell ? await getMissionDetail(id, shell.id) : null // cached — shared with the page
  return { title: mission?.title ? `${mission.title} — Servyou` : 'Mission — Servyou' }
}

// The consumer's mission-detail page. Auth-gated (own post) → logged-out visitors are sent to
// /connexion?next=/mes-missions/[id]. getMissionDetail re-checks author ownership on top of RLS
// (defense in depth); a non-owner, a missing post, an invalid id, or a soft-deleted post all
// yield the same not-found state — no information leak about whether an id exists.
export default async function MissionDetailPage({ params }: Props) {
  const { id } = await params
  const lang = await getLang()

  const shell = await getShellUser()
  if (!shell) redirect(`/connexion?next=${encodeURIComponent(`/mes-missions/${id}`)}`)

  const mission = await getMissionDetail(id, shell.id)
  if (!mission) {
    return (
      <AppShell user={shell.topBarUser}>
        <div className={`mx-auto max-w-md rounded-2xl bg-white p-12 text-center ${CARD_SHADOW}`}>
          <h1 className="text-lg font-semibold text-text-primary">{t('missions.detail.not_found', lang)}</h1>
          <p className="mt-2 text-sm text-text-muted">{t('missions.detail.not_found_desc', lang)}</p>
          <Link
            href="/mes-missions"
            className={`mt-6 inline-flex items-center rounded-full bg-brand-blue-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-blue-500 ${FOCUS_RING}`}
          >
            {t('missions.detail.back', lang)}
          </Link>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell user={shell.topBarUser}>
      <MissionDetail mission={mission} />
    </AppShell>
  )
}
