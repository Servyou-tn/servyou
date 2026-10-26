import { describe, it, expect } from 'vitest'
import { tndPrice } from './listing-utils'

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
