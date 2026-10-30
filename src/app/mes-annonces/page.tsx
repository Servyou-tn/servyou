import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Inbox, Megaphone, MessageSquare, Send, UserCheck } from 'lucide-react'
import { AppShell } from '@/components/shell/AppShell'
import { EmptyState } from '@/components/marche/EmptyState'
import { ErrorState } from '@/components/marche/ErrorState'
import { Pagination } from '@/components/shared/Pagination'
import { StatTile } from '@/components/shared/StatTile'
import { SortSelect } from '@/components/orders/SortSelect'
import { FOCUS_RING } from '@/components/layout/styles'
import { BASE as BUTTON_BASE, SIZE as BUTTON_SIZE, VARIANT_BASE, VARIANT_STATE } from '@/components/ui/button'
import { settle } from '@/lib/supabase/query-error'
import { getShellUser } from '@/lib/marche/shell-user'
import { getMyAnnonces } from '@/lib/marche/my-data'
import {
  ANNONCES_PER_PAGE,
  ANNONCE_SORTS,
  ANNONCE_TABS,
  DEFAULT_ANNONCE_SORT,
  DEFAULT_ANNONCE_TAB,
  pageAnnonces,
  type AnnonceSort,
  type AnnonceTab,
} from '@/lib/marche/annonces-list'
import { getLang } from '@/lib/i18n/server'
import { t, tn } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { AnnonceRow } from './_components/AnnonceRow'
import { AnnonceSearch } from './_components/AnnonceSearch'
import { COL } from './_components/annonce-columns'

export const metadata: Metadata = { title: 'Mes annonces — Servyou' }

const ROUTE = '/mes-annonces'

// F3 « Mes annonces » — Figma 1476:27949 (+ 375 frame 1488:64945), measured in docs/design/mes-annonces-measurements.md. The consumer's own
// job posts and the proposals they received. The frame is H11's scaffold (header · 4 StatTiles · tab <nav> of Links · search · sort ·
// table · Pagination) with annonce content; tab / search / sort / page live in the URL (?statut= ?q= ?tri= ?page=) so the page stays a
// Server Component. Decisions D8 (sort options), D9 (moderation notice + countdown kept on the row), D12 (stat sources): deltas doc.

function parseTab(v: string | undefined): AnnonceTab {
  return (ANNONCE_TABS as readonly string[]).includes(v ?? '') ? (v as AnnonceTab) : DEFAULT_ANNONCE_TAB
}

function parseSort(v: string | undefined): AnnonceSort {
  return (ANNONCE_SORTS as readonly string[]).includes(v ?? '') ? (v as AnnonceSort) : DEFAULT_ANNONCE_SORT
}

function first(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v
}

export default async function MesAnnoncesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const shell = await getShellUser()
  if (!shell) redirect('/connexion')

  const lang = await getLang()
  const publishButton = (
    <Link
      href="/mes-annonces/nouvelle"
      className={cn(BUTTON_BASE, BUTTON_SIZE.md, VARIANT_BASE.primary, VARIANT_STATE.primary, 'w-full shrink-0 sm:w-fit')}
    >
      {t('mesannonces.publish', lang)}
    </Link>
  )
  const header = (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex min-w-0 flex-col gap-1">
        <h1 className="text-h1 text-text-primary">{t('mesannonces.title', lang)}</h1>
        <p className="text-body text-text-muted">{t('mesannonces.subtitle', lang)}</p>
      </div>
      {publishButton}
    </div>
  )

  const loaded = await settle('mes-annonces', getMyAnnonces(shell.id))

  // A failed read is an inline error state inside the shell — never « you have no annonces ».
  if (!loaded.ok) {
    return (
      <AppShell user={shell.topBarUser}>
        <div className="flex flex-col gap-6">
          {header}
          <ErrorState lang={lang} />
        </div>
      </AppShell>
    )
  }

  const sp = await searchParams
  const tab = parseTab(first(sp.statut))
  const sort = parseSort(first(sp.tri))
  const q = (first(sp.q) ?? '').slice(0, 100)
  const page = Math.max(1, Math.floor(Number(first(sp.page) ?? '1')) || 1)

  const data = pageAnnonces(loaded.data, { tab, q, sort, page })

  const hrefFor = (next: { statut?: AnnonceTab; tri?: AnnonceSort }) => {
    const params = new URLSearchParams()
    const s = next.statut ?? tab
    const o = next.tri ?? sort
    if (s !== DEFAULT_ANNONCE_TAB) params.set('statut', s)
    if (o !== DEFAULT_ANNONCE_SORT) params.set('tri', o)
    if (q) params.set('q', q)
    // Changing tab or sort starts over at page 1: the old page number would land out of range on a different result set.
    const qs = params.toString()
    return qs ? `${ROUTE}?${qs}` : ROUTE
  }

  const noneAtAll = data.stats.published === 0

  return (
    <AppShell user={shell.topBarUser}>
      <div className="flex flex-col gap-6">
        {header}

        {noneAtAll ? (
          <EmptyState
            icon={<Megaphone className="mx-auto h-12 w-12" />}
            message={t('mesannonces.empty', lang)}
            cta={{ label: t('mesannonces.empty_cta', lang), href: '/mes-annonces/nouvelle' }}
          />
        ) : (
          <>
            {/* ── stats (1476:27959): 4 equal tiles, gap 16 (2 × 2 at 375: 165 + 12 + 165). Real counts over ALL annonces, never fake. ── */}
            <div className="flex flex-wrap gap-3 sm:gap-4">
              <StatTile
                label={t('mesannonces.tile.published', lang)}
                value={String(data.stats.published)}
                icon={Send}
                accent="blue"
                subtitle={t('mesannonces.tile.published_sub', lang)}
              />
              <StatTile
                label={t('mesannonces.tile.open', lang)}
                value={t('mesannonces.tile.open_value', lang, { count: data.stats.open, total: data.stats.published })}
                icon={Inbox}
                accent="warning"
                subtitle={t('mesannonces.tile.open_sub', lang)}
                subtitleTone="warning"
              />
              <StatTile
                label={t('mesannonces.tile.proposals', lang)}
                value={String(data.stats.proposals)}
                icon={MessageSquare}
                accent="neutral"
                subtitle={t('mesannonces.tile.proposals_sub', lang)}
              />
              <StatTile
                label={t('mesannonces.tile.filled', lang)}
                value={String(data.stats.filled)}
                icon={UserCheck}
                accent="blue"
                subtitle={t('mesannonces.tile.filled_sub', lang)}
              />
            </div>

            {/* ── filter-bar (1476:27988): tabs ⟷ [search 372 · sort 180] ── */}
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap items-end justify-between gap-4">
                {/* A <nav> of links, not role="tablist": every item is a full-page navigation (the H8 / H11 reasoning). Tab Item h 44
                    px 16, active = Semi Bold blue/600 + 2 px indicator, inactive = Medium text/muted, 1 px border/subtle rule. */}
                <nav
                  aria-label={t('mesannonces.tabs_aria', lang)}
                  className="flex min-w-0 max-w-full overflow-x-auto border-b border-border-subtle"
                >
                  {ANNONCE_TABS.map((key) => {
                    const active = key === tab
                    return (
                      <Link
                        key={key}
                        href={hrefFor({ statut: key })}
                        aria-current={active ? 'page' : undefined}
                        className={cn(
                          'relative flex h-11 shrink-0 items-center justify-center px-4 text-body whitespace-nowrap transition-colors',
                          active ? 'font-semibold text-brand-blue-600' : 'font-medium text-text-muted hover:text-text-primary',
                          FOCUS_RING,
                        )}
                      >
                        {t(`mesannonces.tab.${key}`, lang)}
                        {active ? <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-0.5 bg-brand-blue-600" /> : null}
                      </Link>
                    )
                  })}
                </nav>

                <div className="flex w-full flex-wrap items-center gap-3 sm:w-auto">
                  <AnnonceSearch key={q} q={q} lang={lang} />
                  <SortSelect
                    value={sort}
                    options={ANNONCE_SORTS.map((o) => ({
                      value: o,
                      label: t(`mesannonces.sort.${o}`, lang),
                      href: hrefFor({ tri: o }),
                    }))}
                    label={t('mesannonces.sort_aria', lang)}
                  />
                </div>
              </div>

              <p className="text-body-sm text-text-secondary">{tn('mesannonces.count', lang, data.totalCount)}</p>
            </div>

            {/* ── propositions-table (1476:27993) ── */}
            {data.annonces.length === 0 ? (
              <EmptyState
                icon={<Megaphone className="mx-auto h-12 w-12" />}
                message={t('mesannonces.empty_filtered_title', lang)}
                subtitle={t('mesannonces.empty_filtered_body', lang)}
              />
            ) : (
              <div className="overflow-hidden rounded-xl border border-border-subtle bg-surface-base">
                {/* table-header: surface/subtle, py 12, Medium 12 / 17 uppercase tracking 0.24; widths come from COL, shared with the
                    rows. xl only — below it the rows stack as cards. */}
                <div
                  aria-hidden="true"
                  className={`hidden items-center border-b border-border-subtle bg-surface-subtle py-3 text-caption font-medium uppercase tracking-[0.24px] text-text-muted xl:flex ${COL.line}`}
                >
                  <span className={COL.mission}>{t('mesannonces.col.mission', lang)}</span>
                  <span className={COL.proposals}>{t('mesannonces.col.proposals', lang)}</span>
                  <span className={COL.budget}>{t('mesannonces.col.budget', lang)}</span>
                  <span className={COL.statut}>{t('mesannonces.col.status', lang)}</span>
                  <span className={COL.publishedOn}>{t('mesannonces.col.published_on', lang)}</span>
                  <span className={COL.actions} />
                </div>
                <ul>
                  {data.annonces.map((annonce) => (
                    <AnnonceRow key={annonce.id} annonce={annonce} lang={lang} />
                  ))}
                </ul>
              </div>
            )}

            <Pagination
              page={data.page}
              totalPages={data.totalPages}
              basePath={ROUTE}
              totalItems={data.totalCount}
              perPage={ANNONCES_PER_PAGE}
            />
          </>
        )}
      </div>
    </AppShell>
  )
}
