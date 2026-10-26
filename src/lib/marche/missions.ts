import { GOVERNORATES } from '@/lib/tunisia-governorates'
import type { Lang } from '@/lib/i18n'
import { COMPETITION_LOW_MAX, COMPETITION_MEDIUM_MAX, JOB_POST_EXPIRY_DAYS, NEW_MISSION_WINDOW_HOURS } from '@/lib/job-constants'

// H9 « Trouver des missions » — pure rules (no I/O, no clock reads of its own: every function takes `now`).
// Rulings: docs/design/h9-h13-measurements.md §10.2 (D-H9-3…7). The data layer is missions-query.ts.

const HOUR_MS = 60 * 60 * 1000
const DAY_MS = 24 * HOUR_MS

// D-H9-7: 12 = 3 × 4. The frame's « 1 à 6 sur 142 » beside pages « 1 2 3 … 8 » is arithmetically inconsistent.
export const MISSIONS_PER_PAGE = 12

// D-H9-5.
export const MISSION_SORTS = ['recent', 'concurrence', 'budget', 'expire'] as const
export type MissionSort = (typeof MISSION_SORTS)[number]
export const DEFAULT_MISSION_SORT: MissionSort = 'recent'

// D-H9-4. Half-open buckets [from, to): a post matches when its budget range intersects the bucket.
export const BUDGET_BUCKETS = ['lt200', '200_500', '500_1000', 'gte1000'] as const
export type BudgetBucket = (typeof BUDGET_BUCKETS)[number]
const BUCKET_BOUNDS: Record<BudgetBucket, { from: number | null; to: number | null }> = {
  lt200: { from: null, to: 200 },
  '200_500': { from: 200, to: 500 },
  '500_1000': { from: 500, to: 1000 },
  gte1000: { from: 1000, to: null },
}

export type MissionFilters = {
  /** categories.slug of a service sector. */
  categorie: string | null
  /** Canonical governorate value (job_posts.city). */
  ville: string | null
  budget: BudgetBucket | null
  /** One of the viewer's own profile skills, matched exactly (job_post_skills.skill is free text). */
  competence: string | null
  teletravail: boolean
  tri: MissionSort
  page: number
}

type RawParams = Record<string, string | string[] | undefined>

function first(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v
}

function cleanText(v: string | undefined): string | null {
  const s = (v ?? '').trim().slice(0, 100)
  return s === '' ? null : s
}

/** URL → filters. Every value is whitelisted or length-capped; an unknown sort/budget falls back, never throws. */
export function parseMissionParams(sp: RawParams): MissionFilters {
  const budget = first(sp.budget)
  const tri = first(sp.tri)
  return {
    categorie: cleanText(first(sp.categorie)),
    ville: cleanText(first(sp.ville)),
    budget: (BUDGET_BUCKETS as readonly string[]).includes(budget ?? '') ? (budget as BudgetBucket) : null,
    competence: cleanText(first(sp.competence)),
    teletravail: first(sp.teletravail) === '1',
    tri: (MISSION_SORTS as readonly string[]).includes(tri ?? '') ? (tri as MissionSort) : DEFAULT_MISSION_SORT,
    page: Math.max(1, Math.floor(Number(first(sp.page) ?? '1')) || 1),
  }
}

/** The board's URL for `filters` with `patch` applied. Any change other than `page` starts over at page 1. */
export function buildMissionsHref(
  basePath: string,
  filters: MissionFilters,
  patch: Partial<{ [K in keyof MissionFilters]: MissionFilters[K] | null }> = {},
): string {
  const next = { ...filters, ...patch } as MissionFilters
  if (!('page' in patch)) next.page = 1
  const params = new URLSearchParams()
  if (next.categorie) params.set('categorie', next.categorie)
  if (next.ville) params.set('ville', next.ville)
  if (next.budget) params.set('budget', next.budget)
  if (next.competence) params.set('competence', next.competence)
  if (next.teletravail) params.set('teletravail', '1')
  if (next.tri && next.tri !== DEFAULT_MISSION_SORT) params.set('tri', next.tri)
  if (next.page > 1) params.set('page', String(next.page))
  const qs = params.toString()
  return qs ? `${basePath}?${qs}` : basePath
}

/**
 * PostgREST `or=` groups for a budget bucket; pass each to its own `.or()` (they AND together).
 *
 * job_posts.budget_min / budget_max are both nullable and have no min ≤ max CHECK, so « range intersects
 * [from, to) » = (low side < to) AND (high side ≥ from), where a missing side borrows the other. A post with
 * neither bound matches no bucket (D-H9-4: budget-less posts only under « Tous »). Only numbers from
 * BUCKET_BOUNDS are interpolated, never user text.
 */
export function budgetBucketOrFilters(bucket: BudgetBucket): string[] {
  const { from, to } = BUCKET_BOUNDS[bucket]
  const groups: string[] = []
  if (to != null) groups.push(`budget_min.lt.${to},and(budget_min.is.null,budget_max.lt.${to})`)
  if (from != null) groups.push(`budget_max.gte.${from},and(budget_max.is.null,budget_min.gte.${from})`)
  return groups
}

export type CompetitionLevel = 'low' | 'medium' | 'high'

export function competitionLevel(responseCount: number): CompetitionLevel {
  if (responseCount <= COMPETITION_LOW_MAX) return 'low'
  if (responseCount <= COMPETITION_MEDIUM_MAX) return 'medium'
  return 'high'
}

/** D-H9-6: published less than 48 h ago. */
export function isNewMission(createdAt: string, now: Date): boolean {
  const age = now.getTime() - new Date(createdAt).getTime()
  return age < NEW_MISSION_WINDOW_HOURS * HOUR_MS
}

/** Whole days left in the 30-day response window, rounded up, never negative (« Expire dans 12j »). */
export function missionDaysLeft(createdAt: string, now: Date): number {
  const remaining = JOB_POST_EXPIRY_DAYS * DAY_MS - (now.getTime() - new Date(createdAt).getTime())
  return Math.max(0, Math.ceil(remaining / DAY_MS))
}

/**
 * Oldest created_at still inside the window. `gte` this value is exactly « not isAnnoncePastExpiry »
 * (strictly more than 30 days old = expired), and the trigger's own boundary.
 */
export function missionCutoffIso(now: Date): string {
  return new Date(now.getTime() - JOB_POST_EXPIRY_DAYS * DAY_MS).toISOString()
}

/** First word of a display name (« Karim Ben Ali » → « Karim »); '' when there is none. */
export function firstName(fullName: string | null | undefined): string {
  return (fullName ?? '').trim().split(/\s+/)[0] ?? ''
}

/** A stored city (canonical governorate value) in the reader's language; free text that is not a governorate is shown as typed. */
export function localizeCity(city: string | null | undefined, lang: Lang): string | null {
  if (!city) return null
  const g = GOVERNORATES.find((x) => x.value === city)
  return g ? (lang === 'ar' ? g.ar : g.fr) : city
}
