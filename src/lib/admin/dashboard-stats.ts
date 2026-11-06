import { z } from 'zod'

/**
 * Parse schema for `admin_dashboard_stats(p_days)` (migrations 20261106093535 + 20261106132948_same_span; discovery
 * docs/discovery/admin-dashboard-stats.md, D1–D12). The RPC returns `jsonb`, which the generated types only know as
 * `Json`: parse it here so the admin pages get a typed object, and a changed shape fails loudly instead of rendering
 * `undefined`.
 *
 * - `current` = [period.from, period.to); `previous` = [period.previous_from, period.previous_to), the same elapsed
 *   span one period back. Values are raw: compute a delta only when the previous value is non-zero.
 * - A median is `null` when it has no sample (`*_samples` = 0): show « — », never 0.
 * - Timestamps are ISO strings (UTC offset); periods are cut in Africa/Tunis days.
 */

const count = z.number().int().nonnegative()
const timestamp = z.string().refine((s) => !Number.isNaN(Date.parse(s)), 'not a timestamp')

export const DASHBOARD_PERIODS = [7, 30, 90] as const
export type DashboardPeriod = (typeof DASHBOARD_PERIODS)[number]

const periodKpis = z.object({
  orders_created: count,
  orders_received: count,
  created_then_received: count,
  created_then_cancelled: count,
  /** Article × quantity + delivery fee of the orders received in the period, in TND (D1). Declared, never collected. */
  declared_value_tnd: z.number().nonnegative(),
  acceptance_median_minutes: z.number().int().nullable(),
  acceptance_samples: count,
  new_signups: count,
  active_buyers: count,
  new_sellers: count,
  job_posts: count,
  job_posts_with_proposal: count,
  first_proposal_median_minutes: z.number().int().nullable(),
  first_proposal_samples: count,
})

export const dashboardStatsSchema = z.object({
  generated_at: timestamp,
  period: z.object({
    days: z.union([z.literal(7), z.literal(30), z.literal(90)]),
    from: timestamp,
    to: timestamp,
    previous_from: timestamp,
    previous_to: timestamp,
  }),
  current: periodKpis,
  previous: periodKpis,
  /** Now, not per period: no delta (D4–D6). */
  snapshot: z.object({
    active_sellers: count,
    sellers_without_orders: count,
    loyal_buyers: count,
  }),
  /** 8 ISO weeks, oldest first; the last one is the current week. */
  weekly: z.array(z.object({
    week_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    iso_week: z.number().int().min(1).max(53),
    created: count,
    received: count,
  })),
  /** Orders created in the current period, by the furthest stage they reached (D8). */
  funnel: z.object({
    created: count,
    reached_accepted: count,
    reached_arrived: count,
    received: count,
    still_pending: count,
    cancelled: count,
  }),
  /** Top-level categories: live listings now, orders and job posts in the period (D2). The UI sets the thresholds. */
  by_category: z.array(z.object({
    // Loose 8-4-4-4-12 check: one hand-seeded id must not take the whole dashboard down.
    category_id: z.guid(),
    name_fr: z.string(),
    name_ar: z.string(),
    kind: z.string(),
    listings: count,
    orders: count,
    job_posts: count,
  })),
  /** Active sellers now; buyers and orders in the period, by the buyer's city (D9). */
  by_city: z.array(z.object({
    city: z.string(),
    sellers: count,
    buyers: count,
    orders: count,
  })),
  /** J1 « À traiter maintenant »: counts now, and the oldest open item where a promise depends on it. */
  queue: z.object({
    reports_open: count,
    reports_fake_scam_open: count,
    reports_oldest_at: timestamp.nullable(),
    disputes_open: count,
    disputes_oldest_at: timestamp.nullable(),
    orders_blocked: count,
    deletion_requests_pending: count,
    deletion_requests_oldest_at: timestamp.nullable(),
    data_exports_pending: count,
    contact_messages_new: count,
    contact_messages_oldest_at: timestamp.nullable(),
  }),
})

export type DashboardStats = z.infer<typeof dashboardStatsSchema>
export type DashboardKpis = DashboardStats['current']

export type DashboardStatsResult = { ok: true; stats: DashboardStats } | { ok: false; issues: string[] }

/** Parse the RPC's `data`. On a shape mismatch, `issues` lists the failing paths (no values: nothing personal is logged). */
export function parseDashboardStats(data: unknown): DashboardStatsResult {
  const parsed = dashboardStatsSchema.safeParse(data)
  if (parsed.success) return { ok: true, stats: parsed.data }
  return { ok: false, issues: parsed.error.issues.map((i) => `${i.path.join('.') || '(root)'}: ${i.code}`) }
}
