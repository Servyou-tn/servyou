import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { AppShell } from '@/components/shell/AppShell'
import { PageHeader } from '@/components/marche/PageHeader'
import { PageHeader as PageSubtitle } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/marche/EmptyState'
import { MissionCard } from '@/components/marche/MissionCard'
import { getShellUser } from '@/lib/marche/shell-user'
import { getMyMissions } from '@/lib/marche/my-data'
import { paginate } from '@/lib/search/search-params'
import { Pagination } from '@/components/shared/Pagination'
import { getLang } from '@/lib/i18n/server'
import { t } from '@/lib/i18n'
import { FOCUS_RING } from '@/components/layout/styles'
import { BriefcaseIcon } from '@/components/marche/icons'

export const metadata: Metadata = { title: 'Mes missions — Servyou' }

// The consumer's own job posts + response counts. Auth-gated (own data). The full set is
// fetched and paginated in JS (?page=) via the shared helper — same posture as the search
// engines; the count + empty-state read the full list, only the rendered grid is the slice.
export default async function MesMissionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const shell = await getShellUser()
  if (!shell) redirect('/connexion')

  const lang = await getLang()
  const missions = await getMyMissions(shell.id)

  const sp = await searchParams
  const rawPage = Array.isArray(sp.page) ? sp.page[0] : sp.page
  const { totalPages, safePage, start, end } = paginate(
    missions.length,
    Math.max(1, Number.parseInt(rawPage ?? '1', 10) || 1),
  )
  const pageMissions = missions.slice(start, end)

  const newButton = (
    <Link
      href="/mes-missions/nouvelle"
      className={`inline-flex items-center rounded-full bg-brand-accent px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-accent-light ${FOCUS_RING}`}
    >
      {t('mesmissions.new', lang)}
    </Link>
  )

  return (
    <AppShell user={shell.topBarUser}>
      <PageSubtitle
        subtitle={t('page_header.missions.subtitle', lang)}
        emphasisWord={t('page_header.missions.emphasis', lang)}
      />
      {missions.length > 0 && (
        <PageHeader
          countLabel={t('mesmissions.count', lang, { n: missions.length })}
          action={newButton}
        />
      )}

      {missions.length === 0 ? (
        <EmptyState
          icon={<BriefcaseIcon className="mx-auto h-12 w-12" />}
          message={t('mesmissions.empty', lang)}
          cta={{ label: t('mesmissions.empty_cta', lang), href: '/mes-missions/nouvelle' }}
        />
      ) : (
        <>
          <div className="flex flex-col gap-4">
            {pageMissions.map((m) => (
              <MissionCard key={m.id} mission={m} />
            ))}
          </div>
          <div className="mt-8">
            <Pagination page={safePage} totalPages={totalPages} basePath="/mes-missions" />
          </div>
        </>
      )}
    </AppShell>
  )
}
