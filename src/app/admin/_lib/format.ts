import { t, tn, type Lang } from '@/lib/i18n'
import { tndPriceGrouped } from '@/components/listings/listing-utils'
import { GOVERNORATES } from '@/lib/tunisia-governorates'
import type { KpiDelta } from '../_components/KpiTile'
import { deltaTone, durationParts, formatCount, sinceParts, type Delta, type DurationParts, type Polarity } from './dashboard'

// Locale glue for the admin read side: numbers and durations through admin.dash.* keys (FR + AR), every
// number LTR (the callers wrap them in <bdi dir="ltr">). The tile deltas carry a full sr-only sentence.

export function durationText(parts: DurationParts | null, lang: Lang): string {
  return parts ? t(`admin.dash.dur_${parts.key}`, lang, { n: parts.n }) : '—'
}

export function medianText(minutes: number | null, lang: Lang): string {
  return durationText(durationParts(minutes), lang)
}

export function sinceText(iso: string, now: number, lang: Lang): string {
  return durationText(sinceParts(iso, now), lang)
}

/** A declared amount; null (an order before the price snapshot, D10) is « — ». */
export function amountText(value: number | null, lang: Lang): string {
  return value === null ? '—' : tndPriceGrouped(value, lang)
}

type DeltaUnit = 'pct' | 'pts' | 'count' | 'minutes'

/** A tile's delta: the visible text (« 300 % », « 8 pts », « 2 », « 3 h »), its colour by meaning, and its sr-only sentence. */
export function kpiDelta(d: Delta | null, unit: DeltaUnit, lang: Lang, polarity: Polarity = 'higher_better'): KpiDelta | null {
  if (!d) return null
  const text =
    unit === 'pct' ? `${formatCount(d.value)} %`
    : unit === 'pts' ? t('admin.dash.pts', lang, { n: formatCount(d.value) })
    : unit === 'minutes' ? medianText(d.value, lang)
    : formatCount(d.value)
  const key = d.direction === 'up' ? 'admin.dash.delta_up' : d.direction === 'down' ? 'admin.dash.delta_down' : 'admin.dash.delta_flat'
  return { direction: d.direction, tone: deltaTone(d, polarity), text, label: t(key, lang, { value: text }) }
}

/** « il y a 2 h » / « hier » / « il y a 3 jours » — the app's relative-time bands, admin wording. */
export function agoText(iso: string, now: number, lang: Lang): string {
  const ms = Math.max(0, now - new Date(iso).getTime())
  const minutes = Math.floor(ms / 60_000)
  const hours = Math.floor(ms / 3_600_000)
  const days = Math.floor(ms / 86_400_000)
  if (minutes < 1) return t('admin.dash.ago_now', lang)
  if (hours < 1) return tn('admin.dash.ago_minutes', lang, minutes)
  if (hours < 24) return tn('admin.dash.ago_hours', lang, hours)
  if (days === 1) return t('admin.dash.ago_yesterday', lang)
  return tn('admin.dash.ago_days', lang, days)
}

// p_days = null is the RPCs' documented « no date filter » (admin_list_orders / admin_count_orders /
// admin_list_audit_log); the generated Args type only knows `number`, so the null is typed through here.
export const ALL_TIME = null as unknown as number

/** An admin_list_orders row as it really arrives: the snapshot / name columns can be null (D10, deleted users). */
export type AdminOrderRow = {
  id: string; ref: string; item_title: string | null; quantity: number; order_type: string; amount_tnd: number | null
  status: string; created_at: string; status_since: string; status_since_exact: boolean; is_blocked: boolean
  buyer_id: string; buyer_name: string | null; buyer_city: string | null
  seller_id: string; seller_name: string | null; seller_kind: string; seller_city: string | null
  total_count: number
}

/** An admin_list_audit_log row as it really arrives (label / admin name / note can be null). */
export type AdminAuditRow = {
  id: string; created_at: string; action: string; target_type: string; target_id: string | null; target_label: string | null
  before_state: unknown; after_state: unknown; note: string | null; admin_id: string; admin_name: string | null; total_count: number
}

const CONTENT_TARGETS = new Set(['product', 'service', 'shop', 'freelancer_profile', 'job_post'])
const KNOWN_TARGETS = new Set(['report', 'dispute', 'user', 'product', 'service', 'shop', 'freelancer_profile', 'job_post', 'deletion_request', 'data_export', 'contact_message'])

/** « Produit « Montre » », « Nour B. », « Signalement #A1B2C3 » — the RPC's target_label with its kind. */
export function auditTargetText(r: Pick<AdminAuditRow, 'target_type' | 'target_label'>, lang: Lang): string {
  const kind = t(`admin.log.target.${KNOWN_TARGETS.has(r.target_type) ? r.target_type : 'other'}`, lang)
  if (!r.target_label) return kind
  if (r.target_type === 'user' || r.target_type === 'contact_message' || r.target_type === 'deletion_request' || r.target_type === 'data_export') return r.target_label
  if (CONTENT_TARGETS.has(r.target_type)) return `${kind} « ${r.target_label} »`
  return `${kind} ${r.target_label}`
}

const GOV = new Map(GOVERNORATES.map((g) => [g.value, g]))
/** profiles.city holds the canonical governorate value; show its label in the reader's language (unknown → as stored). */
export function cityLabel(city: string, lang: Lang): string {
  const g = GOV.get(city)
  return g ? (lang === 'ar' ? g.ar : g.fr) : city
}
