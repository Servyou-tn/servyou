import type { Metadata } from 'next'
import Link from 'next/link'
import { Briefcase, CheckCircle, Handshake, Inbox, LayoutGrid } from 'lucide-react'
import { AppShell } from '@/components/shell/AppShell'
import { Pagination } from '@/components/shared/Pagination'
import { SortSelect } from '@/components/orders/SortSelect'
import { FOCUS_RING } from '@/components/layout/styles'
import { BASE as BUTTON_BASE, SIZE as BUTTON_SIZE, VARIANT_BASE, VARIANT_STATE } from '@/components/ui/button'
import { requireFreelancer } from '@/lib/auth/require-seller'
import {
  DEFAULT_ENGAGEMENT_SORT,
  DEFAULT_ENGAGEMENT_TAB,
  ENGAGEMENT_SORTS,
  ENGAGEMENT_TABS,
  ENGAGEMENTS_PER_PAGE,
  type EngagementSort,
  type EngagementTab,
} from '@/lib/marche/engagements'
import { getEngagements } from '@/lib/marche/engagements-query'
import { getLang } from '@/lib/i18n/server'
import { t, tn } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { StatTile } from '@/app/mes-services/_components/StatTile'
import { EngagementRow } from './_components/EngagementRow'
import { EngagementSearch } from './_components/EngagementSearch'

export const metadata: Metadata = { title: 'Mes engagements — Servyou' }

const ROUTE = '/mes-engagements'

// H8 « Mes engagements » — Figma 273:8575 (right column 273:8577), measured in docs/design/h8-measurements.md;
// the freelancer's inbox of SERVICE orders. Until now this route was a ComingSoon placeholder and
// /commandes-recues is guarded by requireShopOwner, so a freelancer could neither see nor answer an order.
//
// PR-1 of 3: the list, its tiles / tabs / search / sort, and the row actions (Accepter · Marquer livré ·
// WhatsApp · Annuler). PR-2 is the detail page (/mes-engagements/[id] — the « Voir » links point at it),
// PR-3 the deadline (needs a migration).
//
// Architect rulings, all deviations from the frame (docs/design/h8-measurements.md §5 lists what it omits):
//   D1  a leading « À traiter » tab (pending) is the default landing — the frame draws no pending state;
//   D3  « Dès X TND » from orders.unit_price_tnd;
//   D4  no échéance and no « À livrer » tile (no deadline column yet): the second tile is « À traiter »,
//       the fourth column « Délai souhaité » (what the buyer asked for);
//   D9  « En cours » = accepted only.
// ⚑ NO MOBILE FRAME exists for H8 — everything below `lg` is derived from H5's ServiceRow / G8's row.

function parseTab(v: string | undefined): EngagementTab {
  return (ENGAGEMENT_TABS as readonly string[]).includes(v ?? '') ? (v as EngagementTab) : DEFAULT_ENGAGEMENT_TAB
}

function parseSort(v: string | undefined): EngagementSort {
  return (ENGAGEMENT_SORTS as readonly string[]).includes(v ?? '') ? (v as EngagementSort) : DEFAULT_ENGAGEMENT_SORT
}

function first(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v
}

export default async function MesEngagementsPage({
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
  const page = Math.max(1, Number(first(sp.page) ?? '1') || 1)

  const data = await getEngagements(userId, { tab, q, sort, page })

  const hrefFor = (next: { statut?: EngagementTab; tri?: EngagementSort }) => {
    const params = new URLSearchParams()
    const s = next.statut ?? tab
    const o = next.tri ?? sort
    if (s !== DEFAULT_ENGAGEMENT_TAB) params.set('statut', s)
    if (o !== DEFAULT_ENGAGEMENT_SORT) params.set('tri', o)
    if (q) params.set('q', q)
    // Changing tab or sort starts over at page 1 — the old page number would land on an out-of-range
    // page of a different result set.
    const qs = params.toString()
    return qs ? `${ROUTE}?${qs}` : ROUTE
  }

  const noEngagementsAtAll = data.stats.total === 0
  const emptyKey = noEngagementsAtAll
    ? 'engagements.empty_none'
    : q
      ? 'engagements.empty_search'
      : tab === 'a_traiter'
        ? 'engagements.empty_a_traiter'
        : 'engagements.empty_tab'

  return (
    <AppShell user={topBarUser}>
      <div className="flex flex-col gap-6">
        {/* ── page-header (273:8580): title 32 Bold over a 16 muted line, ghost « Trouver des missions → » ── */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="text-h1 text-text-primary">{t('engagements.title', lang)}</h1>
            <p className="text-body text-text-muted">{t('engagements.subtitle', lang)}</p>
          </div>
          <Link
            href="/trouver-des-missions"
            className={cn(BUTTON_BASE, BUTTON_SIZE.md, VARIANT_BASE.ghost, VARIANT_STATE.ghost, 'w-fit shrink-0')}
          >
            {t('engagements.find_missions', lang)}
          </Link>
        </div>

        {/* ── stats (273:8583): 4 tiles, gap 16. Tile 2 is « À traiter », not the frame's « À livrer » (D4). ── */}
        <div className="flex flex-wrap gap-4">
          <StatTile
            label={t('engagements.tile.in_progress', lang)}
            value={String(data.stats.inProgress)}
            icon={Briefcase}
            accent="blue"
            subtitle={t('engagements.tile.in_progress_sub', lang)}
          />
          <StatTile
            label={t('engagements.tile.to_handle', lang)}
            value={String(data.stats.toHandle)}
            icon={Inbox}
            accent="warning"
            subtitle={t('engagements.tile.to_handle_sub', lang)}
          />
          <StatTile
            label={t('engagements.tile.done', lang)}
            value={String(data.stats.done)}
            icon={CheckCircle}
            accent="success"
            subtitle={t('engagements.tile.done_sub', lang)}
          />
          <StatTile
            label={t('engagements.tile.total', lang)}
            value={String(data.stats.total)}
            icon={LayoutGrid}
            accent="blue"
            subtitle={t('engagements.tile.total_sub', lang)}
          />
        </div>

        {/* ── filter-bar (273:8614): tabs ⟷ [search 372 · sort] ── */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-end justify-between gap-4">
            {/* Underlined text tabs, Figma 273:9054: Tab Item h 44 px 16, active = Semi Bold blue/600 with a
                2 px bottom indicator, inactive = Medium text/muted, a 1 px border/subtle rule under the strip,
                NO count chips.
                derived: the strip scrolls horizontally below-lg so the active tab stays reachable (G8). */}
            <div
              role="tablist"
              aria-label={t('engagements.tabs_aria', lang)}
              className="flex min-w-0 max-w-full overflow-x-auto border-b border-border-subtle"
            >
              {ENGAGEMENT_TABS.map((key) => {
                const active = key === tab
                return (
                  <Link
                    key={key}
                    href={hrefFor({ statut: key })}
                    role="tab"
                    aria-selected={active}
                    className={cn(
                      'relative flex h-11 shrink-0 items-center justify-center px-4 text-body whitespace-nowrap transition-colors',
                      active
                        ? 'font-semibold text-brand-blue-600'
                        : 'font-medium text-text-muted hover:text-text-primary',
                      FOCUS_RING,
                    )}
                  >
                    {t(`engagements.tab.${key}`, lang)}
                    {active ? (
                      <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-0.5 bg-brand-blue-600" />
                    ) : null}
                  </Link>
                )
              })}
            </div>

            <div className="flex w-full flex-wrap items-center gap-3 sm:w-auto">
              <EngagementSearch key={q} q={q} lang={lang} />
              <SortSelect
                value={sort}
                options={ENGAGEMENT_SORTS.map((o) => ({
                  value: o,
                  label: t(`engagements.sort.${o}`, lang),
                  href: hrefFor({ tri: o }),
                }))}
                label={t('engagements.sort_aria', lang)}
              />
            </div>
          </div>

          <p className="text-body-sm text-text-secondary">{tn('engagements.count', lang, data.totalCount)}</p>
        </div>

        {/* ── engagements-table (274:9223) ── */}
        {data.engagements.length === 0 ? (
          <div className="flex flex-col items-center gap-5 rounded-2xl border border-border-subtle bg-surface-base px-10 py-12 text-center">
            <span className="flex h-28 w-28 items-center justify-center rounded-full bg-surface-pill">
              <Handshake className="h-16 w-16 text-icon-muted" aria-hidden="true" />
            </span>
            <div className="flex flex-col gap-2">
              <p className="text-h3 text-text-primary">{t(`${emptyKey}_title`, lang)}</p>
              <p className="text-body text-text-secondary">{t(`${emptyKey}_body`, lang)}</p>
            </div>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border-subtle bg-surface-base">
            {/* table-header: surface/subtle, px 24 py 12, gap 16, Medium 12 / 17 uppercase tracking 0.24.
                lg only — below it each row labels its own cells. */}
            <div
              aria-hidden="true"
              className="hidden items-center gap-4 border-b border-border-subtle bg-surface-subtle px-6 py-3 text-caption font-medium uppercase tracking-[0.24px] text-text-muted lg:flex"
            >
              <span className="w-[200px] shrink-0">{t('engagements.col.client', lang)}</span>
              <span className="min-w-0 flex-1">{t('engagements.col.service', lang)}</span>
              <span className="w-[105px] shrink-0">{t('engagements.col.status', lang)}</span>
              <span className="w-[140px] shrink-0">{t('engagements.col.budget', lang)}</span>
              <span className="w-[160px] shrink-0">{t('engagements.col.timeframe', lang)}</span>
              <span className="w-[208px] shrink-0" />
            </div>
            <ul>
              {data.engagements.map((engagement) => (
                <EngagementRow key={engagement.id} engagement={engagement} lang={lang} />
              ))}
            </ul>
          </div>
        )}

        <Pagination
          page={data.page}
          totalPages={data.totalPages}
          basePath={ROUTE}
          totalItems={data.totalCount}
          perPage={ENGAGEMENTS_PER_PAGE}
        />
      </div>
    </AppShell>
  )
}
