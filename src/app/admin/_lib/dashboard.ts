import { z } from 'zod'

// Pure logic for the admin read side (Figma NOV 4 — Admin: J1 Vue d'ensemble, M1 375, J8 Statistiques and the
// sidebar pills). Data: the live `admin_dashboard_stats(p_days 7|30|90)` RPC (migration 20261106093535; field
// meanings and decisions D1–D12 in docs/discovery/admin-dashboard-stats.md). The RPC returns jsonb, so its shape
// is parsed here — a local copy of the shape until Agent A's src/lib/admin/dashboard-stats.ts lands. No Supabase.
//
// Honesty rules (brief + servyou-phase-aware-features): a delta shows only when the previous value is non-zero;
// a null median is « — », never 0; a rate over 0 orders is « — ».

const count = z.number().int().nonnegative()
const nullableMinutes = z.number().int().nullable()
const isoOrNull = z.string().nullable()

const Kpis = z.object({
  orders_created: count,
  orders_received: count,
  created_then_received: count,
  created_then_cancelled: count,
  declared_value_tnd: z.number(),
  acceptance_median_minutes: nullableMinutes,
  acceptance_samples: count,
  new_signups: count,
  active_buyers: count,
  new_sellers: count,
  job_posts: count,
  job_posts_with_proposal: count,
  first_proposal_median_minutes: nullableMinutes,
  first_proposal_samples: count,
})
export type Kpis = z.infer<typeof Kpis>

const Queue = z.object({
  reports_open: count,
  reports_fake_scam_open: count,
  reports_oldest_at: isoOrNull,
  disputes_open: count,
  disputes_oldest_at: isoOrNull,
  orders_blocked: count,
  deletion_requests_pending: count,
  deletion_requests_oldest_at: isoOrNull,
  data_exports_pending: count,
  contact_messages_new: count,
  contact_messages_oldest_at: isoOrNull,
})
export type Queue = z.infer<typeof Queue>

export const DashboardStats = z.object({
  generated_at: z.string(),
  period: z.object({ days: z.union([z.literal(7), z.literal(30), z.literal(90)]), from: z.string(), to: z.string(), previous_from: z.string() }),
  current: Kpis,
  previous: Kpis,
  snapshot: z.object({ active_sellers: count, sellers_without_orders: count, loyal_buyers: count }),
  weekly: z.array(z.object({ week_start: z.string(), iso_week: z.number().int(), created: count, received: count })),
  funnel: z.object({ created: count, reached_accepted: count, reached_arrived: count, received: count, still_pending: count, cancelled: count }),
  by_category: z.array(z.object({
    category_id: z.string(), name_fr: z.string(), name_ar: z.string().nullable(), kind: z.string(),
    listings: count, orders: count, job_posts: count,
  })),
  by_city: z.array(z.object({ city: z.string(), sellers: count, buyers: count, orders: count })),
  queue: Queue,
})
export type DashboardStats = z.infer<typeof DashboardStats>

/** The RPC's jsonb, checked. A shape drift is a failed read (the page shows its error state), never fake numbers. */
export function parseDashboardStats(json: unknown): DashboardStats | null {
  const r = DashboardStats.safeParse(json)
  return r.success ? r.data : null
}

export const STAT_PERIODS = [7, 30, 90] as const
export type StatPeriod = (typeof STAT_PERIODS)[number]
export function parsePeriod(value: unknown, fallback: StatPeriod = 7): StatPeriod {
  const n = Number(value)
  return (STAT_PERIODS as readonly number[]).includes(n) ? (n as StatPeriod) : fallback
}

export type Delta = { direction: 'up' | 'down' | 'flat'; value: number }

/** Percentage change, only when the previous value is non-zero (brief: no % over a zero base). Rounded. */
export function pctDelta(current: number | null, previous: number | null): Delta | null {
  if (current === null || previous === null || previous === 0) return null
  const value = Math.round(((current - previous) / previous) * 100)
  return { direction: value > 0 ? 'up' : value < 0 ? 'down' : 'flat', value: Math.abs(value) }
}

export type Polarity = 'higher_better' | 'lower_better'
export type DeltaTone = 'good' | 'bad' | 'neutral'
/**
 * The colour a change means (founder ruling after #336): for a delay or a cancellation a fall is good news, so it is
 * green; for counts (orders, sign-ups, value) a rise is green. The arrow still shows the sign.
 */
export function deltaTone(d: Delta, polarity: Polarity): DeltaTone {
  if (d.direction === 'flat') return 'neutral'
  return (d.direction === 'up') === (polarity === 'higher_better') ? 'good' : 'bad'
}

/** Absolute change (counts, « pts » of a rate, minutes of a median); null when either side is unknown. */
export function absDelta(current: number | null, previous: number | null, round = (n: number) => Math.round(n)): Delta | null {
  if (current === null || previous === null) return null
  const value = round(current - previous)
  return { direction: value > 0 ? 'up' : value < 0 ? 'down' : 'flat', value: Math.abs(value) }
}

/** part / whole as a percentage, or null over an empty whole (« — », never « 0 % »). */
export function rate(part: number, whole: number): number | null {
  return whole > 0 ? (part / whole) * 100 : null
}

/** « 12,5 % » — at most one decimal, French separators in both languages (digits stay LTR, the #304 ruling). */
export function formatPercent(value: number | null): string {
  if (value === null) return '—'
  const rounded = Math.round(value * 10) / 10
  return `${rounded.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} %`
}

/** « 1 240 » — the same French grouping in both languages. */
export function formatCount(value: number): string {
  return value.toLocaleString('fr-FR', { maximumFractionDigits: 2 })
}

export type DurationParts = { key: 'min' | 'h' | 'd'; n: number }
/** A median in minutes → « 45 min » / « 3 h » / « 2 j » (i18n key + number); null stays null (« — »). */
export function durationParts(minutes: number | null): DurationParts | null {
  if (minutes === null) return null
  const m = Math.max(0, Math.round(minutes))
  if (m < 60) return { key: 'min', n: m }
  if (m < 48 * 60) return { key: 'h', n: Math.round(m / 60) }
  return { key: 'd', n: Math.round(m / 1440) }
}

/** « Depuis » on an order row: hours under 72 h (« 52 h »), then whole days (« 8 j »). */
export function sinceParts(iso: string, now: number): DurationParts {
  const hours = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 3_600_000))
  return hours < 72 ? { key: 'h', n: hours } : { key: 'd', n: Math.floor(hours / 24) }
}

export type Balance = 'shortage_supply' | 'shortage_demand' | 'balanced'
/** J8 « Équilibre » (brief thresholds): demand ≥ 2× listings → Manque d'offre; listings ≥ 2× demand → Manque de demande. */
export function balanceOf(listings: number, demand: number): Balance {
  if (listings === 0 && demand === 0) return 'balanced'
  if (demand >= 2 * listings) return 'shortage_supply'
  if (listings >= 2 * demand) return 'shortage_demand'
  return 'balanced'
}

export type FunnelStep = 'created' | 'accepted' | 'arrived' | 'received'
/** The J8 « Parcours » rows: count and share of created (null share when nothing was created). */
export function funnelSteps(f: DashboardStats['funnel']): { step: FunnelStep; count: number; share: number | null }[] {
  const rows: [FunnelStep, number][] = [['created', f.created], ['accepted', f.reached_accepted], ['arrived', f.reached_arrived], ['received', f.received]]
  return rows.map(([step, n]) => ({ step, count: n, share: rate(n, f.created) }))
}

/**
 * « Plus grosse perte » (D8: the UI picks the largest drop). The step whose next stage lost the most orders;
 * when that is the first hop and orders are still pending, the frame's sentence (« N commandes restées « En
 * attente » ») is used. Null when nothing dropped.
 */
export function largestDrop(f: DashboardStats['funnel']): { from: FunnelStep; to: FunnelStep; count: number; stillPending: number } | null {
  const hops: { from: FunnelStep; to: FunnelStep; count: number }[] = [
    { from: 'created', to: 'accepted', count: f.created - f.reached_accepted },
    { from: 'accepted', to: 'arrived', count: f.reached_accepted - f.reached_arrived },
    { from: 'arrived', to: 'received', count: f.reached_arrived - f.received },
  ]
  const top = hops.reduce((a, b) => (b.count > a.count ? b : a))
  if (top.count <= 0) return null
  return { ...top, stillPending: top.from === 'created' ? f.still_pending : 0 }
}

/** Bar heights for the J8 weekly chart: the tallest bar is `max` px, a zero bar keeps the frame's 3 px stub. */
export function barHeight(value: number, peak: number, max = 176, stub = 3): number {
  if (peak <= 0 || value <= 0) return stub
  return Math.max(stub, Math.round((value / peak) * max))
}

export type QueueKind = 'fake_scam' | 'reports' | 'disputes' | 'orders_blocked' | 'deletions' | 'exports' | 'contacts'
export type QueueTone = 'danger' | 'warning' | 'info' | 'muted'
export type QueueItem = { kind: QueueKind; count: number; oldestAt: string | null; tone: QueueTone; href: string }

/**
 * J1 « À traiter maintenant », in the frame's order; a line appears only when it has something to do.
 * « Signalement grave : arnaque » counts the open fake-scam reports; « N signalements ouverts » the others, so the
 * same report never shows twice. Exports have no row in the frame; they are part of « Demandes » (pill) and get
 * their own row so the pill and the list agree.
 */
export function queueItems(q: Queue): QueueItem[] {
  const items: QueueItem[] = [
    { kind: 'fake_scam', count: q.reports_fake_scam_open, oldestAt: null, tone: 'danger', href: '/admin/signalements?motif=fake_scam' },
    { kind: 'reports', count: q.reports_open - q.reports_fake_scam_open, oldestAt: q.reports_oldest_at, tone: 'warning', href: '/admin/signalements' },
    { kind: 'disputes', count: q.disputes_open, oldestAt: q.disputes_oldest_at, tone: 'warning', href: '/admin/litiges' },
    { kind: 'orders_blocked', count: q.orders_blocked, oldestAt: null, tone: 'info', href: '/admin/commandes?onglet=blocked&periode=all' },
    { kind: 'deletions', count: q.deletion_requests_pending, oldestAt: q.deletion_requests_oldest_at, tone: 'info', href: '/admin/demandes' },
    { kind: 'exports', count: q.data_exports_pending, oldestAt: null, tone: 'info', href: '/admin/demandes?onglet=export' },
    { kind: 'contacts', count: q.contact_messages_new, oldestAt: q.contact_messages_oldest_at, tone: 'muted', href: '/admin/demandes?onglet=contact' },
  ]
  return items.filter((i) => i.count > 0)
}

/** The sidebar pills (brief): Demandes = pending deletions + pending exports + new contact messages. */
export function sidebarCounts(q: Queue): { reports: number; disputes: number; orders: number; requests: number } {
  return {
    reports: q.reports_open,
    disputes: q.disputes_open,
    orders: q.orders_blocked,
    requests: q.deletion_requests_pending + q.data_exports_pending + q.contact_messages_new,
  }
}
