import { describe, it, expect } from 'vitest'
import { tunisYearMonth, tunisMonthStartUtc, monthBoundaries } from './seller-services-query'

// Africa/Tunis: fixed UTC+1 year-round (DST abolished 2005) — every boundary here is a Tunis-local
// midnight expressed as its UTC instant, i.e. 23:00 UTC the previous day.

describe('tunisYearMonth', () => {
  it('reads the Tunis-local calendar date from a UTC instant near local midnight', () => {
    // 2026-03-14T23:30:00Z is 2026-03-15T00:30 in Tunis (UTC+1) — already the 15th locally.
    expect(tunisYearMonth(new Date('2026-03-14T23:30:00Z'))).toEqual({ year: 2026, month: 3 })
    // 2026-03-14T22:30:00Z is 2026-03-14T23:30 in Tunis — still the 14th.
    expect(tunisYearMonth(new Date('2026-03-14T22:30:00Z'))).toEqual({ year: 2026, month: 3 })
  })
})

describe('tunisMonthStartUtc', () => {
  it('is 23:00 UTC the previous calendar day', () => {
    expect(tunisMonthStartUtc(2026, 2).toISOString()).toBe('2026-02-28T23:00:00.000Z') // March 1 (monthIndex0=2)
  })

  it('rolls a monthIndex0 of 12 into January of the next year (JS Date normalizes this)', () => {
    expect(tunisMonthStartUtc(2026, 12).toISOString()).toBe('2026-12-31T23:00:00.000Z') // Jan 1, 2027
  })

  it('rolls a monthIndex0 of -1 into December of the previous year', () => {
    expect(tunisMonthStartUtc(2026, -1).toISOString()).toBe('2025-11-30T23:00:00.000Z') // Dec 1, 2025
  })
})

describe('monthBoundaries', () => {
  it('gives three consecutive, correctly-ordered Tunis month starts for a mid-month "now"', () => {
    const { lastMonthStart, thisMonthStart, nextMonthStart } = monthBoundaries(new Date('2026-06-15T10:00:00Z'))
    expect(lastMonthStart.toISOString()).toBe('2026-04-30T23:00:00.000Z') // May 1
    expect(thisMonthStart.toISOString()).toBe('2026-05-31T23:00:00.000Z') // June 1
    expect(nextMonthStart.toISOString()).toBe('2026-06-30T23:00:00.000Z') // July 1
    expect(lastMonthStart.getTime()).toBeLessThan(thisMonthStart.getTime())
    expect(thisMonthStart.getTime()).toBeLessThan(nextMonthStart.getTime())
  })

  it('crosses the year boundary correctly for a January "now"', () => {
    const { lastMonthStart, thisMonthStart, nextMonthStart } = monthBoundaries(new Date('2026-01-05T10:00:00Z'))
    expect(lastMonthStart.toISOString()).toBe('2025-11-30T23:00:00.000Z') // Dec 1, 2025
    expect(thisMonthStart.toISOString()).toBe('2025-12-31T23:00:00.000Z') // Jan 1, 2026
    expect(nextMonthStart.toISOString()).toBe('2026-01-31T23:00:00.000Z') // Feb 1, 2026
  })
})
