import { describe, it, expect } from 'vitest'
import { isAnnoncePastExpiry, resolveAnnonceStatus } from './annonce-status'

const NOW = new Date(2026, 5, 30, 12, 0, 0) // 2026-06-30 12:00:00 (injected, since Date.now() varies)
const DAY_MS = 24 * 60 * 60 * 1000

function daysBefore(n: number): string {
  return new Date(NOW.getTime() - n * DAY_MS).toISOString()
}

describe('isAnnoncePastExpiry', () => {
  it('is false at day 29', () => {
    expect(isAnnoncePastExpiry(daysBefore(29), NOW)).toBe(false)
  })

  it('is false at exactly day 30 (strict >, matching the DB trigger)', () => {
    expect(isAnnoncePastExpiry(daysBefore(30), NOW)).toBe(false)
  })

  it('is true at day 30 plus one millisecond', () => {
    const createdAt = new Date(NOW.getTime() - 30 * DAY_MS - 1).toISOString()
    expect(isAnnoncePastExpiry(createdAt, NOW)).toBe(true)
  })

  it('is true at day 31', () => {
    expect(isAnnoncePastExpiry(daysBefore(31), NOW)).toBe(true)
  })
})

describe('resolveAnnonceStatus', () => {
  it('reads "open" for a fresh open post', () => {
    expect(resolveAnnonceStatus('open', daysBefore(1), NOW)).toBe('open')
  })

  it('reads "open" at exactly day 30 (the boundary is not yet expired)', () => {
    expect(resolveAnnonceStatus('open', daysBefore(30), NOW)).toBe('open')
  })

  it('reads "expired" for an open post past day 30', () => {
    expect(resolveAnnonceStatus('open', daysBefore(31), NOW)).toBe('expired')
  })

  it('a filled post reads "filled" regardless of age — precedence over expiry', () => {
    expect(resolveAnnonceStatus('filled', daysBefore(1), NOW)).toBe('filled')
    expect(resolveAnnonceStatus('filled', daysBefore(90), NOW)).toBe('filled')
  })

  it('a status already stored as "expired" is trusted as-is (future-proofing, unreachable today)', () => {
    expect(resolveAnnonceStatus('expired', daysBefore(1), NOW)).toBe('expired')
  })
})
