import { t, tn, type Lang } from '@/lib/i18n'
import { formatTunisDate, TUNIS_TZ } from '@/lib/datetime'

// THE APP'S ONE « il y a … » RULE (journey walk S4 + F5, 2026-11-15). Every « how long ago » label goes through
// timeBand(): under a minute « À l'instant », then minutes, hours (< 24 h), « Hier » (24-48 h), days (< 7), then a
// date (« 14 juil. », with the year when it is not this year's). Arabic counts come from tn(), which picks the CLDR
// form (3-10 plural, 11-99 accusative singular: « منذ 18 يومًا », not « منذ 18 أيام »).
//
// Two WORDINGS share the bands, because each is pinned where it shows:
//   • 'app' — the member screens. Hours read « il y a 2h » (NO space, 📐 MEASURED against 232:7602, h4-discovery.md §9),
//     days « il y a 2 jours » (founder-ruled copy), « Hier » a plain key.
//   • 'admin' — the back office's « il y a 2 h », lowercase « hier » / « à l'instant » (admin.dash.ago_*).
// No date library added.
//
// Not here, on purpose: durations. The seller's « en attente · il y a 3 h » (waitingLabel) and the admin « depuis »
// columns (sinceText) measure how long a STATE has lasted, from an hour count, not when something happened.

export type TimeBand = 'now' | 'minutes' | 'hours' | 'yesterday' | 'days' | 'date'
export type TimeWording = 'app' | 'admin'

const KEYS: Record<TimeWording, Record<Exclude<TimeBand, 'date'>, string>> = {
  app: {
    now: 'activite.time_ago_just_now',
    minutes: 'activite.time_ago_minutes',
    hours: 'activite.time_ago_hours',
    yesterday: 'activite.time_ago_yesterday',
    days: 'activite.time_ago_days',
  },
  admin: {
    now: 'admin.dash.ago_now',
    minutes: 'admin.dash.ago_minutes',
    hours: 'admin.dash.ago_hours',
    yesterday: 'admin.dash.ago_yesterday',
    days: 'admin.dash.ago_days',
  },
}

const MINUTE = 60_000
const HOUR = 3_600_000
const DAY = 86_400_000

/** Which band `iso` falls in, seen from `now`, and the whole count for that band. A future time (clock skew) is « now ». */
export function timeBand(iso: string, now: number): { band: TimeBand; count: number } {
  const ms = Math.max(0, now - new Date(iso).getTime())
  if (ms < MINUTE) return { band: 'now', count: 0 }
  if (ms < HOUR) return { band: 'minutes', count: Math.floor(ms / MINUTE) }
  if (ms < DAY) return { band: 'hours', count: Math.floor(ms / HOUR) }
  const days = Math.floor(ms / DAY)
  if (days === 1) return { band: 'yesterday', count: 1 }
  if (days < 7) return { band: 'days', count: days }
  return { band: 'date', count: days }
}

const tunisYear = (value: string | number) =>
  new Intl.DateTimeFormat('en', { year: 'numeric', timeZone: TUNIS_TZ }).format(new Date(value))

/** « 14 juil. » this year, « 14 juil. 2025 » before it — Tunis calendar. */
function dateLabel(iso: string, lang: Lang, now: number): string {
  return formatTunisDate(iso, lang, tunisYear(iso) === tunisYear(now) ? 'short' : 'medium')
}

/** A standalone label: « il y a 5 min », « Hier », « 14 juil. ». */
export function relativeTimeLabel(iso: string, lang: Lang, now = Date.now(), wording: TimeWording = 'app'): string {
  const { band, count } = timeBand(iso, now)
  if (band === 'date') return dateLabel(iso, lang, now)
  const key = KEYS[wording][band]
  return band === 'now' || band === 'yesterday' ? t(key, lang) : tn(key, lang, count)
}

/** The label, or null once the rule would answer with a date — for a row that already prints the date above it. */
export function recentTimeLabel(iso: string, lang: Lang, now = Date.now(), wording: TimeWording = 'app'): string | null {
  return timeBand(iso, now).band === 'date' ? null : relativeTimeLabel(iso, lang, now, wording)
}

/**
 * The same time inside a sentence (« Publié {when} »): lowercase in FR / EN (« Publié hier »), and the date band
 * reads « le 14 juil. » / « on 14 Jul » / « في 14 جويلية », never a bare date after a verb.
 */
export function relativeTimeInSentence(iso: string, lang: Lang, now = Date.now(), wording: TimeWording = 'app'): string {
  if (timeBand(iso, now).band === 'date') return t('activite.on_date', lang, { date: dateLabel(iso, lang, now) })
  const label = relativeTimeLabel(iso, lang, now, wording)
  return lang === 'ar' ? label : label.charAt(0).toLocaleLowerCase() + label.slice(1)
}

// How long a « en attente » order has waited, on the seller's order list (audit S4, 2026-11-15): whole hours
// under a day, whole days from 24 h — a raw hour count read « il y a 2335 h ». A duration, see the header.
export function waitingLabel(hours: number, lang: Lang): string {
  if (hours < 24) return tn('seller.orders.waiting_hours', lang, hours)
  return tn('seller.orders.waiting_days', lang, Math.floor(hours / 24))
}
