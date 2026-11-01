/**
 * H4 — freelancer dashboard: the four business rules a founder ruling actually pins (Ruling 8
 * plus the advisor's order_events-scoping catch), not the query wiring. docs/design/h4-discovery
 * .md carries the full provenance; this file is the "does the rule hold" check.
 */
import { describe, it, expect } from 'vitest'
import {
  activeOrderCounts,
  activePurchaseCount,
  matchingPostIds,
  buildActivityFeed,
  checklistFrom,
} from './freelancer-dashboard'

describe('activePurchaseCount', () => {
  it('excludes only the two terminal statuses, same rule as activeOrderCounts', () => {
    const orders = [{ status: 'pending' }, { status: 'accepted' }, { status: 'received' }, { status: 'cancelled' }]
    expect(activePurchaseCount(orders)).toBe(2)
  })

  it('is zero on an empty purchase history', () => {
    expect(activePurchaseCount([])).toBe(0)
  })
})

describe('activeOrderCounts', () => {
  it('excludes only the two terminal statuses from "actifs"', () => {
    const orders = [
      { status: 'pending' },
      { status: 'accepted' },
      { status: 'arrived' },
      { status: 'received' },
      { status: 'cancelled' },
    ]
    expect(activeOrderCounts(orders)).toEqual({ engagementsActifs: 3, demandesEnAttente: 1 })
  })

  it('is zero/zero on an empty order list — a brand-new freelancer', () => {
    expect(activeOrderCounts([])).toEqual({ engagementsActifs: 0, demandesEnAttente: 0 })
  })
})

describe('matchingPostIds', () => {
  it('matches on exact skill string, dedups a post that matched on two skills', () => {
    const rows = [
      { job_post_id: 'p1', skill: 'React' },
      { job_post_id: 'p1', skill: 'Node' },
      { job_post_id: 'p2', skill: 'Figma' },
    ]
    expect(matchingPostIds(['React', 'Node'], rows)).toEqual(['p1'])
  })

  it('returns nothing when no skill overlaps — a genuine non-match, not just an empty input', () => {
    const rows = [{ job_post_id: 'p1', skill: 'Plumbing' }]
    expect(matchingPostIds(['React', 'Node'], rows)).toEqual([])
  })

  it('is case- and accent-sensitive today (documented gap, not a bug in this function)', () => {
    const rows = [{ job_post_id: 'p1', skill: 'react' }]
    expect(matchingPostIds(['React'], rows)).toEqual([])
  })

  it('returns empty on an empty skill list', () => {
    expect(matchingPostIds([], [{ job_post_id: 'p1', skill: 'React' }])).toEqual([])
  })
})

describe('buildActivityFeed', () => {
  const order = (
    id: string,
    createdAt: string,
    events: { event_type: string; to_status: string | null; created_at: string }[],
    buyerId = 'buyer-1',
  ) => ({
    id,
    status: 'accepted',
    created_at: createdAt,
    item_title: null,
    buyer_id: buyerId,
    service_listings: { title: `Service ${id}` },
    order_events: events,
  })

  it('emits a request row from orders.created_at AND a status row from order_events, not a double-count of the same instant', () => {
    // The advisor's catch: emit_order_event() writes a 'created' event at the SAME instant the
    // order row itself is created — that 'created' event_type must be excluded, or one new
    // request would render as two Activité récente rows.
    const orders = [
      order('o1', '2026-09-01T10:00:00Z', [
        { event_type: 'created', to_status: 'pending', created_at: '2026-09-01T10:00:00Z' },
        { event_type: 'status_change', to_status: 'accepted', created_at: '2026-09-01T11:00:00Z' },
      ]),
    ]
    const feed = buildActivityFeed(orders, [], new Map(), 10)
    expect(feed).toHaveLength(2)
    expect(feed.filter((f) => f.kind === 'request')).toHaveLength(1)
    expect(feed.filter((f) => f.kind === 'status')).toHaveLength(1)
  })

  it('drops a status_change event with a null to_status rather than rendering a blank status', () => {
    const orders = [
      order('o1', '2026-09-01T10:00:00Z', [
        { event_type: 'status_change', to_status: null, created_at: '2026-09-01T11:00:00Z' },
      ]),
    ]
    const feed = buildActivityFeed(orders, [], new Map(), 10)
    expect(feed.filter((f) => f.kind === 'status')).toHaveLength(0)
  })

  it('sorts the union newest-first across all three sources and caps at limit', () => {
    const orders = [
      order('o1', '2026-09-01T08:00:00Z', []),
      order('o2', '2026-09-03T08:00:00Z', []),
    ]
    const responses = [
      { created_at: '2026-09-02T08:00:00Z', job_posts: { title: 'Mission A' } },
    ]
    const feed = buildActivityFeed(orders, responses, new Map(), 2)
    expect(feed).toHaveLength(2)
    expect(feed[0].createdAt).toBe('2026-09-03T08:00:00Z')
    expect(feed[1].createdAt).toBe('2026-09-02T08:00:00Z')
  })

  it('carries a null proposal title through rather than substituting one — a deleted / moderated post', () => {
    const responses = [{ created_at: '2026-09-01T08:00:00Z', job_posts: null }]
    const feed = buildActivityFeed([], responses, new Map(), 10)
    expect(feed[0]).toMatchObject({ kind: 'proposal', title: null })
  })

  it('resolves a status row\'s buyerName from the map keyed on the order\'s buyer_id', () => {
    const orders = [
      order(
        'o1',
        '2026-09-01T10:00:00Z',
        [{ event_type: 'status_change', to_status: 'received', created_at: '2026-09-01T11:00:00Z' }],
        'buyer-42',
      ),
    ]
    const feed = buildActivityFeed(orders, [], new Map([['buyer-42', 'Ahmed B.']]), 10)
    expect(feed.find((f) => f.kind === 'status')).toMatchObject({ status: 'received', buyerName: 'Ahmed B.' })
  })

  it('resolves to an empty buyerName, not a crash or a fabricated name, when the map has no entry', () => {
    const orders = [
      order(
        'o1',
        '2026-09-01T10:00:00Z',
        [{ event_type: 'status_change', to_status: 'received', created_at: '2026-09-01T11:00:00Z' }],
        'buyer-unmapped',
      ),
    ]
    const feed = buildActivityFeed(orders, [], new Map(), 10)
    expect(feed.find((f) => f.kind === 'status')).toMatchObject({ buyerName: '' })
  })
})

describe('checklistFrom', () => {
  const base = { avatarUrl: null, bioNonEmpty: false, skillsCount: 0, linksCount: 0, portfolioCount: 0 }

  it('« Ajoutez 2 réalisations » is done at 2 portfolio items, not at 0 or 1 (it was hard-coded false before H3 shipped the table)', () => {
    expect(checklistFrom({ ...base, portfolioCount: 0 }).portfolio).toBe(false)
    expect(checklistFrom({ ...base, portfolioCount: 1 }).portfolio).toBe(false)
    expect(checklistFrom({ ...base, portfolioCount: 2 }).portfolio).toBe(true)
    expect(checklistFrom({ ...base, portfolioCount: 6 }).portfolio).toBe(true)
  })

  it('everything done reads complete — the ring can reach 100%', () => {
    const c = checklistFrom({ avatarUrl: 'x.webp', bioNonEmpty: true, skillsCount: 1, linksCount: 1, portfolioCount: 2 })
    expect(c).toEqual({ avatar: true, bio: true, skills: true, links: true, portfolio: true })
  })

  it('« Ajoutez vos liens » is done from the first saved link, not before', () => {
    expect(checklistFrom({ ...base, linksCount: 0 }).links).toBe(false)
    expect(checklistFrom({ ...base, linksCount: 1 }).links).toBe(true)
  })

  it('a brand-new freelancer (no avatar, empty bio, no skills) is all-unmet', () => {
    expect(checklistFrom(base)).toEqual({ avatar: false, bio: false, skills: false, links: false, portfolio: false })
  })

  it('a portfolio_link (an external address) is not a portfolio item — it is not an input here at all', () => {
    expect(Object.keys(base)).not.toContain('portfolioLink')
  })
})
