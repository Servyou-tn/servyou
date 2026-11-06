/**
 * Unit tests for src/lib/admin/dashboard-stats.ts: the parse schema accepts the shape admin_dashboard_stats returns
 * (sample taken from the live RPC, 2026-11-06, 90 days) and fails loudly — with paths, never values — on a change.
 * The live shape itself is re-checked in admin-dashboard-stats-live.test.ts.
 */

import { describe, it, expect } from 'vitest'
import { parseDashboardStats } from '@/lib/admin/dashboard-stats'

const kpis = {
  orders_created: 2, orders_received: 0, created_then_received: 0, created_then_cancelled: 0, declared_value_tnd: 0,
  acceptance_median_minutes: null, acceptance_samples: 0, new_signups: 0, active_buyers: 1, new_sellers: 0,
  job_posts: 3, job_posts_with_proposal: 1, first_proposal_median_minutes: 1585, first_proposal_samples: 1,
}

const sample = () => ({
  generated_at: '2026-11-06T13:14:46.746902+00:00',
  period: {
    days: 90,
    from: '2026-08-08T23:00:00+00:00',
    to: '2026-11-06T13:14:46.746902+00:00',
    previous_from: '2026-05-10T23:00:00+00:00',
    previous_to: '2026-08-08T13:14:46.746902+00:00',
  },
  current: { ...kpis },
  previous: { ...kpis, orders_created: 14, orders_received: 3, declared_value_tnd: 32.5 },
  snapshot: { active_sellers: 11, sellers_without_orders: 9, loyal_buyers: 1 },
  weekly: [{ week_start: '2026-11-02', iso_week: 45, created: 0, received: 0 }],
  funnel: { created: 2, reached_accepted: 0, reached_arrived: 0, received: 0, still_pending: 2, cancelled: 0 },
  by_category: [{
    category_id: 'aaaaaaaa-0000-4000-8000-000000000001', name_fr: 'Mode', name_ar: 'أزياء', kind: 'product',
    listings: 10, orders: 2, job_posts: 0,
  }],
  by_city: [{ city: 'Tunis', sellers: 4, buyers: 1, orders: 2 }],
  queue: {
    reports_open: 0, reports_fake_scam_open: 0, reports_oldest_at: null, disputes_open: 0, disputes_oldest_at: null,
    orders_blocked: 6, deletion_requests_pending: 0, deletion_requests_oldest_at: null, data_exports_pending: 0,
    contact_messages_new: 1, contact_messages_oldest_at: '2026-11-01T17:49:13.249421+00:00',
  },
})

describe('parseDashboardStats', () => {
  it('accepts the live shape, previous_to included, and keeps null medians null', () => {
    const r = parseDashboardStats(sample())
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.stats.period.previous_to).toBe('2026-08-08T13:14:46.746902+00:00')
    expect(r.stats.current.acceptance_median_minutes).toBeNull()
    expect(r.stats.previous.declared_value_tnd).toBe(32.5)
  })

  it('accepts a hand-seeded (non-v4) category id', () => {
    const s = sample()
    s.by_category[0].category_id = 'aaaaaaaa-0000-0000-0000-000000000001'
    expect(parseDashboardStats(s).ok).toBe(true)
  })

  it('fails on a missing previous_to (the pre-same-span shape)', () => {
    const s = sample() as { period: Record<string, unknown> }
    delete s.period.previous_to
    expect(parseDashboardStats(s)).toEqual({ ok: false, issues: ['period.previous_to: invalid_type'] })
  })

  it('fails on an unknown period, a non-timestamp and a negative count — with paths, never values', () => {
    const s = sample()
    const bad = {
      ...s,
      period: { ...s.period, days: 14 },
      queue: { ...s.queue, reports_oldest_at: 'Mohamed Ben Ali' },
      funnel: { ...s.funnel, created: -1 },
    }
    const r = parseDashboardStats(bad)
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.issues.map((i) => i.split(':')[0]).sort()).toEqual(['funnel.created', 'period.days', 'queue.reports_oldest_at'])
    expect(r.issues.join(' ')).not.toContain('Mohamed')
  })

  it('fails on null or a non-object (an RPC error passed through)', () => {
    expect(parseDashboardStats(null).ok).toBe(false)
    expect(parseDashboardStats('oops').ok).toBe(false)
  })
})
