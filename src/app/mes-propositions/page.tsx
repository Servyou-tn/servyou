import type { Metadata } from 'next'
import Link from 'next/link'
import { CheckCircle, Inbox, Send, TrendingUp } from 'lucide-react'
import { AppShell } from '@/components/shell/AppShell'
import { Pagination } from '@/components/shared/Pagination'
import { SortSelect } from '@/components/orders/SortSelect'
import { FOCUS_RING } from '@/components/layout/styles'
import { BASE as BUTTON_BASE, SIZE as BUTTON_SIZE, VARIANT_BASE, VARIANT_STATE } from '@/components/ui/button'
import { requireFreelancer } from '@/lib/auth/require-seller'
import {
  DEFAULT_PROPOSAL_SORT,
  DEFAULT_PROPOSAL_TAB,
  PROPOSAL_SORTS,
  PROPOSAL_TABS,
  PROPOSALS_PER_PAGE,
  type ProposalSort,
  type ProposalTab,
} from '@/lib/marche/proposals'
import { getMyProposals } from '@/lib/marche/proposals-query'
import { getLang } from '@/lib/i18n/server'
import { t, tn } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { StatTile } from '@/components/shared/StatTile'
import { ProposalRow } from './_components/ProposalRow'
import { ProposalSearch } from './_components/ProposalSearch'
import { COL } from './_components/proposal-columns'

export const metadata: Metadata = { title: 'Mes propositions — Servyou' }

const ROUTE = '/mes-propositions'

// H11 « Mes propositions » — Figma 298:9129 (PropositionRow 296:9022), measured in docs/design/h9-h13-measurements.md §5. The
// freelancer's own job_responses, each seen through the state of the post it answers. The frame was cloned from H8, so the page is
// H8's scaffold (header · 4 StatTiles · tab <nav> of Links · search · sort · table · Pagination) with H11's content.
//
// Decisions (PR body): D-H11-1 closed rows still open the mission (read-only closed state, M-B) · D-H11-2 the kebab's « Retirer ma
// proposition » (open posts only) · D-H11-3 sort Plus récentes / Plus anciennes · D-H11-4 « Ce mois » in Africa/Tunis · D-H11-5
// search = mission title + client first name · D-H11-7 default tab « Toutes » · D-H11-8 10 per page + three empty states.
// ⚑ NO MOBILE FRAME and no pagination / empty-state frame exist — everything below `xl` and those states are derived from H8's.

function parseTab(v: string | undefined): ProposalTab {
  return (PROPOSAL_TABS as readonly string[]).includes(v ?? '') ? (v as ProposalTab) : DEFAULT_PROPOSAL_TAB
}

function parseSort(v: string | undefined): ProposalSort {
  return (PROPOSAL_SORTS as readonly string[]).includes(v ?? '') ? (v as ProposalSort) : DEFAULT_PROPOSAL_SORT
}

function first(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v
}

export default async function MesPropositionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  const lang = await getLang()
  const { userId, topBarUser } = await requireFreelancer(ROUTE)

  const tab = parseTab(first(sp.statut))
  const sort = parseSort(first(sp.tri))
  const q = (first(sp.q) ?? '').slice(0, 100)
  const page = Math.max(1, Math.floor(Number(first(sp.page) ?? '1')) || 1)

  const data = await getMyProposals(userId, { tab, q, sort, page })

  const hrefFor = (next: { statut?: ProposalTab; tri?: ProposalSort }) => {
    const params = new URLSearchParams()
    const s = next.statut ?? tab
    const o = next.tri ?? sort
    if (s !== DEFAULT_PROPOSAL_TAB) params.set('statut', s)
    if (o !== DEFAULT_PROPOSAL_SORT) params.set('tri', o)
    if (q) params.set('q', q)
    // Changing tab or sort starts over at page 1: the old page number would land out of range on a different result set.
    const qs = params.toString()
    return qs ? `${ROUTE}?${qs}` : ROUTE
  }

  const noneAtAll = data.stats.sent === 0
  const emptyKey = noneAtAll
    ? 'propositions.empty_none'
    : q
      ? 'propositions.empty_search'
      : tab === 'active'
        ? 'propositions.empty_active'
        : tab === 'closed'
          ? 'propositions.empty_closed'
          : 'propositions.empty_search'
  const showFindCta = noneAtAll || (!q && tab === 'active')
  const findMissions = cn(BUTTON_BASE, BUTTON_SIZE.md, VARIANT_BASE.primary, VARIANT_STATE.primary, 'w-fit')

  return (
    <AppShell user={topBarUser}>
      <div className="flex flex-col gap-6">
        {/* ── page-header (298:9134): title 32 Bold over a 16 muted line, ghost « Trouver des missions → » ── */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="text-h1 text-text-primary">{t('propositions.title', lang)}</h1>
            <p className="text-body text-text-muted">{t('propositions.subtitle', lang)}</p>
          </div>
          <Link
            href="/trouver-des-missions"
            className={cn(BUTTON_BASE, BUTTON_SIZE.md, VARIANT_BASE.ghost, VARIANT_STATE.ghost, 'w-fit shrink-0')}
          >
            {t('propositions.find_missions', lang)}
          </Link>
        </div>

        {/* ── stats (298:9139): 4 tiles, gap 16. Fermées is the recessive grey circle; Actives carries the one coloured caption. ── */}
        <div className="flex flex-wrap gap-4">
          <StatTile
            label={t('propositions.tile.sent', lang)}
            value={String(data.stats.sent)}
            icon={Send}
            accent="blue"
            subtitle={t('propositions.tile.sent_sub', lang)}
          />
          <StatTile
            label={t('propositions.tile.active', lang)}
            value={t('propositions.tile.active_value', lang, { count: data.stats.active, max: data.stats.activeMax })}
            icon={Inbox}
            accent="warning"
            subtitle={t('propositions.tile.active_sub', lang)}
            subtitleTone="warning"
          />
          <StatTile
            label={t('propositions.tile.closed', lang)}
            value={String(data.stats.closed)}
            icon={CheckCircle}
            accent="neutral"
            subtitle={t('propositions.tile.closed_sub', lang)}
          />
          <StatTile
            label={t('propositions.tile.month', lang)}
            value={String(data.stats.thisMonth)}
            icon={TrendingUp}
            accent="blue"
            subtitle={t('propositions.tile.month_sub', lang)}
          />
        </div>

        {/* ── filter-bar (298:9168): tabs ⟷ [search 372 · sort 180] ── */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-end justify-between gap-4">
            {/* A <nav> of links, not role="tablist": every item is a full-page navigation (the H8 reasoning). Tab Item h 44 px 16,
                active = Semi Bold blue/600 + 2 px indicator, inactive = Medium text/muted, 1 px border/subtle rule under the strip. */}
            <nav
              aria-label={t('propositions.tabs_aria', lang)}
              className="flex min-w-0 max-w-full overflow-x-auto border-b border-border-subtle"
            >
              {PROPOSAL_TABS.map((key) => {
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
                    {t(`propositions.tab.${key}`, lang)}
                    {active ? <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-0.5 bg-brand-blue-600" /> : null}
                  </Link>
                )
              })}
            </nav>

            <div className="flex w-full flex-wrap items-center gap-3 sm:w-auto">
              <ProposalSearch key={q} q={q} lang={lang} />
              <SortSelect
                value={sort}
                options={PROPOSAL_SORTS.map((o) => ({
                  value: o,
                  label: t(`propositions.sort.${o}`, lang),
                  href: hrefFor({ tri: o }),
                }))}
                label={t('propositions.sort_aria', lang)}
              />
            </div>
          </div>

          <p className="text-body-sm text-text-secondary">{tn('propositions.count', lang, data.totalCount)}</p>
        </div>

        {/* ── propositions-table (298:9173) ── */}
        {data.proposals.length === 0 ? (
          <div className="flex flex-col items-center gap-5 rounded-2xl border border-border-subtle bg-surface-base px-10 py-12 text-center">
            <span className="flex h-28 w-28 items-center justify-center rounded-full bg-surface-pill">
              <Send className="h-16 w-16 text-icon-muted" aria-hidden="true" />
            </span>
            <div className="flex flex-col gap-2">
              <p className="text-h3 text-text-primary">{t(`${emptyKey}_title`, lang)}</p>
              <p className="text-body text-text-secondary">{t(`${emptyKey}_body`, lang)}</p>
            </div>
            {showFindCta ? (
              <Link href="/trouver-des-missions" className={findMissions}>
                {t('propositions.empty_cta', lang)}
              </Link>
            ) : null}
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border-subtle bg-surface-base">
            {/* table-header: surface/subtle, py 12, Medium 12 / 17 uppercase tracking 0.24; widths come from COL, shared with the
                rows. xl only — below it each row labels its own cells. */}
            <div
              aria-hidden="true"
              className={`hidden items-center border-b border-border-subtle bg-surface-subtle py-3 text-caption font-medium uppercase tracking-[0.24px] text-text-muted xl:flex ${COL.line}`}
            >
              <span className={COL.mission}>{t('propositions.col.mission', lang)}</span>
              <span className={COL.client}>{t('propositions.col.client', lang)}</span>
              <span className={COL.terms}>{t('propositions.col.terms', lang)}</span>
              <span className={COL.statut}>{t('propositions.col.status', lang)}</span>
              <span className={COL.sentOn}>{t('propositions.col.sent_on', lang)}</span>
              <span className={COL.actions} />
            </div>
            <ul>
              {data.proposals.map((proposal) => (
                <ProposalRow key={proposal.id} proposal={proposal} lang={lang} />
              ))}
            </ul>
          </div>
        )}

        <Pagination
          page={data.page}
          totalPages={data.totalPages}
          basePath={ROUTE}
          totalItems={data.totalCount}
          perPage={PROPOSALS_PER_PAGE}
        />
      </div>
    </AppShell>
  )
}
