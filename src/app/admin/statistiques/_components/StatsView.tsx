import Link from 'next/link'
import { t, type Lang } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { FOCUS_RING } from '@/components/layout/styles'
import { StatusPill, type StatusValue } from '@/components/ui/status-pill'
import { ErrorState } from '@/components/marche/ErrorState'
import { KpiTile } from '../../_components/KpiTile'
import { Overline, Panel, PanelNote } from '../../_components/parts'
import type { TileVM } from '../../_components/OverviewView'
import type { Balance, FunnelStep } from '../../_lib/dashboard'

// J8 « Statistiques » (Figma NOV 4 — Admin, 1440). Presentational: the page resolves every string and number.
// header (period segmented) · 4 tiles · Commandes par semaine (fill) + Parcours d'une commande (360) · Offre et
// demande par catégorie (fill) + Par ville (440) · OFFRE · DEMANDE · FIDÉLITÉ tiles · the audience note. Below xl
// the paired panels stack and the tiles go 2 × 2 (at 1100 a 4-up tile is too narrow for « 1 240 TND »).

export type WeekVM = { label: string; created: number; received: number; createdPx: number; receivedPx: number }
export type FunnelVM = { step: FunnelStep; label: string; figure: string; pct: number }
export type CategoryVM = { id: string; name: string; listings: number; demand: number; balance: Balance }
export type CityRowVM = { city: string; sellers: number; buyers: number; orders: number }
export type PeriodVM = { days: number; label: string; href: string; active: boolean }

const STEP_FILL: Record<FunnelStep, string> = {
  created: 'bg-brand-indigo-300',
  accepted: 'bg-brand-indigo-600',
  arrived: 'bg-brand-indigo-500',
  received: 'bg-success-500',
}
export const BALANCE_PILL: Record<Balance, { pill: StatusValue; key: string }> = {
  balanced: { pill: 'reçue', key: 'admin.stats.balance_balanced' },
  shortage_supply: { pill: 'pending', key: 'admin.stats.balance_supply' },
  shortage_demand: { pill: 'acceptee', key: 'admin.stats.balance_demand' },
}
const th = 'px-2 py-2.5 text-caption font-medium uppercase text-text-muted first:ps-5 last:pe-5'
// text-body-sm joins by template string, never cn(): twMerge would evict it next to a text colour.
const td = 'px-2 py-3.5 align-middle text-body-sm first:ps-5 last:pe-5'

export function StatsView({
  lang, subtitle, periods, failed, tiles, tiles2, weeks, funnel, funnelEmpty, drop, categories, cities,
}: {
  lang: Lang
  subtitle: string
  periods: PeriodVM[]
  failed: boolean
  tiles: TileVM[]
  tiles2: TileVM[]
  weeks: WeekVM[]
  funnel: FunnelVM[]
  funnelEmpty: boolean
  drop: string | null
  categories: CategoryVM[]
  cities: CityRowVM[]
}) {
  return (
    <div className="flex flex-col gap-4 lg:gap-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h1 className="text-h1 text-text-primary">{t('admin.nav.statistics', lang)}</h1>
          <p className="text-body-sm text-text-secondary">{subtitle}</p>
        </div>
        {/* Segmented (count=3): sunken track pad 4, radius 10; segments h36 px12, the selected one on surface-base. */}
        <nav aria-label={t('admin.stats.period_aria', lang)} className="flex w-fit shrink-0 rounded-[10px] bg-surface-sunken p-1">
          {periods.map((p) => (
            <Link
              key={p.days}
              href={p.href}
              aria-current={p.active ? 'page' : undefined}
              className={`${cn('flex h-9 items-center rounded-lg px-3 font-medium transition-colors', p.active ? 'bg-surface-base text-text-primary' : 'text-text-secondary hover:text-text-primary', FOCUS_RING)} text-body-sm`}
            >
              {p.label}
            </Link>
          ))}
        </nav>
      </header>

      {failed ? (
        <ErrorState lang={lang} />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:gap-4 xl:grid-cols-4">
            {tiles.map((tile) => <KpiTile key={tile.key} label={tile.label} value={tile.value} accent={tile.accent} delta={tile.delta} subtitle={tile.subtitle} />)}
          </div>

          <div className="flex flex-col gap-6 xl:flex-row xl:items-start">
            <Panel title={t('admin.stats.weekly_title', lang)} aside={t('admin.stats.weekly_span', lang)} className="xl:flex-1">
              <WeeklyChart lang={lang} weeks={weeks} />
            </Panel>

            <Panel title={t('admin.stats.funnel_title', lang)} className="xl:w-[360px] xl:shrink-0">
              {funnelEmpty ? (
                <PanelNote lang={lang} failed={false} emptyKey="admin.stats.funnel_empty" />
              ) : (
                <>
                  <ul className="flex flex-col gap-4">
                    {funnel.map((f) => (
                      <li key={f.step} className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-body-sm font-medium text-text-primary">{f.label}</span>
                          <span className="ms-auto text-body-sm text-text-secondary"><bdi dir="ltr">{f.figure}</bdi></span>
                        </div>
                        <span aria-hidden="true" className="block h-2.5 overflow-hidden rounded-md bg-surface-sunken">
                          <span className={cn('block h-full rounded-md', STEP_FILL[f.step])} style={{ width: `${f.pct}%` }} />
                        </span>
                      </li>
                    ))}
                  </ul>
                  {drop ? <p className="text-caption font-medium text-text-muted">{drop}</p> : null}
                </>
              )}
            </Panel>
          </div>

          <div className="flex flex-col gap-6 xl:flex-row xl:items-start">
            <Panel title={t('admin.stats.categories_title', lang)} className="xl:flex-1">
              {categories.length === 0 ? (
                <PanelNote lang={lang} failed={false} emptyKey="admin.stats.categories_empty" />
              ) : (
                <div className="overflow-x-auto rounded-xl border border-border-subtle">
                  <table className="w-full min-w-[520px]">
                    <thead className="border-b border-border-subtle bg-surface-subtle">
                      <tr>
                        <th scope="col" className={`${th} text-start`}>{t('admin.stats.col_category', lang)}</th>
                        <th scope="col" className={`${th} w-24 text-end`}>{t('admin.stats.col_listings', lang)}</th>
                        <th scope="col" className={`${th} w-24 text-end`}>{t('admin.stats.col_demand', lang)}</th>
                        <th scope="col" className={`${th} w-[150px]`}>{t('admin.stats.col_balance', lang)}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {categories.map((c) => (
                        <tr key={c.id} className="border-b border-border-subtle last:border-b-0">
                          <td className={`${td} font-medium text-text-primary`}><bdi>{c.name}</bdi></td>
                          <td className={`${td} text-end text-text-secondary`}><bdi dir="ltr">{c.listings}</bdi></td>
                          <td className={`${td} text-end text-text-secondary`}><bdi dir="ltr">{c.demand}</bdi></td>
                          <td className={td}><StatusPill status={BALANCE_PILL[c.balance].pill}>{t(BALANCE_PILL[c.balance].key, lang)}</StatusPill></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Panel>

            <Panel title={t('admin.stats.cities_title', lang)} className="xl:w-[440px] xl:shrink-0">
              {cities.length === 0 ? (
                <PanelNote lang={lang} failed={false} emptyKey="admin.stats.cities_empty" />
              ) : (
                <div className="overflow-x-auto rounded-xl border border-border-subtle">
                  <table className="w-full">
                    <thead className="border-b border-border-subtle bg-surface-subtle">
                      <tr>
                        <th scope="col" className={`${th} text-start`}>{t('admin.stats.col_city', lang)}</th>
                        <th scope="col" className={`${th} text-end`}>{t('admin.stats.col_sellers', lang)}</th>
                        <th scope="col" className={`${th} text-end`}>{t('admin.stats.col_buyers', lang)}</th>
                        <th scope="col" className={`${th} text-end`}>{t('admin.stats.col_orders', lang)}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cities.map((c) => (
                        <tr key={c.city} className="border-b border-border-subtle last:border-b-0">
                          <td className={`${td} font-medium text-text-primary`}><bdi>{c.city}</bdi></td>
                          <td className={`${td} text-end text-text-secondary`}><bdi dir="ltr">{c.sellers}</bdi></td>
                          <td className={`${td} text-end text-text-secondary`}><bdi dir="ltr">{c.buyers}</bdi></td>
                          <td className={`${td} text-end text-text-secondary`}><bdi dir="ltr">{c.orders}</bdi></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Panel>
          </div>

          <Overline>{t('admin.stats.loyalty_overline', lang)}</Overline>
          <div className="grid grid-cols-2 gap-3 lg:gap-4 xl:grid-cols-4">
            {tiles2.map((tile) => <KpiTile key={tile.key} label={tile.label} value={tile.value} accent={tile.accent} delta={tile.delta} subtitle={tile.subtitle} />)}
          </div>
        </>
      )}

      {/* Not in the database (discovery: « Not built »): the frame's own empty state, as drawn. */}
      <p className="text-caption font-medium text-text-muted">{t('admin.stats.audience_note', lang)}</p>
    </div>
  )
}

// Commandes par semaine: legend 8 px dots (indigo-200 created / indigo-600 received); 8 columns gap 24; per week two
// 18 px bars gap 4 bottom-aligned on a 176 px peak (3 px stub for 0), then the « S38 » caption 8 below.
function WeeklyChart({ lang, weeks }: { lang: Lang; weeks: WeekVM[] }) {
  return (
    <>
      <div className="flex items-center gap-4">
        <span className="flex items-center gap-1.5 text-caption font-medium text-text-secondary"><span aria-hidden="true" className="size-2 rounded-full bg-brand-indigo-200" />{t('admin.stats.legend_created', lang)}</span>
        <span className="flex items-center gap-1.5 text-caption font-medium text-text-secondary"><span aria-hidden="true" className="size-2 rounded-full bg-brand-indigo-600" />{t('admin.stats.legend_received', lang)}</span>
      </div>
      <div aria-hidden="true" className="flex items-end gap-3 pt-2 lg:gap-6">
        {weeks.map((w) => (
          <div key={w.label} className="flex min-w-0 flex-1 flex-col items-center gap-2">
            <div className="flex items-end gap-1">
              <span className="w-2.5 bg-brand-indigo-200 sm:w-[18px]" style={{ height: `${w.createdPx}px` }} />
              <span className="w-2.5 bg-brand-indigo-600 sm:w-[18px]" style={{ height: `${w.receivedPx}px` }} />
            </div>
            <span className="text-caption font-medium text-text-muted" dir="ltr">{w.label}</span>
          </div>
        ))}
      </div>
      {/* The same numbers for screen readers. */}
      <table className="sr-only">
        <caption>{t('admin.stats.weekly_title', lang)}</caption>
        <thead><tr><th scope="col">{t('admin.stats.col_week', lang)}</th><th scope="col">{t('admin.stats.legend_created', lang)}</th><th scope="col">{t('admin.stats.legend_received', lang)}</th></tr></thead>
        <tbody>{weeks.map((w) => <tr key={w.label}><th scope="row">{w.label}</th><td>{w.created}</td><td>{w.received}</td></tr>)}</tbody>
      </table>
    </>
  )
}
