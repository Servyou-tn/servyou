import { t, tn, type Lang } from '@/lib/i18n'
import {
  STAT_PERIODS,
  absDelta,
  balanceOf,
  barHeight,
  formatCount,
  formatPercent,
  funnelSteps,
  largestDrop,
  pctDelta,
  rate,
  type DashboardStats,
  type StatPeriod,
} from '../../_lib/dashboard'
import { agoText, amountText, cityLabel, kpiDelta, medianText } from '../../_lib/format'
import type { TileVM } from '../../_components/OverviewView'
import type { CategoryVM, CityRowVM, FunnelVM, PeriodVM, WeekVM } from '../_components/StatsView'

// J8 view-model: the RPC's jsonb → the strings StatsView draws. Kept out of page.tsx so the page stays a thin loader.

const declaredUnknown = (k: DashboardStats['current']) => k.orders_received > 0 && k.declared_value_tnd === 0

function tilesOf(s: DashboardStats, lang: Lang): { tiles: TileVM[]; tiles2: TileVM[] } {
  const c = s.current, p = s.previous
  const success = rate(c.created_then_received, c.orders_created), prevSuccess = rate(p.created_then_received, p.orders_created)
  const cancel = rate(c.created_then_cancelled, c.orders_created), prevCancel = rate(p.created_then_cancelled, p.orders_created)
  return {
    tiles: [
      { key: 'received', label: t('admin.dash.kpi_received', lang), value: formatCount(c.orders_received), accent: 'green', delta: kpiDelta(pctDelta(c.orders_received, p.orders_received), 'pct', lang) },
      { key: 'success', label: t('admin.dash.kpi_success', lang), value: formatPercent(success), accent: 'blue', delta: kpiDelta(absDelta(success, prevSuccess), 'pts', lang) },
      // D10: orders before the price snapshot add nothing to the sum, so received orders with a 0 total are « — »
      // (« prix non enregistré »), never a fake « 0 TND »; an unknown previous value gives no delta.
      declaredUnknown(c)
        ? { key: 'value', label: t('admin.stats.kpi_declared', lang), value: '—', accent: 'indigo', subtitle: t('admin.stats.kpi_declared_unknown', lang) }
        : { key: 'value', label: t('admin.stats.kpi_declared', lang), value: amountText(c.declared_value_tnd, lang), accent: 'indigo', delta: declaredUnknown(p) ? null : kpiDelta(pctDelta(c.declared_value_tnd, p.declared_value_tnd), 'pct', lang) },
      { key: 'cancel', label: t('admin.dash.kpi_cancel', lang), value: formatPercent(cancel), accent: 'neutral', delta: kpiDelta(absDelta(cancel, prevCancel), 'pts', lang, 'lower_better') },
    ],
    tiles2: [
      { key: 'new_sellers', label: t('admin.stats.kpi_new_sellers', lang), value: formatCount(c.new_sellers), accent: 'neutral', delta: kpiDelta(absDelta(c.new_sellers, p.new_sellers), 'count', lang) },
      // Snapshots (D5, D6): no previous value, so a subtitle instead of a delta.
      { key: 'idle_sellers', label: t('admin.stats.kpi_idle_sellers', lang), value: formatCount(s.snapshot.sellers_without_orders), accent: 'neutral', subtitle: t('admin.stats.kpi_idle_sellers_sub', lang) },
      { key: 'loyal', label: t('admin.stats.kpi_loyal', lang), value: formatCount(s.snapshot.loyal_buyers), accent: 'neutral', subtitle: t('admin.stats.kpi_loyal_sub', lang) },
      { key: 'first_proposal', label: t('admin.stats.kpi_first_proposal', lang), value: medianText(c.first_proposal_median_minutes, lang), accent: 'neutral', delta: kpiDelta(absDelta(c.first_proposal_median_minutes, p.first_proposal_median_minutes), 'minutes', lang, 'lower_better') },
    ],
  }
}

function dropText(s: DashboardStats, lang: Lang): string | null {
  const d = largestDrop(s.funnel)
  if (!d) return null
  if (d.from === 'created' && d.stillPending > 0) return tn('admin.stats.drop_pending', lang, d.stillPending)
  return tn('admin.stats.drop_step', lang, d.count, { from: t(`admin.stats.step_${d.from}`, lang), to: t(`admin.stats.step_${d.to}`, lang) })
}

export function buildStats({ stats, period, now, lang, route }: { stats: DashboardStats | null; period: StatPeriod; now: number; lang: Lang; route: string }) {
  const periods: PeriodVM[] = STAT_PERIODS.map((days) => ({
    days,
    label: t(`admin.stats.period_${days}`, lang),
    href: days === 7 ? route : `${route}?periode=${days}`,
    active: days === period,
  }))
  const subtitle = stats ? t('admin.stats.subtitle', lang, { ago: agoText(stats.generated_at, now, lang) }) : t('admin.stats.subtitle_failed', lang)
  if (!stats) {
    return { subtitle, periods, failed: true, tiles: [], tiles2: [], weeks: [], funnel: [], funnelEmpty: true, drop: null, categories: [], cities: [] }
  }
  const { tiles, tiles2 } = tilesOf(stats, lang)
  const peak = Math.max(0, ...stats.weekly.flatMap((w) => [w.created, w.received]))
  const weeks: WeekVM[] = stats.weekly.map((w) => ({
    label: t('admin.stats.week', lang, { n: w.iso_week }),
    created: w.created,
    received: w.received,
    createdPx: barHeight(w.created, peak),
    receivedPx: barHeight(w.received, peak),
  }))
  const funnel: FunnelVM[] = funnelSteps(stats.funnel).map((f) => ({
    step: f.step,
    label: t(`admin.stats.step_${f.step}`, lang),
    // Whole percents, as drawn (« 11 · 69 % »).
    figure: `${formatCount(f.count)} · ${formatPercent(f.share === null ? null : Math.round(f.share))}`,
    pct: f.share === null ? 0 : Math.round(f.share),
  }))
  const categories: CategoryVM[] = stats.by_category.map((c) => {
    const demand = c.orders + c.job_posts // D2: orders + job posts of the period
    return { id: c.category_id, name: lang === 'ar' && c.name_ar ? c.name_ar : c.name_fr, listings: c.listings, demand, balance: balanceOf(c.listings, demand) }
  })
  const cities: CityRowVM[] = stats.by_city.map((c) => ({ city: cityLabel(c.city, lang), sellers: c.sellers, buyers: c.buyers, orders: c.orders }))
  return { subtitle, periods, failed: false, tiles, tiles2, weeks, funnel, funnelEmpty: stats.funnel.created === 0, drop: dropText(stats, lang), categories, cities }
}
