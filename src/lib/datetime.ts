// ONE place that turns a stored timestamp into text a user reads — always in Africa/Tunis.
//
// ⚑ WHY THIS EXISTS. `new Date(iso).toLocaleDateString(locale)` formats in the RUNTIME's timezone. A
// Server Component runs on Vercel (UTC), so an order placed at 00:30 in Tunis (23:30 UTC the day before)
// printed the PREVIOUS day, while the same page hydrated in a Tunis browser would print the right one — a
// wrong date on the server, a hydration mismatch waiting to happen, and no error anywhere. Every
// user-facing date therefore passes an explicit `timeZone: 'Africa/Tunis'`.
//
// Tunisia has been a fixed UTC+1 since it abolished DST in 2005, but the zone is named, never a hard-coded
// "+1" — the tz database stays the source of truth (same stance as seller-services-query.ts's
// tunisYearMonth, which this does not replace: that one builds month BOUNDARIES for queries, this one
// FORMATS).
//
// Digits are Latin in both locales: the default Arabic numbering system is Arabic-Indic, and prices and dates
// must stay readable left-to-right inside Arabic text (the existing order-status.ts rule, now kept here).
//
// Pure — no `Date.now()`: callers pass the instant, so a test can sit either side of Tunis midnight.
// `toLocale*String` (not `Intl.DateTimeFormat#format`) on purpose: an unparseable value renders « Invalid
// Date » there instead of throwing a RangeError that would take the whole page down.
import type { Lang } from '@/lib/i18n'

export const TUNIS_TZ = 'Africa/Tunis'

const LOCALE: Record<Lang, string> = { fr: 'fr-FR', ar: 'ar-TN-u-nu-latn' }

export type TunisDateStyle =
  /** « 24 nov » — a header date. */
  | 'short'
  /** « 20 novembre 2024 » — a meta date. */
  | 'long'
  /** « 05 juil. 2024 » — a compact dated line. */
  | 'medium'
  /** « juillet 2026 » — month granularity (« membre depuis »). */
  | 'month-year'

const DATE_OPTIONS: Record<TunisDateStyle, Intl.DateTimeFormatOptions> = {
  short: { day: 'numeric', month: 'short' },
  long: { day: 'numeric', month: 'long', year: 'numeric' },
  medium: { day: '2-digit', month: 'short', year: 'numeric' },
  'month-year': { month: 'long', year: 'numeric' },
}

type Instant = string | number | Date

export function formatTunisDate(value: Instant, lang: Lang, style: TunisDateStyle = 'short'): string {
  return new Date(value).toLocaleDateString(LOCALE[lang], { ...DATE_OPTIONS[style], timeZone: TUNIS_TZ })
}

/**
 * « 18/07 09h12 » — the order timeline stamp (Figma 504:27049).
 *
 * Built by hand: the frame's separator is the FRENCH hour mark (« 09h12 »), which no locale's time format
 * produces — `fr-FR` gives « 09:12 ». `hourCycle: 'h23'` (not `hour12: false`): the latter can print
 * « 24:30 » for half past midnight in some ICU builds, and half past midnight is exactly the case this file
 * exists for.
 */
export function formatTunisDateTime(value: Instant, lang: Lang): string {
  const d = new Date(value)
  const date = d.toLocaleDateString(LOCALE[lang], { day: '2-digit', month: '2-digit', timeZone: TUNIS_TZ })
  const time = d.toLocaleTimeString(LOCALE[lang], {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZone: TUNIS_TZ,
  })
  return `${date} ${time.replace(':', 'h')}`
}

/** The Tunis calendar day of an instant as `YYYY-MM-DD` — for same-day comparisons, never for display. */
export function tunisDayKey(value: Instant): string {
  // `en-CA` renders ISO-ordered Y-M-D; only the digits are used.
  return new Date(value).toLocaleDateString('en-CA', { timeZone: TUNIS_TZ })
}

/** « 14h32 » — the time of an instant in Tunis, with the French hour mark (see formatTunisDateTime for why by hand). */
export function formatTunisTime(value: Instant, lang: Lang): string {
  const time = new Date(value).toLocaleTimeString(LOCALE[lang], {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZone: TUNIS_TZ,
  })
  return time.replace(':', 'h')
}
