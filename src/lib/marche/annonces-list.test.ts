import { describe, it, expect } from 'vitest'
import { annonceProposalsNote, annonceStats, matchesAnnonceQuery, pageAnnonces, ANNONCES_PER_PAGE } from './annonces-list'

type Row = Parameters<typeof annonceStats>[0][number]

let n = 0
function row(over: Partial<Row> = {}): Row {
  n += 1
  return {
    display_status: 'open',
    response_count: 0,
    created_at: new Date(Date.UTC(2026, 9, n)).toISOString(),
    title: `Annonce ${n}`,
    category: 'Développement',
    category_ar: 'التطوير',
    ...over,
  }
}

describe('annonceStats — F3 tiles count ALL annonces, from real data', () => {
  it('published · open · proposals · filled', () => {
    const all = [
      row({ display_status: 'open', response_count: 5 }),
      row({ display_status: 'open', response_count: 3 }),
      row({ display_status: 'filled', response_count: 4 }),
      row({ display_status: 'expired', response_count: 8 }),
    ]
    expect(annonceStats(all)).toEqual({ published: 4, open: 2, proposals: 20, filled: 1 })
  })

  it('an empty list is all zeros, never NaN', () => {
    expect(annonceStats([])).toEqual({ published: 0, open: 0, proposals: 0, filled: 0 })
  })
})

describe('matchesAnnonceQuery', () => {
  it('matches title or category (French or Arabic), accent- and case-insensitive; blank matches all', () => {
    const a = row({ title: 'Refonte site e-commerce', category: 'Développement', category_ar: 'التطوير' })
    expect(matchesAnnonceQuery(a, 'REFONTE')).toBe(true)
    expect(matchesAnnonceQuery(a, 'developpement')).toBe(true)
    expect(matchesAnnonceQuery(a, 'التطوير')).toBe(true)
    expect(matchesAnnonceQuery(a, 'logo')).toBe(false)
    expect(matchesAnnonceQuery(a, '   ')).toBe(true)
  })

  it('a row without a category still matches on its title', () => {
    expect(matchesAnnonceQuery(row({ title: 'Traduction', category: null, category_ar: null }), 'tradu')).toBe(true)
  })
})

describe('pageAnnonces — tabs, sort, paging', () => {
  const all = [
    row({ title: 'old open', display_status: 'open', response_count: 1, created_at: '2026-10-01T10:00:00Z' }),
    row({ title: 'mid filled', display_status: 'filled', response_count: 9, created_at: '2026-10-10T10:00:00Z' }),
    row({ title: 'new expired', display_status: 'expired', response_count: 2, created_at: '2026-10-20T10:00:00Z' }),
    row({ title: 'newest open', display_status: 'open', response_count: 2, created_at: '2026-10-25T10:00:00Z' }),
  ]
  const run = (o: Partial<Parameters<typeof pageAnnonces>[1]> = {}) =>
    pageAnnonces(all, { tab: 'all', q: '', sort: 'recent', page: 1, ...o })

  it('« Actives » = open only; « Fermées » = filled AND expired; « Toutes » = everything', () => {
    expect(run({ tab: 'active' }).annonces.map((a) => a.title)).toEqual(['newest open', 'old open'])
    expect(run({ tab: 'closed' }).annonces.map((a) => a.title)).toEqual(['new expired', 'mid filled'])
    expect(run().totalCount).toBe(4)
  })

  it('sorts newest first by default, oldest first, or by proposals (ties newest first)', () => {
    expect(run().annonces[0].title).toBe('newest open')
    expect(run({ sort: 'oldest' }).annonces[0].title).toBe('old open')
    expect(run({ sort: 'responses' }).annonces.map((a) => a.title)).toEqual(['mid filled', 'newest open', 'new expired', 'old open'])
  })

  it('stats never move with the tab or the search', () => {
    expect(run({ tab: 'closed', q: 'zzz' }).stats).toEqual(annonceStats(all))
  })

  it('combines the search with the tab', () => {
    expect(run({ tab: 'active', q: 'newest' }).annonces.map((a) => a.title)).toEqual(['newest open'])
  })

  it('pages by ANNONCES_PER_PAGE and clamps an out-of-range or fractional page', () => {
    const many = Array.from({ length: ANNONCES_PER_PAGE + 3 }, () => row())
    const p1 = pageAnnonces(many, { tab: 'all', q: '', sort: 'recent', page: 1 })
    expect(p1.annonces).toHaveLength(ANNONCES_PER_PAGE)
    expect(p1.totalPages).toBe(2)
    const p9 = pageAnnonces(many, { tab: 'all', q: '', sort: 'recent', page: 9 })
    expect(p9.page).toBe(2)
    expect(p9.annonces).toHaveLength(3)
    expect(pageAnnonces(many, { tab: 'all', q: '', sort: 'recent', page: 1.5 }).page).toBe(1)
    expect(pageAnnonces(many, { tab: 'all', q: '', sort: 'recent', page: 0 }).page).toBe(1)
  })

  it('an empty result still has one page', () => {
    const r = pageAnnonces([], { tab: 'all', q: '', sort: 'recent', page: 3 })
    expect(r).toMatchObject({ totalCount: 0, totalPages: 1, page: 1 })
  })
})

describe('annonceProposalsNote — the sub-line under « N propositions »', () => {
  it('filled → freelance choisi · expired → aucune retenue · open with none → en attente · open → sur 10 maximum', () => {
    expect(annonceProposalsNote({ display_status: 'filled', response_count: 4 })).toEqual({ key: 'chosen' })
    expect(annonceProposalsNote({ display_status: 'expired', response_count: 2 })).toEqual({ key: 'none_kept' })
    expect(annonceProposalsNote({ display_status: 'open', response_count: 0 })).toEqual({ key: 'waiting' })
    expect(annonceProposalsNote({ display_status: 'open', response_count: 5 })).toEqual({ key: 'of_max', max: 10 })
  })
})
