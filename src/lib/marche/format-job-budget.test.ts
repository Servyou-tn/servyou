import { describe, it, expect } from 'vitest'
import { formatJobBudget, hasJobBudget } from './format-job-budget'

describe('formatJobBudget (D-H10-2)', () => {
  it('range, equal bounds, one bound, none — FR', () => {
    expect(formatJobBudget(200, 400, 'fr')).toBe('200 – 400 TND')
    expect(formatJobBudget(800, 800, 'fr')).toBe('800 TND')
    expect(formatJobBudget(200, null, 'fr')).toBe('Dès 200 TND')
    expect(formatJobBudget(null, 400, 'fr')).toBe("Jusqu'à 400 TND")
    expect(formatJobBudget(null, null, 'fr')).toBe('Budget à discuter')
  })

  it('swaps a reversed pair instead of printing it backwards (no min ≤ max CHECK in the DB)', () => {
    expect(formatJobBudget(400, 200, 'fr')).toBe('200 – 400 TND')
  })

  it('keeps decimals only when there are some', () => {
    expect(formatJobBudget(99.5, 120, 'fr')).toBe('99.50 – 120 TND')
  })

  it('treats a zero bound as a real value, not as missing', () => {
    expect(formatJobBudget(0, 100, 'fr')).toBe('0 – 100 TND')
    expect(hasJobBudget(0, null)).toBe(true)
  })

  it('AR uses د.ت and never leaves a raw key', () => {
    expect(formatJobBudget(200, 400, 'ar')).toBe('200 – 400 د.ت')
    expect(formatJobBudget(null, null, 'ar')).not.toContain('jobbudget.')
  })

  it('hasJobBudget is false only with no bound at all', () => {
    expect(hasJobBudget(null, null)).toBe(false)
    expect(hasJobBudget(null, 10)).toBe(true)
  })
})
