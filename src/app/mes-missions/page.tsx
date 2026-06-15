import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { MarcheLayout } from '@/components/marche/MarcheLayout'
import { PageHeader } from '@/components/marche/PageHeader'
import { EmptyState } from '@/components/marche/EmptyState'
import { MissionCard } from '@/components/marche/MissionCard'
import { getShellUser } from '@/lib/marche/shell-user'
import { getMyMissions } from '@/lib/marche/my-data'
import { getLang } from '@/lib/i18n/server'
import { t } from '@/lib/i18n'
import { FOCUS_RING } from '@/components/layout/styles'
import { BriefcaseIcon } from '@/components/marche/icons'

export const metadata: Metadata = { title: 'Mes missions — Servyou' }

// The consumer's own job posts + response counts. Auth-gated (own data).
export default async function MesMissionsPage() {
  const shell = await getShellUser()
  if (!shell) redirect('/connexion')

  const lang = await getLang()
  const missions = await getMyMissions(shell.id)

  const newButton = (
    <Link
      href="/mes-missions/nouvelle"
      className={`inline-flex items-center rounded-full bg-brand-accent px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-accent-light ${FOCUS_RING}`}
    >
      {t('mesmissions.new', lang)}
    </Link>
  )

  return (
    <MarcheLayout user={shell.topBarUser}>
      <PageHeader
        title={t('marche.sidebar.missions', lang)}
        countLabel={missions.length > 0 ? t('mesmissions.count', lang, { n: missions.length }) : undefined}
        action={missions.length > 0 ? newButton : undefined}
      />

      {missions.length === 0 ? (
        <EmptyState
          icon={<BriefcaseIcon className="mx-auto h-12 w-12" />}
          message={t('mesmissions.empty', lang)}
          cta={{ label: t('mesmissions.empty_cta', lang), href: '/mes-missions/nouvelle' }}
        />
      ) : (
        <div className="flex flex-col gap-4">
          {missions.map((m) => (
            <MissionCard key={m.id} mission={m} />
          ))}
        </div>
      )}
    </MarcheLayout>
  )
}
