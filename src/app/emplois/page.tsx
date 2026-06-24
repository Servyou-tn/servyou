import type { Metadata } from 'next'
import Link from 'next/link'
import { MarcheLayout } from '@/components/marche/MarcheLayout'
import { PageHeader } from '@/components/shared/PageHeader'
import { Pagination } from '@/components/shared/Pagination'
import { BriefcaseIcon } from '@/components/marche/icons'
import { JobBoardFilters, type CityOption, type JobFilterSelection } from '@/components/freelance/JobBoardFilters'
import { JobBoardFiltersSheet } from '@/components/freelance/JobBoardFiltersSheet'
import { JobBoardSort } from '@/components/freelance/JobBoardSort'
import { JobPostsList } from '@/components/freelance/JobPostsList'
import { getShellUser } from '@/lib/marche/shell-user'
import {
  getActiveJobPosts,
  getJobFilterCategories,
  getJobSkillOptions,
  parseJobBoardParams,
} from '@/lib/freelance/job-board-data'
import { GOVERNORATES } from '@/lib/tunisia-governorates'
import { getLang } from '@/lib/i18n/server'
import { t } from '@/lib/i18n'
import { CARD_SHADOW, FOCUS_RING } from '@/components/layout/styles'

export const metadata: Metadata = { title: 'Trouver des missions — Servyou' }

const PAGE_SIZE = 20

// The public job board: open project posts (job_posts) a freelancer can browse and respond to.
// PUBLIC — no auth/role gate (browsing is open to everyone, per product.md); it renders through
// the shared MarcheLayout for ALL roles (a marketplace-browse page, not a workspace page), so
// freelancers, consumers, and anonymous visitors get one consistent shell. The job filters live
// in the page content (a left rail at xl+, a bottom sheet below) rather than the nav sidebar,
// because MarcheSidebar injects its filter only on /marche/* routes and consumer code stays
// untouched. Detail route /emplois/[id] ships later (links 404 until then).
export default async function EmploisPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  const params = parseJobBoardParams(sp, PAGE_SIZE)
  const lang = await getLang()

  const shell = await getShellUser()
  const topBarUser = shell?.topBarUser ?? null

  const [categories, skillOptions, { items, total }] = await Promise.all([
    getJobFilterCategories(),
    getJobSkillOptions(),
    getActiveJobPosts(params),
  ])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const isEmpty = total === 0
  const hasFilters =
    params.categories.length > 0 ||
    params.minBudget != null ||
    params.maxBudget != null ||
    params.cities.length > 0 ||
    params.skills.length > 0 ||
    params.postedWithinDays != null

  const cityOptions: CityOption[] = GOVERNORATES.map((g) => ({
    value: g.value,
    label: lang === 'ar' ? g.ar : g.fr,
  }))
  const selected: JobFilterSelection = {
    categories: params.categories,
    minBudget: params.minBudget,
    maxBudget: params.maxBudget,
    cities: params.cities,
    skills: params.skills,
    postedWithin: params.postedWithinDays,
  }

  return (
    <MarcheLayout user={topBarUser}>
      <PageHeader
        subtitle={t('page_header.emplois.subtitle', lang)}
        emphasisWord={t('page_header.emplois.emphasis', lang)}
      />

      {/* Mobile/tablet (<xl): filters behind a button + bottom sheet (desktop shows the rail). */}
      <div className="mb-4 xl:hidden">
        <JobBoardFiltersSheet
          categories={categories}
          cityOptions={cityOptions}
          skillOptions={skillOptions}
          selected={selected}
        />
      </div>

      <div className="xl:grid xl:grid-cols-[240px_minmax(0,1fr)] xl:gap-8">
        {/* Desktop xl+ filter rail (in the content, not the nav sidebar). */}
        <aside className="hidden xl:block">
          <JobBoardFilters
            mode="inline"
            categories={categories}
            cityOptions={cityOptions}
            skillOptions={skillOptions}
            selected={selected}
          />
        </aside>

        <div className="min-w-0">
          {!isEmpty && (
            <div className="mb-4 flex items-center justify-end">
              <JobBoardSort value={params.sort} />
            </div>
          )}

          {isEmpty ? (
            <div className={`rounded-2xl bg-white p-12 text-center ${CARD_SHADOW}`}>
              <div className="mx-auto max-w-md">
                <BriefcaseIcon className="mx-auto h-10 w-10 text-[#B8B8B8]" aria-hidden="true" />
                <p className="mt-4 text-base font-semibold text-text-primary">
                  {t('emplois.empty.title', lang)}
                </p>
                <p className="mt-2 text-[13px] text-text-muted">
                  {t('emplois.empty.description', lang)}
                </p>
                {hasFilters && (
                  <Link
                    href="/emplois"
                    className={`mt-5 inline-flex items-center rounded-full bg-brand-accent px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-accent/90 ${FOCUS_RING}`}
                  >
                    {t('emplois.filters.reset', lang)}
                  </Link>
                )}
              </div>
            </div>
          ) : (
            <>
              <JobPostsList items={items} />
              <div className="mt-8">
                <Pagination page={params.page} totalPages={totalPages} basePath="/emplois" />
              </div>
            </>
          )}
        </div>
      </div>
    </MarcheLayout>
  )
}
