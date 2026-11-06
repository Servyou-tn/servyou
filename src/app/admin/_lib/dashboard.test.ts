import { describe, expect, it } from 'vitest'
import {
  absDelta,
  balanceOf,
  barHeight,
  deltaTone,
  durationParts,
  formatPercent,
  largestDrop,
  parseDashboardStats,
  parsePeriod,
  pctDelta,
  queueItems,
  rate,
  sidebarCounts,
  sinceParts,
} from './dashboard'

const kpis = {
  orders_created: 2, orders_received: 0, created_then_received: 0, created_then_cancelled: 0, declared_value_tnd: 0,
  acceptance_median_minutes: null, acceptance_samples: 0, new_signups: 3, active_buyers: 2, new_sellers: 1,
  job_posts: 3, job_posts_with_proposal: 1, first_proposal_median_minutes: 1585, first_proposal_samples: 1,
}
const queue = {
  reports_open: 3, reports_fake_scam_open: 1, reports_oldest_at: '2026-11-05T10:00:00Z', disputes_open: 0, disputes_oldest_at: null,
  orders_blocked: 6, deletion_requests_pending: 1, deletion_requests_oldest_at: '2026-11-05T19:00:00Z', data_exports_pending: 2,
  contact_messages_new: 1, contact_messages_oldest_at: '2026-11-05T08:00:00Z',
}
// The shape the live RPC returned on the read-only compile check (discovery §Plan), trimmed.
const RPC = {
  generated_at: '2026-11-06T12:00:00Z',
  period: { days: 90, from: '2026-08-08T23:00:00Z', to: '2026-11-06T12:00:00Z', previous_from: '2026-05-10T23:00:00Z' },
  current: kpis,
  previous: { ...kpis, orders_created: 14, orders_received: 3, created_then_cancelled: 2 },
  snapshot: { active_sellers: 11, sellers_without_orders: 9, loyal_buyers: 1 },
  weekly: [{ week_start: '2026-09-14', iso_week: 38, created: 0, received: 0 }],
  funnel: { created: 16, reached_accepted: 9, reached_arrived: 6, received: 4, still_pending: 5, cancelled: 2 },
  by_category: [{ category_id: 'c1', name_fr: 'Mode', name_ar: 'أزياء', kind: 'product', listings: 10, orders: 2, job_posts: 0 }],
  by_city: [{ city: 'Tunis', sellers: 6, buyers: 3, orders: 2 }],
  queue,
}

describe('admin dashboard logic', () => {
  it('parses the RPC shape and refuses a drifted one (a failed read, never fake numbers)', () => {
    expect(parseDashboardStats(RPC)?.snapshot.active_sellers).toBe(11)
    expect(parseDashboardStats({ ...RPC, current: { ...kpis, orders_created: '2' } })).toBeNull()
    expect(parseDashboardStats(null)).toBeNull()
  })

  it('periods: 7 / 30 / 90 only', () => {
    expect(parsePeriod('30')).toBe(30)
    expect(parsePeriod('14')).toBe(7)
    expect(parsePeriod(undefined, 30)).toBe(30)
  })

  it('a % delta only over a non-zero previous value', () => {
    expect(pctDelta(4, 1)).toEqual({ direction: 'up', value: 300 })
    expect(pctDelta(3, 5)).toEqual({ direction: 'down', value: 40 })
    expect(pctDelta(5, 0)).toBeNull()
    expect(pctDelta(null, 3)).toBeNull()
    expect(pctDelta(2, 2)).toEqual({ direction: 'flat', value: 0 })
  })

  it('delta colour follows meaning: a shorter delay or fewer cancellations is good', () => {
    expect(deltaTone({ direction: 'down', value: 40 }, 'lower_better')).toBe('good')
    expect(deltaTone({ direction: 'up', value: 3 }, 'lower_better')).toBe('bad')
    expect(deltaTone({ direction: 'up', value: 300 }, 'higher_better')).toBe('good')
    expect(deltaTone({ direction: 'down', value: 25 }, 'higher_better')).toBe('bad')
    expect(deltaTone({ direction: 'flat', value: 0 }, 'lower_better')).toBe('neutral')
  })

  it('absolute deltas need both sides (a null median has no delta)', () => {
    expect(absDelta(25, 17)).toEqual({ direction: 'up', value: 8 })
    expect(absDelta(null, 17)).toBeNull()
    expect(absDelta(12.5, 16.5)).toEqual({ direction: 'down', value: 4 })
  })

  it('rates over an empty whole are null (« — »), and format with a French comma', () => {
    expect(rate(2, 16)).toBe(12.5)
    expect(rate(0, 0)).toBeNull()
    expect(formatPercent(12.5).replace(/\s/g, ' ')).toBe('12,5 %')
    expect(formatPercent(25).replace(/\s/g, ' ')).toBe('25 %')
    expect(formatPercent(null)).toBe('—')
  })

  it('durations: minutes, then hours, then days; null stays null', () => {
    expect(durationParts(null)).toBeNull()
    expect(durationParts(45)).toEqual({ key: 'min', n: 45 })
    expect(durationParts(180)).toEqual({ key: 'h', n: 3 })
    expect(durationParts(1585)).toEqual({ key: 'h', n: 26 })
    expect(durationParts(3 * 1440)).toEqual({ key: 'd', n: 3 })
  })

  it('« Depuis »: hours under 72 h, then days', () => {
    const now = Date.parse('2026-11-06T12:00:00Z')
    expect(sinceParts('2026-11-04T08:00:00Z', now)).toEqual({ key: 'h', n: 52 })
    expect(sinceParts('2026-10-29T12:00:00Z', now)).toEqual({ key: 'd', n: 8 })
  })

  it('offer / demand label thresholds (brief)', () => {
    expect(balanceOf(6, 5)).toBe('balanced')
    expect(balanceOf(4, 8)).toBe('shortage_supply')
    expect(balanceOf(14, 2)).toBe('shortage_demand')
    expect(balanceOf(0, 3)).toBe('shortage_supply')
    expect(balanceOf(5, 0)).toBe('shortage_demand')
  })

  it('the largest funnel drop, with the pending count when it is the first hop', () => {
    expect(largestDrop(RPC.funnel)).toEqual({ from: 'created', to: 'accepted', count: 7, stillPending: 5 })
    expect(largestDrop({ created: 4, reached_accepted: 4, reached_arrived: 1, received: 1, still_pending: 0, cancelled: 0 }))
      .toEqual({ from: 'accepted', to: 'arrived', count: 3, stillPending: 0 })
    expect(largestDrop({ created: 0, reached_accepted: 0, reached_arrived: 0, received: 0, still_pending: 0, cancelled: 0 })).toBeNull()
  })

  it('bars: the peak is 176 px, a zero keeps the 3 px stub', () => {
    expect(barHeight(4, 4)).toBe(176)
    expect(barHeight(1, 4)).toBe(44)
    expect(barHeight(0, 4)).toBe(3)
    expect(barHeight(0, 0)).toBe(3)
  })

  it('queue: only lines with work, fake-scam reports not counted twice', () => {
    const items = queueItems(queue)
    expect(items.map((i) => [i.kind, i.count])).toEqual([
      ['fake_scam', 1], ['reports', 2], ['orders_blocked', 6], ['deletions', 1], ['exports', 2], ['contacts', 1],
    ])
  })

  it('the blocked line opens the blocked tab over all time, as it is counted', () => {
    expect(queueItems(queue).find((i) => i.kind === 'orders_blocked')?.href).toBe('/admin/commandes?onglet=blocked&periode=all')
  })

  it('sidebar pills: Demandes = deletions + exports + new messages', () => {
    expect(sidebarCounts(queue)).toEqual({ reports: 3, disputes: 0, orders: 6, requests: 4 })
  })
})
