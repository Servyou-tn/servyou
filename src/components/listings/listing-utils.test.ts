import { describe, it, expect } from 'vitest'
import { tndCurrency, tndPrice, tndPriceGrouped } from './listing-utils'

// `initials` moved to the one shared helper (components/ui/initials.ts) — its tests live there.

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

describe('one currency notation per language (walk #25 / #30)', () => {
  it('FR keeps « TND », byte for byte; AR is « د.ت », the seller dashboard notation', () => {
    expect(tndPrice(120)).toBe('120 TND')
    expect(tndPrice(120, 'fr')).toBe('120 TND')
    expect(tndPrice(120, 'ar')).toBe('120 د.ت')
    expect(tndPrice(49.5, 'ar')).toBe('49.50 د.ت')
    expect(tndCurrency('ar')).toBe('د.ت')
    expect(tndCurrency('fr')).toBe('TND')
  })

  it('the grouped variant groups the same way in both languages (« 1.250 » would read as millimes) and never says TND in AR', () => {
    const NNBSP = '\u202f' // fr-FR's group separator
    expect(tndPriceGrouped(1250, 'fr')).toBe(`1${NNBSP}250 TND`)
    expect(tndPriceGrouped(1250, 'ar')).toBe(`1${NNBSP}250 د.ت`)
    expect(tndPriceGrouped(1250.5, 'ar')).toBe(`1${NNBSP}250,5 د.ت`)
    expect(tndPriceGrouped(17, 'ar')).toBe('17 د.ت')
  })

  it('English groups the international way: « 1,250.5 TND »', () => {
    expect(tndPriceGrouped(1250, 'en')).toBe('1,250 TND')
    expect(tndPriceGrouped(1250.5, 'en')).toBe('1,250.5 TND')
  })
})
