import { describe, it, expect } from 'vitest'
import {
  PROPOSALS_PER_PAGE,
  isProposalActive,
  matchesProposalQuery,
  pageProposals,
  proposalStats,
  resolveProposalState,
  tunisMonthKey,
  type Proposal,
} from './proposals'
import { missionLiveness } from './missions'

const NOW = new Date('2026-10-27T12:00:00Z')
const DAY = 86_400_000
const ago = (ms: number) => new Date(NOW.getTime() - ms).toISOString()

function proposal(over: Partial<Proposal> = {}): Proposal {
  return {
    id: 'r1',
    jobPostId: 'p1',
    createdAt: ago(2 * DAY),
    state: 'open',
    price: null,
    timeframe: null,
    title: 'Logo 3D',
    categorySlug: null,
    categoryNameFr: null,
    categoryNameAr: null,
    clientId: 'c1',
    clientFirstName: 'Karim',
    clientCity: null,
    ...over,
  }
}

describe('resolveProposalState — the state of the post a proposal answers', () => {
  it('an unreadable post (deleted / moderated) is unavailable', () => {
    expect(resolveProposalState(null, NOW)).toBe('unavailable')
  })

  it('open inside the window is open; open past 30 days is expired; filled and stored-expired stay as they are', () => {
    expect(resolveProposalState({ status: 'open', createdAt: ago(29 * DAY) }, NOW)).toBe('open')
    expect(resolveProposalState({ status: 'open', createdAt: ago(31 * DAY) }, NOW)).toBe('expired')
    expect(resolveProposalState({ status: 'filled', createdAt: ago(40 * DAY) }, NOW)).toBe('filled')
    expect(resolveProposalState({ status: 'expired', createdAt: ago(1 * DAY) }, NOW)).toBe('expired')
  })

  it('only an open post counts as active (the DB cap of 5 counts the same set)', () => {
    expect(isProposalActive('open')).toBe(true)
    for (const s of ['filled', 'expired', 'unavailable'] as const) expect(isProposalActive(s)).toBe(false)
  })
})

describe('tunisMonthKey — the « Ce mois » boundary is the Tunis calendar month (D-H11-4)', () => {
  it('23:30 UTC on the 31st is already the 1st in Tunis (UTC+1)', () => {
    expect(tunisMonthKey('2026-10-31T23:30:00Z')).toBe('2026-11')
    expect(tunisMonthKey('2026-10-31T22:59:00Z')).toBe('2026-10')
  })
})

describe('proposalStats', () => {
  it('splits sent into active and closed, and counts this month in Tunis time', () => {
    const all = [
      proposal({ id: 'a', state: 'open', createdAt: '2026-10-05T10:00:00Z' }),
      proposal({ id: 'b', state: 'filled', createdAt: '2026-09-30T23:30:00Z' }), // 00:30 on Oct 1 in Tunis → this month
      proposal({ id: 'c', state: 'expired', createdAt: '2026-09-30T22:30:00Z' }), // 23:30 on Sep 30 in Tunis → last month
      proposal({ id: 'd', state: 'unavailable', createdAt: '2026-08-01T10:00:00Z' }),
    ]
    expect(proposalStats(all, NOW)).toEqual({ sent: 4, active: 1, activeMax: 5, closed: 3, thisMonth: 2 })
  })
})

describe('matchesProposalQuery', () => {
  it('matches the mission title or the client first name, ignoring case and accents', () => {
    const p = proposal({ title: 'Création de logo', clientFirstName: 'Hélène' })
    expect(matchesProposalQuery(p, 'creation')).toBe(true)
    expect(matchesProposalQuery(p, 'HELENE')).toBe(true)
    expect(matchesProposalQuery(p, 'zzz')).toBe(false)
    expect(matchesProposalQuery(p, '  ')).toBe(true)
  })

  it('a proposal whose post is gone has no title to match, and does not throw', () => {
    expect(matchesProposalQuery(proposal({ title: null, clientFirstName: '' }), 'logo')).toBe(false)
  })
})

describe('pageProposals', () => {
  const mixed = [
    proposal({ id: 'new-open', state: 'open', createdAt: ago(1 * DAY) }),
    proposal({ id: 'mid-filled', state: 'filled', createdAt: ago(5 * DAY) }),
    proposal({ id: 'old-gone', state: 'unavailable', createdAt: ago(9 * DAY), title: null }),
  ]

  it('tabs: Toutes = all, Actives = open, Fermées = everything else (unavailable included)', () => {
    const ids = (tab: 'all' | 'active' | 'closed') =>
      pageProposals(mixed, { tab, q: '', sort: 'recent', page: 1 }, NOW).proposals.map((p) => p.id)
    expect(ids('all')).toEqual(['new-open', 'mid-filled', 'old-gone'])
    expect(ids('active')).toEqual(['new-open'])
    expect(ids('closed')).toEqual(['mid-filled', 'old-gone'])
  })

  it('sorts by send date, newest or oldest first', () => {
    const oldest = pageProposals(mixed, { tab: 'all', q: '', sort: 'oldest', page: 1 }, NOW)
    expect(oldest.proposals.map((p) => p.id)).toEqual(['old-gone', 'mid-filled', 'new-open'])
  })

  it('stats cover every proposal whatever the tab or the search', () => {
    const page = pageProposals(mixed, { tab: 'closed', q: 'logo', sort: 'recent', page: 1 }, NOW)
    expect(page.stats.sent).toBe(3)
    expect(page.totalCount).toBe(1)
  })

  it('pages by 10 and clamps an out-of-range or fractional page', () => {
    const many = Array.from({ length: 23 }, (_, i) => proposal({ id: `r${i}`, createdAt: ago(i * 1000) }))
    const p3 = pageProposals(many, { tab: 'all', q: '', sort: 'recent', page: 3 }, NOW)
    expect(p3.proposals).toHaveLength(3)
    expect(p3.totalPages).toBe(3)
    expect(pageProposals(many, { tab: 'all', q: '', sort: 'recent', page: 99 }, NOW).page).toBe(3)
    expect(pageProposals(many, { tab: 'all', q: '', sort: 'recent', page: 1.5 }, NOW).proposals).toHaveLength(PROPOSALS_PER_PAGE)
  })
})

describe('missionLiveness — no « Nouveau » / « Expire dans » on a post that no longer takes proposals', () => {
  it('an open post inside the window keeps both', () => {
    expect(missionLiveness({ status: 'open', createdAt: ago(3 * 3_600_000) }, NOW)).toEqual({ isNew: true, daysLeft: 30 })
  })

  it('a fresh post the consumer already marked filled is neither new nor counting down', () => {
    expect(missionLiveness({ status: 'filled', createdAt: ago(3 * 3_600_000) }, NOW)).toEqual({ isNew: false, daysLeft: null })
  })

  it('stored-expired, past-window and moderated posts are not live either', () => {
    expect(missionLiveness({ status: 'expired', createdAt: ago(1 * DAY) }, NOW)).toEqual({ isNew: false, daysLeft: null })
    expect(missionLiveness({ status: 'open', createdAt: ago(31 * DAY) }, NOW)).toEqual({ isNew: false, daysLeft: null })
    expect(missionLiveness({ status: 'open', createdAt: ago(3_600_000), hidden: true }, NOW)).toEqual({ isNew: false, daysLeft: null })
  })
})
