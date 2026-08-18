import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { AppShell } from '@/components/shell/AppShell'
import { PageHeader } from '@/components/marche/PageHeader'
import { EmptyState } from '@/components/marche/EmptyState'
import { AnnonceCard } from '@/components/marche/AnnonceCard'
import { getShellUser } from '@/lib/marche/shell-user'
import { getMyAnnonces } from '@/lib/marche/my-data'
import { paginate } from '@/lib/search/search-params'
import { Pagination } from '@/components/shared/Pagination'
import { getLang } from '@/lib/i18n/server'
import { t } from '@/lib/i18n'
import { FOCUS_RING } from '@/components/layout/styles'
import { BriefcaseIcon } from '@/components/marche/icons'

export const metadata: Metadata = { title: 'Mes annonces — Servyou' }

// The consumer's own job posts + response counts. Auth-gated (own data). The full set is
// fetched and paginated in JS (?page=) via the shared helper — same posture as the search
// engines; the count + empty-state read the full list, only the rendered grid is the slice.
export default async function MesAnnoncesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const shell = await getShellUser()
  if (!shell) redirect('/connexion')

  const lang = await getLang()
  const annonces = await getMyAnnonces(shell.id)

  const sp = await searchParams
  const rawPage = Array.isArray(sp.page) ? sp.page[0] : sp.page
  const { totalPages, safePage, start, end } = paginate(
    annonces.length,
    Math.max(1, Number.parseInt(rawPage ?? '1', 10) || 1),
  )
  const pageAnnonces = annonces.slice(start, end)

  const newButton = (
    <Link
      href="/mes-annonces/nouvelle"
      className={`inline-flex items-center rounded-full bg-brand-blue-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-blue-500 ${FOCUS_RING}`}
    >
      {t('mesannonces.new', lang)}
    </Link>
  )

  return (
    <AppShell user={shell.topBarUser}>
      <PageHeader
        title={t('mesannonces.title', lang)}
        countLabel={annonces.length > 0 ? t('mesannonces.count', lang, { n: annonces.length }) : undefined}
        action={annonces.length > 0 ? newButton : undefined}
      />

      {annonces.length === 0 ? (
        <EmptyState
          icon={<BriefcaseIcon className="mx-auto h-12 w-12" />}
          message={t('mesannonces.empty', lang)}
          cta={{ label: t('mesannonces.empty_cta', lang), href: '/mes-annonces/nouvelle' }}
        />
      ) : (
        <>
          <div className="flex flex-col gap-4">
            {pageAnnonces.map((a) => (
              <AnnonceCard key={a.id} annonce={a} />
            ))}
          </div>
          <div className="mt-8">
            <Pagination page={safePage} totalPages={totalPages} basePath="/mes-annonces" />
          </div>
        </>
      )}
    </AppShell>
  )
}
