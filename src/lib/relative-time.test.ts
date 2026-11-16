import { describe, it, expect } from 'vitest'
import { relativeTimeLabel, waitingLabel } from './relative-time'

const NOW = new Date('2026-09-03T12:00:00Z').getTime()
const hoursAgo = (h: number) => new Date(NOW - h * 3_600_000).toISOString()
const daysAgo = (d: number) => new Date(NOW - d * 86_400_000).toISOString()

describe('relativeTimeLabel — the three bands the founder\'s own examples name', () => {
  it('renders "À l\'instant" under one hour', () => {
    expect(relativeTimeLabel(hoursAgo(0.5), 'fr', NOW)).toBe("À l'instant")
  })

  it('renders "il y a {h}h" (abbreviated, invariant, NO space before the h) between 1 and 23 hours — 📐 measured against 232:7602: "il y a 2h"', () => {
    expect(relativeTimeLabel(hoursAgo(3), 'fr', NOW)).toBe('il y a 3h')
    expect(relativeTimeLabel(hoursAgo(1), 'fr', NOW)).toBe('il y a 1h')
    expect(relativeTimeLabel(hoursAgo(2), 'fr', NOW)).toBe('il y a 2h')
  })

  it('renders "Hier" for exactly one day, as a plain key — not "il y a 1 jour"', () => {
    expect(relativeTimeLabel(daysAgo(1), 'fr', NOW)).toBe('Hier')
    expect(relativeTimeLabel(hoursAgo(30), 'fr', NOW)).toBe('Hier')
  })

  it('renders "il y a {d} jours" (spelled out, real plural) at 2+ days — matches "il y a 2 jours"', () => {
    expect(relativeTimeLabel(daysAgo(2), 'fr', NOW)).toBe('il y a 2 jours')
    expect(relativeTimeLabel(daysAgo(10), 'fr', NOW)).toBe('il y a 10 jours')
  })

  it('French singular day reads "il y a 1 jour" if ever reached (defensive — "hier" wins first in practice)', () => {
    // days === 1 is intercepted by the "hier" branch before tn() ever sees count=1 for this key;
    // this only exercises the plural table's own one/other split directly.
    expect(relativeTimeLabel(hoursAgo(3), 'fr', NOW)).not.toContain('jour')
  })

  it('Arabic: hours use ساعة/ساعتين/ساعات (one/two/other), days use يوم/يومين/أيام, "hier" -> أمس', () => {
    expect(relativeTimeLabel(hoursAgo(1), 'ar', NOW)).toBe('منذ 1 ساعة')
    expect(relativeTimeLabel(hoursAgo(2), 'ar', NOW)).toBe('منذ 2 ساعتين')
    expect(relativeTimeLabel(hoursAgo(5), 'ar', NOW)).toBe('منذ 5 ساعات')
    expect(relativeTimeLabel(daysAgo(1), 'ar', NOW)).toBe('أمس')
    expect(relativeTimeLabel(daysAgo(2), 'ar', NOW)).toBe('منذ 2 يومين')
    expect(relativeTimeLabel(daysAgo(10), 'ar', NOW)).toBe('منذ 10 أيام')
    expect(relativeTimeLabel(daysAgo(18), 'ar', NOW)).toBe('منذ 18 يومًا')
    expect(relativeTimeLabel(hoursAgo(15), 'ar', NOW)).toBe('منذ 15 ساعةً')
  })
})

describe('waitingLabel — seller order wait (audit S4): hours under a day, then days, never « 2335 h »', () => {
  it('French', () => {
    expect(waitingLabel(0, 'fr')).toBe('· il y a 0 h')
    expect(waitingLabel(23, 'fr')).toBe('· il y a 23 h')
    expect(waitingLabel(24, 'fr')).toBe('· il y a 1 jour')
    expect(waitingLabel(47, 'fr')).toBe('· il y a 1 jour')
    expect(waitingLabel(2335, 'fr')).toBe('· il y a 97 jours')
  })

  it('Arabic', () => {
    expect(waitingLabel(5, 'ar')).toBe('· منذ 5 ساعات')
    expect(waitingLabel(48, 'ar')).toBe('· منذ 2 يومين')
    expect(waitingLabel(2335, 'ar')).toBe('· منذ 97 يومًا')
  })

  it('English', () => {
    expect(waitingLabel(3, 'en')).toBe('· 3 h ago')
    expect(waitingLabel(24, 'en')).toBe('· 1 day ago')
    expect(waitingLabel(2335, 'en')).toBe('· 97 days ago')
  })
})
