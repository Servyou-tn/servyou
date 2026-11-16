import { describe, it, expect } from 'vitest'
import { recentTimeLabel, relativeTimeInSentence, relativeTimeLabel, timeBand, waitingLabel } from './relative-time'

const NOW = new Date('2026-09-03T12:00:00Z').getTime()
const ago = (ms: number) => new Date(NOW - ms).toISOString()
const S = 1000
const MIN = 60 * S
const H = 60 * MIN
const D = 24 * H

describe('timeBand — the one rule (journey walk S4 + F5): minutes → hours (< 24 h) → days (< 7) → a date', () => {
  it.each([
    [59 * S, 'now', 0],
    [1 * MIN, 'minutes', 1],
    [59 * MIN + 59 * S, 'minutes', 59],
    [1 * H, 'hours', 1],
    [23 * H + 59 * MIN, 'hours', 23],
    [24 * H, 'yesterday', 1],
    [47 * H + 59 * MIN, 'yesterday', 1],
    [48 * H, 'days', 2],
    [6 * D + 23 * H, 'days', 6],
    [7 * D, 'date', 7],
    [400 * D, 'date', 400],
  ] as const)('%d ms ago → %s', (ms, band, count) => {
    expect(timeBand(ago(ms), NOW)).toEqual({ band, count })
  })

  it('an unparseable time never throws — it renders « Invalid Date » like formatTunisDate', () => {
    expect(() => relativeTimeLabel('not-a-date', 'fr', NOW)).not.toThrow()
    expect(relativeTimeLabel('not-a-date', 'fr', NOW)).toBe('Invalid Date')
    expect(() => relativeTimeInSentence('not-a-date', 'ar', NOW)).not.toThrow()
  })

  it('a time in the future (clock skew between the DB and the server) is « now », never negative', () => {
    expect(timeBand(new Date(NOW + 5 * MIN).toISOString(), NOW)).toEqual({ band: 'now', count: 0 })
  })
})

describe('relativeTimeLabel — app wording', () => {
  it('French: « À l\'instant », minutes, « il y a 3h » (no space — 📐 measured against 232:7602), « Hier », days', () => {
    expect(relativeTimeLabel(ago(30 * S), 'fr', NOW)).toBe("À l'instant")
    expect(relativeTimeLabel(ago(1 * MIN), 'fr', NOW)).toBe('il y a 1 min')
    expect(relativeTimeLabel(ago(30 * MIN), 'fr', NOW)).toBe('il y a 30 min')
    expect(relativeTimeLabel(ago(1 * H), 'fr', NOW)).toBe('il y a 1h')
    expect(relativeTimeLabel(ago(3 * H), 'fr', NOW)).toBe('il y a 3h')
    expect(relativeTimeLabel(ago(23 * H + 59 * MIN), 'fr', NOW)).toBe('il y a 23h')
    expect(relativeTimeLabel(ago(24 * H), 'fr', NOW)).toBe('Hier')
    expect(relativeTimeLabel(ago(30 * H), 'fr', NOW)).toBe('Hier')
    expect(relativeTimeLabel(ago(2 * D), 'fr', NOW)).toBe('il y a 2 jours')
    expect(relativeTimeLabel(ago(6 * D + 23 * H), 'fr', NOW)).toBe('il y a 6 jours')
  })

  it('from 7 days: the date, in the Tunis calendar, with the year only when it is not this year', () => {
    expect(relativeTimeLabel(ago(10 * D), 'fr', NOW)).toBe('24 août')
    // 23:30 UTC on the 26th is 00:30 on the 27th in Tunis.
    expect(relativeTimeLabel('2026-08-26T23:30:00Z', 'fr', NOW)).toBe('27 août')
    // 23:30 UTC on 31 Dec 2025 is already 1 Jan 2026 in Tunis: this year, so no year.
    expect(relativeTimeLabel('2025-12-31T23:30:00Z', 'fr', NOW)).toBe('1 janv.')
    expect(relativeTimeLabel('2025-12-31T22:00:00Z', 'fr', NOW)).toBe('31 déc. 2025')
    expect(relativeTimeLabel('2026-08-26T23:30:00Z', 'ar', NOW)).toBe('27 أوت')
    expect(relativeTimeLabel('2025-12-31T22:00:00Z', 'ar', NOW)).toBe('31 ديسمبر 2025')
    expect(relativeTimeLabel('2026-08-26T23:30:00Z', 'en', NOW)).toBe('27 Aug')
  })

  it('Arabic: the CLDR form per count — 3-10 plural (few), 11-99 accusative singular (many)', () => {
    expect(relativeTimeLabel(ago(30 * S), 'ar', NOW)).toBe('الآن')
    expect(relativeTimeLabel(ago(1 * MIN), 'ar', NOW)).toBe('منذ 1 دقيقة')
    expect(relativeTimeLabel(ago(2 * MIN), 'ar', NOW)).toBe('منذ 2 دقيقتين')
    expect(relativeTimeLabel(ago(3 * MIN), 'ar', NOW)).toBe('منذ 3 دقائق')
    expect(relativeTimeLabel(ago(11 * MIN), 'ar', NOW)).toBe('منذ 11 دقيقةً')
    expect(relativeTimeLabel(ago(1 * H), 'ar', NOW)).toBe('منذ 1 ساعة')
    expect(relativeTimeLabel(ago(2 * H), 'ar', NOW)).toBe('منذ 2 ساعتين')
    expect(relativeTimeLabel(ago(5 * H), 'ar', NOW)).toBe('منذ 5 ساعات')
    expect(relativeTimeLabel(ago(15 * H), 'ar', NOW)).toBe('منذ 15 ساعةً')
    expect(relativeTimeLabel(ago(1 * D), 'ar', NOW)).toBe('أمس')
    expect(relativeTimeLabel(ago(2 * D), 'ar', NOW)).toBe('منذ 2 يومين')
    expect(relativeTimeLabel(ago(6 * D), 'ar', NOW)).toBe('منذ 6 أيام')
  })

  it('English', () => {
    expect(relativeTimeLabel(ago(30 * S), 'en', NOW)).toBe('Just now')
    expect(relativeTimeLabel(ago(5 * MIN), 'en', NOW)).toBe('5 min ago')
    expect(relativeTimeLabel(ago(3 * H), 'en', NOW)).toBe('3h ago')
    expect(relativeTimeLabel(ago(1 * D), 'en', NOW)).toBe('Yesterday')
    expect(relativeTimeLabel(ago(6 * D), 'en', NOW)).toBe('6 days ago')
  })
})

describe('relativeTimeLabel — admin wording, same bands', () => {
  it('keeps the back office\'s « il y a 2 h » and lowercase « hier »', () => {
    expect(relativeTimeLabel(ago(30 * S), 'fr', NOW, 'admin')).toBe("à l'instant")
    expect(relativeTimeLabel(ago(5 * MIN), 'fr', NOW, 'admin')).toBe('il y a 5 min')
    expect(relativeTimeLabel(ago(2 * H), 'fr', NOW, 'admin')).toBe('il y a 2 h')
    expect(relativeTimeLabel(ago(1 * D), 'fr', NOW, 'admin')).toBe('hier')
    expect(relativeTimeLabel(ago(3 * D), 'fr', NOW, 'admin')).toBe('il y a 3 jours')
    expect(relativeTimeLabel(ago(10 * D), 'fr', NOW, 'admin')).toBe('24 août')
    expect(relativeTimeLabel(ago(11 * MIN), 'ar', NOW, 'admin')).toBe('منذ 11 دقيقةً')
  })
})

describe('recentTimeLabel — rows that already print the date', () => {
  it('is the label under 7 days and null from 7 days', () => {
    expect(recentTimeLabel(ago(6 * D), 'fr', NOW)).toBe('il y a 6 jours')
    expect(recentTimeLabel(ago(7 * D), 'fr', NOW)).toBeNull()
  })
})

describe('relativeTimeInSentence — « Publié {when} »', () => {
  it('lowercases FR / EN, leaves Arabic alone', () => {
    expect(relativeTimeInSentence(ago(30 * S), 'fr', NOW)).toBe("à l'instant")
    expect(relativeTimeInSentence(ago(1 * D), 'fr', NOW)).toBe('hier')
    expect(relativeTimeInSentence(ago(3 * H), 'fr', NOW)).toBe('il y a 3h')
    expect(relativeTimeInSentence(ago(1 * D), 'en', NOW)).toBe('yesterday')
    expect(relativeTimeInSentence(ago(1 * D), 'ar', NOW)).toBe('أمس')
  })

  it('a date reads « le 27 août » / « on 27 Aug » / « في 27 أوت », never a bare date after the verb', () => {
    expect(relativeTimeInSentence('2026-08-26T23:30:00Z', 'fr', NOW)).toBe('le 27 août')
    expect(relativeTimeInSentence('2026-08-26T23:30:00Z', 'en', NOW)).toBe('on 27 Aug')
    expect(relativeTimeInSentence('2026-08-26T23:30:00Z', 'ar', NOW)).toBe('في 27 أوت')
    expect(relativeTimeInSentence('2025-12-31T22:00:00Z', 'fr', NOW, 'admin')).toBe('le 31 déc. 2025')
  })
})

describe('waitingLabel — seller order wait (audit S4): a duration, hours under a day, then days, never « 2335 h »', () => {
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
