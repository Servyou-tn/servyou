import { describe, it, expect } from 'vitest'
import { initials, tndPrice } from './listing-utils'

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
