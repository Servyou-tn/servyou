import { describe, it, expect } from 'vitest'
import { initials, frenchRelativeAdded, tndPrice } from './listing-utils'

describe('initials', () => {
  it('two words → two letters, uppercase', () => {
    expect(initials('Mohamed Ali')).toBe('MA')
  })
  it('one word → one letter', () => {
    expect(initials('Sarra')).toBe('S')
  })
  it('three words → first two only', () => {
    expect(initials('Ahmed Ben Salah')).toBe('AB')
  })
  it('null / empty → placeholder', () => {
    expect(initials(null)).toBe('?')
    expect(initials('   ')).toBe('?')
  })
})

describe('frenchRelativeAdded', () => {
  const now = new Date('2026-06-14T12:00:00Z').getTime()
  const ago = (ms: number) => new Date(now - ms).toISOString()
  const MIN = 60_000
  const HOUR = 60 * MIN
  const DAY = 24 * HOUR

  it('< 1 hour', () => {
    expect(frenchRelativeAdded(ago(30 * MIN), now)).toBe("moins d'une heure")
  })
  it('singular hour vs plural', () => {
    expect(frenchRelativeAdded(ago(1 * HOUR), now)).toBe('1 heure')
    expect(frenchRelativeAdded(ago(5 * HOUR), now)).toBe('5 heures')
  })
  it('singular day vs plural', () => {
    expect(frenchRelativeAdded(ago(1 * DAY), now)).toBe('1 jour')
    expect(frenchRelativeAdded(ago(3 * DAY), now)).toBe('3 jours')
  })
  it('months', () => {
    expect(frenchRelativeAdded(ago(60 * DAY), now)).toBe('2 mois')
  })
  it('years', () => {
    expect(frenchRelativeAdded(ago(400 * DAY), now)).toBe('1 an')
  })
})

describe('tndPrice', () => {
  it('integer → no decimals', () => {
    expect(tndPrice(120)).toBe('120 TND')
  })
  it('decimal → two places', () => {
    expect(tndPrice(49.5)).toBe('49.50 TND')
  })
  it('null → 0 TND', () => {
    expect(tndPrice(null)).toBe('0 TND')
  })
})
