import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { AppShell } from '@/components/shell/AppShell'
import { PageHeader } from '@/components/marche/PageHeader'
import { EmptyState } from '@/components/marche/EmptyState'
import { AnnonceCard } from '@/components/marche/AnnonceCard'
import { getShellUser } from '@/lib/marche/shell-user'
import { getMyAnnonces } from '@/lib/marche/my-data'
import { paginate, PER_PAGE } from '@/lib/search/search-params'
import { Pagination } from '@/components/shared/Pagination'
import { getLang } from '@/lib/i18n/server'
import { t } from '@/lib/i18n'
import { BriefcaseIcon } from '@/components/marche/icons'
import { BASE as BUTTON_BASE, SIZE as BUTTON_SIZE, VARIANT_BASE, VARIANT_STATE } from '@/components/ui/button'
import { cn } from '@/lib/utils'

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

  // A real <a> (navigation, not an action) styled with Button's own class recipe — same single
  // source of truth as the primitive, without rendering the primitive's hardcoded <button>.
  const newButton = (
    <Link
      href="/mes-annonces/nouvelle"
      className={cn(BUTTON_BASE, BUTTON_SIZE.md, VARIANT_BASE.primary, VARIANT_STATE.primary)}
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
          {/* Deliberately diverges from ListingResults.tsx:26's lg:grid-cols-3: this card's
              budget row is a wider, dominant figure than a service card's price, so 3-up at
              lg (1024, minus the 240px sidebar) gives ~208px columns and wraps a "min – max"
              range mid-value. xl:grid-cols-3 holds this card at 2-up through 1279, landing
              3-up only once a column is ~355px+ (1280+). */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 xl:grid-cols-3">
            {pageAnnonces.map((a) => (
              <AnnonceCard key={a.id} annonce={a} />
            ))}
          </div>
          <div className="mt-8">
            <Pagination
              page={safePage}
              totalPages={totalPages}
              basePath="/mes-annonces"
              totalItems={annonces.length}
              perPage={PER_PAGE}
            />
          </div>
        </>
      )}
    </AppShell>
  )
}
