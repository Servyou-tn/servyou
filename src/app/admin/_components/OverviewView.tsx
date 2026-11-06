import Link from 'next/link'
import { Zap } from 'lucide-react'
import { t, type Lang } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { BASE as BUTTON_BASE, SIZE as BUTTON_SIZE, VARIANT_BASE, VARIANT_STATE } from '@/components/ui/button'
import { ErrorState } from '@/components/marche/ErrorState'
import { KpiTile, type KpiAccent, type KpiDelta } from './KpiTile'
import { OrderStatusPill, Overline, Panel, PanelNote, figureDir } from './parts'
import { RefreshButton } from './RefreshButton'
import type { QueueTone } from '../_lib/dashboard'

// J1 « Vue d'ensemble » (Figma NOV 4 — Admin, 1440) + M1 (admin-m375-overview). Presentational: the page resolves
// every string. lg+: header · « À traiter maintenant » · 2 × 4 tiles · Commandes récentes (fill) beside a 360 rail
// (Offre et demande par ville, Dernières actions). Below lg the M1 frame: the queue, the first 4 tiles 2 × 2 with
// their short labels, then Commandes récentes as a list of 3 — M1 draws no second tile row and no rail.

export type QueueRowVM = { key: string; tone: QueueTone; title: string; sub: string; action: string; href: string; primary: boolean }
export type TileVM = { key: string; label: string; labelShort?: string; value: string; accent: KpiAccent; delta?: KpiDelta | null; subtitle?: string | null; subtitleShort?: string | null }
export type RecentOrderVM = { id: string; ref: string; title: string; parties: { buyer: string; seller: string }; status: string; type: string; since: string; sinceLine: string }
export type CityVM = { city: string; line: string; sellersPct: number; ordersPct: number }
export type ActionVM = { id: string; title: string; sub: string }

const BAR: Record<QueueTone, string> = { danger: 'bg-danger-500', warning: 'bg-warning-500', info: 'bg-info-500', muted: 'bg-text-muted' }
const button = (primary: boolean) => cn(BUTTON_BASE, BUTTON_SIZE.sm, VARIANT_BASE[primary ? 'primary' : 'secondary'], VARIANT_STATE[primary ? 'primary' : 'secondary'], 'shrink-0')

export function OverviewView({
  lang, updated, updatedShort, queue, tiles, tiles2, statsFailed, recent, recentFailed, cities, actions, actionsFailed,
}: {
  lang: Lang
  updated: string
  updatedShort: string
  /** null = the stats read failed. */
  queue: QueueRowVM[] | null
  tiles: TileVM[]
  tiles2: TileVM[]
  statsFailed: boolean
  recent: RecentOrderVM[]
  recentFailed: boolean
  cities: CityVM[]
  actions: ActionVM[]
  actionsFailed: boolean
}) {
  return (
    <div className="flex flex-col gap-4 lg:gap-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h1 className="text-h1 text-text-primary">{t('admin.overview.title', lang)}</h1>
          <p className="text-body-sm text-text-secondary">
            <span className="lg:hidden">{updatedShort}</span>
            <span className="max-lg:hidden">{updated}</span>
          </p>
        </div>
        <div className="max-lg:hidden"><RefreshButton label={t('admin.home.refresh', lang)} /></div>
      </header>

      {/* « À traiter maintenant » — rows 78 (pad 14, gap 16, 4 × 40 bar, 16 Semi Bold title, 14 sub), divided. */}
      <section className="flex flex-col gap-4 rounded-xl border border-border-subtle bg-surface-base p-4 lg:p-6">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-text-primary">
          <Zap className="size-5 shrink-0 max-lg:hidden" aria-hidden="true" />
          <span className="lg:hidden">{t('admin.home.queue_title_short', lang)}</span>
          <span className="max-lg:hidden">{t('admin.home.queue_title', lang)}</span>
        </h2>
        {queue === null ? (
          <ErrorState lang={lang} />
        ) : queue.length === 0 ? (
          <p className="py-4 text-center text-body-sm text-text-muted">{t('admin.home.queue_empty', lang)}</p>
        ) : (
          <ul className="flex flex-col">
            {queue.map((q) => (
              <li key={q.key} className="flex items-center gap-3 border-b border-border-subtle py-3 last:border-b-0 lg:gap-4 lg:py-3.5">
                <span aria-hidden="true" className={cn('h-9 w-1 shrink-0 rounded-sm lg:h-10', BAR[q.tone])} />
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <p className="text-body-sm font-semibold text-text-primary lg:text-body">{q.title}</p>
                  <p className="text-caption font-medium text-text-secondary lg:text-body-sm lg:font-normal">{q.sub}</p>
                </div>
                <Link href={q.href} className={button(q.primary)}>{q.action}</Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Overline>
        <span className="lg:hidden">{t('admin.home.health_short', lang)}</span>
        <span className="max-lg:hidden">{t('admin.home.health', lang)}</span>
      </Overline>
      {statsFailed ? (
        <ErrorState lang={lang} />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:gap-4 xl:grid-cols-4">
            {tiles.map((tile) => <Tile key={tile.key} tile={tile} />)}
          </div>
          <div className="grid grid-cols-2 gap-4 max-lg:hidden xl:grid-cols-4">
            {tiles2.map((tile) => <Tile key={tile.key} tile={tile} />)}
          </div>
        </>
      )}

      <div className="flex flex-col gap-6 xl:flex-row xl:items-start">
        <Panel title={t('admin.home.recent_title', lang)} link={{ href: '/admin/commandes', label: t('admin.home.recent_all', lang), labelShort: t('admin.home.recent_all_short', lang) }} className="xl:flex-1">
          {recentFailed || recent.length === 0 ? (
            <PanelNote lang={lang} failed={recentFailed} emptyKey="admin.home.recent_empty" />
          ) : (
            <>
              <RecentTable lang={lang} rows={recent} />
              <ul className="flex flex-col lg:hidden">
                {recent.slice(0, 3).map((o) => (
                  <li key={o.id} className="flex items-center gap-3 border-b border-border-subtle py-3 last:border-b-0">
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <p className="truncate text-body-sm font-medium text-text-primary"><bdi>{o.title}</bdi></p>
                      <p className="text-caption font-medium text-text-muted"><bdi dir="ltr">{o.ref}</bdi> · {o.sinceLine}</p>
                    </div>
                    <OrderStatusPill status={o.status} type={o.type} lang={lang} />
                  </li>
                ))}
              </ul>
            </>
          )}
        </Panel>

        <div className="flex flex-col gap-6 max-lg:hidden xl:w-[360px] xl:shrink-0">
          <Panel title={t('admin.home.cities_title', lang)}>
            {statsFailed || cities.length === 0 ? (
              <PanelNote lang={lang} failed={statsFailed} emptyKey="admin.home.cities_empty" />
            ) : (
              <>
                <div className="flex items-center gap-4">
                  <Legend dot="bg-brand-indigo-500" label={t('admin.home.legend_sellers', lang)} />
                  <Legend dot="bg-warning-500" label={t('admin.home.legend_orders', lang)} />
                </div>
                <ul className="flex flex-col gap-4">
                  {cities.map((c) => (
                    <li key={c.city} className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-body-sm font-medium text-text-primary"><bdi>{c.city}</bdi></span>
                        <span className="ms-auto text-caption font-medium text-text-muted">{c.line}</span>
                      </div>
                      <Track pct={c.sellersPct} fill="bg-brand-indigo-500" />
                      <Track pct={c.ordersPct} fill="bg-warning-500" />
                    </li>
                  ))}
                </ul>
              </>
            )}
          </Panel>

          <Panel title={t('admin.home.actions_title', lang)} link={{ href: '/admin/journal', label: t('admin.nav.journal', lang) }}>
            {actionsFailed || actions.length === 0 ? (
              <PanelNote lang={lang} failed={actionsFailed} emptyKey="admin.home.actions_empty" />
            ) : (
              <ul className="flex flex-col gap-4">
                {actions.map((a) => (
                  <li key={a.id} className="flex flex-col gap-0.5">
                    <p className="text-body-sm font-semibold text-text-primary">{a.title}</p>
                    <p className="text-caption font-medium text-text-muted"><bdi>{a.sub}</bdi></p>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </div>
  )
}

function Tile({ tile }: { tile: TileVM }) {
  return (
    <KpiTile
      label={tile.label}
      labelShort={tile.labelShort}
      value={tile.value}
      accent={tile.accent}
      delta={tile.delta}
      subtitle={tile.subtitle}
      subtitleShort={tile.subtitleShort}
    />
  )
}

function Legend({ dot, label }: { dot: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5 text-caption font-medium text-text-secondary">
      <span aria-hidden="true" className={cn('size-2 rounded-full', dot)} />
      {label}
    </span>
  )
}

/** A 6 px track (surface-sunken, radius 4) with a fill; a zero keeps a 4 px stub, as drawn for « 0 vendeurs ». */
function Track({ pct, fill }: { pct: number; fill: string }) {
  return (
    <span aria-hidden="true" className="block h-1.5 overflow-hidden rounded bg-surface-sunken">
      <span className={cn('block h-full rounded', fill)} style={{ width: pct > 0 ? `${pct}%` : '4px' }} />
    </span>
  )
}

// Commandes récentes — thead 38 (pad 10/20), rows pad 14/20, gap 16; columns 110 · fill · 190 · 120 · 70.
function RecentTable({ lang, rows }: { lang: Lang; rows: RecentOrderVM[] }) {
  const th = 'px-2 py-2.5 text-caption font-medium uppercase text-text-muted first:ps-5 last:pe-5'
  // text-body-sm joins by template string, never cn(): twMerge would evict it next to a text colour.
  const td = 'px-2 py-3.5 align-middle text-body-sm first:ps-5 last:pe-5'
  return (
    <div className="hidden overflow-hidden rounded-xl border border-border-subtle lg:block">
      <table className="w-full table-fixed">
        <colgroup><col className="w-[126px]" /><col /><col className="w-[206px]" /><col className="w-[136px]" /><col className="w-[90px]" /></colgroup>
        <thead className="border-b border-border-subtle bg-surface-subtle">
          <tr>
            <th scope="col" className={`${th} text-start`}>{t('admin.home.col_order', lang)}</th>
            <th scope="col" className={`${th} text-start`}>{t('admin.home.col_item', lang)}</th>
            <th scope="col" className={`${th} text-start`}>{t('admin.home.col_parties', lang)}</th>
            <th scope="col" className={`${th} text-start`}>{t('admin.users.field_status', lang)}</th>
            <th scope="col" className={`${th} text-end`}>{t('admin.home.col_since', lang)}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((o) => (
            <tr key={o.id} className="border-b border-border-subtle last:border-b-0">
              <td className={`${td} font-medium text-text-primary`}><bdi dir="ltr">{o.ref}</bdi></td>
              <td className={`${td} text-text-secondary`}><bdi>{o.title}</bdi></td>
              <td className={`${td} text-text-secondary`}><bdi>{o.parties.buyer}</bdi> {lang === 'ar' ? '←' : '→'} <bdi>{o.parties.seller}</bdi></td>
              <td className={td}><OrderStatusPill status={o.status} type={o.type} lang={lang} /></td>
              <td className={`${td} text-end text-text-secondary`}><bdi dir={figureDir(o.since)}>{o.since}</bdi></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
