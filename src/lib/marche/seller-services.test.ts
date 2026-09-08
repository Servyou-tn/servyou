import { describe, it, expect } from 'vitest'
import { matchesServiceTab, countServiceTabs, SERVICE_TABS, SERVICE_SORTS } from './seller-services'

describe('SERVICE_TABS — the measured Segmented set (244:727, count=3)', () => {
  it('is exactly Tous · Actifs · En pause, in frame order', () => {
    expect([...SERVICE_TABS]).toEqual(['all', 'active', 'paused'])
  })

  it('has exactly the 3 sorts ProduitsFilterBar established for a "Trier par" trigger', () => {
    expect([...SERVICE_SORTS]).toEqual(['recent', 'price_asc', 'price_desc'])
  })
})

describe('matchesServiceTab — all three tabs', () => {
  it('"all" matches active and hidden, but NOT draft', () => {
    expect(matchesServiceTab({ status: 'active' }, 'all')).toBe(true)
    expect(matchesServiceTab({ status: 'hidden' }, 'all')).toBe(true)
    // A draft was never published by its owner — H5 must not be the surface that first makes it
    // visible (founder ruling). Excluded from every tab, Tous included; H6's job to surface it.
    expect(matchesServiceTab({ status: 'draft' }, 'all')).toBe(false)
  })

  it('"active" matches only status=active', () => {
    expect(matchesServiceTab({ status: 'active' }, 'active')).toBe(true)
    expect(matchesServiceTab({ status: 'hidden' }, 'active')).toBe(false)
    expect(matchesServiceTab({ status: 'draft' }, 'active')).toBe(false)
  })

  it('"paused" matches status=hidden — BOTH a self-pause and an admin-moderated row — never draft', () => {
    // The tab groups by DB status only; the StatusPill (not the tab) is what tells a self-pause
    // apart from admin moderation (ServiceRow.tsx's isModerated check).
    expect(matchesServiceTab({ status: 'hidden' }, 'paused')).toBe(true)
    expect(matchesServiceTab({ status: 'draft' }, 'paused')).toBe(false)
  })
})

describe('countServiceTabs', () => {
  it('counts each tab independently, "all" excluding drafts', () => {
    const rows: { status: 'active' | 'hidden' | 'draft' }[] = [
      { status: 'active' },
      { status: 'active' },
      { status: 'hidden' },
    ]
    expect(countServiceTabs(rows)).toEqual({ all: 3, active: 2, paused: 1 })
  })

  it('a draft counts toward NEITHER "all" NOR any other tab — it is invisible in H5 entirely', () => {
    const rows: { status: 'active' | 'hidden' | 'draft' }[] = [
      { status: 'active' },
      { status: 'draft' },
      { status: 'draft' },
    ]
    expect(countServiceTabs(rows)).toEqual({ all: 1, active: 1, paused: 0 })
  })

  it('handles zero services — every count is 0, not undefined or NaN', () => {
    expect(countServiceTabs([])).toEqual({ all: 0, active: 0, paused: 0 })
  })
})
