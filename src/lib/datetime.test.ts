/**
 * Africa/Tunis date formatting — the midnight boundary.
 *
 * Tunisia is a fixed UTC+1 (no DST), so Tunis midnight is 23:00 UTC the day before. The bug these pin:
 * an order placed at 00:30 Tunis (23:30Z) printed the PREVIOUS day on a UTC server. Every assertion below
 * is an ABSOLUTE string, so it holds whatever timezone the test runner (or the server) is in — run it under
 * `TZ=UTC`, `TZ=America/Los_Angeles` and `TZ=Pacific/Kiritimati` to prove it (see the PR).
 *
 * Pure — no DB, no browser.
 * Run: npx vitest run src/lib/datetime.test.ts
 */

import { describe, it, expect } from 'vitest'
import { formatTunisDate, formatTunisDateTime, tunisDayKey, TUNIS_TZ } from './datetime'
import { shortDate, longDate, shortDateTime } from './orders/order-status'

// 2026-07-05 22:59:59Z = 23:59:59 on the 5th in Tunis; 23:00:00Z = 00:00:00 on the 6th.
const LAST_SECOND_OF_5TH = '2026-07-05T22:59:59Z'
const FIRST_SECOND_OF_6TH = '2026-07-05T23:00:00Z'
const HALF_PAST_MIDNIGHT = '2026-07-05T23:30:00Z' // « an order at 00:30 Tunis »

describe('formatTunisDate — the day flips at Tunis midnight, not UTC midnight', () => {
  it('23:59:59 Tunis is still the 5th', () => {
    expect(formatTunisDate(LAST_SECOND_OF_5TH, 'fr', 'short')).toBe('5 juil.')
  })

  it('00:00:00 Tunis is the 6th (23:00Z)', () => {
    expect(formatTunisDate(FIRST_SECOND_OF_6TH, 'fr', 'short')).toBe('6 juil.')
  })

  it('an order at 00:30 Tunis shows the 6th, not the 5th the UTC clock still reads', () => {
    expect(formatTunisDate(HALF_PAST_MIDNIGHT, 'fr', 'short')).toBe('6 juil.')
    expect(formatTunisDate(HALF_PAST_MIDNIGHT, 'fr', 'long')).toBe('6 juillet 2026')
    expect(formatTunisDate(HALF_PAST_MIDNIGHT, 'fr', 'medium')).toBe('06 juil. 2026')
  })

  it('rolls the year at Tunis new year (31 Dec 23:30Z is 1 Jan 00:30 Tunis)', () => {
    expect(formatTunisDate('2026-12-31T23:30:00Z', 'fr', 'long')).toBe('1 janvier 2027')
  })

  it('rolls the month at Tunis month end — month-year granularity', () => {
    expect(formatTunisDate('2026-07-31T23:30:00Z', 'fr', 'month-year')).toBe('août 2026')
    expect(formatTunisDate('2026-07-31T22:30:00Z', 'fr', 'month-year')).toBe('juillet 2026')
  })

  it('accepts a Date and an epoch number the same as an ISO string', () => {
    const iso = HALF_PAST_MIDNIGHT
    expect(formatTunisDate(new Date(iso), 'fr', 'short')).toBe(formatTunisDate(iso, 'fr', 'short'))
    expect(formatTunisDate(new Date(iso).getTime(), 'fr', 'short')).toBe(formatTunisDate(iso, 'fr', 'short'))
  })

  it('a date-only value (annonce deadline « YYYY-MM-DD ») keeps its calendar day', () => {
    // Parsed as UTC midnight = 01:00 Tunis, the same day — never shifted to the day before.
    expect(formatTunisDate('2026-10-30', 'fr', 'long')).toBe('30 octobre 2026')
  })

  it('Arabic: Latin digits, the 6th, and no Arabic-Indic numerals', () => {
    const ar = formatTunisDate(HALF_PAST_MIDNIGHT, 'ar', 'short')
    expect(ar).toContain('6')
    expect(ar).not.toMatch(/[٠-٩]/)
    expect(formatTunisDate(LAST_SECOND_OF_5TH, 'ar', 'short')).toContain('5')
  })

  it('an unparseable value renders « Invalid Date » instead of throwing the page down', () => {
    expect(() => formatTunisDate('not-a-date', 'fr')).not.toThrow()
    expect(formatTunisDate('not-a-date', 'fr')).toBe('Invalid Date')
  })
})

describe('formatTunisDateTime — « 18/07 09h12 », with a real 00h at midnight', () => {
  it('half past midnight Tunis is « 00h30 », never « 24h30 », and on the 6th', () => {
    expect(formatTunisDateTime(HALF_PAST_MIDNIGHT, 'fr')).toBe('06/07 00h30')
    expect(formatTunisDateTime(HALF_PAST_MIDNIGHT, 'ar')).toMatch(/00h30$/)
    expect(formatTunisDateTime(HALF_PAST_MIDNIGHT, 'ar')).not.toContain('24h')
  })

  it('23:59 Tunis is still the 5th', () => {
    expect(formatTunisDateTime(LAST_SECOND_OF_5TH, 'fr')).toBe('05/07 23h59')
  })

  it('the Figma example reads « 18/07 09h12 » (08:12Z = 09:12 Tunis)', () => {
    expect(formatTunisDateTime('2026-07-18T08:12:00Z', 'fr')).toBe('18/07 09h12')
  })
})

describe('tunisDayKey', () => {
  it('is the Tunis calendar day, ISO-ordered', () => {
    expect(tunisDayKey(LAST_SECOND_OF_5TH)).toBe('2026-07-05')
    expect(tunisDayKey(FIRST_SECOND_OF_6TH)).toBe('2026-07-06')
    expect(tunisDayKey(HALF_PAST_MIDNIGHT)).toBe('2026-07-06')
  })

  it('two instants either side of Tunis midnight are different days; either side of UTC midnight the same day', () => {
    expect(tunisDayKey(LAST_SECOND_OF_5TH)).not.toBe(tunisDayKey(FIRST_SECOND_OF_6TH))
    // 00:30 UTC and 23:30 UTC are 01:30 and 00:30 (next day) in Tunis — same Tunis day only when both fall in it.
    expect(tunisDayKey('2026-07-06T00:30:00Z')).toBe(tunisDayKey('2026-07-05T23:30:00Z'))
  })
})

// The order helpers E3 / G8 / G9 / H8 call — they must delegate, so no call site needed touching.
describe('order-status wrappers use the Tunis formatter', () => {
  it('shortDate / longDate / shortDateTime agree with it across the boundary', () => {
    expect(shortDate(HALF_PAST_MIDNIGHT, 'fr')).toBe('6 juil.')
    expect(shortDate(LAST_SECOND_OF_5TH, 'fr')).toBe('5 juil.')
    expect(longDate(HALF_PAST_MIDNIGHT, 'fr')).toBe('6 juillet 2026')
    expect(shortDateTime(HALF_PAST_MIDNIGHT, 'fr')).toBe('06/07 00h30')
  })

  it('names the zone it formats in', () => {
    expect(TUNIS_TZ).toBe('Africa/Tunis')
  })
})
