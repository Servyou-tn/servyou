import { t, tn, type Lang } from '@/lib/i18n'
import { formatTunisDate, formatTunisTime } from '@/lib/datetime'
import { hoursLeft } from '../demandes/_lib/view'
import { logActionKey } from '../journal/_lib/log'
import { formatCount, formatPercent, pctDelta, queueItems, rate, type DashboardStats, type QueueItem } from './dashboard'
import { agoText, auditTargetText, cityLabel, kpiDelta, medianText, sinceText, type AdminAuditRow, type AdminOrderRow } from './format'
import type { ActionVM, CityVM, QueueRowVM, RecentOrderVM, TileVM } from '../_components/OverviewView'

// J1 / M1 view-model: RPC rows → the strings OverviewView draws. Kept out of page.tsx so the page stays a thin loader.

const ACTION: Record<QueueItem['kind'], string> = {
  fake_scam: 'admin.home.q_action_examine',
  reports: 'admin.home.q_action_queue',
  disputes: 'admin.home.q_action_open',
  orders_blocked: 'admin.home.q_action_view',
  deletions: 'admin.home.q_action_handle',
  exports: 'admin.home.q_action_handle',
  contacts: 'admin.home.q_action_read',
}

function queueSub(item: QueueItem, now: number, lang: Lang): string {
  switch (item.kind) {
    case 'fake_scam': return t('admin.home.q_fake_scam_sub', lang)
    case 'orders_blocked': return t('admin.home.q_blocked_sub', lang)
    case 'exports': return t('admin.home.q_exports_sub', lang)
    case 'deletions': {
      if (!item.oldestAt) return t('admin.home.q_exports_sub', lang)
      const h = hoursLeft(item.oldestAt, now)
      return h >= 0 ? tn('admin.home.q_deletions_left', lang, h) : tn('admin.home.q_deletions_late', lang, -h)
    }
    default:
      return item.oldestAt ? t('admin.home.q_oldest', lang, { ago: agoText(item.oldestAt, now, lang) }) : ''
  }
}

function tilesOf(s: DashboardStats, lang: Lang): { tiles: TileVM[]; tiles2: TileVM[] } {
  const c = s.current, p = s.previous
  const success = rate(c.created_then_received, c.orders_created)
  const cancel = rate(c.created_then_cancelled, c.orders_created)
  const tiles: TileVM[] = [
    { key: 'received', label: t('admin.dash.kpi_received', lang), labelShort: t('admin.home.kpi_received_short', lang), value: formatCount(c.orders_received), accent: 'green', delta: kpiDelta(pctDelta(c.orders_received, p.orders_received), 'pct', lang) },
    { key: 'success', label: t('admin.dash.kpi_success', lang), labelShort: t('admin.home.kpi_success_short', lang), value: formatPercent(success), accent: 'blue', subtitle: t('admin.home.kpi_success_sub', lang), subtitleShort: t('admin.home.kpi_success_sub_short', lang) },
    { key: 'acceptance', label: t('admin.dash.kpi_acceptance', lang), labelShort: t('admin.home.kpi_acceptance_short', lang), value: medianText(c.acceptance_median_minutes, lang), accent: 'indigo', delta: kpiDelta(pctDelta(c.acceptance_median_minutes, p.acceptance_median_minutes), 'pct', lang) },
    {
      key: 'cancel', label: t('admin.dash.kpi_cancel', lang), labelShort: t('admin.home.kpi_cancel_short', lang), value: formatPercent(cancel), accent: 'neutral',
      subtitle: c.orders_created > 0 ? tn('admin.home.kpi_cancel_sub', lang, c.orders_created, { part: c.created_then_cancelled }) : null,
      subtitleShort: c.orders_created > 0 ? t('admin.home.kpi_cancel_sub_short', lang, { part: c.created_then_cancelled, count: c.orders_created }) : null,
    },
  ]
  const tiles2: TileVM[] = [
    // A snapshot (D4): no previous value, so no delta.
    { key: 'sellers', label: t('admin.home.kpi_active_sellers', lang), value: formatCount(s.snapshot.active_sellers), accent: 'neutral' },
    { key: 'signups', label: t('admin.home.kpi_signups', lang), value: formatCount(c.new_signups), accent: 'neutral', delta: kpiDelta(pctDelta(c.new_signups, p.new_signups), 'pct', lang) },
    { key: 'buyers', label: t('admin.home.kpi_active_buyers', lang), value: formatCount(c.active_buyers), accent: 'neutral', subtitle: t('admin.home.kpi_active_buyers_sub', lang) },
    { key: 'missions', label: t('admin.home.kpi_missions', lang), value: `${formatCount(c.job_posts_with_proposal)} / ${formatCount(c.job_posts)}`, accent: 'neutral', subtitle: t('admin.home.kpi_missions_sub', lang) },
  ]
  return { tiles, tiles2 }
}

function citiesOf(s: DashboardStats, lang: Lang): CityVM[] {
  const top = s.by_city.slice(0, 5)
  // One scale for both bars (the frame: Tunis 9 orders fills the track, its 6 sellers two thirds of it).
  const peak = Math.max(1, ...top.flatMap((c) => [c.sellers, c.orders]))
  return top.map((c) => ({
    city: cityLabel(c.city, lang),
    line: t('admin.home.city_line', lang, { sellers: tn('admin.home.city_sellers', lang, c.sellers), orders: tn('admin.home.city_orders', lang, c.orders) }),
    sellersPct: Math.round((c.sellers / peak) * 100),
    ordersPct: Math.round((c.orders / peak) * 100),
  }))
}

export function buildOverview({ stats, orders, log, now, lang }: { stats: DashboardStats | null; orders: AdminOrderRow[]; log: AdminAuditRow[]; now: number; lang: Lang }) {
  const queue: QueueRowVM[] | null = stats
    ? queueItems(stats.queue).map((item) => ({
        key: item.kind,
        tone: item.tone,
        title: tn(`admin.home.q_${item.kind}`, lang, item.count),
        sub: queueSub(item, now, lang),
        action: t(ACTION[item.kind], lang),
        href: item.href,
        primary: item.kind === 'fake_scam',
      }))
    : null
  const { tiles, tiles2 } = stats ? tilesOf(stats, lang) : { tiles: [], tiles2: [] }
  const recent: RecentOrderVM[] = orders.map((o) => {
    const since = sinceText(o.status_since, now, lang)
    return {
      id: o.id,
      ref: o.ref,
      title: o.item_title ?? '—',
      parties: { buyer: o.buyer_name ?? '—', seller: o.seller_name ?? '—' },
      status: o.status,
      type: o.order_type,
      since,
      sinceLine: t('admin.home.since_line', lang, { since }),
    }
  })
  const actions: ActionVM[] = log.map((r) => ({
    id: r.id,
    title: t(logActionKey(r.action), lang),
    sub: `${auditTargetText(r, lang)} · ${agoText(r.created_at, now, lang)}`,
  }))
  const stamp = stats ? `${formatTunisDate(stats.generated_at, lang, 'medium')}, ${formatTunisTime(stats.generated_at, lang)}` : ''
  const ago = stats ? agoText(stats.generated_at, now, lang) : ''
  return {
    updated: stats ? t('admin.home.updated', lang, { ago, stamp }) : t('admin.home.updated_failed', lang),
    updatedShort: stats ? t('admin.home.updated_short', lang, { ago }) : t('admin.home.updated_failed', lang),
    queue,
    tiles,
    tiles2,
    statsFailed: !stats,
    recent,
    cities: stats ? citiesOf(stats, lang) : [],
    actions,
  }
}
