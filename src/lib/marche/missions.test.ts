import { describe, it, expect } from 'vitest'
import {
  budgetBucketOrFilters,
  buildMissionsHref,
  competitionLevel,
  firstName,
  isNewMission,
  localizeCity,
  missionCutoffIso,
  missionDaysLeft,
  parseMissionParams,
  type MissionFilters,
} from './missions'
import { isAnnoncePastExpiry } from './annonce-status'

const NOW = new Date('2026-10-26T12:00:00Z')
const ago = (ms: number) => new Date(NOW.getTime() - ms).toISOString()
const H = 3_600_000
const D = 24 * H

describe('competitionLevel — thresholds 0–3 / 4–7 / 8–10', () => {
  it.each([
    [0, 'low'],
    [3, 'low'],
    [4, 'medium'],
    [7, 'medium'],
    [8, 'high'],
    [10, 'high'],
  ] as const)('%i responses → %s', (n, level) => {
    expect(competitionLevel(n)).toBe(level)
  })
})

describe('isNewMission — published < 48 h ago (D-H9-6)', () => {
  it('is new at 47 h 59 m, not at exactly 48 h', () => {
    expect(isNewMission(ago(48 * H - 60_000), NOW)).toBe(true)
    expect(isNewMission(ago(48 * H), NOW)).toBe(false)
    expect(isNewMission(ago(5 * D), NOW)).toBe(false)
  })
})

describe('missionDaysLeft — whole days left in the 30-day window, rounded up', () => {
  it('is 30 for a post made just now, and counts down', () => {
    expect(missionDaysLeft(ago(0), NOW)).toBe(30)
    expect(missionDaysLeft(ago(1 * D + H), NOW)).toBe(29)
    expect(missionDaysLeft(ago(29 * D + 23 * H), NOW)).toBe(1)
  })
  it('is 0 on or past the boundary, never negative', () => {
    expect(missionDaysLeft(ago(30 * D), NOW)).toBe(0)
    expect(missionDaysLeft(ago(45 * D), NOW)).toBe(0)
  })
})

describe('missionCutoffIso — `gte` this is exactly « not past expiry »', () => {
  it('a post made exactly at the cutoff is still open; one millisecond older is expired', () => {
    const cutoff = missionCutoffIso(NOW)
    expect(isAnnoncePastExpiry(cutoff, NOW)).toBe(false)
    expect(isAnnoncePastExpiry(new Date(new Date(cutoff).getTime() - 1).toISOString(), NOW)).toBe(true)
  })
})

describe('budgetBucketOrFilters — range intersects the half-open bucket, nulls borrow the other bound', () => {
  it('lt200 has only the low-side group: nothing is required of the upper bound', () => {
    expect(budgetBucketOrFilters('lt200')).toEqual(['budget_min.lt.200,and(budget_min.is.null,budget_max.lt.200)'])
  })
  it('gte1000 has only the high-side group', () => {
    expect(budgetBucketOrFilters('gte1000')).toEqual(['budget_max.gte.1000,and(budget_max.is.null,budget_min.gte.1000)'])
  })
  it('a middle bucket has both groups (they AND together as separate .or() calls)', () => {
    expect(budgetBucketOrFilters('200_500')).toEqual([
      'budget_min.lt.500,and(budget_min.is.null,budget_max.lt.500)',
      'budget_max.gte.200,and(budget_max.is.null,budget_min.gte.200)',
    ])
  })
  it('only ever interpolates numbers — no group carries a quote, paren pair beyond and(), or user text', () => {
    for (const b of ['lt200', '200_500', '500_1000', 'gte1000'] as const) {
      for (const g of budgetBucketOrFilters(b)) expect(g).toMatch(/^[a-z_.,()0-9]+$/)
    }
  })
})

describe('parseMissionParams', () => {
  it('falls back instead of throwing on junk', () => {
    const f = parseMissionParams({ tri: 'DROP', budget: 'x', page: '-4', teletravail: 'yes', ville: '   ' })
    expect(f).toMatchObject({ tri: 'recent', budget: null, page: 1, teletravail: false, ville: null, categorie: null })
  })
  it('reads valid values and takes the first of a repeated param', () => {
    const f = parseMissionParams({ tri: 'concurrence', budget: '200_500', page: '3', teletravail: '1', competence: ['React', 'Vue'] })
    expect(f).toMatchObject({ tri: 'concurrence', budget: '200_500', page: 3, teletravail: true, competence: 'React' })
  })
  it('caps a text value at 100 characters', () => {
    expect(parseMissionParams({ ville: 'a'.repeat(500) }).ville).toHaveLength(100)
  })
})

describe('buildMissionsHref', () => {
  const base: MissionFilters = { categorie: null, ville: null, budget: null, competence: null, teletravail: false, tri: 'recent', page: 1 }
  it('omits defaults', () => {
    expect(buildMissionsHref('/trouver-des-missions', base)).toBe('/trouver-des-missions')
  })
  it('changing a filter resets the page; changing only the page keeps it', () => {
    const f = { ...base, ville: 'Tunis', page: 4 }
    expect(buildMissionsHref('/x', f, { budget: '200_500' })).toBe('/x?ville=Tunis&budget=200_500')
    expect(buildMissionsHref('/x', f, { page: 5 })).toBe('/x?ville=Tunis&page=5')
  })
  it('null removes a param and encodes the rest', () => {
    const f = { ...base, ville: 'Le Kef', competence: 'Next.js' }
    expect(buildMissionsHref('/x', f, { ville: null })).toBe('/x?competence=Next.js')
    expect(buildMissionsHref('/x', f)).toBe('/x?ville=Le+Kef&competence=Next.js')
  })
})

describe('firstName', () => {
  it('takes the first word and tolerates null / blank', () => {
    expect(firstName('  Karim Ben Ali ')).toBe('Karim')
    expect(firstName(null)).toBe('')
    expect(firstName('   ')).toBe('')
  })
})

describe('localizeCity', () => {
  it('maps a governorate to the reader language, leaves free text and null alone', () => {
    expect(localizeCity('Le Kef', 'fr')).toBe('Le Kef')
    expect(localizeCity('Le Kef', 'ar')).toBe('الكاف')
    expect(localizeCity('Tunis centre', 'ar')).toBe('Tunis centre')
    expect(localizeCity(null, 'ar')).toBeNull()
  })
})
