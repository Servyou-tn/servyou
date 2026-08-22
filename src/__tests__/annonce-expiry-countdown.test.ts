/**
 * Unit tests for the annonce expiry countdown (business-rule logic, gated to the last 7 days of
 * the 30-day job_posts expiry window — see annonce-status.ts's own isAnnoncePastExpiry boundary).
 *
 * Pure function — no DB, no Supabase, no browser.
 *
 * Run: npx vitest run src/__tests__/annonce-expiry-countdown.test.ts
 */

import { describe, it, expect } from 'vitest'
import { getExpiryCountdownDays, EXPIRY_COUNTDOWN_THRESHOLD_DAYS } from '@/lib/marche/annonce-expiry-countdown'

const DAY_MS = 24 * 60 * 60 * 1000
const NOW = new Date('2026-08-22T12:00:00.000Z')

function createdDaysAgo(days: number): string {
  return new Date(NOW.getTime() - days * DAY_MS).toISOString()
}

describe('getExpiryCountdownDays', () => {
  it('is null well inside the window (e.g. a post 5 days old, 25 days left)', () => {
    expect(getExpiryCountdownDays(createdDaysAgo(5), NOW)).toBeNull()
  })

  it('is null right up to the 7-day boundary (23 days old → 7 days left is the edge)', () => {
    // 30 - 23 = 7 days remaining exactly — this IS inside the window.
    expect(getExpiryCountdownDays(createdDaysAgo(22), NOW)).toBeNull() // 8 days left, still outside
    expect(getExpiryCountdownDays(createdDaysAgo(23), NOW)).toBe(7) // 7 days left, threshold itself
  })

  it(`counts down through the last ${EXPIRY_COUNTDOWN_THRESHOLD_DAYS} days`, () => {
    expect(getExpiryCountdownDays(createdDaysAgo(25), NOW)).toBe(5)
    expect(getExpiryCountdownDays(createdDaysAgo(28), NOW)).toBe(2)
  })

  it('returns null once past annonce-status.ts\'s own expiry boundary — resolveAnnonceStatus takes over', () => {
    expect(getExpiryCountdownDays(createdDaysAgo(30), NOW)).toBeNull()
    expect(getExpiryCountdownDays(createdDaysAgo(31), NOW)).toBeNull()
  })

  it('never returns 0 or negative — the last instant before expiry still reads as 1 day left', () => {
    const almostThirty = new Date(NOW.getTime() - (30 * DAY_MS - 1000))
    expect(getExpiryCountdownDays(almostThirty.toISOString(), NOW)).toBe(1)
  })
})
